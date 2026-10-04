import MedicalRecordsService from "./MedicalRecords_Service.js";
import { sendError } from "../../../utils/errorResponse.js";

const medicalRecordsService = new MedicalRecordsService();

export default class MedicalRecordsController {
  // req.body is already the zod-parsed addConsultationSchema output
  // (validateBody strips unknown keys), so it's safe to pass straight through.
  async addConsultation(req, res) {
    try {
      const result = await medicalRecordsService.addConsultation({
        ...req.body,
        appointment_id: req.params.appointment_id,
        requestingUser: req.session.user,
      });
      res.status(201).json(result);
    } catch (error) {
      console.log("Error on Controller addConsultation function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async getPetMedicalRecords(req, res) {
    try {
      const records = await medicalRecordsService.getPetMedicalRecords(
        req.params.pets_id,
      );
      res.json(records);
    } catch (error) {
      console.log("Error on Controller getPetMedicalRecords function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }
}
