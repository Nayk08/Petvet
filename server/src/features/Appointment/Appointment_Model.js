import pool from "../../config/db.js";
import { paginateQuery } from "../../../utils/paginateQuery.js";

const ALLOWED_SEARCH_COLUMNS = ["name", "client_id", "contact_number", "email"];
const ALLOWED_FILTER_COLUMNS = ["name"];

export class Appointment_Model {

  async getAppointments({ page = 1, limit = 10, search = "", filters = {} } = {}) {
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
}
