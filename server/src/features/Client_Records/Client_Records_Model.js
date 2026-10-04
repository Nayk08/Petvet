import pool from "../../config/db.js";
import { paginateQuery } from "../../../utils/paginateQuery.js";

const ALLOWED_SEARCH_COLUMNS = ["name", "client_id", "email"];
const ALLOWED_FILTER_COLUMNS = ["name"];

function generateMicrochipNumber() {
  // 15-digit numeric string, ISO 11784/11785 style
  let chip = "";
  for (let i = 0; i < 15; i++) {
    chip += Math.floor(Math.random() * 10);
  }
  return chip;
}
export default class ClientRecordsModel {
  async getClients({ page = 1, limit = 10, search = "", filters = {} } = {}) {
    const client = await pool.connect();

    try {
      const values = [];
      const conditions = ["is_deleted IS NOT TRUE"];

      for (const [key, value] of Object.entries(filters)) {
        if (!ALLOWED_FILTER_COLUMNS.includes(key) || !value) continue;

        const valueList = value.split(",").filter(Boolean);
        if (valueList.length === 0) continue;

        values.push(valueList);
        conditions.push(`${key} = ANY($${values.length})`);
      }

      if (search && search.trim()) {
        values.push(`%${search.trim()}%`);
        const idx = values.length;
        const searchClause = ALLOWED_SEARCH_COLUMNS.map((col) =>
          col === "client_id"
            ? `${col}::text ILIKE $${idx}`
            : `${col} ILIKE $${idx}`,
        ).join(" OR ");
        conditions.push(`(${searchClause})`);
      }

      const whereClause = `WHERE ${conditions.join(" AND ")}`;

      return await paginateQuery(client, {
        baseQuery: `SELECT * FROM tbl_clients ${whereClause} ORDER BY client_id DESC`,
        countQuery: `SELECT COUNT(*) AS total FROM tbl_clients ${whereClause}`,
        values,
        page,
        limit,
      });
    } catch (error) {
      console.log("Error on Model getClients function");
      throw error;
    } finally {
      client.release();
    }
  }

