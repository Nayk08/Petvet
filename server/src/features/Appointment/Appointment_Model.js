import pool from "../../config/db.js";
import { paginateQuery } from "../../../utils/paginateQuery.js";
import { resolvePaymentSplit } from "../../../utils/validatePaymentMethod.js";
import {
  parseTimeString,
  CLINIC_OPEN_MINUTE,
  CLINIC_CLOSE_MINUTE,
} from "../../validators/appointmentSchema.js";

const ALLOWED_SEARCH_COLUMNS = ["appointment_id", "client_name", "pets_name"];
const ALLOWED_FILTER_COLUMNS = [
  "appointment_status_name",
  "service_name",
  "category_name",
  "assigned_staff_id",
  "appointment_date",
];
// ANY($n) needs an explicit cast for non-text columns — pg can't safely
// infer int[]/date[] from an array of plain JS strings otherwise.
const FILTER_COLUMN_CASTS = {
  assigned_staff_id: "int[]",
  appointment_date: "date[]",
};

// Combines the validated appointment_date (a Date, UTC-midnight — see
// appointmentSchema.js's date-string comment) with a time-of-day string
// ("HH:mm" or "HH:mm:ss", from the fixed Zod schema) into a single
// "YYYY-MM-DD HH:mm:ss" string for tbl_appointments.start_time/end_time
// (TIMESTAMP WITHOUT TIME ZONE). Postgres's timestamp type requires a full
// date+time — a bare "17:00:00" is not valid input for it (that's what a
// TIME column takes). Building this as plain text keeps the write path
// free of any Date/timezone conversion while still matching what the
// column expects — no new Date(...) anywhere in this file, on purpose.
function toTimestampString(appointment_date, timeStr) {
  const dateStr =
    appointment_date instanceof Date
      ? appointment_date.toISOString().slice(0, 10)
      : appointment_date;
  const normalizedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr; // "HH:mm" → "HH:mm:ss"
  return `${dateStr} ${normalizedTime}`;
}

// Maps a partial-unique-index violation on tbl_appointments to a friendly,
// user-facing message. Returns the error to throw, or null if this isn't
// one of those constraints. Two are enforced: the same STAFF member can't
// be double-booked into one slot, and the same PET can't be booked into two
// simultaneous appointments with two different staff — physically
// impossible even though staff-scoped uniqueness alone wouldn't catch it.
function mapSlotConflictError(error) {
  if (error.code !== "23505") return null;

  if (error.constraint === "uq_appointments_staff_slot") {
    const err = new Error(
      "This staff member is already booked for this date and time slot.",
    );
    err.statusCode = 409;
    return err;
  }

  if (error.constraint === "uq_appointments_pet_slot") {
    const err = new Error(
      "This pet already has another appointment booked at this date and time.",
    );
    err.statusCode = 409;
    return err;
  }

  return null;
}

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

const pad2 = (n) => String(n).padStart(2, "0");

