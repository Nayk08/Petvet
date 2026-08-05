import PaymentModel from "./Payment_Model.js";

const paymentModel = new PaymentModel();

export default class PaymentService {
  async getPayments({ page, limit, filters }) {
    return paymentModel.getPayments({ page, limit, filters });
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

  async checkout({ created_by, cartItems }) {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      const err = new Error("Cart is empty");
      err.statusCode = 400;
      throw err;
    }

    for (const item of cartItems) {
      if (!item.product_id || !item.quantity || item.quantity <= 0) {
        const err = new Error(
          "Each cart item needs a valid product_id and quantity > 0",
        );
        err.statusCode = 400;
        throw err;
      }
      if (item.item_price == null || Number(item.item_price) < 0) {
        const err = new Error("Each cart item needs a valid item_price");
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

  async completePayment(payment_id, updated_by) {
    await this.getPaymentById(payment_id); // throws 404 if missing

    const completedStatusId =
      await paymentModel.getPaymentStatusId("Completed");
    if (!completedStatusId) {
      const err = new Error("'Completed' payment status not configured");
      err.statusCode = 500;
      throw err;
    }

    try {
      return await paymentModel.completeCheckout({
        payment_id,
        payment_status_id: completedStatusId,
        updated_by,
      });
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
        const err = new Error(
          "'Cancelled' payment status not configured",
        );
        err.statusCode = 500;
        throw err;
      }

      return paymentModel.cancelPayment({
        payment_id,
        payment_status_id: cancelledStatusId,
        updated_by,
      });
    } catch (error) {
      console.log("Error on Service cancelPayment function");
      throw error;
    }
  }
}
