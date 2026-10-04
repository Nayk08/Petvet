import express from "express";
import hasPermission from "../../middleware/has-permission.js";
import MedicalRecordsController from "./MedicalRecords_Controller.js";
import { validateBody, validateParams } from "../../middleware/validate.js";
import { addConsultationSchema } from "../../validators/medicalRecordsSchema.js";
import { appointmentIdParamSchema } from "../../validators/appointmentSchema.js";
import { petIdParamSchema } from "../../validators/petSchema.js";

const router = express.Router();
const medicalRecordsController = new MedicalRecordsController();

// Gated by MEDICAL_RECORDS can_create (Admin + Veterinarian only, see the
// tbl_module_access seed) — the Service layer then further restricts this
// to the specific vet assigned to the appointment (or Admin on their
// behalf), same identity-scoping as completeAppointment.
router.post(
  "/appointments/:appointment_id/consultation",
  hasPermission("MEDICAL_RECORDS", "can_create"),
  validateParams(appointmentIdParamSchema),
  validateBody(addConsultationSchema),
  (req, res) => medicalRecordsController.addConsultation(req, res),
);

router.get(
  "/pets/:pets_id/medical-records",
  hasPermission("MEDICAL_RECORDS", "can_view"),
  validateParams(petIdParamSchema),
  (req, res) => medicalRecordsController.getPetMedicalRecords(req, res),
);

export default router;
