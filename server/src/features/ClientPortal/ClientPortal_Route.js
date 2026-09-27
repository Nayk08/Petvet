import express from "express";
import ClientPortalController from "./ClientPortal_Controller.js";
import isClientAuth from "../../middleware/is-client-auth.js";
import authLimiter from "../../middleware/rate-Limiter.js";
import { uploadPaymentProof } from "../../middleware/upload.js";
import { validateBody } from "../../middleware/validate.js";
import { clientPortalBookAppointmentSchema } from "../../validators/appointmentSchema.js";

const router = express.Router();
const clientPortalController = new ClientPortalController();

// Public — no client session/token exists yet at this point. Not behind
// doubleCsrfProtection either: this issues a bearer token, not a cookie,
// and the request body is a Google-signed ID token that can't be forged
// by a cross-site request, so CSRF isn't a meaningful threat here.
router.post(
  "/auth/google",
  authLimiter,
  (req, res) => clientPortalController.loginWithGoogle(req, res),
);

// Everything below requires a valid client JWT.
router.get("/me", isClientAuth, (req, res) =>
  clientPortalController.getMe(req, res),
);
router.get("/appointments", isClientAuth, (req, res) =>
  clientPortalController.getMyAppointments(req, res),
);
// Same business-hour/slot rules the staff booking route enforces
// (addAppointmentSchema) — this route previously had no validation at all,
// so a direct request could book any date/time.
router.post(
  "/appointments",
  isClientAuth,
  validateBody(clientPortalBookAppointmentSchema),
  (req, res) => clientPortalController.bookAppointment(req, res),
);
router.get("/appointments/booked-slots", isClientAuth, (req, res) =>
  clientPortalController.getStaffBookedSlots(req, res),
);
router.get("/clinic-schedule", isClientAuth, (req, res) =>
  clientPortalController.getClinicSchedule(req, res),
);
router.get("/payments", isClientAuth, (req, res) =>
  clientPortalController.getMyPayments(req, res),
);
router.post(
  "/payments/:id/proof",
  isClientAuth,
  uploadPaymentProof.single("payment_proof_image"),
  (req, res) => clientPortalController.submitPaymentProof(req, res),
);
router.get("/gcash-qr-code", isClientAuth, (req, res) =>
  clientPortalController.getGcashQrCode(req, res),
);
router.get("/pets", isClientAuth, (req, res) =>
  clientPortalController.getMyPets(req, res),
);
router.get("/appointment-services", isClientAuth, (req, res) =>
  clientPortalController.selectAppointmentServices(req, res),
);
router.get("/appointment-staff", isClientAuth, (req, res) =>
  clientPortalController.selectStaff(req, res),
);
router.get("/grooming-price-tiers", isClientAuth, (req, res) =>
  clientPortalController.getGroomingPriceTiers(req, res),
);

export default router;
