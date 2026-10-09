import pool from "../../config/db.js";
import { paginateQuery } from "../../../utils/paginateQuery.js";

const ALLOWED_FILTER_COLUMNS = ["payment_status_name"];

// Staff payment lists show real payment activity only. Hidden:
//   - an online booking the client hasn't paid yet (Pending, made in the
//     client portal, no GCash proof sent) — staff collect it at the clinic
//     via Appointments -> Confirm Payment;
//   - a bill cancelled without ever being paid (cancelled booking,
//     abandoned checkout) — no money ever moved.
// Paid-then-refunded bills (Cancelled with a payment_method) stay visible.
export const REAL_PAYMENT_ACTIVITY_SQL = `NOT (payment_status_name = 'Cancelled' AND payment_method IS NULL)
  AND NOT (payment_status_name = 'Pending' AND created_by = 'Client Portal')`;

// How many payments are in each status (every status, even at 0) within
// `scopeSql` — powers the status chips above the payment lists.
export async function paymentStatusCounts(scopeSql) {
  const { rows } = await pool.query(
    `SELECT s.payment_status_name, COUNT(p.payment_status_name)::int AS count
     FROM tbl_payment_status s
     LEFT JOIN (SELECT payment_status_name FROM v_payments WHERE ${scopeSql}) p
       USING (payment_status_name)
     GROUP BY s.payment_status_name, s.payment_status_id
     ORDER BY s.payment_status_id`,
  );
  return rows;
}

// Paid (fully, or a verified deposit) → its Pending appointment goes In Queue.
// Runs inside the caller's transaction.
async function confirmPendingAppointment(client, appointment_id, updated_by) {
  if (!appointment_id) return;
  await client.query(
    `UPDATE tbl_appointments
     SET appointment_status_id = (SELECT appointment_status_id FROM tbl_appointment_status
                                  WHERE LOWER(TRIM(appointment_status_name)) = 'in queue'),
         updated_by = $2, date_updated = NOW()
     WHERE appointment_id = $1 AND is_deleted IS NOT TRUE
       AND appointment_status_id = (SELECT appointment_status_id FROM tbl_appointment_status
                                    WHERE LOWER(TRIM(appointment_status_name)) = 'pending')`,
    [appointment_id, updated_by],
  );
}

// Revenue card totals from the v_revenue ledger (migration 010), filtered by
// `whereSql` (e.g. one day). Same field names the cards always used.
const revenueTotalsSql = (whereSql) => `
  SELECT SUM(cash) AS total_cash,
         SUM(gcash) AS total_gcash,
         SUM(amount) FILTER (WHERE control_number LIKE 'INV%') AS total_invoice,
         SUM(amount) FILTER (WHERE control_number LIKE 'APT%') AS total_appointment
  FROM v_revenue WHERE ${whereSql}`;

// Revenue transaction lists (cards' click-through): one row per money-in
// event — the bill's fields plus what was received in that event and when.
// `extraWhere` scopes it (e.g. today). Shared with Dashboard_Model.
export function revenueTransactionsQuery({ type, method, search, extraWhere }) {
  const values = [];
  const conditions = [extraWhere ?? "TRUE"];
  if (type === "INV" || type === "APT") {
    values.push(`${type}%`);
    conditions.push(`r.control_number LIKE $${values.length}`);
  }
  if (method === "cash") conditions.push("r.cash > 0");
  else if (method === "gcash") conditions.push("r.gcash > 0");
  if (search && search.trim()) {
    values.push(`%${search.trim()}%`);
    conditions.push(`r.control_number ILIKE $${values.length}`);
  }
  const where = `WHERE ${conditions.join(" AND ")}`;
  return {
    baseQuery: `SELECT p.*, r.kind, r.received_at, r.amount AS received_amount,
                       r.cash AS received_cash, r.gcash AS received_gcash,
                       p.payment_id || '-' || r.kind AS event_id
                FROM v_revenue r JOIN v_payments p ON p.payment_id = r.payment_id
                ${where} ORDER BY r.received_at DESC, r.payment_id DESC`,
    countQuery: `SELECT COUNT(*) AS total FROM v_revenue r ${where}`,
    values,
  };
}