// Resolves a booking's time slot from the sub-service's CURRENT duration and
// checks it, inside the caller's transaction:
//   - the end time is start + duration_minutes (never sent by the client),
//   - the start sits on that sub-service's own grid (9:00, then every
//     `duration` minutes) and the service ends by 6:00 PM,
//   - neither the staff member nor the pet has an OVERLAPPING appointment.
// Durations differ per sub-service, so slots no longer line up: a 30-min
// Half Bath at 9:30 overlaps a 60-min Full Groom at 9:00 even though their
// start times differ — the old exact-start unique index can't see that.
// Per-staff and per-pet advisory locks make check-then-insert safe against a
// simultaneous booking (always staff first, then pet: no deadlock cycle).
// `skipGridCheck`: an edit that keeps its existing time is fine even if the
// duration has since changed in Maintenance.
async function resolveSlot(
  client,
  {
    appointment_services_id,
    assigned_staff_id,
    pets_id,
    appointment_date,
    start_time,
    exclude_appointment_id = null,
    skipGridCheck = false,
    keep_end_time_full = null,
  },
) {
  const { rows } = await client.query(
    `SELECT appointment_services, service_price, duration_minutes
     FROM tbl_appointment_services WHERE appointment_services_id = $1`,
    [appointment_services_id],
  );
  if (!rows.length) throw httpError(404, "Selected service not found");
  const service = rows[0];
  const duration = Number(service.duration_minutes);

  const start = parseTimeString(start_time);
  const startMinute = start.hour * 60 + start.minute;
  const endMinute = startMinute + duration;

  if (!skipGridCheck) {
    if ((startMinute - CLINIC_OPEN_MINUTE) % duration !== 0) {
      throw httpError(
        400,
        `${service.appointment_services} takes ${duration} minutes — pick one of its listed start times.`,
      );
    }
    if (endMinute > CLINIC_CLOSE_MINUTE) {
      throw httpError(
        400,
        `${service.appointment_services} takes ${duration} minutes and would end after 6:00 PM.`,
      );
    }
  }

  const start_time_full = toTimestampString(appointment_date, `${pad2(start.hour)}:${pad2(start.minute)}`);
  const end_time_full =
    keep_end_time_full ??
    toTimestampString(
      appointment_date,
      `${pad2(Math.floor(endMinute / 60))}:${pad2(endMinute % 60)}`,
    );

  await client.query(`SELECT pg_advisory_xact_lock(hashtext('appt-staff:' || $1::text))`, [assigned_staff_id]);
  await client.query(`SELECT pg_advisory_xact_lock(hashtext('appt-pet:' || $1::text))`, [pets_id]);

  const overlap = await client.query(
    `SELECT assigned_staff_id = $1 AS same_staff
     FROM tbl_appointments
     WHERE is_deleted IS NOT TRUE
       AND (assigned_staff_id = $1 OR pets_id = $2)
       AND appointment_id IS DISTINCT FROM $5
       AND start_time < $4::timestamp AND end_time > $3::timestamp
     LIMIT 1`,
    [assigned_staff_id, pets_id, start_time_full, end_time_full, exclude_appointment_id],
  );
  if (overlap.rows.length) {
    throw httpError(
      409,
      overlap.rows[0].same_staff
        ? "This staff member already has an appointment during this time."
        : "This pet already has another appointment during this time.",
    );
  }

  return { service, start_time_full, end_time_full };
}

async function assertPetBelongsToClient(client, pets_id, client_id) {
  const { rows } = await client.query(
    `SELECT 1 FROM tbl_pets p
     JOIN tbl_clients c ON c.client_id = p.client_id AND c.is_deleted IS NOT TRUE
     WHERE p.pets_id = $1 AND p.client_id = $2 AND p.is_deleted IS NOT TRUE`,
    [pets_id, client_id],
  );
  if (!rows.length) {
    throw httpError(400, "That pet doesn't belong to the selected client.");
  }
}

async function assertPetBelongsToAppointmentClient(client, pets_id, appointment_id) {
  const { rows } = await client.query(
    `SELECT 1 FROM tbl_pets p
     JOIN tbl_appointments a ON a.client_id = p.client_id
     WHERE p.pets_id = $1 AND a.appointment_id = $2 AND p.is_deleted IS NOT TRUE`,
    [pets_id, appointment_id],
  );
  if (!rows.length) {
    throw httpError(400, "That pet doesn't belong to this appointment's client.");
  }
}

