import { isAdmin as isAdminUser } from "../../../utils/isAdmin.js";
import MedicalRecordsModel from "./MedicalRecords_Model.js";
import AppointmentService from "../Appointment/Appointment_Service.js";

const medicalRecordsModel = new MedicalRecordsModel();
const appointmentService = new AppointmentService();

export default class MedicalRecordsService {
  // Identity-scoped like completeAppointment — the vet who actually saw
  // the pet (or Admin, on their behalf) is the only one who can file the
  // consultation note for that visit, not just anyone with MEDICAL_RECORDS
  // create access.
  async addConsultation({ appointment_id, requestingUser, consultation_date, ...fields }) {
    const appointment = await appointmentService.getAppointmentById(appointment_id); // throws 404

    const isAdmin = isAdminUser(requestingUser);
    if (!isAdmin && String(appointment.assigned_staff_id) !== String(requestingUser.id)) {
      const err = new Error(
        "You can only add a medical record for an appointment assigned to you.",
      );
      err.statusCode = 403;
      throw err;
    }

    // Only a visit that actually happened (paid & checked in, or done) gets
    // a clinical record — not a Pending, Cancelled or No Show booking.
    if (!["In Queue", "Completed"].includes(appointment.appointment_status_name)) {
      const err = new Error(
        `Can't add a medical record to a ${appointment.appointment_status_name} appointment.`,
      );
      err.statusCode = 409;
      throw err;
    }

    const existing = await medicalRecordsModel.getConsultationByAppointmentId(
      appointment_id,
    );
    if (existing) {
      const err = new Error(
        "A consultation record already exists for this appointment.",
      );
      err.statusCode = 409;
      throw err;
    }

    return medicalRecordsModel.addConsultation({
      ...fields,
      appointment_id,
      pets_id: appointment.pets_id,
      veterinarian_id: appointment.assigned_staff_id,
      // The visit's own date — not "today", which is wrong whenever the vet
      // files the notes a day later (and was a UTC date on Render anyway).
      consultation_date: consultation_date || appointment.appointment_date,
      created_by: requestingUser.name,
    });
  }

  async getPetMedicalRecords(pets_id) {
    return medicalRecordsModel.getPetMedicalRecords(pets_id);
  }
}