  async getClientById(client_id) {
    const client = await pool.connect();

    try {
      const res = await client.query(
        `SELECT * FROM tbl_clients WHERE client_id = $1 AND is_deleted IS NOT TRUE`,
        [client_id],
      );

      if (!res.rows.length) {
        throw new Error("Client record not found.");
      }

      return res.rows[0];
    } catch (error) {
      console.log(`Error on Model getClientById function: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async addClient({
    client_name,
    client_email,
    contact_no,
    emergency_contact_name,
    emergency_contact_number,
    address,
    created_by,
  }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `INSERT INTO tbl_clients
          (name, email, mobile_no, emergency_contact_name, emergency_contact_number, address, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          client_name,
          client_email,
          contact_no,
          emergency_contact_name || null,
          emergency_contact_number || null,
          address || null,
          created_by,
        ],
      );
      return res.rows[0];
    } catch (error) {
      console.log(`Error in addClient: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async editClient({
    client_id,
    client_name,
    client_email,
    contact_no,
    emergency_contact_name,
    emergency_contact_number,
    address,
    updated_by,
  }) {
    const client = await pool.connect();
    try {
      // editClientBodySchema allows a partial body (any one field) — an
      // omitted field arrives here as undefined/null, so COALESCE keeps the
      // existing column value instead of overwriting it with NULL.
      const res = await client.query(
        `UPDATE tbl_clients
        SET name = COALESCE($1, name),
            email = COALESCE($2, email),
            mobile_no = COALESCE($3, mobile_no),
            emergency_contact_name = COALESCE($4, emergency_contact_name),
            emergency_contact_number = COALESCE($5, emergency_contact_number),
            address = COALESCE($6, address),
            updated_by = $7,
            date_updated = NOW()
        WHERE client_id = $8 AND is_deleted IS NOT TRUE
        RETURNING *`,
        [
          client_name,
          client_email,
          contact_no,
          emergency_contact_name || null,
          emergency_contact_number || null,
          address || null,
          updated_by,
          client_id,
        ],
      );

      if (res.rows.length === 0) {
        throw new Error(`Client with id ${client_id} not found`);
      }
      return res.rows[0];
    } catch (error) {
      console.log(`Error in editClient: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteClient({ client_id, deleted_by }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_clients
        SET is_deleted = true, deleted_by = $2, date_updated = NOW()
        WHERE client_id = $1 RETURNING *`,
        [client_id, deleted_by],
      );

      if (res.rows.length === 0) {
        throw new Error(`Client with id ${client_id} not found`);
      }
      return res.rows[0];
    } catch (error) {
      console.log(`Error in deleteClient: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async getArchivedClients({ page = 1, limit = 10, search = "" } = {}) {
    const client = await pool.connect();
    try {
      const values = [];
      const conditions = ["is_deleted = true"];

      if (search && search.trim()) {
        values.push(`%${search.trim()}%`);
        const idx = values.length;
        conditions.push(
          `(name ILIKE $${idx} OR email ILIKE $${idx} OR client_id::text ILIKE $${idx})`,
        );
      }

      const whereClause = `WHERE ${conditions.join(" AND ")}`;

      return await paginateQuery(client, {
        baseQuery: `SELECT * FROM tbl_clients ${whereClause} ORDER BY date_updated DESC NULLS LAST, client_id DESC`,
        countQuery: `SELECT COUNT(*) AS total FROM tbl_clients ${whereClause}`,
        values,
        page,
        limit,
      });
    } catch (error) {
      console.log("Error on Model getArchivedClients function");
      throw error;
    } finally {
      client.release();
    }
  }

  async restoreClient({ client_id, updated_by }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_clients
        SET is_deleted = false, deleted_by = NULL, updated_by = $2, date_updated = NOW()
        WHERE client_id = $1 AND is_deleted = true
        RETURNING *`,
        [client_id, updated_by],
      );

      if (res.rows.length === 0) {
        throw new Error(`Archived client with id ${client_id} not found`);
      }
      return res.rows[0];
    } catch (error) {
      console.log(`Error in restoreClient: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  // Hard delete — only ever called on an already-archived row (the WHERE
  // clause is the actual guarantee, not just the route it's wired behind).
  // tbl_pets and tbl_appointments both reference client_id with
  // ON DELETE NO ACTION, so Postgres blocks this rather than silently
  // orphaning pet/appointment history — caught below as a friendly message.
  async permanentlyDeleteClient({ client_id }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `DELETE FROM tbl_clients WHERE client_id = $1 AND is_deleted = true RETURNING client_id`,
        [client_id],
      );
      return res.rows[0];
    } catch (error) {
      if (error.code === "23503") {
        const err = new Error(
          "This client can't be permanently deleted — they still have pets or appointment history. They will remain archived instead.",
        );
        err.status = 409;
        throw err;
      }
      console.log(`Error in permanentlyDeleteClient: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async getClienPetById({ client_id, page = 1, limit = 10, search = "" } = {}) {
    const client = await pool.connect();

    try {
      const res = await client.query(
        `SELECT * FROM v_client_pets WHERE client_id = $1`,
        [client_id],
      );

      if (!res.rows.length) {
        throw new Error("Client Pet record not found.");
      }

      const { client_name, pets } = res.rows[0];

      let filtered = pets;
      if (search && search.trim()) {
        const term = search.trim().toLowerCase();
        filtered = pets.filter((p) =>
          [p.pet_name, p.breed, p.microchip_number]
            .filter(Boolean)
            .some((val) => String(val).toLowerCase().includes(term)),
        );
      }

      const total = filtered.length;
      const isAll = limit === "all" || limit >= 999999;
      const effectiveLimit = isAll ? total || 1 : Number(limit);
      const totalPages = isAll
        ? 1
        : Math.max(1, Math.ceil(total / effectiveLimit));
      const currentPage = isAll ? 1 : Number(page);
      const start = isAll ? 0 : (currentPage - 1) * effectiveLimit;
      const rows = isAll
        ? filtered
        : filtered.slice(start, start + effectiveLimit);

      return {
        client_name,
        rows,
        pagination: {
          page: currentPage,
          limit: isAll ? total : effectiveLimit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      console.log(`Error on Model getClienPetById function: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async addPet({
    client_id,
    pets_name,
    breed,
    is_spayed_neutered,
    date_of_birth,
    weight_kg,
    pet_status_id,
    species_id,
    gender_id,
    pet_image,
    allergies,
    medical_conditions,
    temperament,
    created_by,
  }) {
    const client = await pool.connect();
    const MAX_ATTEMPTS = 5;

    try {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const microchip_number = generateMicrochipNumber();

        try {
          const res = await client.query(
            `INSERT INTO tbl_pets
              (pets_name, breed, is_spayed_neutered, date_of_birth, weight_kg,
               microchip_number, pet_status_id, species_id, gender_id, client_id, pet_image,
               allergies, medical_conditions, temperament, created_by)
             VALUES
              ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
             RETURNING *`,
            [
              pets_name,
              breed,
              is_spayed_neutered,
              date_of_birth,
              weight_kg,
              microchip_number,
              pet_status_id,
              species_id,
              gender_id,
              client_id,
              pet_image,
              allergies || null,
              medical_conditions || null,
              temperament || null,
              created_by,
            ],
          );
          return res.rows[0];
        } catch (error) {
          const isMicrochipConflict =
            error.code === "23505" &&
            error.constraint === "tbl_pets_microchip_number_key";

          if (isMicrochipConflict && attempt < MAX_ATTEMPTS) {
            continue;
          }
          throw error;
        }
      }
    } catch (error) {
      console.log(`Error in addPet: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async countOpenAppointmentsForPet(pets_id) {
    const res = await pool.query(
      `SELECT COUNT(*)::int AS n FROM tbl_appointments a
       JOIN tbl_appointment_status s ON s.appointment_status_id = a.appointment_status_id
       WHERE a.pets_id = $1 AND a.is_deleted IS NOT TRUE
         AND LOWER(TRIM(s.appointment_status_name)) IN ('pending', 'in queue')`,
      [pets_id],
    );
    return res.rows[0].n;
  }

  async getOpenItemsForClient(client_id) {
    const res = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM tbl_appointments a
          JOIN tbl_appointment_status s ON s.appointment_status_id = a.appointment_status_id
          WHERE a.client_id = $1 AND a.is_deleted IS NOT TRUE
            AND LOWER(TRIM(s.appointment_status_name)) IN ('pending', 'in queue'))::int AS appointments,
         (SELECT COUNT(*) FROM tbl_payments p
          JOIN tbl_appointments a ON a.appointment_id = p.appointment_id
          JOIN tbl_payment_status ps ON ps.payment_status_id = p.payment_status_id
          WHERE a.client_id = $1 AND p.is_deleted IS NOT TRUE
            AND LOWER(TRIM(ps.payment_status_name)) IN ('pending', 'awaiting verification', 'refund needed'))::int AS payments`,
      [client_id],
    );
    return res.rows[0];
  }

  async getPetById(pets_id) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        // A deleted client's pets are archived with them — they must not
        // stay editable/transferable/viewable on their own.
        `SELECT p.* FROM tbl_pets p
         JOIN tbl_clients c ON c.client_id = p.client_id AND c.is_deleted IS NOT TRUE
         WHERE p.pets_id = $1 AND p.is_deleted IS NOT TRUE`,
        [pets_id],
      );
      if (!res.rows.length) {
        const err = new Error("Pet record not found.");
        err.status = 404;
        throw err;
      }
      return res.rows[0];
    } catch (error) {
      console.log(`Error on Model getPetById function: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async editPet({
    pets_id,
    pets_name,
    breed,
    is_spayed_neutered,
    date_of_birth,
    weight_kg,
    pet_status_id,
    species_id,
    gender_id,
    pet_image,
    allergies,
    medical_conditions,
    temperament,
    updated_by,
  }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_pets
        SET pets_name = $1, breed = $2, is_spayed_neutered = $3,
            date_of_birth = $4, weight_kg = $5, pet_status_id = $6,
            species_id = $7, gender_id = $8, pet_image = $9,
            allergies = $10, medical_conditions = $11, temperament = $12,
            updated_by = $13, date_updated = NOW()
        WHERE pets_id = $14
        RETURNING *`,
        [
          pets_name,
          breed,
          is_spayed_neutered,
          date_of_birth,
          weight_kg,
          pet_status_id,
          species_id,
          gender_id,
          pet_image,
          allergies || null,
          medical_conditions || null,
          temperament || null,
          updated_by,
          pets_id,
        ],
      );
      if (res.rows.length === 0) {
        throw new Error(`Pet with id ${pets_id} not found`);
      }
      return res.rows[0];
    } catch (error) {
      console.log(`Error in editPet: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async transferPetOwner({ pets_id, new_client_id, updated_by }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const res = await client.query(
        `UPDATE tbl_pets
        SET client_id = $1, updated_by = $2, date_updated = NOW()
        WHERE pets_id = $3 AND is_deleted IS NOT TRUE
        RETURNING *`,
        [new_client_id, updated_by, pets_id],
      );

      if (res.rows.length === 0) {
        const err = new Error("Pet record not found.");
        err.status = 404;
        throw err;
      }

      // The pet's upcoming visits (and so their bills) go with it — they used
      // to stay on the old owner, who kept seeing/paying for them while the
      // new owner couldn't. Past visits stay as history under who brought it.
      await client.query(
        `UPDATE tbl_appointments a
         SET client_id = $1, updated_by = $2, date_updated = NOW()
         FROM tbl_appointment_status s
         WHERE s.appointment_status_id = a.appointment_status_id
           AND a.pets_id = $3 AND a.is_deleted IS NOT TRUE
           AND LOWER(TRIM(s.appointment_status_name)) IN ('pending', 'in queue')`,
        [new_client_id, updated_by, pets_id],
      );

      await client.query("COMMIT");
      return res.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      console.log(`Error in transferPetOwner: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async deletePet({ pets_id, deleted_by }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_pets
        SET is_deleted = true, deleted_by = $2 WHERE pets_id = $1 RETURNING *`,
        [pets_id, deleted_by],
      );

      if (res.rows.length === 0) {
        throw new Error(`Pet with id ${pets_id} not found`);
      }
      return res.rows[0];
    } catch (error) {
      console.log(`Error in deletePet: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async selectSpecies() {
    const client = await pool.connect();
    try {
      const res = await client.query(`SELECT * FROM tbl_species`);
      return res.rows;
    } catch (error) {
      console.log(`Error on Model selectSpecies function: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async selectGender() {
    const client = await pool.connect();
    try {
      const res = await client.query(`SELECT * FROM tbl_gender`);
      return res.rows;
    } catch (error) {
      console.log(`Error on Model selectGender function: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async selectPetStatus() {
    const client = await pool.connect();
    try {
      const res = await client.query(`SELECT * FROM tbl_pet_status`);
      return res.rows;
    } catch (error) {
      console.log(`Error on Model selectPetStatus function: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }
}