export default class AppointmentModel {
  // Payment is now collected at booking time, so a Pending/In Queue
  // appointment whose slot has already passed is presumed to have happened
  // (paid + attended), not abandoned — flip it to Completed rather than
  // leaving it stuck, or requiring a manual "mark completed" step. Run
  // lazily on every read rather than via a cron job, since this app has no
  // job scheduler. A no-show can still be cancelled after the fact via the
  // Cancel action for as long as it stays Pending/In Queue.
  //
  // FIXED: end_time is a naive TIMESTAMP holding genuine Manila wall-clock
  // values, while NOW() is a TIMESTAMPTZ — comparing them directly made
  // Postgres cast end_time using the session's TimeZone setting (UTC on
  // Render), running this up to 8 hours early/late. `NOW() AT TIME ZONE
  // 'Asia/Manila'` converts the current instant to the equivalent Manila
  // wall-clock naive timestamp first, so the comparison is correct
  // regardless of what timezone the DB session itself is set to.
  async autoCompletePastAppointments() {
    const client = await pool.connect();
    try {
      // Only a paid, checked-in visit ("In Queue") is assumed done once its
      // slot is over. A "Pending" one was never paid/checked in — the client
      // didn't show, so it must not be recorded as a completed visit.
      // A no-show's unpaid bill is cancelled in the same statement, so it
      // doesn't linger in Payments / the client portal as payable for a
      // visit that never happened.
      await client.query(`
        WITH changed AS (
        UPDATE tbl_appointments a
        SET appointment_status_id = (
              SELECT appointment_status_id FROM tbl_appointment_status
              WHERE LOWER(TRIM(appointment_status_name)) =
                CASE WHEN LOWER(TRIM(s.appointment_status_name)) = 'pending'
                     THEN 'no show' ELSE 'completed' END
            ),
            updated_by = 'System',
            date_updated = NOW()
        FROM tbl_appointment_status s
        WHERE s.appointment_status_id = a.appointment_status_id
          AND a.is_deleted IS NOT TRUE
          AND a.end_time < (NOW() AT TIME ZONE 'Asia/Manila')
          AND LOWER(TRIM(s.appointment_status_name)) IN ('pending', 'in queue')
        RETURNING a.appointment_id, LOWER(TRIM(s.appointment_status_name)) AS was
        )
        UPDATE tbl_payments p
        SET is_deleted = true,
            payment_status_id = (SELECT payment_status_id FROM tbl_payment_status
                                 WHERE LOWER(TRIM(payment_status_name)) = 'cancelled'),
            updated_by = 'System', deleted_by = 'System', date_updated = NOW()
        FROM changed
        WHERE changed.was = 'pending' AND p.appointment_id = changed.appointment_id
          AND p.is_deleted IS NOT TRUE
          AND p.payment_status_id = (SELECT payment_status_id FROM tbl_payment_status
                                     WHERE LOWER(TRIM(payment_status_name)) = 'pending')
      `);
    } catch (error) {
      console.log(
        `Error on Model autoCompletePastAppointments function: ${error}`,
      );
      throw error;
    } finally {
      client.release();
    }
  }

  async getAppointments({
    page = 1,
    limit = 10,
    search = "",
    filters = {},
  } = {}) {
    await this.autoCompletePastAppointments();
    const client = await pool.connect();

    try {
      const values = [];
      // A cancelled appointment is a status, not a real deletion — it should
      // still show up in every listing with its "Cancelled" badge, same
      // convention as Payment_Model.js:getPayments.
      const conditions = [];

      for (const [key, value] of Object.entries(filters)) {
        if (!ALLOWED_FILTER_COLUMNS.includes(key) || !value) continue;

        const valueList = value.split(",").filter(Boolean);
        if (valueList.length === 0) continue;

        values.push(valueList);
        const cast = FILTER_COLUMN_CASTS[key]
          ? `::${FILTER_COLUMN_CASTS[key]}`
          : "";
        conditions.push(`${key} = ANY($${values.length}${cast})`);
      }

      if (search && search.trim()) {
        values.push(`%${search.trim()}%`);
        const idx = values.length;
        const searchClause = ALLOWED_SEARCH_COLUMNS.map((col) =>
          col === "appointment_id"
            ? `${col}::text ILIKE $${idx}`
            : `${col} ILIKE $${idx}`,
        ).join(" OR ");
        conditions.push(`(${searchClause})`);
      }

      const whereClause = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

      return await paginateQuery(client, {
        baseQuery: `SELECT * FROM v_appointments ${whereClause} ORDER BY appointment_id DESC`,
        countQuery: `SELECT COUNT(*) AS total FROM v_appointments ${whereClause}`,
        values,
        page,
        limit,
      });
    } catch (error) {
      console.log("Error on Model getAppointments function");
      throw error;
    } finally {
      client.release();
    }
  }

