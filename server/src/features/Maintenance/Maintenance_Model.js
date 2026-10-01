import pool from "../../config/db.js";

export default class MaintenanceModel {
  // Every service, active or not — the Appointment booking flow only ever
  // sees active ones (Appointment_Model.js:selectAppointmentServices), but
  // the admin managing the catalog needs to see everything to reactivate a
  // retired one.
  async getServices() {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT * FROM tbl_appointment_services ORDER BY appointment_services ASC`,
      );
      return res.rows;
    } catch (error) {
      console.log("Error on Model getServices function");
      throw error;
    } finally {
      client.release();
    }
  }

  async addService({
    appointment_services,
    category,
    description,
    service_price,
    min_price,
    duration_minutes,
    allowed_roles,
    created_by,
  }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `INSERT INTO tbl_appointment_services
          (appointment_services, category, description, service_price, min_price,
           duration_minutes, allowed_roles, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [
          appointment_services,
          category || null,
          description || null,
          service_price === "" ? null : service_price,
          min_price === "" ? null : min_price,
          duration_minutes ?? null,
          allowed_roles ?? [],
          created_by,
        ],
      );
      return res.rows[0];
    } catch (error) {
      if (error.code === "23505") {
        const err = new Error("A service with this name already exists.");
        err.status = 409;
        throw err;
      }
      console.log("Error on Model addService function");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateService({
    service_id,
    appointment_services,
    category,
    description,
    service_price,
    min_price,
    duration_minutes,
    allowed_roles,
    updated_by,
  }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_appointment_services SET
           appointment_services = COALESCE($1, appointment_services),
           category = $2,
           description = $3,
           service_price = $4,
           min_price = $5,
           duration_minutes = $6,
           allowed_roles = COALESCE($7, allowed_roles),
           updated_by = $8,
           date_updated = NOW()
         WHERE appointment_services_id = $9
         RETURNING *`,
        [
          appointment_services,
          category || null,
          description || null,
          service_price === "" ? null : service_price,
          min_price === "" ? null : min_price,
          duration_minutes ?? null,
          allowed_roles,
          updated_by,
          service_id,
        ],
      );
      if (!res.rows.length) {
        const err = new Error("Service not found");
        err.status = 404;
        throw err;
      }
      return res.rows[0];
    } catch (error) {
      if (error.code === "23505") {
        const err = new Error("A service with this name already exists.");
        err.status = 409;
        throw err;
      }
      console.log("Error on Model updateService function");
      throw error;
    } finally {
      client.release();
    }
  }

  // Soft toggle, not a real delete — tbl_appointments references this row
  // (ON DELETE NO ACTION), so a hard delete would fail once the service has
  // ever actually been booked. Deactivating removes it from the booking
  // dropdown without touching that history.
  async setServiceActive({ service_id, is_active, updated_by }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_appointment_services
         SET is_active = $1, updated_by = $2, date_updated = NOW()
         WHERE appointment_services_id = $3
         RETURNING *`,
        [is_active, updated_by, service_id],
      );
      if (!res.rows.length) {
        const err = new Error("Service not found");
        err.status = 404;
        throw err;
      }
      return res.rows[0];
    } catch (error) {
      console.log("Error on Model setServiceActive function");
      throw error;
    } finally {
      client.release();
    }
  }

  // ── Grooming price tiers ───────────────────────────

  async getGroomingTiers() {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT * FROM tbl_grooming_price_tiers ORDER BY max_weight_kg ASC NULLS LAST`,
      );
      return res.rows;
    } catch (error) {
      console.log("Error on Model getGroomingTiers function");
      throw error;
    } finally {
      client.release();
    }
  }

  async addGroomingTier({
    tier_name,
    max_weight_kg,
    price,
    description,
    duration_minutes,
  }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `INSERT INTO tbl_grooming_price_tiers
          (tier_name, max_weight_kg, price, description, duration_minutes)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING *`,
        [
          tier_name,
          max_weight_kg === "" ? null : max_weight_kg,
          price,
          description || null,
          duration_minutes ?? null,
        ],
      );
      return res.rows[0];
    } catch (error) {
      if (error.code === "23505") {
        const err = new Error("A tier with this name already exists.");
        err.status = 409;
        throw err;
      }
      console.log("Error on Model addGroomingTier function");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateGroomingTier({
    tier_id,
    tier_name,
    max_weight_kg,
    price,
    description,
    duration_minutes,
  }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_grooming_price_tiers SET
           tier_name = COALESCE($1, tier_name),
           max_weight_kg = $2,
           price = COALESCE($3, price),
           description = $4,
           duration_minutes = $5
         WHERE tier_id = $6
         RETURNING *`,
        [
          tier_name,
          max_weight_kg === "" ? null : max_weight_kg,
          price,
          description || null,
          duration_minutes ?? null,
          tier_id,
        ],
      );
      if (!res.rows.length) {
        const err = new Error("Grooming tier not found");
        err.status = 404;
        throw err;
      }
      return res.rows[0];
    } catch (error) {
      if (error.code === "23505") {
        const err = new Error("A tier with this name already exists.");
        err.status = 409;
        throw err;
      }
      console.log("Error on Model updateGroomingTier function");
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteGroomingTier(tier_id) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `DELETE FROM tbl_grooming_price_tiers WHERE tier_id = $1 RETURNING tier_id`,
        [tier_id],
      );
      if (!res.rows.length) {
        const err = new Error("Grooming tier not found");
        err.status = 404;
        throw err;
      }
      return res.rows[0];
    } catch (error) {
      console.log("Error on Model deleteGroomingTier function");
      throw error;
    } finally {
      client.release();
    }
  }
}
