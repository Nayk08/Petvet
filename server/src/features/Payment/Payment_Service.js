import PaymentModel from "./Payment_Model.js";
import AppointmentModel from "../Appointment/Appointment_Model.js";
import {
  validatePaymentMethod,
  resolvePaymentSplit,
} from "../../../utils/validatePaymentMethod.js";

const paymentModel = new PaymentModel();
const appointmentModel = new AppointmentModel();

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
    // "Completed" — use updatePaymentStatus (or a dedicated "complete"
    // action) later to mark the order as paid.
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
    } = {},
  ) {
    const payment = await this.getPaymentById(payment_id); // throws 404 if missing
    if (payment.payment_status_name !== "Pending") {
      const err = new Error(
        `Only pending payments can be completed. Payment is already ${payment.payment_status_name}.`,
      );
      err.statusCode = 409;
      throw err;
    }
    validatePaymentMethod({ payment_method, gcash_reference_number });
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
      });

      // This payment may belong to an appointment (booked "pay later" —
      // see Appointment_Model.js:addAppointment) rather than a cart
      // checkout. Completing it here, through the generic Payment module,
      // bypasses completeAppointmentPayment entirely, so the appointment
      // itself needs to be confirmed as a side effect or it stays stuck on
      // Pending even though it's now paid.
      if (payment.appointment_id) {
        const confirmedStatusId =
          await appointmentModel.getAppointmentStatusId("In Queue");
        if (confirmedStatusId) {
          await appointmentModel.setAppointmentStatus({
            appointment_id: payment.appointment_id,
            appointment_status_id: confirmedStatusId,
            updated_by,
          });
        }
      }

      return completed;
    } catch (error) {
      if (error.message?.startsWith("Insufficient stock")) {
        error.statusCode = 409;
      }
      throw error;
    }
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

      const cancelled = await paymentModel.cancelPayment({
        payment_id,
        payment_status_id: cancelledStatusId,
        updated_by,
      });

      // This payment's cancel/delete soft-deletes the row entirely, so an
      // appointment linked to it would otherwise be left stuck on Pending
      // with no valid payment row left to ever complete against (see
      // completeAppointmentPayment's "Payment record ... not found"). Cancel
      // the appointment too — the client needs a fresh booking either way.
      if (payment.appointment_id) {
        const cancelledApptStatusId =
          await appointmentModel.getAppointmentStatusId("Cancelled");
        if (cancelledApptStatusId) {
          await appointmentModel.setAppointmentStatus({
            appointment_id: payment.appointment_id,
            appointment_status_id: cancelledApptStatusId,
            updated_by,
          });
        }
      }

      return cancelled;
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
      });
    }

    if (decision === "reject") {
      const pendingStatusId = await paymentModel.getPaymentStatusId("Pending");
      if (!pendingStatusId) {
        const err = new Error("'Pending' payment status not configured");
        err.statusCode = 500;
        throw err;
      }
      return paymentModel.updatePaymentStatus({
        payment_id,
        payment_status_id: pendingStatusId,
        updated_by,
      });
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
