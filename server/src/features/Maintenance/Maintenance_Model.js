import pool from "../../config/db.js";

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// A duplicate name (UNIQUE appointment_services) or a category id that
// isn't one of the three fixed rows (FK) — both are user input mistakes.
function mapServiceWriteError(error) {
  if (error.code === "23505") return httpError(409, "A sub-service with this name already exists.");
  if (error.code === "23503") return httpError(400, "Please select a valid category.");
  return null;
}

export default class MaintenanceModel {
  // The three fixed categories (seeded by migrations/001). Read-only: there
  // is deliberately no endpoint to add, rename or delete them.
  async getServiceCategories() {
    const res = await pool.query(
      `SELECT category_id, category_name FROM tbl_service_categories ORDER BY sort_order`,
    );
    return res.rows;
  }

  // Every sub-service, deleted (is_active = false) or not — the booking flow
  // only ever sees active ones (Appointment_Model.selectAppointmentServices),
  // but Maintenance lists deleted ones too so they can be restored.
  async getServices() {
    const res = await pool.query(
      `SELECT s.*, sc.category_name
       FROM tbl_appointment_services s
       JOIN tbl_service_categories sc ON sc.category_id = s.category_id
       ORDER BY sc.sort_order, s.appointment_services ASC`,
    );
    return res.rows;
  }

  async addService({
    appointment_services,
    category_id,
    description,
    service_price,
    duration_minutes,
    allowed_roles,
    created_by,
  }) {
    try {
      const res = await pool.query(
        `INSERT INTO tbl_appointment_services
          (appointment_services, category_id, description, service_price,
           duration_minutes, allowed_roles, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [
          appointment_services,
          category_id,
          description || null,
          service_price === "" ? null : service_price,
          duration_minutes,
          allowed_roles ?? [],
          created_by,
        ],
      );
      return res.rows[0];
    } catch (error) {
      throw mapServiceWriteError(error) ?? error;
    }
  }

  // Changing duration_minutes only affects NEW bookings — existing
  // appointments store their own start_time/end_time.
  async updateService({
    service_id,
    appointment_services,
    category_id,
    description,
    service_price,
    duration_minutes,
    allowed_roles,
    updated_by,
  }) {
    try {
      const res = await pool.query(
        `UPDATE tbl_appointment_services SET
           appointment_services = COALESCE($1, appointment_services),
           category_id = COALESCE($2, category_id),
           description = $3,
           service_price = $4,
           duration_minutes = COALESCE($5, duration_minutes),
           allowed_roles = COALESCE($6, allowed_roles),
           updated_by = $7,
           date_updated = NOW()
         WHERE appointment_services_id = $8
         RETURNING *`,
        [
          appointment_services,
          category_id,
          description || null,
          service_price === "" ? null : service_price,
          duration_minutes,
          allowed_roles,
          updated_by,
          service_id,
        ],
      );
      if (!res.rows.length) throw httpError(404, "Sub-service not found");
      return res.rows[0];
    } catch (error) {
      throw mapServiceWriteError(error) ?? error;
    }
  }

  // Soft delete / restore. Not a real DELETE — tbl_appointments references
  // this row, so its booking history must stay intact.
  async setServiceActive({ service_id, is_active, updated_by }) {
    const res = await pool.query(
      `UPDATE tbl_appointment_services
       SET is_active = $1, updated_by = $2, date_updated = NOW()
       WHERE appointment_services_id = $3
       RETURNING *`,
      [is_active, updated_by, service_id],
    );
    if (!res.rows.length) throw httpError(404, "Sub-service not found");
    return res.rows[0];
  }
}
