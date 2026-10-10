import express from "express";
import hasPermission from "../../middleware/has-permission.js";
import AppointmentController from "./Appointment_Controller.js";
import { validateBody, validateParams } from "../../middleware/validate.js";
import {
  addAppointmentSchema,
  editAppointmentSchema,
  bookAppointmentWithPaymentSchema,
  completeAppointmentPaymentSchema,
  appointmentIdParamSchema,
  addAppointmentGroupSchema,
  bookingGroupParamSchema,
  completeGroupPaymentSchema,
} from "../../validators/appointmentSchema.js";

const router = express.Router();
const appointmentController = new AppointmentController();

router.get(
  "/appointments",
  hasPermission("APPOINTMENT", "can_view"),
  (req, res) => appointmentController.getAppointments(req, res),
);

router.get(
  "/appointments/consultation",
  hasPermission("C_APPOINTMENT", "can_view"),
  (req, res) => appointmentController.getConsultationAppointments(req, res),
);

router.get(
  "/appointments/grooming",
  hasPermission("G_APPOINTMENT", "can_view"),
  (req, res) => appointmentController.getGroomingAppointments(req, res),
);

router.get(
  "/appointments/operation",
  hasPermission("O_APPOINTMENT", "can_view"),
  (req, res) => appointmentController.getOperationAppointments(req, res),
);

router.post(
  "/appointments/add-appointment",
  hasPermission("APPOINTMENT", "can_create"),
  validateBody(addAppointmentSchema),
  (req, res) => appointmentController.addAppointment(req, res),
);

// Multi-item booking: several pets / services / times in one booking,
// paid together via the group complete-payment below.
router.post(
  "/appointments/add-group",
  hasPermission("APPOINTMENT", "can_create"),
  validateBody(addAppointmentGroupSchema),
  (req, res) => appointmentController.addAppointmentGroup(req, res),
);

router.get(
  "/appointments/groups/:booking_group",
  hasPermission("APPOINTMENT", "can_view"),
  validateParams(bookingGroupParamSchema),
  (req, res) => appointmentController.getBookingGroup(req, res),
);

router.patch(
  "/appointments/groups/:booking_group/complete-payment",
  hasPermission("APPOINTMENT", "can_edit"),
  validateParams(bookingGroupParamSchema),
  validateBody(completeGroupPaymentSchema),
  (req, res) => appointmentController.completeGroupPayment(req, res),
);

router.post(
  "/appointments/book-with-payment",
  hasPermission("APPOINTMENT", "can_create"),
  validateBody(bookAppointmentWithPaymentSchema),
  (req, res) => appointmentController.bookAppointmentWithPayment(req, res),
);

router.get(
  "/appointments/:appointment_id",
  hasPermission("APPOINTMENT", "can_view"),
  validateParams(appointmentIdParamSchema),
  (req, res) => appointmentController.getAppointmentById(req, res),
);

router.put(
  "/appointments/:appointment_id/edit-appointment",
  hasPermission("APPOINTMENT", "can_edit"),
  validateParams(appointmentIdParamSchema),
  validateBody(editAppointmentSchema),
  (req, res) => appointmentController.editAppointment(req, res),
);

router.put(
  "/appointments/:appointment_id/cancel-appointment",
  hasPermission("APPOINTMENT", "can_delete"),
  validateParams(appointmentIdParamSchema),
  (req, res) => appointmentController.cancelAppointment(req, res),
);

router.put(
  "/appointments/:appointment_id/mark-no-show",
  hasPermission("APPOINTMENT", "can_edit"),
  validateParams(appointmentIdParamSchema),
  (req, res) => appointmentController.markNoShow(req, res),
);

// No hasPermission gate — same reasoning as Authenticator_Route.js's
// /me/picture: "mark MY OWN assigned appointment done" is an identity-based
// action, not a module CRUD permission a Groomer/Veterinarian would
// otherwise need granted (the G_APPOINTMENT/C_APPOINTMENT/O_APPOINTMENT
// modules are deliberately view-only — see Grooming_Appointment.jsx). The
// real authorization is the ownership check inside
// Appointment_Service.js:completeAppointment (assigned_staff_id must match
// the caller, or they must be Admin) — already covered by the global
// isAuth this whole router sits behind.
router.put(
  "/appointments/:appointment_id/complete-appointment",
  validateParams(appointmentIdParamSchema),
  (req, res) => appointmentController.completeAppointment(req, res),
);

router.get(
  "/appointment-services",
  hasPermission("APPOINTMENT", "can_view"),
  (req, res) => appointmentController.selectAppointmentServices(req, res),
);

router.get(
  "/appointment-staff",
  hasPermission("APPOINTMENT", "can_view"),
  (req, res) => appointmentController.selectStaff(req, res),
);

router.patch(
  "/appointments/:appointment_id/complete-payment",
  hasPermission("APPOINTMENT", "can_edit"),
  validateParams(appointmentIdParamSchema),
  validateBody(completeAppointmentPaymentSchema),
  (req, res) => appointmentController.completeAppointmentPayment(req, res),
);

export default router;