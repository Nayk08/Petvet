import PaymentService from "./Payment_Service.js";

const paymentService = new PaymentService();

export default class PaymentController {
  async getPayments(req, res) {
    try {
      const { page, limit, search, ...filters } = req.query;
      const result = await paymentService.getPayments({
        page,
        limit,
        search,
        filters,
      });
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
      const created_by = req.session.user?.name ?? null;
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
      const updated_by = req.session.user?.name ?? null;
      const {
        payment_method,
        gcash_reference_number,
        cash_received,
        gcash_received,
      } = req.body;
      const payment = await paymentService.completePayment(
        req.params.id,
        updated_by,
        {
          payment_method,
          gcash_reference_number,
          cash_received,
          gcash_received,
        },
      );
      res.json(payment);
    } catch (error) {
      console.log("Error on Controller completePayment function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }
  async cancelPayment(req, res) {
    try {
      const updated_by = req.session.user?.name ?? null;
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

  async getRevenueSummary(req, res) {
    try {
      const revenueSummary = await paymentService.getRevenueSummary();
      res.json(revenueSummary);
    } catch (error) {
      console.log("Error on Controller getRevenueSummary function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async getTodayRevenue(req, res) {
    try {
      const todayRevenue = await paymentService.getTodayRevenueSummary();
      res.json(todayRevenue);
    } catch (error) {
      console.log("Error on Controller getTodayRevenue function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async getRevenueTransactions(req, res) {
    try {
      const { type, method, search, page, limit } = req.query;
      const result = await paymentService.getRevenueTransactions({
        type,
        method,
        search,
        page,
        limit,
      });
      res.json(result);
    } catch (error) {
      console.log("Error on Controller getRevenueTransactions function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async verifyPayment(req, res) {
    try {
      const updated_by = req.session.user?.name ?? null;
      const { decision } = req.body;
      const payment = await paymentService.verifyPayment({
        payment_id: req.params.id,
        decision,
        updated_by,
      });
      res.json(payment);
    } catch (error) {
      console.log("Error on Controller verifyPayment function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async getGcashQrCode(req, res) {
    try {
      const settings = await paymentService.getGcashQrCode();
      res.json(settings);
    } catch (error) {
      console.log("Error on Controller getGcashQrCode function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async updateGcashQrCode(req, res) {
    try {
      const updated_by = req.session.user?.name ?? null;
      if (!req.file) {
        return res.status(400).json({ message: "No QR code image uploaded" });
      }
      const settings = await paymentService.updateGcashQrCode({
        image_url: req.file.path,
        updated_by,
      });
      res.json(settings);
    } catch (error) {
      console.log("Error on Controller updateGcashQrCode function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }
}
