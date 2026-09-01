import pool from "../../config/db.js";
import { paginateQuery } from "../../../utils/paginateQuery.js";

const ALLOWED_SEARCH_COLUMNS = ["appointment_id", "client_name", "pets_name"];
const ALLOWED_FILTER_COLUMNS = [
  "appointment_status_name",
  "service_name",
  "assigned_staff_id",
  "appointment_date",
];
// ANY($n) needs an explicit cast for non-text columns — pg can't safely
// infer int[]/date[] from an array of plain JS strings otherwise.
const FILTER_COLUMN_CASTS = {
  assigned_staff_id: "int[]",
  appointment_date: "date[]",
};

// Maps the two partial-unique-index violations on tbl_appointments to a
// friendly, user-facing message. Returns the error to throw, or null if
// this isn't one of those two constraints.
function mapSlotConflictError(error) {
  if (error.code !== "23505") return null;

  if (error.constraint === "uq_appointments_service_slot") {
    const err = new Error(
      "That service is already booked for this date and time slot.",
    );
    err.statusCode = 409;
    return err;
  }

  if (error.constraint === "uq_appointments_staff_slot") {
    const err = new Error(
      "This staff member is already booked for this date and time slot.",
    );
    err.statusCode = 409;
    return err;
  }

  return null;
}

export default class AppointmentModel {
  async getAppointments({
    page = 1,
    limit = 10,
    search = "",
    filters = {},
  } = {}) {
    const client = await pool.connect();

    try {
      const values = [];
      const conditions = ["is_deleted IS NOT TRUE"];

      for (const [key, value] of Object.entries(filters)) {
        if (!ALLOWED_FILTER_COLUMNS.includes(key) || !value) continue;

        const valueList = value.split(",").filter(Boolean);
        if (valueList.length === 0) continue;

        values.push(valueList);
        const cast = FILTER_COLUMN_CASTS[key] ? `::${FILTER_COLUMN_CASTS[key]}` : "";
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

      const whereClause = `WHERE ${conditions.join(" AND ")}`;

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

  async addAppointment({
    client_id,
    pets_id,
    appointment_services_id,
    assigned_staff_id,
    appointment_date,
    start_time,
    end_time,
    appointment_status_id,
    notes,
    created_by,
  }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
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
          start_time,
          end_time,
          appointment_status_id,
          notes,
          created_by,
        ],
      );
      return res.rows[0];
    } catch (error) {
      const conflict = mapSlotConflictError(error);
      if (conflict) throw conflict;
      console.log(`Error in addAppointment: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async editAppointment({
    appointment_id,
    pets_id,
    appointment_services_id,
    assigned_staff_id,
    appointment_date,
    start_time,
    end_time,
    appointment_status_id,
    notes,
    updated_by,
  }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_appointments
       SET pets_id = $1,
           appointment_services_id = $2,
           assigned_staff_id = $3,
           appointment_date = $4,
           start_time = $5,
           end_time = $6,
           appointment_status_id = $7,
           notes = $8,
           updated_by = $9,
           date_updated = NOW()
       WHERE appointment_id = $10
       RETURNING *`,
        [
          pets_id,
          appointment_services_id,
          assigned_staff_id,
          appointment_date,
          start_time,
          end_time,
          appointment_status_id,
          notes,
          updated_by,
          appointment_id,
        ],
      );

      if (res.rows.length === 0) {
        throw new Error(`Appointment with id ${appointment_id} not found`);
      }
      return res.rows[0];
    } catch (error) {
      const conflict = mapSlotConflictError(error);
      if (conflict) throw conflict;
      console.log(`Error in editAppointment: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteAppointment({ appointment_id, appointment_status_id, deleted_by }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_appointments
        SET is_deleted = true,
            deleted_by = $2,
            date_deleted = NOW(),
            appointment_status_id = $3
        WHERE appointment_id = $1
        RETURNING *`,
        [appointment_id, deleted_by, appointment_status_id],
      );

      if (res.rows.length === 0) {
        throw new Error(`Appointment with id ${appointment_id} not found`);
      }
      return res.rows[0];
    } catch (error) {
      console.log(`Error in deleteAppointment: ${error}`);
      throw error;
    } finally {
      client.release();
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

  async selectAppointmentServices() {
    const client = await pool.connect();
    try {
      const res = await client.query(`SELECT * FROM tbl_appointment_services`);
      return res.rows;
    } catch (error) {
      console.log(`Error on Model selectAppointmentServices function: ${error}`);
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
}