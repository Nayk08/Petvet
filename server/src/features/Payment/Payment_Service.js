import PaymentModel from "./Payment_Model.js";
import {
  validatePaymentMethod,
  resolvePaymentSplit,
} from "../../../utils/validatePaymentMethod.js";

const paymentModel = new PaymentModel();

export default class PaymentService {
  async getPayments({ page, limit, search, filters }) {
    return paymentModel.getPayments({ page, limit, search, filters });
  }

  async getPaymentById(payment_id) {
    const payment = await paymentModel.getPaymentById(payment_id);
    if (!payment) {
      const err = new Error("Payment not found");
      err.statusCode = 404;
      throw err;
    }
    const items = await paymentModel.getCartItemsByPaymentId(payment_id);
    return { ...payment, items };
  }

  async getPaymentByAppointmentId(appointment_id) {
    return paymentModel.getPaymentByAppointmentId(appointment_id);
  }

  async getPaymentStatusId(status_name) {
    const statusId = await paymentModel.getPaymentStatusId(status_name);
    return statusId;
  }

  async checkout({ created_by, cartItems }) {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      const err = new Error("Cart is empty");
      err.statusCode = 400;
      throw err;
    }

    // Cart lines are keyed by product_name (not a specific batch) and
    // never carry a trusted price — the model resolves the real batch(es)
    // and their real prices at checkout time (see Payment_Model.checkout).
    for (const item of cartItems) {
      if (!item.product_name || typeof item.product_name !== "string") {
        const err = new Error("Each cart item needs a valid product_name");
        err.statusCode = 400;
        throw err;
      }
      if (!item.quantity || item.quantity <= 0) {
        const err = new Error("Each cart item needs a quantity > 0");
        err.statusCode = 400;
        throw err;
      }
    }

    // New checkouts are saved as "Pending" rather than immediately
    // "Completed" — the "complete" action (completePayment) marks them
    // paid later.
    const pendingStatusId = await paymentModel.getPaymentStatusId("Pending");
    if (!pendingStatusId) {
      const err = new Error("'Pending' payment status not configured");
      err.statusCode = 500;
      throw err;
    }