  async getAppointmentById(appointment_id) {
    await this.autoCompletePastAppointments();
    const client = await pool.connect();

    try {
      const res = await client.query(
        `SELECT * FROM v_appointments WHERE appointment_id = $1`,
        [appointment_id],
      );

      if (!res.rows.length) {
        throw new Error("Appointment record not found.");
      }

      return res.rows[0];
    } catch (error) {
      console.log(`Error on Model getAppointmentById function: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  // Books the appointment AND opens a matching Pending payment record in the
  // same transaction — same convention as Payment_Model.js:checkout, which
  // opens a Pending payment at checkout time and completes it later rather
  // than only writing to tbl_payments once money actually changes hands.
  // The total is resolved the same way completeAppointmentPayment prices
  // it: a fixed tbl_appointment_services.service_price (Consultation) wins
  // if set; otherwise Grooming is priced off the pet's weight tier;
  // otherwise (Operation) the price isn't known yet, so 0 is a placeholder
  // until completeAppointmentPayment fills in the real amount.
  async addAppointment({
    client_id,
    pets_id,
    appointment_services_id,
    assigned_staff_id,
    appointment_date,
    start_time,
    appointment_status_id,
    notes,
    created_by,
  }) {
    const client = await pool.connect();
    let queryError = null;
    try {
      await client.query("BEGIN");

      await assertPetBelongsToClient(client, pets_id, client_id);

      // end_time = start + the sub-service's current duration, stored on the
      // row so later duration edits don't move this appointment.
      const { service, start_time_full, end_time_full } = await resolveSlot(client, {
        appointment_services_id,
        assigned_staff_id,
        pets_id,
        appointment_date,
        start_time,
      });

      const apptRes = await client.query(
        `INSERT INTO tbl_appointments
          (client_id, pets_id, appointment_services_id, assigned_staff_id,
           appointment_date, start_time, end_time, appointment_status_id, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          client_id,
          pets_id,
          appointment_services_id,
          assigned_staff_id,
          appointment_date,
          start_time_full,
          end_time_full,
          appointment_status_id,
          notes,
          created_by,
        ],
      );
      const appointment = apptRes.rows[0];

      // The sub-service's fixed price; none = priced by hand when payment is
      // confirmed (0 is a placeholder until then).
      const total_amount = service.service_price;

      const pendingPaymentStatusRes = await client.query(
        `SELECT payment_status_id FROM tbl_payment_status
         WHERE LOWER(TRIM(payment_status_name)) = 'pending'`,
      );
      const pending_payment_status_id =
        pendingPaymentStatusRes.rows[0]?.payment_status_id;
      if (!pending_payment_status_id) {
        throw new Error("'Pending' payment status not configured");
      }

      await client.query(
        `INSERT INTO tbl_payments
          (total_amount, payment_status_id, appointment_id, created_by)
         VALUES ($1, $2, $3, $4)`,
        [
          total_amount ?? 0,
          pending_payment_status_id,
          appointment.appointment_id,
          created_by,
        ],
      );

      await client.query("COMMIT");
      return appointment;
    } catch (error) {
      queryError = error;
      await client.query("ROLLBACK");
      const conflict = mapSlotConflictError(error);
      if (conflict) throw conflict;
      console.log(`Error in addAppointment: ${error}`);
      throw error;
    } finally {
      client.release(queryError);
    }
  }