export default class PaymentModel {
  async getPayments({ page = 1, limit = 10, search = "", filters = {} } = {}) {
    const client = await pool.connect();
    try {
      const values = [];
      const conditions = [REAL_PAYMENT_ACTIVITY_SQL];

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

      const result = await paginateQuery(client, {
        baseQuery: `SELECT * FROM v_payments ${whereClause} ORDER BY payment_id DESC`,
        countQuery: `SELECT COUNT(*) AS total FROM v_payments ${whereClause}`,
        values,
        page,
        limit,
      });
      return { ...result, status_counts: await paymentStatusCounts(REAL_PAYMENT_ACTIVITY_SQL) };
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

  // Used right after booking (addAppointment creates its own Pending
  // payment row as a side effect, but doesn't return it — see
  // Appointment_Model.js:addAppointment) so a caller that needs the
  // payment_id for that new appointment doesn't have to re-derive it.
  async getPaymentByAppointmentId(appointment_id) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT * FROM v_payments
         WHERE appointment_id = $1 AND is_deleted IS NOT TRUE
         ORDER BY payment_id DESC LIMIT 1`,
        [appointment_id],
      );
      return res.rows[0];
    } catch (error) {
      console.log("Error on Model getPaymentByAppointmentId function");
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
             -- FEFO must never pick a batch that has already expired (same
             -- rule as v_products.is_expired)
             AND (product_expiry_date IS NULL OR product_expiry_date > CURRENT_TIMESTAMP)
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
          throw new Error(`Insufficient stock for ${item.product_name} (expired batches can't be sold)`);
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
    expected_status = "Pending",
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
           AND p.is_deleted = false -- an archived bill must never be charged
         FOR UPDATE OF p`,
        [payment_id],
      );
      if (!lockRes.rows.length) {
        const err = new Error("Payment not found");
        err.statusCode = 404;
        throw err;
      }
      if (lockRes.rows[0].payment_status_name !== expected_status) {
        const err = new Error(
          `Only ${expected_status.toLowerCase()} payments can be completed here. Payment is already ${lockRes.rows[0].payment_status_name}.`,
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
           -- the batch may have expired or been archived since checkout
           AND is_deleted = false
           AND (product_expiry_date IS NULL OR product_expiry_date > CURRENT_TIMESTAMP)
         RETURNING *`,
          [item.quantity, item.product_id],
        );

        if (stockRes.rows.length === 0) {
          throw new Error(
            `Insufficient stock for product ${item.product_id} — it sold out, expired or was archived since checkout. Cancel this order and check out again.`,
          );
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

      // A paid appointment charge confirms its (still Pending) appointment —
      // in this same transaction, so a paid appointment can't end up stuck
      // on Pending if a second, separate write failed.
      await confirmPendingAppointment(client, paymentRes.rows[0].appointment_id, updated_by);

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

  // Rejected GCash proof -> back to Pending with the rejected reference,
  // method and screenshot cleared, so the next attempt (or a cash payment at
  // the desk) starts clean instead of inheriting the bad GCash details.
  async rejectProof({ payment_id, payment_status_id, updated_by }) {
    const res = await pool.query(
      `UPDATE tbl_payments SET
         payment_status_id = $1, updated_by = $2, date_updated = NOW(),
         gcash_reference_number = NULL, payment_method = NULL, payment_proof_image = NULL,
         amount_sent = NULL
       WHERE payment_id = $3
         AND payment_status_id = (SELECT payment_status_id FROM tbl_payment_status
                                  WHERE LOWER(TRIM(payment_status_name)) = 'awaiting verification')
       RETURNING *`,
      [payment_status_id, updated_by, payment_id],
    );
    return res.rows[0];
  }

  // Staff approved a partial GCash proof: the deposit (amount_sent) is now
  // money received, the bill is "Partially Paid" and the appointment is
  // confirmed — one transaction. Not Completed, so not in revenue yet.
  async approveDeposit({ payment_id, updated_by }) {
    const client = await pool.connect();
    let queryError = null;
    try {
      await client.query("BEGIN");
      const res = await client.query(
        `UPDATE tbl_payments SET
           payment_status_id = (SELECT payment_status_id FROM tbl_payment_status
                                WHERE payment_status_name = 'Partially Paid'),
           payment_method = 'GCash',
           gcash_amount = amount_sent,
           cash_amount = 0,
           deposit_paid_at = NOW(), -- counts as revenue today (v_revenue)
           updated_by = $2, date_updated = NOW()
         WHERE payment_id = $1 AND is_deleted = false AND amount_sent > 0
           AND payment_status_id = (SELECT payment_status_id FROM tbl_payment_status
                                    WHERE payment_status_name = 'Awaiting Verification')
         RETURNING *`,
        [payment_id, updated_by],
      );
      if (res.rows.length) {
        await confirmPendingAppointment(client, res.rows[0].appointment_id, updated_by);
      }
      await client.query("COMMIT");
      return res.rows[0];
    } catch (error) {
      queryError = error;
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release(queryError);
    }
  }

  // No-show on a visit with a verified online deposit: the clinic keeps the
  // deposit. The bill closes as Completed for the deposit amount (so revenue
  // is the money actually kept); original_total records what it was.
  async forfeitDeposit(appointment_id, updated_by) {
    const res = await pool.query(
      `UPDATE tbl_payments SET
         original_total = total_amount,
         total_amount = gcash_amount,
         cash_amount = 0,
         payment_method = 'GCash',
         payment_status_id = (SELECT payment_status_id FROM tbl_payment_status
                              WHERE payment_status_name = 'Completed'),
         updated_by = $2, date_updated = NOW()
       WHERE appointment_id = $1 AND is_deleted = false
         AND payment_status_id = (SELECT payment_status_id FROM tbl_payment_status
                                  WHERE payment_status_name = 'Partially Paid')
       RETURNING *`,
      [appointment_id, updated_by],
    );
    return res.rows[0];
  }

  // The balance of a "Partially Paid" bill, collected at the clinic. The
  // status guard stops a double submit from recording it twice.
  async completeBalance({
    payment_id,
    updated_by,
    payment_method,
    cash_amount,
    gcash_amount,
    balance_gcash_reference,
  }) {
    const res = await pool.query(
      `UPDATE tbl_payments SET
         payment_status_id = (SELECT payment_status_id FROM tbl_payment_status
                              WHERE payment_status_name = 'Completed'),
         payment_method = $2, cash_amount = $3, gcash_amount = $4,
         balance_gcash_reference = $5,
         updated_by = $6, date_updated = NOW()
       WHERE payment_id = $1 AND is_deleted = false
         AND payment_status_id = (SELECT payment_status_id FROM tbl_payment_status
                                  WHERE payment_status_name = 'Partially Paid')
       RETURNING *`,
      [payment_id, payment_method, cash_amount, gcash_amount, balance_gcash_reference, updated_by],
    );
    return res.rows[0];
  }

  // Closes out a "Refund Needed" payment once staff have actually returned
  // the money. Ends as Cancelled, so it stays out of revenue.
  async markRefunded({ payment_id, updated_by }) {
    const res = await pool.query(
      `UPDATE tbl_payments
       SET payment_status_id = (SELECT payment_status_id FROM tbl_payment_status
                                WHERE LOWER(TRIM(payment_status_name)) = 'cancelled'),
           updated_by = $2, date_updated = NOW()
       WHERE payment_id = $1 AND is_deleted = false
         AND payment_status_id = (SELECT payment_status_id FROM tbl_payment_status
                                  WHERE LOWER(TRIM(payment_status_name)) = 'refund needed')
       RETURNING *`,
      [payment_id, updated_by],
    );
    return res.rows[0];
  }

  // One transaction: the payment and (if any) its appointment are cancelled
  // together. "Still Pending" is checked in the UPDATE itself, so a payment
  // completed a moment ago can't be cancelled out from under the cashier.
  async cancelPayment({ payment_id, payment_status_id, updated_by }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const res = await client.query(
        `UPDATE tbl_payments SET
           is_deleted = true,
           payment_status_id = $2,
           updated_by = $3,
           deleted_by = $3,
           date_deleted = NOW(),
           date_updated = NOW()
         WHERE payment_id = $1 AND is_deleted = false
           AND payment_status_id = (SELECT payment_status_id FROM tbl_payment_status
                                    WHERE LOWER(TRIM(payment_status_name)) = 'pending')
         RETURNING *`,
        [payment_id, payment_status_id, updated_by],
      );
      if (!res.rows.length) {
        const err = new Error(
          "This payment is no longer pending — refresh and try again.",
        );
        err.statusCode = 409;
        throw err;
      }

      // Its unpaid appointment can't go ahead any more. Soft-delete it like
      // a normal cancel does, which also frees the staff's time slot (the
      // slot index ignores deleted rows) — leaving it undeleted used to
      // block that slot forever.
      if (res.rows[0].appointment_id) {
        await client.query(
          `UPDATE tbl_appointments
           SET appointment_status_id = (SELECT appointment_status_id FROM tbl_appointment_status
                                        WHERE LOWER(TRIM(appointment_status_name)) = 'cancelled'),
               is_deleted = true, deleted_by = $2, date_deleted = NOW(),
               updated_by = $2, date_updated = NOW()
           WHERE appointment_id = $1 AND is_deleted IS NOT TRUE
             AND appointment_status_id = (SELECT appointment_status_id FROM tbl_appointment_status
                                          WHERE LOWER(TRIM(appointment_status_name)) = 'pending')`,
          [res.rows[0].appointment_id, updated_by],
        );
      }

      await client.query("COMMIT");
      return res.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      console.log("Error on Model cancelPayment function");
      throw error;
    } finally {
      client.release();
    }
  }

  async getRevenueSummary() {
    const client = await pool.connect();

    try {
      // Money actually received (v_revenue: completed bills + verified
      // reservation fees) — a Pending booking or cart order isn't revenue.
      const { rows } = await client.query(revenueTotalsSql("TRUE"));
      return rows[0];
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
      return await paginateQuery(client, {
        ...revenueTransactionsQuery({ type, method, search }),
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
      // Each payment counts on the day it was received (v_revenue): a
      // reservation fee on the day it was verified, a balance / full payment
      // on the day it was completed.
      const { rows: [totals] } = await client.query(
        revenueTotalsSql("received_at::date = CURRENT_DATE"),
      );

      // Scheduled for today (appointment_date), not booked today
      // (date_created) — matches Dashboard_Model.js:getTodayAppointments.
      const todayqueueRes = await client.query(
        `SELECT COUNT(*) as total_queue FROM tbl_appointments WHERE is_deleted = false AND appointment_date = CURRENT_DATE`,
      );

      return {
        ...totals,
        total_queue: todayqueueRes.rows[0].total_queue,
      };
    } catch (error) {
      console.log("Error on Model getTodayRevenueSummary function");
      throw error;
    } finally {
      client.release();
    }
  }

  // A real GCash transaction has exactly one reference number — if it's
  // already attached to another Completed or Awaiting-Verification payment,
  // someone is reusing proof of a single real transfer to claim a second
  // (or third...) payment. Excludes the payment's own row so resubmitting
  // the same proof for the same payment isn't blocked.
  // GCash proofs from the client portal that staff still need to verify.
  async countAwaitingVerification() {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM v_payments
       WHERE is_deleted = false AND payment_status_name = 'Awaiting Verification'`,
    );
    return rows[0].count;
  }

  async isGcashReferenceInUse({ gcash_reference_number, excludePaymentId }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT 1 FROM tbl_payments p
         JOIN tbl_payment_status ps ON ps.payment_status_id = p.payment_status_id
         WHERE (p.gcash_reference_number = $1 OR p.balance_gcash_reference = $1)
           AND p.is_deleted IS NOT TRUE
           AND p.payment_id IS DISTINCT FROM $2
           AND ps.payment_status_name IN ('Completed', 'Awaiting Verification', 'Partially Paid')
         LIMIT 1`,
        [gcash_reference_number, excludePaymentId ?? null],
      );
      return res.rows.length > 0;
    } catch (error) {
      console.log("Error on Model isGcashReferenceInUse function");
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
    amount_sent,
  }) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `UPDATE tbl_payments SET
           payment_status_id = $1,
           payment_method = 'GCash',
           gcash_reference_number = $2,
           payment_proof_image = $3,
           amount_sent = $5,
           date_updated = NOW()
         WHERE payment_id = $4
         RETURNING *`,
        [payment_status_id, gcash_reference_number, payment_proof_image, payment_id, amount_sent],
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
