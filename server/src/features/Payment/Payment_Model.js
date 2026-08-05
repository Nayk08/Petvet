import pool from "../../config/db.js";
import { paginateQuery } from "../../../utils/paginateQuery.js";

const ALLOWED_FILTER_COLUMNS = ["payment_status_name"];

export default class PaymentModel {
  async getPayments({ page = 1, limit = 10, filters = {} } = {}) {
    const client = await pool.connect();
    try {
      const values = [];
      const conditions = [];

      for (const [key, value] of Object.entries(filters)) {
        if (!ALLOWED_FILTER_COLUMNS.includes(key) || !value) continue;

        const valueList = value.split(",").filter(Boolean);
        if (valueList.length === 0) continue;

        values.push(valueList);
        conditions.push(`${key} = ANY($${values.length})`);
      }

      const whereClause = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

      return await paginateQuery(client, {
        baseQuery: `SELECT * FROM v_payments ${whereClause} ORDER BY payment_id DESC`,
        countQuery: `SELECT COUNT(*) AS total FROM v_payments ${whereClause}`,
        values,
        page,
        limit,
      });
    } catch (error) {
      console.log("Error on Model getPayments function");
      throw error;
    } finally {
      client.release();
    }
  }

  async getPaymentById(payment_id) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        "SELECT * FROM v_payments WHERE payment_id = $1",
        [payment_id],
      );
      return res.rows[0];
    } catch (error) {
      console.log("Error on Model getPaymentById function");
      throw error;
    } finally {
      client.release();
    }
  }

  async getCartItemsByPaymentId(payment_id) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT ci.cart_item_id,
                ci.product_id,
                p.product_name,
                ci.quantity,
                ci.item_price,
                ci.subtotal,
                ci.date_created
         FROM tbl_cart_items ci
         LEFT JOIN tbl_products p ON p.product_id = ci.product_id
         WHERE ci.payment_id = $1
         ORDER BY ci.cart_item_id`,
        [payment_id],
      );
      return res.rows;
    } catch (error) {
      console.log("Error on Model getCartItemsByPaymentId function");
      throw error;
    } finally {
      client.release();
    }
  }

  // Dynamic lookup for payment_status_id by name, so the service layer never
  // has to hardcode numeric IDs that can drift out of sync with seed data
  // (e.g. across environments or after a re-seed).
  async getPaymentStatusId(statusName) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT payment_status_id FROM tbl_payment_status 
         WHERE LOWER(TRIM(payment_status_name)) = LOWER(TRIM($1))`,
        [statusName],
      );
      return res.rows[0]?.payment_status_id;
    } catch (error) {
      console.log("Error on Model getPaymentStatusId function");
      throw error;
    } finally {
      client.release();
    }
  }

  // Checkout needs its own connection + transaction since it writes to
  // tbl_payments, tbl_cart_items, and tbl_products (stock) together and
  // must roll back atomically if any item fails (e.g. insufficient stock).
  async checkout({ created_by, payment_status_id, cartItems }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const totalAmount = cartItems.reduce(
        (sum, item) => sum + Number(item.item_price) * Number(item.quantity),
        0,
      );

      const paymentRes = await client.query(
        `INSERT INTO tbl_payments (total_amount, payment_status_id, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
        [totalAmount, payment_status_id, created_by],
      );
      const payment = paymentRes.rows[0];

      for (const item of cartItems) {
        // Just confirm enough stock exists right now — do NOT deduct yet.
        // Stock is only committed when the payment is actually completed,
        // so an abandoned/pending order never holds inventory hostage.
        const stockRes = await client.query(
          `SELECT product_quantity FROM tbl_products WHERE product_id = $1`,
          [item.product_id],
        );

        if (
          stockRes.rows.length === 0 ||
          stockRes.rows[0].product_quantity < item.quantity
        ) {
          throw new Error(`Insufficient stock for product ${item.product_id}`);
        }

        await client.query(
          `INSERT INTO tbl_cart_items (payment_id, product_id, quantity, item_price)
         VALUES ($1, $2, $3, $4)`,
          [payment.payment_id, item.product_id, item.quantity, item.item_price],
        );
      }

      await client.query("COMMIT");
      return payment;
    } catch (error) {
      await client.query("ROLLBACK");
      console.log("Error on Model checkout function");
      throw error;
    } finally {
      client.release();
    }
  }

  // Called only when a Pending payment is actually confirmed/paid.
  // Deducts stock for each cart item tied to this payment, then flips
  // the payment status — both in one transaction so a stock failure
  // (e.g. someone else bought the last unit while this order sat pending)
  // rolls back the status change too.
  async completeCheckout({ payment_id, payment_status_id, updated_by }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const itemsRes = await client.query(
        `SELECT product_id, quantity FROM tbl_cart_items WHERE payment_id = $1`,
        [payment_id],
      );

      for (const item of itemsRes.rows) {
        const stockRes = await client.query(
          `UPDATE tbl_products
         SET product_quantity = product_quantity - $1,
             date_updated = NOW()
         WHERE product_id = $2 AND product_quantity >= $1
         RETURNING *`,
          [item.quantity, item.product_id],
        );

        if (stockRes.rows.length === 0) {
          throw new Error(`Insufficient stock for product ${item.product_id}`);
        }
      }

      const paymentRes = await client.query(
        `UPDATE tbl_payments SET
        payment_status_id = $1,
        updated_by = $2,
        date_updated = NOW()
       WHERE payment_id = $3 RETURNING *`,
        [payment_status_id, updated_by, payment_id],
      );

      await client.query("COMMIT");
      return paymentRes.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      console.log("Error on Model completeCheckout function");
      throw error;
    } finally {
      client.release();
    }
  }

  async updatePaymentStatus({ payment_id, payment_status_id, updated_by }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_payments SET
        payment_status_id = $1,
        updated_by = $2,
        date_updated = NOW()
        WHERE payment_id = $3 RETURNING *`,
        [payment_status_id, updated_by, payment_id],
      );
      return res.rows[0];
    } catch (error) {
      console.log("Error on Model updatePaymentStatus function");
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelPayment({ payment_id, payment_status_id, updated_by }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_payments SET
           is_deleted = true,
           payment_status_id = $2,
           updated_by = $3,
           date_updated = NOW()
         WHERE payment_id = $1
         RETURNING *`,
        [payment_id, payment_status_id, updated_by],
      );

      return res.rows[0];
    } catch (error) {
      console.log("Error on Model cancelPayment function");
      throw error;
    } finally {
      client.release();
    }
  }
}
