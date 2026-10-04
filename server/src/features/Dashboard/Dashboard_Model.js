import pool from "../../config/db.js";
import { paginateQuery } from "../../../utils/paginateQuery.js";
import AppointmentModel from "../Appointment/Appointment_Model.js";
import { REAL_PAYMENT_ACTIVITY_SQL } from "../Payment/Payment_Model.js";

const appointmentModel = new AppointmentModel();

const APPOINTMENT_ALLOWED_FILTER_COLUMNS = [
  "appointment_status_name",
  "service_name",
  "category_name",
  "assigned_staff_id",
  "appointment_date",
];
// ANY($n) needs an explicit cast for non-text columns — pg can't safely
// infer int[]/date[] from an array of plain JS strings otherwise.
const APPOINTMENT_FILTER_COLUMN_CASTS = {
  assigned_staff_id: "int[]",
  appointment_date: "date[]",
};
const APPOINTMENT_ALLOWED_SEARCH_COLUMNS = [
  "appointment_id",
  "client_name",
  "pets_name",
];

const PAYMENT_ALLOWED_FILTER_COLUMNS = ["payment_status_name"];

export default class DashboardModel {
  // Powers the Dashboard's "Today's Live Queue" widget — scoped to
  // appointments *scheduled* for today (appointment_date), not when they
  // were booked (date_created).
  async getTodayAppointments({
    page = 1,
    limit = 10,
    search = "",
    filters = {},
  } = {}) {
    await appointmentModel.autoCompletePastAppointments();
    const client = await pool.connect();

    try {
      const values = [];
      const conditions = ["appointment_date = CURRENT_DATE"];

      for (const [key, value] of Object.entries(filters)) {
        if (!APPOINTMENT_ALLOWED_FILTER_COLUMNS.includes(key) || !value) continue;

        const valueList = value.split(",").filter(Boolean);
        if (valueList.length === 0) continue;

        values.push(valueList);
        const cast = APPOINTMENT_FILTER_COLUMN_CASTS[key]
          ? `::${APPOINTMENT_FILTER_COLUMN_CASTS[key]}`
          : "";
        conditions.push(`${key} = ANY($${values.length}${cast})`);
      }

      if (search && search.trim()) {
        values.push(`%${search.trim()}%`);
        const idx = values.length;
        const searchClause = APPOINTMENT_ALLOWED_SEARCH_COLUMNS.map((col) =>
          col === "appointment_id"
            ? `${col}::text ILIKE $${idx}`
            : `${col} ILIKE $${idx}`,
        ).join(" OR ");
        conditions.push(`(${searchClause})`);
      }

      const whereClause = `WHERE ${conditions.join(" AND ")}`;

      return await paginateQuery(client, {
        baseQuery: `SELECT * FROM v_appointments ${whereClause} ORDER BY start_time ASC`,
        countQuery: `SELECT COUNT(*) AS total FROM v_appointments ${whereClause}`,
        values,
        page,
        limit,
      });
    } catch (error) {
      console.log("Error on Model getTodayAppointments function");
      throw error;
    } finally {
      client.release();
    }
  }

  // Powers the Dashboard's "Today's Sales" widget — same filtering/search
  // shape as Payment_Model.js:getPayments, scoped to payments created today.
  async getTodayPayments({
    page = 1,
    limit = 10,
    search = "",
    filters = {},
  } = {}) {
    const client = await pool.connect();
    try {
      const values = [];
      const conditions = ["date_created::date = CURRENT_DATE", REAL_PAYMENT_ACTIVITY_SQL];

      for (const [key, value] of Object.entries(filters)) {
        if (key === "payment_type") {
          if (!value) continue;
          const types = value.split(",").filter(Boolean);
          const wantsInvoice = types.includes("INV");
          const wantsAppointment = types.includes("APT");
          // control_number is INV{year}{id} for a cart checkout (no
          // appointment_id) or APT{year}{id} for an appointment charge.
          if (wantsInvoice && !wantsAppointment) {
            conditions.push("appointment_id IS NULL");
          } else if (wantsAppointment && !wantsInvoice) {
            conditions.push("appointment_id IS NOT NULL");
          }
          continue;
        }

        if (!PAYMENT_ALLOWED_FILTER_COLUMNS.includes(key) || !value) continue;

        const valueList = value.split(",").filter(Boolean);
        if (valueList.length === 0) continue;

        values.push(valueList);
        conditions.push(`${key} = ANY($${values.length})`);
      }

      if (search && search.trim()) {
        values.push(`%${search.trim()}%`);
        conditions.push(`control_number ILIKE $${values.length}`);
      }

      const whereClause = `WHERE ${conditions.join(" AND ")}`;

      return await paginateQuery(client, {
        baseQuery: `SELECT * FROM v_payments ${whereClause} ORDER BY payment_id DESC`,
        countQuery: `SELECT COUNT(*) AS total FROM v_payments ${whereClause}`,
        values,
        page,
        limit,
      });
    } catch (error) {
      console.log("Error on Model getTodayPayments function");
      throw error;
    } finally {
      client.release();
    }
  }

  // Backs the Dashboard revenue cards' click-through modal — must match
  // Payment_Model.js:getTodayRevenueSummary's own filtering EXACTLY
  // (Completed only, dated by when it was actually paid, not booked) so
  // the listed transactions really do add up to the number the user
  // clicked on. `type` narrows to the same INV/APT split the hero card's
  // breakdown shows ("INV" -> Sales, "APT" -> Services, omitted ->
  // everything). `method` narrows to the Cash/Cashless row cards instead —
  // filtered by which amount column is actually nonzero (not
  // payment_method = 'Cash'/'GCash') so a Split payment that contributed
  // to BOTH buckets correctly shows up under both, matching how the
  // summary totals themselves are computed (SUM(cash_amount)/SUM(gcash_amount)).
  async getTodayRevenueTransactions({
    type,
    method,
    search = "",
    page = 1,
    limit = 10,
  } = {}) {
    const client = await pool.connect();
    try {
      const values = [];
      const conditions = [
        "is_deleted = false",
        "payment_status_name = 'Completed'",
        "DATE(COALESCE(date_updated, date_created)) = CURRENT_DATE",
      ];

      if (type === "INV" || type === "APT") {
        values.push(`${type}%`);
        conditions.push(`control_number LIKE $${values.length}`);
      }

      if (method === "cash") {
        conditions.push("cash_amount > 0");
      } else if (method === "gcash") {
        conditions.push("gcash_amount > 0");
      }

      if (search && search.trim()) {
        values.push(`%${search.trim()}%`);
        conditions.push(`control_number ILIKE $${values.length}`);
      }

      const whereClause = `WHERE ${conditions.join(" AND ")}`;

      return await paginateQuery(client, {
        baseQuery: `SELECT * FROM v_payments ${whereClause} ORDER BY date_updated DESC NULLS LAST, date_created DESC`,
        countQuery: `SELECT COUNT(*) AS total FROM v_payments ${whereClause}`,
        values,
        page,
        limit,
      });
    } catch (error) {
      console.log("Error on Model getTodayRevenueTransactions function");
      throw error;
    } finally {
      client.release();
    }
  }
}
