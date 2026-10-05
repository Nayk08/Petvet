import { isAdmin as isAdminUser } from "../../../utils/isAdmin.js";
import AppointmentModel from "./Appointment_Model.js";
import PaymentModel from "../Payment/Payment_Model.js";
import { validatePaymentMethod } from "../../../utils/validatePaymentMethod.js";
import { sendMail } from "../../config/mailer.js";
import { appointmentCompletedEmail } from "../../../utils/emailTemplates.js";
import { parseManilaTimestamp } from "../../../utils/manilaTime.js";
import { slotStartInstant } from "../../validators/appointmentSchema.js";

const appointmentModel = new AppointmentModel();

// A guarded status change found the appointment already moved on (another
// staff member, a double click, or the auto-complete got there first).
function statusChangedError() {
  const err = new Error(
    "This appointment's status was just changed by someone else — refresh and try again.",
  );
  err.statusCode = 409;
  return err;
}
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

// A booking with no price for this pet (an unpriced sub-service, or Grooming
// for a pet with no weight / no matching tier) is priced by whatever amount
// staff enter when the client pays — it just has to be a real, positive amount.
async function assertValidManualAmount(service, pets_id, amount) {
  const price = await appointmentModel.getEffectivePrice(
    service.appointment_services_id,
    pets_id,
  );
  if (price != null) return;

  if (!(Number(amount) > 0)) {
    const err = new Error(
      `A valid amount is required to book a ${service.appointment_services} appointment.`,
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
    status_name,
    notes,
    updated_by,
  }) {
    const current = await this.getAppointmentById(appointment_id); // throws 404 if missing

    // A Completed or Cancelled appointment is a closed record — rescheduling
    // it after the fact (or reassigning its staff/pet/service) would rewrite
    // history with no trace that it happened, and for a Completed visit,
    // no re-validation of what was actually charged.
    if (["Completed", "Cancelled", "No Show"].includes(current.appointment_status_name)) {
      const err = new Error(
        `A ${current.appointment_status_name} appointment can't be edited.`,
      );
      err.statusCode = 409;
      throw err;
    }

    // Status only moves through its own actions (Confirm Payment -> In
    // Queue, Mark Completed, Mark No Show, Cancel), each of which enforces
    // payment / ownership / email. Editing used to let anyone jump straight
    // to "Completed" or "In Queue" without paying.
    if (status_name && status_name !== current.appointment_status_name) {
      const err = new Error(
        "Status can't be changed by editing — use Confirm Payment, Mark Completed, Mark No Show or Cancel.",
      );
      err.statusCode = 409;
      throw err;
    }

    // Already paid: a different service or pet would no longer match what
    // was charged. (Pending ones are re-priced in the model instead.)
    if (
      current.appointment_status_name === "In Queue" &&
      (String(current.appointment_services_id) !== String(appointment_services_id) ||
        String(current.pets_id) !== String(pets_id))
    ) {
      const err = new Error(
        "This appointment is already paid — its service or pet can't be changed. Cancel it (the payment is flagged for refund) and book again.",
      );
      err.statusCode = 409;
      throw err;
    }

    // Keeping an already-started slot is fine (e.g. adding notes mid-visit);
    // MOVING the appointment into the past is not.
    const newStart = slotStartInstant(appointment_date, start_time);
    if (newStart !== parseManilaTimestamp(current.start_time) && newStart < Date.now()) {
      const err = new Error("Cannot move an appointment into the past");
      err.statusCode = 400;
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
      expected_status_id: current.appointment_status_id,
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
    const isAdmin = isAdminUser(requestingUser);
    // start_time is Manila wall-clock; new Date() parsed it in the server's
    // timezone (UTC on Render), making this cutoff 8 hours late.
    const msUntilStart = parseManilaTimestamp(appointment.start_time) - Date.now();
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

    const updated = await appointmentModel.setAppointmentStatus({
      appointment_id,
      appointment_status_id: noShowStatusId,
      updated_by,
      from_status: appointment.appointment_status_name,
    });
    if (!updated) throw statusChangedError();
    await appointmentModel.cancelPendingPayment(appointment_id, updated_by);
    // Clinic policy: an online deposit is forfeited on a no-show — the bill
    // closes as Completed for the deposit only (no balance is owed).
    await paymentModel.forfeitDeposit(appointment_id, updated_by);
    return updated;
  }

  // The groomer/veterinarian actually assigned to the appointment marks it
  // done once they've finished — not a full "edit" (reschedule, reassign,
  // etc.), just a focused status flip, gated by identity rather than a
  // module CRUD permission: you can only complete the one appointment
  // that's actually yours (Admin can complete any, same override every
  // other appointment action already gives them).
  async completeAppointment(appointment_id, requestingUser) {
    const appointment = await this.getAppointmentById(appointment_id); // throws 404 if missing

    const isAdmin = isAdminUser(requestingUser);
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

    // An online deposit was paid but the balance wasn't collected yet:
    // finishing the visit now would let the client leave without paying it.
    const payment = await paymentModel.getPaymentByAppointmentId(appointment_id);
    if (payment?.payment_status_name === "Partially Paid") {
      const balance = Number(payment.total_amount) - Number(payment.gcash_amount ?? 0);
      const err = new Error(
        `Collect the ₱${balance.toFixed(2)} balance first (Payments → Process on ${payment.control_number}), then complete the visit.`,
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
      from_status: "In Queue",
    });
    if (!updated) throw statusChangedError();

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
    // Not awaited: the response shouldn't wait on an SMTP round trip.
    sendMail({ to: appointment.email, subject, html });

    return updated;
  }

  async selectAppointmentServices() {
    return appointmentModel.selectAppointmentServices();
  }

  async selectStaff() {
    return appointmentModel.selectStaff();
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
    await assertValidManualAmount(service, pets_id, amount);

    return appointmentModel.addAppointmentWithPayment({
      client_id,
      pets_id,
      appointment_services_id,
      assigned_staff_id,
      appointment_date,
      start_time,
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

    await assertValidManualAmount(service, appointment.pets_id, amount);

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