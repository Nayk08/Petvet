import AppointmentModel from "./Appointment_Model.js";

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

    if (!["Pending", "Confirmed"].includes(appointment.appointment_status_name)) {
      const err = new Error(
        `Only pending or confirmed appointments can be cancelled. Appointment is already ${appointment.appointment_status_name}.`,
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
}