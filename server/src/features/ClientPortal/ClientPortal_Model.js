import pool from "../../config/db.js";
import { paginateQuery } from "../../../utils/paginateQuery.js";
import { staffRoleSql } from "../Appointment/Appointment_Model.js";
import { GROUPED_PRODUCTS_QUERY } from "../Inventory/Inventory_model.js";

export default class ClientPortalModel {
  // Landing page catalog: products that can actually be bought (unexpired
  // stock), one row per product, display fields only — no stock counts or
  // audit names.
  async getPublicProducts() {
    const res = await pool.query(
      `SELECT product_name, product_image, category_name, brand, purpose, dosage,
              unit, description, min_price, max_price, product_expiry_date
       FROM (${GROUPED_PRODUCTS_QUERY}) g
       WHERE g.product_name IS NOT NULL AND g.sellable_quantity > 0
       ORDER BY g.category_name NULLS LAST, g.product_name`,
    );
    return res.rows;
  }

  async findClientByEmail(email) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT * FROM tbl_clients
         WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) AND is_deleted IS NOT TRUE`,
        [email],
      );
      return res.rows[0];
    } catch (error) {
      console.log("Error on Model findClientByEmail function");
      throw error;
    } finally {
      client.release();
    }
  }

  async getClientById(client_id) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT client_id, name, email, mobile_no, is_registered
         FROM tbl_clients WHERE client_id = $1 AND is_deleted IS NOT TRUE`,
        [client_id],
      );
      return res.rows[0];
    } catch (error) {
      console.log("Error on Model getClientById function");
      throw error;
    } finally {
      client.release();
    }
  }

  // Idempotent — safe to call on every Google login, not just the first
  // one, so there's no separate "already linked" branch to maintain.
  async linkGoogleAccount({ client_id, google_sub }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_clients
         SET is_registered = true, google_sub = $2
         WHERE client_id = $1
         RETURNING *`,
        [client_id, google_sub],
      );
      return res.rows[0];
    } catch (error) {
      console.log("Error on Model linkGoogleAccount function");
      throw error;
    } finally {
      client.release();
    }
  }

  // Same v_appointments source as the staff-facing Appointment_Model, but
  // hardcoded to one client_id — deliberately a separate, dedicated method
  // rather than exposing client_id as a generic filter on the staff
  // endpoint, so ownership scoping can never be bypassed by a stray query
  // param.
  async getMyAppointments({
    client_id,
    page = 1,
    limit = 10,
    search = "",
    filters = {},
  } = {}) {
    const client = await pool.connect();
    try {
      const values = [client_id];
      const conditions = ["client_id = $1"];

      if (filters.appointment_status_name) {
        const statuses = filters.appointment_status_name
          .split(",")
          .filter(Boolean);
        if (statuses.length) {
          values.push(statuses);
          conditions.push(`appointment_status_name = ANY($${values.length})`);
        }
      }

      if (search && search.trim()) {
        values.push(`%${search.trim()}%`);
        conditions.push(
          `(pets_name ILIKE $${values.length} OR service_name ILIKE $${values.length})`,
        );
      }

      const whereClause = `WHERE ${conditions.join(" AND ")}`;

      return await paginateQuery(client, {
        // Plus the visit's bill, so My Appointments can open its receipt.
        baseQuery: `SELECT v_appointments.*, bill.payment_id, bill.payment_status_name
          FROM v_appointments
          LEFT JOIN LATERAL (
            SELECT p.payment_id, ps.payment_status_name
            FROM tbl_payments p
            JOIN tbl_payment_status ps ON ps.payment_status_id = p.payment_status_id
            WHERE p.appointment_id = v_appointments.appointment_id AND p.is_deleted IS NOT TRUE
            ORDER BY p.payment_id DESC LIMIT 1
          ) bill ON true
          ${whereClause} ORDER BY appointment_date DESC, start_time DESC`,
        countQuery: `SELECT COUNT(*) AS total FROM v_appointments ${whereClause}`,
        values,
        page,
        limit,
      });
    } catch (error) {
      console.log("Error on Model getMyAppointments function");
      throw error;
    } finally {
      client.release();
    }
  }

  // v_payments has no client_id column at all — a cart checkout
  // (appointment_id IS NULL) has no client association whatsoever, so it
  // can never appear here. Client is only reachable by joining through
  // tbl_appointments; this is a real, existing limitation, not a bug in
  // this query — see README/plan notes on payment client-linkage.
  async getMyPayments({ client_id, page = 1, limit = 10 } = {}) {
    const client = await pool.connect();
    try {
      const values = [client_id];
      const whereClause = `WHERE a.client_id = $1 AND p.is_deleted = false`;

      return await paginateQuery(client, {
        // The appointment's details travel with each bill, so the GCash pay
        // window can show what is being paid for.
        baseQuery: `SELECT p.*, va.pets_name, va.service_name, va.staff_name,
                           va.appointment_date, va.start_time, va.end_time,
                           va.category_name, va.appointment_status_name,
                           ${staffRoleSql("va.assigned_staff_id")} AS staff_role
                    FROM v_payments p
                    JOIN tbl_appointments a ON a.appointment_id = p.appointment_id
                    JOIN v_appointments va ON va.appointment_id = p.appointment_id
                    ${whereClause}
                    ORDER BY p.date_updated DESC NULLS LAST, p.date_created DESC`,
        countQuery: `SELECT COUNT(*) AS total FROM v_payments p
                     JOIN tbl_appointments a ON a.appointment_id = p.appointment_id
                     ${whereClause}`,
        values,
        page,
        limit,
      });
    } catch (error) {
      console.log("Error on Model getMyPayments function");
      throw error;
    } finally {
      client.release();
    }
  }

  // A client adding their own pet has no business picking a clinical
  // status (Active/Inactive is a staff concept, e.g. "deceased" or
  // "no longer a patient") — every self-added pet just defaults to
  // whichever status ISN'T "inactive". Matched by excluding "inactive"
  // rather than matching "active" directly, since the seed data has a typo
  // on that row ("Acticve") that a prefix match on "activ%" misses.
  async getDefaultPetStatusId() {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT pet_status_id FROM tbl_pet_status
         WHERE pet_status NOT ILIKE 'inactiv%'
         ORDER BY pet_status_id ASC LIMIT 1`,
      );
      return res.rows[0]?.pet_status_id ?? null;
    } catch (error) {
      console.log("Error on Model getDefaultPetStatusId function");
      throw error;
    } finally {
      client.release();
    }
  }

  // Powers the booking form's "disable already-booked slots" check. Only
  // returns the minimal fields needed for that (no client_name/pets_name)
  // since these rows may belong to OTHER clients entirely — a client
  // booking their own appointment should never see who else has a slot
  // with that staff member, only that the slot is taken.
  async getStaffBookedSlots({ assigned_staff_id, appointment_date }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT appointment_id, start_time, end_time, appointment_status_name
         FROM v_appointments
         WHERE assigned_staff_id = $1
           AND appointment_date = $2
           AND is_deleted IS NOT TRUE`,
        [assigned_staff_id, appointment_date],
      );
      return res.rows;
    } catch (error) {
      console.log("Error on Model getStaffBookedSlots function");
      throw error;
    } finally {
      client.release();
    }
  }

  // Powers the client calendar's "clinic schedule" view — how busy the
  // WHOLE clinic is on today/future days, across every client, not just
  // this one. Deliberately excludes client_name/pets_name/staff_name: a
  // client should be able to see that a slot is taken and roughly what
  // kind of visit it is, never who it belongs to. Also hard-floors the
  // range at CURRENT_DATE server-side (not just trusting the caller's
  // start_date) so a client can never pull the clinic's historical
  // schedule for other people through this endpoint.
  async getClinicSchedule({ start_date, end_date }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT appointment_date, start_time, end_time, service_name
         FROM v_appointments
         WHERE is_deleted IS NOT TRUE
           AND appointment_status_name != 'Cancelled'
           AND appointment_date >= CURRENT_DATE
           AND appointment_date >= $1
           AND appointment_date <= $2
         ORDER BY appointment_date, start_time`,
        [start_date, end_date],
      );
      return res.rows;
    } catch (error) {
      console.log("Error on Model getClinicSchedule function");
      throw error;
    } finally {
      client.release();
    }
  }
}
