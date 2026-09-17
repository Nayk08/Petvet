import AppointmentModel from "./Appointment_Model.js";
import { validatePaymentMethod } from "../../../utils/validatePaymentMethod.js";

const appointmentModel = new AppointmentModel();

export default class AppointmentService {
  async getAppointments({ page, limit, search, filters }) {
    return appointmentModel.getAppointments({ page, limit, search, filters });
  }

  async getAppointmentById(appointment_id) {
    const appointment = await appointmentModel.getAppointmentById(
      appointment_id,
    );
    if (!appointment) {
      const err = new Error("Appointment not found");
      err.statusCode = 404;
      throw err;
    }
    return appointment;
  }

  async addAppointment({
    client_id,
    pets_id,
    appointment_services_id,
    assigned_staff_id,
    appointment_date,
    start_time,
    end_time,
    notes,
    created_by,
  }) {
    const pendingStatusId =
      await appointmentModel.getAppointmentStatusId("Pending");
    if (!pendingStatusId) {
      const err = new Error("'Pending' appointment status not configured");
      err.statusCode = 500;
      throw err;
    }

    return appointmentModel.addAppointment({
      client_id,
      pets_id,
      appointment_services_id,
      assigned_staff_id,
      appointment_date,
      start_time,
      end_time,
      appointment_status_id: pendingStatusId,
      notes,
      created_by,
    });
  }

  async editAppointment({
    appointment_id,
    pets_id,
    appointment_services_id,
    assigned_staff_id,
    appointment_date,
    start_time,
    end_time,
    status_name,
    notes,
    updated_by,
  }) {
    await this.getAppointmentById(appointment_id); // throws 404 if missing

    const appointment_status_id =
      await appointmentModel.getAppointmentStatusId(status_name);
    if (!appointment_status_id) {
      const err = new Error(`'${status_name}' appointment status not configured`);
      err.statusCode = 500;
      throw err;
    }

    return appointmentModel.editAppointment({
      appointment_id,
      pets_id,
      appointment_services_id,
      assigned_staff_id,
      appointment_date,
      start_time,
      end_time,
      appointment_status_id,
      notes,
      updated_by,
    });
  }

  async cancelAppointment(appointment_id, deleted_by) {
    const appointment = await this.getAppointmentById(appointment_id); // throws 404 if missing

    if (!["Pending", "In Queue"].includes(appointment.appointment_status_name)) {
      const err = new Error(
        `Only pending or in-queue appointments can be cancelled. Appointment is already ${appointment.appointment_status_name}.`,
      );
      err.statusCode = 409;
      throw err;
    }

    const cancelledStatusId =
      await appointmentModel.getAppointmentStatusId("Cancelled");
    if (!cancelledStatusId) {
      const err = new Error("'Cancelled' appointment status not configured");
      err.statusCode = 500;
      throw err;
    }

    return appointmentModel.deleteAppointment({
      appointment_id,
      appointment_status_id: cancelledStatusId,
      deleted_by,
    });
  }

  async selectAppointmentServices() {
    return appointmentModel.selectAppointmentServices();
  }

  async selectStaff() {
    return appointmentModel.selectStaff();
  }

  async getGroomingPriceTiers() {
    return appointmentModel.getGroomingPriceTiers();
  }

  async bookAppointmentWithPayment({
    client_id,
    pets_id,
    appointment_services_id,
    assigned_staff_id,
    appointment_date,
    start_time,
    end_time,
    notes,
    amount,
    payment_method,
    gcash_reference_number,
    cash_received,
    gcash_received,
    created_by,
  }) {
    validatePaymentMethod({ payment_method, gcash_reference_number });

    // Payment is already collected at booking time, so there's nothing left
    // pending — the appointment goes straight to In Queue rather than
    // sitting in "Pending" (that status is for a future flow where an
    // appointment is created before payment/approval).
    const confirmedStatusId =
      await appointmentModel.getAppointmentStatusId("In Queue");
    if (!confirmedStatusId) {
      const err = new Error("'In Queue' appointment status not configured");
      err.statusCode = 500;
      throw err;
    }

    // Fail fast with a clean 400 if this is a variable-price service
    // (Operation) and no amount was given, rather than letting it fail deep
    // inside the transactional write.
    const services = await appointmentModel.selectAppointmentServices();
    const service = services.find(
      (s) => String(s.appointment_services_id) === String(appointment_services_id),
    );
    if (!service) {
      const err = new Error("Selected service not found");
      err.statusCode = 404;
      throw err;
    }

    const needsManualAmount =
      service.service_price == null && service.appointment_services !== "Grooming";
    if (needsManualAmount && !(amount > 0)) {
      const err = new Error(
        `A valid amount is required to book a ${service.appointment_services} appointment.`,
      );
      err.statusCode = 400;
      throw err;
    }

    return appointmentModel.addAppointmentWithPayment({
      client_id,
      pets_id,
      appointment_services_id,
      assigned_staff_id,
      appointment_date,
      start_time,
      end_time,
      appointment_status_id: confirmedStatusId,
      notes,
      amount,
      payment_method,
      gcash_reference_number,
      cash_received,
      gcash_received,
      created_by,
    });
  }

  // Finishes a Pending appointment (created via addAppointment without
  // payment) by collecting payment and flipping it to In Queue.
  async completeAppointmentPayment({
    appointment_id,
    amount,
    payment_method,
    gcash_reference_number,
    cash_received,
    gcash_received,
    updated_by,
  }) {
    validatePaymentMethod({ payment_method, gcash_reference_number });

    const appointment = await this.getAppointmentById(appointment_id); // throws 404 if missing

    if (appointment.appointment_status_name !== "Pending") {
      const err = new Error(
        `Only pending appointments can be paid. Appointment is already ${appointment.appointment_status_name}.`,
      );
      err.statusCode = 409;
      throw err;
    }

    // Fail fast with a clean 400 if this is a variable-price service
    // (Operation) and no amount was given, rather than letting it fail deep
    // inside the transactional write.
    const services = await appointmentModel.selectAppointmentServices();
    const service = services.find(
      (s) =>
        String(s.appointment_services_id) ===
        String(appointment.appointment_services_id),
    );
    if (!service) {
      const err = new Error("Selected service not found");
      err.statusCode = 404;
      throw err;
    }

    const needsManualAmount =
      service.service_price == null && service.appointment_services !== "Grooming";
    if (needsManualAmount && !(amount > 0)) {
      const err = new Error(
        `A valid amount is required to book a ${service.appointment_services} appointment.`,
      );
      err.statusCode = 400;
      throw err;
    }

    return appointmentModel.completeAppointmentPayment({
      appointment_id,
      amount,
      payment_method,
      gcash_reference_number,
      cash_received,
      gcash_received,
      updated_by,
    });
  }
}