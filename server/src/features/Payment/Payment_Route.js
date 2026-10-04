import { Router } from "express";
import PaymentController from "./Payment_Controller.js";
import hasPermission from "../../middleware/has-permission.js";
import { uploadQrCode } from "../../middleware/upload.js";

const router = Router();
const paymentController = new PaymentController();

router.get("/payments", hasPermission("PAYMENTS", "can_view"), (req, res) =>
  paymentController.getPayments(req, res),
);

// Registered before "/payments/:id" below — otherwise Express would match
// "gcash-qr-code" as the :id param instead of this literal route.
router.get(
  "/payments/gcash-qr-code",
  hasPermission("PAYMENTS", "can_view"),
  (req, res) => paymentController.getGcashQrCode(req, res),
);
router.patch(
  "/payments/gcash-qr-code",
  hasPermission("PAYMENTS", "can_edit"),
  uploadQrCode.single("qr_code_image"),
  (req, res) => paymentController.updateGcashQrCode(req, res),
);

router.get("/payments/:id", hasPermission("PAYMENTS", "can_view"), (req, res) =>
  paymentController.getPaymentById(req, res),
);
router.patch(
  "/payments/:id/cancel",
  hasPermission("PAYMENTS", "can_delete"),
  (req, res) => paymentController.cancelPayment(req, res),
);
router.patch(
  "/payments/:id/refunded",
  hasPermission("PAYMENTS", "can_delete"),
  (req, res) => paymentController.markRefunded(req, res),
);
router.patch(
  "/payments/:id/verify",
  hasPermission("PAYMENTS", "can_edit"),
  (req, res) => paymentController.verifyPayment(req, res),
);

router.post("/checkout", hasPermission("PAYMENTS", "can_create"), (req, res) =>
  paymentController.checkout(req, res),
);
router.patch(
  "/checkout/:id/complete",
  hasPermission("PAYMENTS", "can_edit"),
  (req, res) => paymentController.completePayment(req, res),
);

router.get(
  "/revenue-summary",
  hasPermission("PAYMENTS", "can_view"),
  (req, res) => paymentController.getRevenueSummary(req, res),
);

router.get(
  "/revenue-summary/today",
  hasPermission("PAYMENTS", "can_view"),
  (req, res) => paymentController.getTodayRevenue(req, res),
);

router.get(
  "/revenue-transactions",
  hasPermission("PAYMENTS", "can_view"),
  (req, res) => paymentController.getRevenueTransactions(req, res),
);

export default router;
