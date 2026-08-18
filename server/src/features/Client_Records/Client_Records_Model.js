import pool from "../../config/db.js";
import { paginateQuery } from "../../../utils/paginateQuery.js";

const ALLOWED_SEARCH_COLUMNS = ["name", "client_id", "contact_number", "email"];
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
        `SELECT * FROM tbl_clients WHERE client_id = $1 `,
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

  async addClient({ client_name, client_email, contact_no }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `INSERT INTO tbl_clients (name, email, mobile_no) VALUES ($1, $2, $3) RETURNING *`,
        [client_name, client_email, contact_no],
      );
      return res.rows[0];
    } catch (error) {
      console.log(`Error in addClient: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async editClient({ client_id, client_name, client_email, contact_no }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_clients  
        SET name = $1, email = $2, mobile_no = $3  WHERE client_id = $4 RETURNING *`,
        [client_name, client_email, contact_no, client_id],
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

  async deleteClient({ client_id }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_clients  
        SET is_deleted = true WHERE client_id = $1 RETURNING *`,
        [client_id],
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

  async getClienPetById(client_id) {
    const client = await pool.connect();

    try {
      const res = await client.query(
        `SELECT * FROM v_client_pets WHERE client_id = $1 `,
        [client_id],
      );

      if (!res.rows.length) {
        throw new Error("Client Pet record not found.");
      }

      return res.rows[0];
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
               microchip_number, pet_status_id, species_id, gender_id, client_id)
             VALUES
              ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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

  async getPetById(pets_id) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT * FROM tbl_pets WHERE pets_id = $1`,
        [pets_id],
      );
      if (!res.rows.length) {
        throw new Error("Pet record not found.");
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
  }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_pets
        SET pets_name = $1, breed = $2, is_spayed_neutered = $3,
            date_of_birth = $4, weight_kg = $5, pet_status_id = $6,
            species_id = $7, gender_id = $8
        WHERE pets_id = $9
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

  async deletePet({ pets_id }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_pets  
        SET is_deleted = true WHERE pets_id = $1 RETURNING *`,
        [pets_id],
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
