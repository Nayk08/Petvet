import pool from "../../config/db.js";

export default class AnalyticsModel {
  // Daily revenue split Sales (cart checkout, INV) vs Services (appointment
  // charge, APT) — same "count every non-deleted payment regardless of
  // status" definition Payment_Model.js:getRevenueSummary already uses, so
  // this chart's totals stay consistent with the Dashboard's revenue cards.
  async getRevenueTrend({ startDate, endDate }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT
           date_created::date AS day,
           COALESCE(SUM(total_amount) FILTER (WHERE appointment_id IS NULL), 0) AS sales,
           COALESCE(SUM(total_amount) FILTER (WHERE appointment_id IS NOT NULL), 0) AS services
         FROM tbl_payments
         WHERE is_deleted = false
           AND date_created::date BETWEEN $1 AND $2
         GROUP BY date_created::date
         ORDER BY day ASC`,
        [startDate, endDate],
      );
      return res.rows;
    } catch (error) {
      console.log(`Error on Model getRevenueTrend function: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  // Scoped to the appointment's actual scheduled date (appointment_date),
  // not when it was booked — this is a reporting view of clinic activity
  // within the range, not a "today" widget.
  async getAppointmentsBreakdown({ startDate, endDate }) {
    const client = await pool.connect();
    try {
      const byService = await client.query(
        `SELECT service_name, COUNT(*) AS count
         FROM v_appointments
         WHERE is_deleted IS NOT TRUE
           AND appointment_date BETWEEN $1 AND $2
         GROUP BY service_name
         ORDER BY service_name ASC`,
        [startDate, endDate],
      );

      const byStatus = await client.query(
        `SELECT appointment_status_name, COUNT(*) AS count
         FROM v_appointments
         WHERE is_deleted IS NOT TRUE
           AND appointment_date BETWEEN $1 AND $2
         GROUP BY appointment_status_name
         ORDER BY appointment_status_name ASC`,
        [startDate, endDate],
      );

      return { byService: byService.rows, byStatus: byStatus.rows };
    } catch (error) {
      console.log(`Error on Model getAppointmentsBreakdown function: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async getTopProducts({ startDate, endDate, limit = 10 }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT
           p.product_name,
           SUM(ci.quantity) AS total_quantity,
           SUM(ci.subtotal) AS total_revenue
         FROM tbl_cart_items ci
         JOIN tbl_products p ON p.product_id = ci.product_id
         JOIN tbl_payments pay ON pay.payment_id = ci.payment_id
         WHERE pay.is_deleted = false
           AND pay.date_created::date BETWEEN $1 AND $2
         GROUP BY p.product_name
         ORDER BY total_revenue DESC
         LIMIT $3`,
        [startDate, endDate, limit],
      );
      return res.rows;
    } catch (error) {
      console.log(`Error on Model getTopProducts function: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  // Product "movement" = units actually sold — Completed payments only, so a
  // Cancelled or still-Pending cart checkout doesn't count toward velocity.
  async getProductMovers({ startDate, endDate }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT
           p.product_name,
           SUM(ci.quantity) AS total_quantity
         FROM tbl_cart_items ci
         JOIN tbl_products p ON p.product_id = ci.product_id
         JOIN v_payments pay ON pay.payment_id = ci.payment_id
         WHERE pay.is_deleted = false
           AND pay.payment_status_name = 'Completed'
           AND pay.date_created::date BETWEEN $1 AND $2
         GROUP BY p.product_name
         ORDER BY total_quantity DESC`,
        [startDate, endDate],
      );
      return res.rows;
    } catch (error) {
      console.log(`Error on Model getProductMovers function: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  async getClientGrowth({ startDate, endDate }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT date_created::date AS day, COUNT(*) AS new_clients
         FROM tbl_clients
         WHERE is_deleted IS NOT TRUE
           AND date_created::date BETWEEN $1 AND $2
         GROUP BY date_created::date
         ORDER BY day ASC`,
        [startDate, endDate],
      );
      return res.rows;
    } catch (error) {
      console.log(`Error on Model getClientGrowth function: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }

  // Current-state snapshot (not date-ranged) — reuses v_products' existing
  // stock-tier logic (Inventory.jsx already shows the same tiers) rather
  // than inventing a separate "critical" threshold. A product also counts
  // as critical if it expires within 5 months, even with plenty of stock
  // left, since it'll need to be pulled/discounted soon regardless.
  async getCriticalStock() {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT product_id, product_name, product_quantity, status_name,
                product_expiry_date, is_expired,
                (product_expiry_date IS NOT NULL
                 AND NOT is_expired
                 AND product_expiry_date <= CURRENT_DATE + INTERVAL '5 months'
                ) AS expiring_soon
         FROM v_products
         WHERE status_name IN ('Low Stock', 'Out of Stock')
            OR (product_expiry_date IS NOT NULL
                AND product_expiry_date <= CURRENT_DATE + INTERVAL '5 months')
         ORDER BY
           is_expired DESC,
           expiring_soon DESC,
           product_expiry_date ASC NULLS LAST,
           product_quantity ASC,
           product_name ASC`,
      );
      return res.rows;
    } catch (error) {
      console.log(`Error on Model getCriticalStock function: ${error}`);
      throw error;
    } finally {
      client.release();
    }
  }
}
