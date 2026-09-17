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

router.get(
  "/appointment-grooming-tiers",
  hasPermission("APPOINTMENT", "can_view"),
  (req, res) => appointmentController.getGroomingPriceTiers(req, res),
);

router.patch(
  "/appointments/:appointment_id/complete-payment",
  hasPermission("APPOINTMENT", "can_edit"),
  validateParams(appointmentIdParamSchema),
  validateBody(completeAppointmentPaymentSchema),
  (req, res) => appointmentController.completeAppointmentPayment(req, res),
);

export default router;