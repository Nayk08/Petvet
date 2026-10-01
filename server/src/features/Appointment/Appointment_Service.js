import AppointmentModel from "./Appointment_Model.js";
import PaymentModel from "../Payment/Payment_Model.js";
import { validatePaymentMethod } from "../../../utils/validatePaymentMethod.js";
import { sendMail } from "../../config/mailer.js";
import { appointmentCompletedEmail } from "../../../utils/emailTemplates.js";

const appointmentModel = new AppointmentModel();
const paymentModel = new PaymentModel();

// Looks up the service and staff member fresh (never trusts a client-sent
// name/role) and checks the staff's role against the service's own
// allowed_roles (set via the Maintenance module — tbl_appointment_services,
// not a hardcoded map, so a newly added service is only assignable once an
// admin actually configures who can perform it). Returns the resolved
// service row so callers that also need it (pricing) don't have to fetch
// the services list a second time.
async function assertStaffMatchesService(
  appointment_services_id,
  assigned_staff_id,
) {
  const [services, staffList] = await Promise.all([
    appointmentModel.selectAppointmentServices(),
    appointmentModel.selectStaff(),
  ]);

  const service = services.find(
    (s) => String(s.appointment_services_id) === String(appointment_services_id),
  );
  if (!service) {
    const err = new Error("Selected service not found");
    err.statusCode = 404;
    throw err;
  }

  const staffMember = staffList.find(
    (s) => String(s.users_id) === String(assigned_staff_id),
  );
  if (!staffMember) {
    const err = new Error("Selected staff member not found");
    err.statusCode = 404;
    throw err;
  }

  const allowedRoles = service.allowed_roles ?? [];
  if (!allowedRoles.includes(staffMember.user_level?.trim())) {
    const err = new Error(
      `${staffMember.user_name} (${staffMember.user_level}) can't be assigned to a ${service.appointment_services} appointment.`,
    );
    err.statusCode = 400;
    throw err;
  }

  return service;
}

