import express from "express";
import ClientPortalController from "./ClientPortal_Controller.js";
import isClientAuth from "../../middleware/is-client-auth.js";
import authLimiter from "../../middleware/rate-Limiter.js";
import { uploadPaymentProof } from "../../middleware/upload.js";
import { validateBody } from "../../middleware/validate.js";
import { clientPortalBookAppointmentSchema } from "../../validators/appointmentSchema.js";
import { clientPortalAddPetSchema } from "../../validators/petSchema.js";
import { doubleCsrfProtection } from "../../config/csrf.js";

const router = express.Router();
const clientPortalController = new ClientPortalController();

// Public — no client session/token exists yet at this point. The request
// body is a Google-signed ID token that can't be forged by a cross-site
// request, so CSRF isn't a meaningful threat for THIS specific request —
// but everything after login now runs on an httpOnly cookie (see
// is-client-auth.js), which the browser attaches automatically, so those
// routes need doubleCsrfProtection same as the staff side.
router.post(
  "/auth/google",
  authLimiter,
  (req, res) => clientPortalController.loginWithGoogle(req, res),
);

router.post(
  "/logout",
  doubleCsrfProtection,
  (req, res) => clientPortalController.logout(req, res),
);

// Public — powers the landing page's "live calendar" for visitors who
// aren't signed in at all. Reuses the exact same controller method as the
// authenticated /clinic-schedule below: it already excludes every
// client/pet/staff-identifying field (see ClientPortal_Model.js) and
// hard-floors the range at today server-side, so there's nothing here that
// needs an auth gate.
router.get("/public/clinic-schedule", (req, res) =>
  clientPortalController.getClinicSchedule(req, res),
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
  doubleCsrfProtection,
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
router.get("/payments/:id/receipt", isClientAuth, (req, res) =>
  clientPortalController.getMyPaymentReceipt(req, res),
);
router.post(
  "/payments/:id/proof",
  isClientAuth,
  doubleCsrfProtection,
  uploadPaymentProof.single("payment_proof_image"),
  (req, res) => clientPortalController.submitPaymentProof(req, res),
);
router.get("/gcash-qr-code", isClientAuth, (req, res) =>
  clientPortalController.getGcashQrCode(req, res),
);
router.get("/pets", isClientAuth, (req, res) =>
  clientPortalController.getMyPets(req, res),
);
router.post(
  "/pets",
  isClientAuth,
  doubleCsrfProtection,
  validateBody(clientPortalAddPetSchema),
  (req, res) => clientPortalController.addMyPet(req, res),
);
router.get("/pets/:pets_id/history", isClientAuth, (req, res) =>
  clientPortalController.getMyPetHistory(req, res),
);
router.get("/species", isClientAuth, (req, res) =>
  clientPortalController.selectSpecies(req, res),
);
router.get("/gender", isClientAuth, (req, res) =>
  clientPortalController.selectGender(req, res),
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
