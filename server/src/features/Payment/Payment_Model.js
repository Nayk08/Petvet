import pool from "../../config/db.js";
import { paginateQuery } from "../../../utils/paginateQuery.js";

const ALLOWED_FILTER_COLUMNS = ["payment_status_name"];

export default class PaymentModel {
  async getPayments({ page = 1, limit = 10, search = "", filters = {} } = {}) {
    const client = await pool.connect();
    try {
      const values = [];
      const conditions = [];

      for (const [key, value] of Object.entries(filters)) {
        if (key === "payment_type") {
          if (!value) continue;
          const types = value.split(",").filter(Boolean);
          const wantsInvoice = types.includes("INV");
          const wantsAppointment = types.includes("APT");
          // control_number is INV{year}{id} for a cart checkout (no
          // appointment_id) or APT{year}{id} for an appointment charge —
          // appointment_id is the real column backing that distinction.
          if (wantsInvoice && !wantsAppointment) {
            conditions.push("appointment_id IS NULL");
          } else if (wantsAppointment && !wantsInvoice) {
            conditions.push("appointment_id IS NOT NULL");
          }
          continue;
        }

        // date_created is a timestamp — match by calendar day, same column
        // the grid itself displays as "Payment Date". Each bound is
        // independent, so a range with only one end set still works.
        if (key === "payment_date_from") {
          if (!value) continue;
          values.push(value);
          conditions.push(`DATE(date_created) >= $${values.length}`);
          continue;
        }

        if (key === "payment_date_to") {
          if (!value) continue;
          values.push(value);
          conditions.push(`DATE(date_created) <= $${values.length}`);
          continue;
        }

        if (!ALLOWED_FILTER_COLUMNS.includes(key) || !value) continue;

        const valueList = value.split(",").filter(Boolean);
        if (valueList.length === 0) continue;

        values.push(valueList);
        conditions.push(`${key} = ANY($${values.length})`);
      }

      if (search && search.trim()) {
        values.push(`%${search.trim()}%`);
        conditions.push(`control_number ILIKE $${values.length}`);
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
        `SELECT * FROM v_payment_cart_items
         WHERE payment_id = $1
         ORDER BY cart_item_id`,
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
  // Cart lines are keyed by product_name, not a specific batch — a product
  // can have several batches (same name, different expiry dates) sharing
  // one shelf quantity. This resolves each line against the real batches
  // FEFO-style (soonest expiry consumed first, matching the Critical Stock/
  // expiry conventions elsewhere in the app), splitting across batches when
  // one alone doesn't cover the requested quantity — each portion becomes
  // its own tbl_cart_items row with THAT batch's real product_id/price,
  // never a client-supplied price.
  async checkout({ created_by, payment_status_id, cartItems }) {
    const client = await pool.connect();
    let queryError = null;
    try {
      await client.query("BEGIN");

      let totalAmount = 0;
      const insertRows = [];

      for (const item of cartItems) {
        const batchesRes = await client.query(
          `SELECT product_id, product_price, product_quantity
           FROM tbl_products
           WHERE product_name = $1 AND is_deleted = false AND product_quantity > 0
           ORDER BY product_expiry_date ASC NULLS LAST, product_id ASC
           FOR UPDATE`,
          [item.product_name],
        );

        let remaining = Number(item.quantity);
        for (const batch of batchesRes.rows) {
          if (remaining <= 0) break;
          const take = Math.min(remaining, batch.product_quantity);
          if (take <= 0) continue;

          insertRows.push({
            product_id: batch.product_id,
            quantity: take,
            item_price: batch.product_price,
          });
          totalAmount += Number(batch.product_price) * take;
          remaining -= take;
        }

        if (remaining > 0) {
          throw new Error(`Insufficient stock for ${item.product_name}`);
        }
      }

      const paymentRes = await client.query(
        `INSERT INTO tbl_payments (total_amount, payment_status_id, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
        [totalAmount, payment_status_id, created_by],
      );
      const payment = paymentRes.rows[0];

      // Stock isn't deducted here — only confirmed above — so an
      // abandoned/pending order never holds inventory hostage. It's
      // actually committed when the payment is completed (completeCheckout).
      for (const row of insertRows) {
        await client.query(
          `INSERT INTO tbl_cart_items (payment_id, product_id, quantity, item_price)
         VALUES ($1, $2, $3, $4)`,
          [payment.payment_id, row.product_id, row.quantity, row.item_price],
        );
      }

      await client.query("COMMIT");
      return payment;
    } catch (error) {
      queryError = error;
      await client.query("ROLLBACK");
      console.log("Error on Model checkout function");
      throw error;
    } finally {
      client.release(queryError);
    }
  }

  // Called only when a Pending payment is actually confirmed/paid.
  // Deducts stock for each cart item tied to this payment, then flips
  // the payment status — both in one transaction so a stock failure
  // (e.g. someone else bought the last unit while this order sat pending)
  // rolls back the status change too.
  async completeCheckout({
    payment_id,
    payment_status_id,
    updated_by,
    payment_method,
    gcash_reference_number,
    cash_amount,
    gcash_amount,
  }) {
    const client = await pool.connect();
    let queryError = null;
    try {
      await client.query("BEGIN");

      // Lock the payment row and re-check status inside the transaction —
      // the Service-layer check alone can't stop two concurrent requests
      // (double-click, or completePayment firing twice via verifyPayment's
      // "approve" path) from both passing before either commits, which
      // would otherwise deduct stock twice for the same order.
      const lockRes = await client.query(
        `SELECT p.payment_id, ps.payment_status_name
         FROM tbl_payments p
         JOIN tbl_payment_status ps ON ps.payment_status_id = p.payment_status_id
         WHERE p.payment_id = $1
         FOR UPDATE OF p`,
        [payment_id],
      );
      if (!lockRes.rows.length) {
        const err = new Error("Payment not found");
        err.statusCode = 404;
        throw err;
      }
      if (lockRes.rows[0].payment_status_name !== "Pending") {
        const err = new Error(
          `Only pending payments can be completed. Payment is already ${lockRes.rows[0].payment_status_name}.`,
        );
        err.statusCode = 409;
        throw err;
      }

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
        payment_method = $3,
        gcash_reference_number = $4,
        cash_amount = $5,
        gcash_amount = $6,
        date_updated = NOW()
       WHERE payment_id = $7 RETURNING *`,
        [
          payment_status_id,
          updated_by,
          payment_method,
          gcash_reference_number || null,
          cash_amount,
          gcash_amount,
          payment_id,
        ],
      );

      await client.query("COMMIT");
      return paymentRes.rows[0];
    } catch (error) {
      queryError = error;
      await client.query("ROLLBACK");
      console.log("Error on Model completeCheckout function");
      throw error;
    } finally {
      client.release(queryError);
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
           deleted_by = $3,
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

  async getRevenueSummary() {
    const client = await pool.connect();

    try {
      // Only Completed payments represent money actually collected — a
      // Pending booking or cart order must not count as revenue just
      // because a payment row exists for it.
      const cashRes = await client.query(
        `SELECT SUM(cash_amount) as total_cash, SUM(gcash_amount) as total_gcash
       FROM tbl_payments
       WHERE is_deleted = false
         AND payment_status_id = (
           SELECT payment_status_id FROM tbl_payment_status
           WHERE LOWER(TRIM(payment_status_name)) = 'completed'
         )`,
      );

      const invRes = await client.query(
        `SELECT SUM(total_amount) as total_invoice FROM v_payments
         WHERE control_number LIKE 'INV%' AND is_deleted = false
           AND payment_status_name = 'Completed'`,
      );

      const aptRes = await client.query(
        `SELECT SUM(total_amount) as total_appointment FROM v_payments
         WHERE control_number LIKE 'APT%' AND is_deleted = false
           AND payment_status_name = 'Completed'`,
      );

      return {
        total_cash: cashRes.rows[0].total_cash,
        total_gcash: cashRes.rows[0].total_gcash,
        total_invoice: invRes.rows[0].total_invoice,
        total_appointment: aptRes.rows[0].total_appointment,
      };
    } catch (error) {
      console.log("Error on Model getRevenueSummary function");
      throw error;
    } finally {
      client.release();
    }
  }

  // Backs the Payment page's revenue cards' click-through modal — the
  // all-time counterpart of Dashboard_Model.js:getTodayRevenueTransactions
  // (same Completed-only + type/method filtering, no date restriction) so
  // the listed transactions add up to the number the user clicked on.
  async getRevenueTransactions({
    type,
    method,
    search = "",
    page = 1,
    limit = 10,
  } = {}) {
    const client = await pool.connect();
    try {
      const values = [];
      const conditions = ["is_deleted = false", "payment_status_name = 'Completed'"];

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
      console.log("Error on Model getRevenueTransactions function");
      throw error;
    } finally {
      client.release();
    }
  }

  async getTodayRevenueSummary() {
    const client = await pool.connect();

    try {
      // Both booking flows (cart checkout and appointment booking) insert a
      // Pending payment row with total_amount already set BEFORE any money
      // actually changes hands — an unpaid booking or an abandoned cart
      // order must not count as revenue just because it happened today.
      // Only Completed payments represent money actually collected.
      //
      // "Today" here means the day the payment was actually completed, not
      // the day the payment row was first created — a Pending payment
      // booked yesterday and processed today must count toward TODAY's
      // revenue. completeCheckout/completeAppointmentPayment both stamp
      // date_updated = NOW() at the moment a payment flips to Completed;
      // a payment that was created already-Completed in one step (e.g.
      // addAppointmentWithPayment) never gets a date_updated, so fall back
      // to date_created for that case.
      const cashRes = await client.query(
        `SELECT SUM(cash_amount) as total_cash, SUM(gcash_amount) as total_gcash
       FROM tbl_payments
       WHERE is_deleted = false
         AND DATE(COALESCE(date_updated, date_created)) = CURRENT_DATE
         AND payment_status_id = (
           SELECT payment_status_id FROM tbl_payment_status
           WHERE LOWER(TRIM(payment_status_name)) = 'completed'
         )`,
      );

      const invRes = await client.query(
        `SELECT SUM(total_amount) as total_invoice FROM v_payments
         WHERE control_number LIKE 'INV%' AND is_deleted = false
           AND DATE(COALESCE(date_updated, date_created)) = CURRENT_DATE
           AND payment_status_name = 'Completed'`,
      );

      const aptRes = await client.query(
        `SELECT SUM(total_amount) as total_appointment FROM v_payments
         WHERE control_number LIKE 'APT%' AND is_deleted = false
           AND DATE(COALESCE(date_updated, date_created)) = CURRENT_DATE
           AND payment_status_name = 'Completed'`,
      );

      // Scheduled for today (appointment_date), not booked today
      // (date_created) — matches Dashboard_Model.js:getTodayAppointments.
      const todayqueueRes = await client.query(
        `SELECT COUNT(*) as total_queue FROM tbl_appointments WHERE is_deleted = false AND appointment_date = CURRENT_DATE`,
      );

      return {
        total_cash: cashRes.rows[0].total_cash,
        total_gcash: cashRes.rows[0].total_gcash,
        total_invoice: invRes.rows[0].total_invoice,
        total_appointment: aptRes.rows[0].total_appointment,
        total_queue: todayqueueRes.rows[0].total_queue,
      };
    } catch (error) {
      console.log("Error on Model getTodayRevenueSummary function");
      throw error;
    } finally {
      client.release();
    }
  }

  // Client-portal self-service GCash payment: stores the reference number
  // + uploaded screenshot and moves the payment to "Awaiting Verification"
  // — no stock/appointment side effects here, since nothing is actually
  // confirmed paid until staff approves it (see Payment_Service.js:verifyPayment,
  // which reuses completePayment for that side of things).
  async submitOnlinePaymentProof({
    payment_id,
    payment_status_id,
    gcash_reference_number,
    payment_proof_image,
  }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_payments SET
           payment_status_id = $1,
           payment_method = 'GCash',
           gcash_reference_number = $2,
           payment_proof_image = $3,
           date_updated = NOW()
         WHERE payment_id = $4
         RETURNING *`,
        [payment_status_id, gcash_reference_number, payment_proof_image, payment_id],
      );
      return res.rows[0];
    } catch (error) {
      console.log("Error on Model submitOnlinePaymentProof function");
      throw error;
    } finally {
      client.release();
    }
  }

  // Single-row clinic-wide settings table (id always 1) — currently just
  // the GCash QR code image, kept as its own small table rather than
  // repurposing an unrelated one since nothing like it existed before.
  async getGcashQrCode() {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT gcash_qr_code_url, date_updated FROM tbl_clinic_settings WHERE id = 1`,
      );
      return res.rows[0];
    } catch (error) {
      console.log("Error on Model getGcashQrCode function");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateGcashQrCode({ image_url, updated_by }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_clinic_settings
         SET gcash_qr_code_url = $1, updated_by = $2, date_updated = NOW()
         WHERE id = 1
         RETURNING *`,
        [image_url, updated_by],
      );
      return res.rows[0];
    } catch (error) {
      console.log("Error on Model updateGcashQrCode function");
      throw error;
    } finally {
      client.release();
    }
  }
}
