import { Router } from "express";
import PaymentController from "./Payment_Controller.js";
import hasPermission from "../../middleware/has-permission.js";

const router = Router();
const paymentController = new PaymentController();

router.get("/payments", hasPermission("PAYMENTS", "can_view"), (req, res) =>
  paymentController.getPayments(req, res),
);
router.get("/payments/:id", hasPermission("PAYMENTS", "can_view"), (req, res) =>
  paymentController.getPaymentById(req, res),
);
router.patch(
  "/payments/:id/cancel",
  hasPermission("PAYMENTS", "can_delete"),
  (req, res) => paymentController.cancelPayment(req, res),
);

router.post("/checkout", (req, res) => paymentController.checkout(req, res));
router.patch("/checkout/:id/complete", (req, res) =>
  paymentController.completePayment(req, res),
);

export default router;
