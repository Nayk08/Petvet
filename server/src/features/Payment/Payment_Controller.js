import PaymentService from "./Payment_Service.js";

const paymentService = new PaymentService();

export default class PaymentController {
  async getPayments(req, res) {
    try {
      const { page, limit, ...filters } = req.query;
      const result = await paymentService.getPayments({ page, limit, filters });
      res.json(result);
    } catch (error) {
      console.log("Error on Controller getPayments function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async getPaymentById(req, res) {
    try {
      const payment = await paymentService.getPaymentById(req.params.id);
      res.json(payment);
    } catch (error) {
      console.log("Error on Controller getPaymentById function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async checkout(req, res) {
    try {
      const created_by = req.user?.username ?? null; // adjust to your auth middleware
      const { cartItems } = req.body;
      const payment = await paymentService.checkout({ created_by, cartItems });
      res.status(201).json(payment);
    } catch (error) {
      console.log("Error on Controller checkout function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async completePayment(req, res) {
    try {
      const updated_by = req.user?.username ?? null;
      const payment = await paymentService.completePayment(
        req.params.id,
        updated_by,
      );
      res.json(payment);
    } catch (error) {
      console.log("Error on Controller completePayment function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }
  async cancelPayment(req, res) {
    try {
      const updated_by = req.user?.username ?? null;
      const payment = await paymentService.cancelPayment(
        req.params.id,
        updated_by,
      );
      res.json(payment);
    } catch (error) {
      console.log("Error on Controller cancelPayment function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }
}