    try {
      const payment = await paymentModel.checkout({
        created_by,
        payment_status_id: pendingStatusId,
        cartItems,
      });
      const items = await paymentModel.getCartItemsByPaymentId(
        payment.payment_id,
      );
      return { ...payment, items };
    } catch (error) {
      if (error.message?.startsWith("Insufficient stock")) {
        error.statusCode = 409;
      }
      throw error;
    }
  }

  async completePayment(
    payment_id,
    updated_by,
    {
      payment_method,
      gcash_reference_number,
      cash_received,
      gcash_received,
      // The Verify flow completes a payment that is "Awaiting Verification"
      // (client sent GCash proof); every other path completes a Pending one.
      expected_status = "Pending",
    } = {},
  ) {
    const payment = await this.getPaymentById(payment_id); // throws 404 if missing
    if (payment.payment_status_name !== expected_status) {
      const err = new Error(
        `Only ${expected_status.toLowerCase()} payments can be completed here. Payment is already ${payment.payment_status_name}.`,
      );
      err.statusCode = 409;
      throw err;
    }
    // An appointment for a service with no fixed price is booked at ₱0 and
    // priced by hand when confirmed. Completing it here would record the
    // visit as paid for free.
    if (payment.appointment_id && !(Number(payment.total_amount) > 0)) {
      const err = new Error(
        "This appointment has no price yet — confirm its payment from the Appointments page, where the amount is entered.",
      );
      err.statusCode = 409;
      throw err;
    }
    validatePaymentMethod({ payment_method, gcash_reference_number });

    if (
      gcash_reference_number &&
      (await paymentModel.isGcashReferenceInUse({
        gcash_reference_number,
        excludePaymentId: payment_id,
      }))
    ) {
      const err = new Error(
        "This GCash reference number has already been used for another payment.",
      );
      err.statusCode = 409;
      throw err;
    }

    const { cash_amount, gcash_amount } = resolvePaymentSplit({
      payment_method,
      total_amount: payment.total_amount,
      cash_received,
      gcash_received,
    });

    const completedStatusId =
      await paymentModel.getPaymentStatusId("Completed");
    if (!completedStatusId) {
      const err = new Error("'Completed' payment status not configured");
      err.statusCode = 500;
      throw err;
    }

    try {
      const completed = await paymentModel.completeCheckout({
        payment_id,
        payment_status_id: completedStatusId,
        updated_by,
        payment_method,
        gcash_reference_number,
        cash_amount,
        gcash_amount,
        expected_status,
      });

      // A linked Pending appointment is confirmed (-> In Queue) inside
      // completeCheckout's transaction.
      return completed;
    } catch (error) {
      if (error.message?.startsWith("Insufficient stock")) {
        error.statusCode = 409;
      }
      throw error;
    }
  }

  async markRefunded(payment_id, updated_by) {
    const refunded = await paymentModel.markRefunded({ payment_id, updated_by });
    if (!refunded) {
      const err = new Error("Only payments marked \"Refund Needed\" can be marked refunded.");
      err.statusCode = 409;
      throw err;
    }
    return refunded;
  }

  async cancelPayment(payment_id, updated_by) {
    try {
      const payment = await this.getPaymentById(payment_id); // throws 404 if missing

      if (payment.payment_status_name !== "Pending") {
        const err = new Error(
          `Only pending payments can be cancelled. Payment is already ${payment.payment_status_name}.`,
        );
        err.statusCode = 409;
        throw err;
      }

      const cancelledStatusId =
        await paymentModel.getPaymentStatusId("Cancelled");
      if (!cancelledStatusId) {
        const err = new Error("'Cancelled' payment status not configured");
        err.statusCode = 500;
        throw err;
      }

      // Also cancels (and frees the slot of) a linked Pending appointment,
      // in the same transaction — see Payment_Model.cancelPayment.
      return await paymentModel.cancelPayment({
        payment_id,
        payment_status_id: cancelledStatusId,
        updated_by,
      });
    } catch (error) {
      console.log("Error on Service cancelPayment function");
      throw error;
    }
  }

  async getRevenueSummary() {
    try {
      const revenueSummary = await paymentModel.getRevenueSummary();
      return revenueSummary;
    } catch (error) {
      console.log("Error on Service getRevenueSummary function");
      throw error;
    }
  }

  async getTodayRevenueSummary() {
    try {
      const todayRevenueSummary = await paymentModel.getTodayRevenueSummary();
      return todayRevenueSummary;
    } catch (error) {
      console.log("Error on Service getTodayRevenueSummary function");
      throw error;
    }
  }

  async getRevenueTransactions({ type, method, search, page, limit }) {
    return paymentModel.getRevenueTransactions({
      type,
      method,
      search,
      page,
      limit,
    });
  }

  // Client-portal self-service GCash submission — can't auto-complete like
  // completePayment does, since there's no way to programmatically verify
  // a GCash transaction; staff has to look at the proof and decide (see
  // verifyPayment below). Only valid from "Pending" so a payment already
  // Awaiting Verification, Completed, or Cancelled can't be resubmitted
  // out from under a pending staff review.
  async submitOnlinePaymentProof({
    payment_id,
    gcash_reference_number,
    payment_proof_image,
  }) {
    const payment = await this.getPaymentById(payment_id); // throws 404 if missing

    // A sub-service with no fixed price is priced and paid at the clinic —
    // there's no amount to send by GCash yet.
    if (!(Number(payment.total_amount) > 0)) {
      const err = new Error("This booking is priced at the clinic — please pay there.");
      err.statusCode = 409;
      throw err;
    }

    if (payment.payment_status_name !== "Pending") {
      const err = new Error(
        `Only a Pending payment can have proof submitted. This payment is already ${payment.payment_status_name}.`,
      );
      err.statusCode = 409;
      throw err;
    }

    validatePaymentMethod({
      payment_method: "GCash",
      gcash_reference_number,
    });

    if (
      await paymentModel.isGcashReferenceInUse({
        gcash_reference_number,
        excludePaymentId: payment_id,
      })
    ) {
      const err = new Error(
        "This GCash reference number has already been used for another payment. Please double-check the number, or contact the clinic if you believe this is an error.",
      );
      err.statusCode = 409;
      throw err;
    }

    const awaitingVerificationStatusId = await paymentModel.getPaymentStatusId(
      "Awaiting Verification",
    );
    if (!awaitingVerificationStatusId) {
      const err = new Error("'Awaiting Verification' payment status not configured");
      err.statusCode = 500;
      throw err;
    }

    return paymentModel.submitOnlinePaymentProof({
      payment_id,
      payment_status_id: awaitingVerificationStatusId,
      gcash_reference_number,
      payment_proof_image,
    });
  }

  // Staff reviews the proof submitted above and approves or rejects it.
  // Approve reuses completePayment as-is — the client already supplied a
  // reference number in the required GCash format, so this is exactly the
  // same transaction (stock deduction, appointment flip to In Queue) staff
  // would do processing a walk-in GCash payment, just staff-initiated
  // instead of client-initiated. Reject just reverts to Pending so the
  // client can fix a mistaken reference or resubmit a better screenshot —
  // nothing else needs to change since a resubmission overwrites the old
  // reference/image outright.
  async verifyPayment({ payment_id, decision, updated_by }) {
    const payment = await this.getPaymentById(payment_id); // throws 404 if missing

    if (payment.payment_status_name !== "Awaiting Verification") {
      const err = new Error(
        `Only a payment Awaiting Verification can be verified. This payment is ${payment.payment_status_name}.`,
      );
      err.statusCode = 409;
      throw err;
    }

    if (decision === "approve") {
      return this.completePayment(payment_id, updated_by, {
        payment_method: "GCash",
        gcash_reference_number: payment.gcash_reference_number,
        gcash_received: payment.total_amount,
        cash_received: 0,
        // The client already sent GCash proof, so this payment is Awaiting
        // Verification, not Pending — approving it used to always fail.
        expected_status: "Awaiting Verification",
      });
    }

    if (decision === "reject") {
      const pendingStatusId = await paymentModel.getPaymentStatusId("Pending");
      if (!pendingStatusId) {
        const err = new Error("'Pending' payment status not configured");
        err.statusCode = 500;
        throw err;
      }
      const rejected = await paymentModel.rejectProof({
        payment_id,
        payment_status_id: pendingStatusId,
        updated_by,
      });
      if (!rejected) {
        const err = new Error("This payment was just verified by someone else — refresh.");
        err.statusCode = 409;
        throw err;
      }
      return rejected;
    }

    const err = new Error('decision must be "approve" or "reject"');
    err.statusCode = 400;
    throw err;
  }

  async getGcashQrCode() {
    return paymentModel.getGcashQrCode();
  }

  async updateGcashQrCode({ image_url, updated_by }) {
    return paymentModel.updateGcashQrCode({ image_url, updated_by });
  }
}