  async editAppointment({
    appointment_id,
    pets_id,
    appointment_services_id,
    assigned_staff_id,
    appointment_date,
    start_time,
    expected_status_id,
    notes,
    updated_by,
  }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // The pet must still belong to this appointment's client.
      await assertPetBelongsToAppointmentClient(client, pets_id, appointment_id);

      // Same sub-service and same start time => keep the stored end time
      // (a later duration change in Maintenance must not move an existing
      // appointment). Otherwise re-derive it from the current duration.
      const { rows: currentRows } = await client.query(
        `SELECT appointment_services_id, start_time, end_time
         FROM tbl_appointments WHERE appointment_id = $1`,
        [appointment_id],
      );
      const current = currentRows[0];
      const requestedStart = toTimestampString(appointment_date, start_time);
      const slotUnchanged =
        current &&
        String(current.appointment_services_id) === String(appointment_services_id) &&
        String(current.start_time).slice(0, 16) === requestedStart.slice(0, 16);

      const { service, start_time_full, end_time_full } = await resolveSlot(client, {
        appointment_services_id,
        assigned_staff_id,
        pets_id,
        appointment_date,
        start_time,
        exclude_appointment_id: appointment_id,
        skipGridCheck: slotUnchanged,
        keep_end_time_full: slotUnchanged ? current.end_time : null,
      });

      // Status in the WHERE: if someone cancelled / completed / no-showed it
      // since the service read it, this edit must not silently overwrite that.
      const res = await client.query(
        `UPDATE tbl_appointments
       SET pets_id = $1,
           appointment_services_id = $2,
           assigned_staff_id = $3,
           appointment_date = $4,
           start_time = $5,
           end_time = $6,
           notes = $7,
           updated_by = $8,
           date_updated = NOW()
       WHERE appointment_id = $9 AND appointment_status_id = $10
         AND is_deleted IS NOT TRUE
       RETURNING *`,
        [
          pets_id,
          appointment_services_id,
          assigned_staff_id,
          appointment_date,
          start_time_full,
          end_time_full,
          notes,
          updated_by,
          appointment_id,
          expected_status_id,
        ],
      );

      if (res.rows.length === 0) {
        throw httpError(
          409,
          "This appointment was changed by someone else — refresh and try again.",
        );
      }

      // A different sub-service means a different price. Re-price the
      // still-unpaid charge, or the Payment module would bill the old amount.
      // (Sub-services priced by hand at payment time have no price to apply.)
      const price = service.service_price;
      if (price != null) {
        await client.query(
          `UPDATE tbl_payments SET total_amount = $1, updated_by = $2, date_updated = NOW()
           WHERE appointment_id = $3 AND is_deleted IS NOT TRUE
             AND payment_status_id = (SELECT payment_status_id FROM tbl_payment_status
                                      WHERE LOWER(TRIM(payment_status_name)) = 'pending')`,
          [price, updated_by, appointment_id],
        );
      }

      await client.query("COMMIT");
      return res.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      const conflict = mapSlotConflictError(error);
      if (conflict) throw conflict;
      console.log(`Error in editAppointment: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteAppointment({
    appointment_id,
    appointment_status_id,
    deleted_by,
  }) {
    const client = await pool.connect();
    let queryError = null;
    try {
      await client.query("BEGIN");

      const res = await client.query(
        `UPDATE tbl_appointments
        SET is_deleted = true,
            deleted_by = $2,
            date_deleted = NOW(),
            appointment_status_id = $3
        WHERE appointment_id = $1 AND is_deleted IS NOT TRUE
          -- re-checked here, not just in the service, so a cancel can't
          -- overwrite a status someone else changed a moment ago
          AND appointment_status_id IN (
            SELECT appointment_status_id FROM tbl_appointment_status
            WHERE LOWER(TRIM(appointment_status_name)) IN ('pending', 'in queue'))
        RETURNING *`,
        [appointment_id, deleted_by, appointment_status_id],
      );

      if (res.rows.length === 0) {
        throw httpError(
          409,
          "This appointment's status was just changed by someone else — refresh and try again.",
        );
      }

      // A cancelled appointment that was never paid shouldn't leave an
      // orphaned Pending payment sitting in the Payment module — cancel it
      // alongside the appointment.
      await client.query(
        `UPDATE tbl_payments
         SET is_deleted = true,
             payment_status_id = (
               SELECT payment_status_id FROM tbl_payment_status
               WHERE LOWER(TRIM(payment_status_name)) = 'cancelled'
             ),
             updated_by = $2,
             deleted_by = $2,
             date_updated = NOW()
         WHERE appointment_id = $1
           AND is_deleted IS NOT TRUE
           AND payment_status_id = (
             SELECT payment_status_id FROM tbl_payment_status
             WHERE LOWER(TRIM(payment_status_name)) = 'pending'
           )`,
        [appointment_id, deleted_by],
      );

      // FIXED: an In Queue appointment's Completed payment used to be left
      // untouched on cancel — money already collected for a visit that's
      // now marked Cancelled, with nothing anywhere flagging it needs to go
      // back. This doesn't auto-refund (that's a real bank/GCash action a
      // human has to actually do) — it flips the payment to "Refund Needed"
      // so it surfaces in the Payment module instead of silently sitting as
      // "Completed" forever. The row stays (not soft-deleted) so it's still
      // visible to process.
      await client.query(
        `UPDATE tbl_payments
         SET payment_status_id = (
               SELECT payment_status_id FROM tbl_payment_status
               WHERE LOWER(TRIM(payment_status_name)) = 'refund needed'
             ),
             updated_by = $2,
             date_updated = NOW()
         WHERE appointment_id = $1
           AND is_deleted IS NOT TRUE
           -- 'awaiting verification' too: the client already sent GCash
           -- money for it, which must not just be forgotten.
           AND payment_status_id IN (
             SELECT payment_status_id FROM tbl_payment_status
             WHERE LOWER(TRIM(payment_status_name)) IN ('completed', 'awaiting verification')
           )`,
        [appointment_id, deleted_by],
      );

      await client.query("COMMIT");
      return res.rows[0];
    } catch (error) {
      queryError = error;
      await client.query("ROLLBACK");
      console.log(`Error in deleteAppointment: ${error}`);
      throw error;
    } finally {
      client.release(queryError);
    }
  }

  async getAppointmentStatusId(statusName) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT appointment_status_id FROM tbl_appointment_status
         WHERE LOWER(TRIM(appointment_status_name)) = LOWER(TRIM($1))
         LIMIT 1`,
        [statusName],
      );
      return res.rows[0]?.appointment_status_id;
    } catch (error) {
      console.log(`Error on Model getAppointmentStatusId function: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  // A bare status flip with no payment side effects — used when the payment
  // for an appointment-linked charge gets completed through the generic
  // Payment module ("Process" on the Payment list) rather than through
  // completeAppointmentPayment, so the appointment doesn't stay stuck on
  // Pending even though it's been paid.
  // A no-show's still-unpaid bill is void (see autoCompletePastAppointments).
  async cancelPendingPayment(appointment_id, updated_by) {
    await pool.query(
      `UPDATE tbl_payments
       SET is_deleted = true,
           payment_status_id = (SELECT payment_status_id FROM tbl_payment_status
                                WHERE LOWER(TRIM(payment_status_name)) = 'cancelled'),
           updated_by = $2, deleted_by = $2, date_updated = NOW()
       WHERE appointment_id = $1 AND is_deleted IS NOT TRUE
         AND payment_status_id = (SELECT payment_status_id FROM tbl_payment_status
                                  WHERE LOWER(TRIM(payment_status_name)) = 'pending')`,
      [appointment_id, updated_by],
    );
  }

  // `from_status` (optional) makes it a guarded transition: the row only
  // changes if it is still in that status, so a stale caller can't drag an
  // appointment backwards (e.g. Completed -> In Queue).
  async setAppointmentStatus({
    appointment_id,
    appointment_status_id,
    updated_by,
    from_status = null,
  }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_appointments
         SET appointment_status_id = $1, updated_by = $2, date_updated = NOW()
         WHERE appointment_id = $3
           AND ($4::text IS NULL OR appointment_status_id = (
                 SELECT appointment_status_id FROM tbl_appointment_status
                 WHERE LOWER(TRIM(appointment_status_name)) = LOWER(TRIM($4::text))))
         RETURNING *`,
        [appointment_status_id, updated_by, appointment_id, from_status],
      );
      return res.rows[0];
    } catch (error) {
      console.log(`Error on Model setAppointmentStatus function: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  // Only active services — a deactivated one (see Maintenance module) drops
  // out of the booking dropdown and can't be newly booked, without losing
  // its data or breaking FK references from past appointments.
  async selectAppointmentServices() {
    const client = await pool.connect();
    try {
      // Booking picks a category first, then one of its sub-services — so
      // each row carries its category (and its duration, for the slot list).
      const res = await client.query(
        `SELECT s.*, sc.category_name
         FROM tbl_appointment_services s
         JOIN tbl_service_categories sc ON sc.category_id = s.category_id
         WHERE s.is_active = true
         ORDER BY sc.sort_order, s.appointment_services ASC`,
      );
      return res.rows;
    } catch (error) {
      console.log(
        `Error on Model selectAppointmentServices function: ${error}`,
      );
      throw error;
    } finally {
      client.release();
    }
  }

  async selectStaff() {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT users_id, user_name, user_level
         FROM v_users
         WHERE user_level <> 'Client'
         ORDER BY user_name`,
      );
      return res.rows;
    } catch (error) {
      console.log(`Error on Model selectStaff function: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  // Powers "pet medical history" — a simple timeline of this pet's past
  // visits (service, staff, date, status, notes), shown both to staff (Pet
  // Records) and the client (their own pet's history). Not a real EMR
  // (vitals/diagnosis/prescriptions) — deliberately just the appointment
  // record itself, which is all that exists right now.
  async getAppointmentHistoryForPet(pets_id) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT * FROM v_appointments
         WHERE pets_id = $1 AND is_deleted IS NOT TRUE
         ORDER BY start_time DESC`,
        [pets_id],
      );
      return res.rows;
    } catch (error) {
      console.log(`Error on Model getAppointmentHistoryForPet function: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  // Books the appointment and charges for it in one transaction — if payment
  // isn't confirmed, the appointment must not exist either. The total is
  // resolved server-side: the sub-service's fixed service_price wins if set;
  // otherwise (priced per case, e.g. surgery) the caller-supplied amount.
  async addAppointmentWithPayment({
    client_id,
    pets_id,
    appointment_services_id,
    assigned_staff_id,
    appointment_date,
    start_time,
    appointment_status_id,
    notes,
    amount,
    payment_method,
    gcash_reference_number,
    cash_received,
    gcash_received,
    additional_fee_label,
    additional_fee_amount,
    created_by,
  }) {
    const client = await pool.connect();
    let queryError = null;
    try {
      await client.query("BEGIN");

      await assertPetBelongsToClient(client, pets_id, client_id);

      const { service, start_time_full, end_time_full } = await resolveSlot(client, {
        appointment_services_id,
        assigned_staff_id,
        pets_id,
        appointment_date,
        start_time,
      });

      // An add-on fee (de-matting, handling an aggressive pet, after-hours
      // service) is layered on top of the sub-service's own price.
      const total_amount =
        Number(service.service_price ?? amount) + Number(additional_fee_amount || 0);

      const { cash_amount, gcash_amount } = resolvePaymentSplit({
        payment_method,
        total_amount,
        cash_received,
        gcash_received,
      });

      const statusRes = await client.query(
        `SELECT payment_status_id FROM tbl_payment_status
         WHERE LOWER(TRIM(payment_status_name)) = 'completed'`,
      );
      const payment_status_id = statusRes.rows[0]?.payment_status_id;
      if (!payment_status_id) {
        throw new Error("'Completed' payment status not configured");
      }

      const apptRes = await client.query(
        `INSERT INTO tbl_appointments
          (client_id, pets_id, appointment_services_id, assigned_staff_id,
           appointment_date, start_time, end_time, appointment_status_id, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          client_id,
          pets_id,
          appointment_services_id,
          assigned_staff_id,
          appointment_date,
          start_time_full,
          end_time_full,
          appointment_status_id,
          notes,
          created_by,
        ],
      );
      const appointment = apptRes.rows[0];

      const paymentRes = await client.query(
        `INSERT INTO tbl_payments
          (total_amount, payment_status_id, appointment_id, payment_method, gcash_reference_number, cash_amount, gcash_amount, additional_fee_label, additional_fee_amount, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          total_amount,
          payment_status_id,
          appointment.appointment_id,
          payment_method,
          gcash_reference_number || null,
          cash_amount,
          gcash_amount,
          additional_fee_label || null,
          additional_fee_amount || null,
          created_by,
        ],
      );

      await client.query("COMMIT");
      return { appointment, payment: paymentRes.rows[0] };
    } catch (error) {
      queryError = error;
      await client.query("ROLLBACK");
      const conflict = mapSlotConflictError(error);
      if (conflict) throw conflict;
      console.log(`Error in addAppointmentWithPayment: ${error}`);
      throw error;
    } finally {
      client.release(queryError);
    }
  }

  // Finishes a Pending appointment that was created without payment (the
  // "book now, pay in the next step" flow): prices it the same way
  // addAppointmentWithPayment does, records the payment, and flips the
  // appointment to In Queue — all in one transaction.
  //
  // NOTE: this method doesn't touch start_time/end_time at all (it only
  // updates payment fields and the appointment's status), so it needs no
  // change for this fix — included here unmodified for completeness.
  async completeAppointmentPayment({
    appointment_id,
    amount,
    payment_method,
    gcash_reference_number,
    cash_received,
    gcash_received,
    additional_fee_label,
    additional_fee_amount,
    updated_by,
  }) {
    const client = await pool.connect();
    let queryError = null;
    try {
      await client.query("BEGIN");

      const apptRes = await client.query(
        `SELECT a.*, ast.appointment_status_name, s.appointment_services, s.service_price
         FROM tbl_appointments a
         JOIN tbl_appointment_status ast ON ast.appointment_status_id = a.appointment_status_id
         JOIN tbl_appointment_services s ON s.appointment_services_id = a.appointment_services_id
         WHERE a.appointment_id = $1 AND a.is_deleted IS NOT TRUE
         FOR UPDATE OF a`,
        [appointment_id],
      );
      if (!apptRes.rows.length) {
        const err = new Error("Appointment not found");
        err.statusCode = 404;
        throw err;
      }
      const appointment = apptRes.rows[0];

      if (appointment.appointment_status_name !== "Pending") {
        const err = new Error(
          `Only pending appointments can be paid. Appointment is already ${appointment.appointment_status_name}.`,
        );
        err.statusCode = 409;
        throw err;
      }

      const paymentRowRes = await client.query(
        `SELECT * FROM tbl_payments
         WHERE appointment_id = $1 AND is_deleted IS NOT TRUE
         FOR UPDATE`,
        [appointment_id],
      );
      if (!paymentRowRes.rows.length) {
        throw new Error("Payment record for this appointment not found");
      }
      const paymentRow = paymentRowRes.rows[0];

      // The sub-service's fixed price, or (priced per case) the amount entered.
      const total_amount =
        Number(appointment.service_price ?? amount) + Number(additional_fee_amount || 0);

      const { cash_amount, gcash_amount } = resolvePaymentSplit({
        payment_method,
        total_amount,
        cash_received,
        gcash_received,
      });

      const paymentStatusRes = await client.query(
        `SELECT payment_status_id FROM tbl_payment_status
         WHERE LOWER(TRIM(payment_status_name)) = 'completed'`,
      );
      const payment_status_id = paymentStatusRes.rows[0]?.payment_status_id;
      if (!payment_status_id) {
        throw new Error("'Completed' payment status not configured");
      }

      const confirmedStatusRes = await client.query(
        `SELECT appointment_status_id FROM tbl_appointment_status
         WHERE LOWER(TRIM(appointment_status_name)) = 'in queue'`,
      );
      const confirmed_status_id =
        confirmedStatusRes.rows[0]?.appointment_status_id;
      if (!confirmed_status_id) {
        throw new Error("'In Queue' appointment status not configured");
      }

      const paymentRes = await client.query(
        `UPDATE tbl_payments SET
           total_amount = $1,
           payment_status_id = $2,
           payment_method = $3,
           gcash_reference_number = $4,
           cash_amount = $5,
           gcash_amount = $6,
           additional_fee_label = $7,
           additional_fee_amount = $8,
           updated_by = $9,
           date_updated = NOW()
         WHERE payment_id = $10
         RETURNING *`,
        [
          total_amount,
          payment_status_id,
          payment_method,
          gcash_reference_number || null,
          cash_amount,
          gcash_amount,
          additional_fee_label || null,
          additional_fee_amount || null,
          updated_by,
          paymentRow.payment_id,
        ],
      );

      const updatedApptRes = await client.query(
        `UPDATE tbl_appointments
         SET appointment_status_id = $1, updated_by = $2, date_updated = NOW()
         WHERE appointment_id = $3
         RETURNING *`,
        [confirmed_status_id, updated_by, appointment_id],
      );

      await client.query("COMMIT");
      return {
        appointment: updatedApptRes.rows[0],
        payment: paymentRes.rows[0],
      };
    } catch (error) {
      queryError = error;
      await client.query("ROLLBACK");
      console.log(`Error in completeAppointmentPayment: ${error}`);
      throw error;
    } finally {
      client.release(queryError);
    }
  }
}