// A service with no fixed service_price and no weight-tier pricing
// (currently just Operation) is priced by whatever amount the caller
// submits — this is the only real check on that, so a caller-controlled
// number can't undercut a configured floor (tbl_appointment_services.min_price)
// or, absent one, be booked for an arbitrarily small amount.
function assertValidManualAmount(service, amount) {
  const needsManualAmount =
    service.service_price == null && service.appointment_services !== "Grooming";
  if (!needsManualAmount) return;

  const minAmount =
    service.min_price != null ? Number(service.min_price) : 0.01;

  if (!(Number(amount) >= minAmount)) {
    const err = new Error(
      minAmount > 0.01
        ? `Amount for a ${service.appointment_services} appointment must be at least ₱${minAmount.toFixed(2)}.`
        : `A valid amount is required to book a ${service.appointment_services} appointment.`,
    );
    err.statusCode = 400;
    throw err;
  }
}

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

    await assertStaffMatchesService(appointment_services_id, assigned_staff_id);

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
    const current = await this.getAppointmentById(appointment_id); // throws 404 if missing

    // A Completed or Cancelled appointment is a closed record — rescheduling
    // it after the fact (or reassigning its staff/pet/service) would rewrite
    // history with no trace that it happened, and for a Completed visit,
    // no re-validation of what was actually charged.
    if (["Completed", "Cancelled"].includes(current.appointment_status_name)) {
      const err = new Error(
        `A ${current.appointment_status_name} appointment can't be edited.`,
      );
      err.statusCode = 409;
      throw err;
    }

    const appointment_status_id =
      await appointmentModel.getAppointmentStatusId(status_name);
    if (!appointment_status_id) {
      const err = new Error(`'${status_name}' appointment status not configured`);
      err.statusCode = 500;
      throw err;
    }

    await assertStaffMatchesService(appointment_services_id, assigned_staff_id);

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

  async cancelAppointment(appointment_id, requestingUser) {
    const appointment = await this.getAppointmentById(appointment_id); // throws 404 if missing

    if (!["Pending", "In Queue"].includes(appointment.appointment_status_name)) {
      const err = new Error(
        `Only pending or in-queue appointments can be cancelled. Appointment is already ${appointment.appointment_status_name}.`,
      );
      err.statusCode = 409;
      throw err;
    }

    // Cancellations should come in at least 2 hours before the slot so the
    // clinic has a real chance to fill it — Admin can still override for a
    // genuine exception (e.g. the clinic itself needs to cancel last-minute).
    const isAdmin = requestingUser.role?.trim() === "Admin";
    const msUntilStart = new Date(appointment.start_time).getTime() - Date.now();
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    if (!isAdmin && msUntilStart < TWO_HOURS_MS) {
      const err = new Error(
        "This appointment can no longer be cancelled — cancellations must be made at least 2 hours before the scheduled time. Please contact the clinic directly.",
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
      deleted_by: requestingUser.name,
    });
  }

  // Front-desk action for a booked appointment whose client never showed up
  // — distinct from Cancelled (client proactively backed out beforehand) and
  // from Completed (service was actually rendered). Not identity-scoped like
  // completeAppointment: any staff with APPOINTMENT edit rights can mark a
  // no-show, since the assigned staff member may already be free to see the
  // next client and isn't the one who'd notice/record the no-show.
  async markNoShow(appointment_id, updated_by) {
    const appointment = await this.getAppointmentById(appointment_id); // throws 404 if missing

    if (!["Pending", "In Queue"].includes(appointment.appointment_status_name)) {
      const err = new Error(
        `Only pending or in-queue appointments can be marked as a no-show. Appointment is already ${appointment.appointment_status_name}.`,
      );
      err.statusCode = 409;
      throw err;
    }

    const noShowStatusId = await appointmentModel.getAppointmentStatusId("No Show");
    if (!noShowStatusId) {
      const err = new Error("'No Show' appointment status not configured");
      err.statusCode = 500;
      throw err;
    }

    return appointmentModel.setAppointmentStatus({
      appointment_id,
      appointment_status_id: noShowStatusId,
      updated_by,
    });
  }

  // The groomer/veterinarian actually assigned to the appointment marks it
  // done once they've finished — not a full "edit" (reschedule, reassign,
  // etc.), just a focused status flip, gated by identity rather than a
  // module CRUD permission: you can only complete the one appointment
  // that's actually yours (Admin can complete any, same override every
  // other appointment action already gives them).
  async completeAppointment(appointment_id, requestingUser) {
    const appointment = await this.getAppointmentById(appointment_id); // throws 404 if missing

    const isAdmin = requestingUser.role?.trim() === "Admin";
    if (!isAdmin && String(appointment.assigned_staff_id) !== String(requestingUser.id)) {
      const err = new Error(
        "You can only complete an appointment that's assigned to you.",
      );
      err.statusCode = 403;
      throw err;
    }

    if (appointment.appointment_status_name !== "In Queue") {
      const err = new Error(
        `Only in-queue appointments can be marked completed. Appointment is already ${appointment.appointment_status_name}.`,
      );
      err.statusCode = 409;
      throw err;
    }

    const completedStatusId =
      await appointmentModel.getAppointmentStatusId("Completed");
    if (!completedStatusId) {
      const err = new Error("'Completed' appointment status not configured");
      err.statusCode = 500;
      throw err;
    }

    const updated = await appointmentModel.setAppointmentStatus({
      appointment_id,
      appointment_status_id: completedStatusId,
      updated_by: requestingUser.name,
    });

    // Fire-and-forget by design (see mailer.js) — the appointment is
    // already marked completed above regardless of whether this succeeds,
    // fails, or SMTP was never configured at all.
    const { subject, html } = appointmentCompletedEmail({
      client_name: appointment.client_name,
      pets_name: appointment.pets_name,
      service_name: appointment.service_name,
      staff_name: appointment.staff_name,
      appointment_date: appointment.appointment_date,
    });
    await sendMail({ to: appointment.email, subject, html });

    return updated;
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

  async getAppointmentHistoryForPet(pets_id) {
    return appointmentModel.getAppointmentHistoryForPet(pets_id);
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
    additional_fee_label,
    additional_fee_amount,
    created_by,
  }) {
    validatePaymentMethod({ payment_method, gcash_reference_number });

    if (
      gcash_reference_number &&
      (await paymentModel.isGcashReferenceInUse({ gcash_reference_number }))
    ) {
      const err = new Error(
        "This GCash reference number has already been used for another payment.",
      );
      err.statusCode = 409;
      throw err;
    }

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

    // Fail fast with a clean 400/404 (staff-role mismatch, missing amount
    // for a variable-price service) rather than letting either fail deep
    // inside the transactional write.
    const service = await assertStaffMatchesService(
      appointment_services_id,
      assigned_staff_id,
    );
    assertValidManualAmount(service, amount);

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
      additional_fee_label,
      additional_fee_amount,
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
    additional_fee_label,
    additional_fee_amount,
    updated_by,
  }) {
    validatePaymentMethod({ payment_method, gcash_reference_number });

    if (
      gcash_reference_number &&
      (await paymentModel.isGcashReferenceInUse({ gcash_reference_number }))
    ) {
      const err = new Error(
        "This GCash reference number has already been used for another payment.",
      );
      err.statusCode = 409;
      throw err;
    }

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

    assertValidManualAmount(service, amount);

    return appointmentModel.completeAppointmentPayment({
      appointment_id,
      amount,
      payment_method,
      gcash_reference_number,
      cash_received,
      gcash_received,
      additional_fee_label,
      additional_fee_amount,
      updated_by,
    });
  }
}