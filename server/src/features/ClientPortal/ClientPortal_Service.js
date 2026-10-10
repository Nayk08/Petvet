import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { sendMail } from "../../config/mailer.js";
import { depositError, minDeposit } from "../../../utils/deposit.js";
import { bookingReceiptEmail } from "../../../utils/emailTemplates.js";
import { UNPAID_HOLD_MINUTES } from "../Appointment/Appointment_Model.js";
import ClientPortalModel from "./ClientPortal_Model.js";
import ClientRecordsService from "../Client_Records/Client_Records_Service.js";
import AppointmentService from "../Appointment/Appointment_Service.js";
import PaymentService from "../Payment/Payment_Service.js";
import MedicalRecordsService from "../MedicalRecords/MedicalRecords_Service.js";

const clientPortalModel = new ClientPortalModel();
const clientRecordsService = new ClientRecordsService();
const appointmentService = new AppointmentService();
const paymentService = new PaymentService();
const medicalRecordsService = new MedicalRecordsService();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Sign-in OTP: after Google, a 6-digit code is emailed and must be entered
// before the session cookie is set. Stateless — the code's HMAC (keyed with
// the server secret, so it can't be brute-forced offline) rides in a
// short-lived signed token; wrong guesses are capped by loginLimiter.
// ponytail: a code stays valid until it expires even after use; store used
// tokens if one-time use ever matters.
export const OTP_MINUTES = 10;
const otpHash = (client_id, code) =>
  crypto
    .createHmac("sha256", process.env.CLIENT_JWT_SECRET)
    .update(`${client_id}:${code}`)
    .digest("hex");
// "kyanvillarin60@gmail.com" -> "ky***@gmail.com"
export const maskEmail = (email) =>
  email.replace(/^(.{1,2})[^@]*@/, (_, start) => `${start}***@`);

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function readOtpToken(otp_token, { ignoreExpiration = false } = {}) {
  try {
    const t = jwt.verify(otp_token, process.env.CLIENT_JWT_SECRET, { ignoreExpiration });
    if (t.purpose === "otp") return t;
  } catch {
    // fall through
  }
  throw httpError(401, "Your sign-in code expired. Please sign in with Google again.");
}

export default class ClientPortalService {
  // Verifies the Google ID token server-side (signature, audience, issuer),
  // then looks up a matching tbl_clients row by email. An unknown email
  // isn't rejected: it gets a short-lived registration token instead, which
  // registerWithGoogle trades for a new client record once the client adds
  // the mobile number Google doesn't provide.
  async loginWithGoogle(credential) {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.email_verified) {
      const err = new Error("Google account email is not verified.");
      err.statusCode = 401;
      throw err;
    }

    const existingClient = await clientPortalModel.findClientByEmail(
      payload.email,
    );
    if (!existingClient) {
      // The email/name come from Google's verified token, never from the
      // browser — signing them here stops a client registering someone
      // else's email in step two.
      const registration_token = jwt.sign(
        { purpose: "register", email: payload.email, name: payload.name, sub: payload.sub },
        process.env.CLIENT_JWT_SECRET,
        { expiresIn: "15m" },
      );
      return {
        needs_registration: true,
        registration_token,
        profile: { name: payload.name ?? "", email: payload.email },
      };
    }

    return this.#startOtp(existingClient, payload.sub);
  }

  // Step two of a first Google sign-in: creates the Client Records row
  // (same insert + duplicate handling as staff "Add Client"), then signs in.
  async registerWithGoogle({ registration_token, client_name, contact_no }) {
    let reg;
    try {
      reg = jwt.verify(registration_token, process.env.CLIENT_JWT_SECRET);
    } catch {
      reg = null;
    }
    if (reg?.purpose !== "register") {
      const err = new Error("Registration expired. Please sign in with Google again.");
      err.statusCode = 401;
      throw err;
    }

    // Registered in another tab meanwhile — just sign in.
    const existingClient = await clientPortalModel.findClientByEmail(reg.email);
    if (existingClient) return this.#startOtp(existingClient, reg.sub);

    const newClient = await clientRecordsService.addClient({
      client_name,
      client_email: reg.email,
      contact_no,
      created_by: "Client Portal",
    });
    return this.#startOtp(newClient, reg.sub);
  }

  // Emails a fresh 6-digit code; the session starts only in verifyOtp.
  async #startOtp(clientRow, google_sub) {
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
    const otp_token = jwt.sign(
      { purpose: "otp", client_id: clientRow.client_id, sub: google_sub, h: otpHash(clientRow.client_id, code) },
      process.env.CLIENT_JWT_SECRET,
      { expiresIn: `${OTP_MINUTES}m` },
    );

    const { sent } = await sendMail({
      to: clientRow.email,
      subject: `Your PetVet sign-in code: ${code}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:420px">
        <p>Use this code to finish signing in to PetVet:</p>
        <p style="font-size:30px;font-weight:bold;letter-spacing:6px;color:#2E7D32">${code}</p>
        <p>It expires in ${OTP_MINUTES} minutes. If you didn't try to sign in, you can ignore this email.</p>
      </div>`,
    });
    if (!sent) {
      // No email set up: a dev machine can read the code from the server
      // log; production can't sign anyone in without it, so say so.
      if (process.env.NODE_ENV === "production") {
        throw httpError(503, "We couldn't send your sign-in code right now. Please try again later.");
      }
      console.log(`[dev] PetVet sign-in code for ${clientRow.email}: ${code}`);
    }

    return { needs_otp: true, otp_token, email: maskEmail(clientRow.email) };
  }

  async verifyOtp({ otp_token, code }) {
    const t = readOtpToken(otp_token);
    const expected = Buffer.from(t.h);
    const given = Buffer.from(otpHash(t.client_id, code));
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
      throw httpError(400, "That code is incorrect. Check your email and try again.");
    }
    const client = await clientPortalModel.getClientById(t.client_id);
    if (!client) throw httpError(401, "This account is no longer active. Please contact the clinic.");
    return this.#signIn(client, t.sub);
  }

  // New code to the same client; works for a while after the old one expired.
  async resendOtp({ otp_token }) {
    const t = readOtpToken(otp_token, { ignoreExpiration: true });
    if (Date.now() / 1000 - t.iat > 60 * 60) {
      throw httpError(401, "Your sign-in code expired. Please sign in with Google again.");
    }
    const client = await clientPortalModel.getClientById(t.client_id);
    if (!client) throw httpError(401, "This account is no longer active. Please contact the clinic.");
    return this.#startOtp(client, t.sub);
  }

  async #signIn(clientRow, google_sub) {
    await clientPortalModel.linkGoogleAccount({
      client_id: clientRow.client_id,
      google_sub,
    });

    const token = jwt.sign(
      { client_id: clientRow.client_id, email: clientRow.email },
      process.env.CLIENT_JWT_SECRET,
      { expiresIn: "7d" },
    );

    return {
      token,
      client: {
        client_id: clientRow.client_id,
        name: clientRow.name,
        email: clientRow.email,
      },
    };
  }

  async getMe(client_id) {
    const client = await clientPortalModel.getClientById(client_id);
    if (!client) {
      const err = new Error("Client not found");
      err.statusCode = 404;
      throw err;
    }
    return client;
  }

  async getMyAppointments({ client_id, page, limit, search, filters }) {
    await appointmentService.expireUnpaidOnlineBookings();
    return clientPortalModel.getMyAppointments({
      client_id,
      page,
      limit,
      search,
      filters,
    });
  }

  async getMyPayments({ client_id, page, limit }) {
    await appointmentService.expireUnpaidOnlineBookings(); // no "Pay Now" on an expired hold
    return clientPortalModel.getMyPayments({ client_id, page, limit });
  }

  // Same ownership check as submitPaymentProof — the payment must be
  // linked to an appointment belonging to the calling client. Bundles the
  // appointment alongside the payment in one response since ReceiptContent
  // (shared with the staff side) needs both to render client/pet/service
  // details, and the client portal has no standalone "get my appointment
  // by id" endpoint to make a second round trip to.
  async getMyPaymentReceipt({ payment_id, client_id }) {
    const payment = await paymentService.getPaymentById(payment_id); // throws 404 if missing

    if (!payment.appointment_id) {
      const err = new Error("Receipt not found");
      err.statusCode = 404;
      throw err;
    }

    const appointment = await appointmentService.getAppointmentById(
      payment.appointment_id,
    );
    if (String(appointment.client_id) !== String(client_id)) {
      const err = new Error("You don't have access to this payment.");
      err.statusCode = 403;
      throw err;
    }

    // Completed, or Partially Paid (reservation fee verified; the receipt
    // shows the balance still due at the clinic).
    if (!["Completed", "Partially Paid"].includes(payment.payment_status_name)) {
      const err = new Error(
        "A receipt is available once your payment has been verified by the clinic.",
      );
      err.statusCode = 409;
      throw err;
    }

    return { payment, appointment };
  }

  async getMyPets({ client_id, page, limit, search }) {
    return clientRecordsService.getClienPetById({
      client_id,
      page,
      limit,
      search,
    });
  }

  async getMyPetHistory({ pets_id, client_id }) {
    const pet = await clientRecordsService.getPetById(pets_id); // throws if missing
    if (String(pet.client_id) !== String(client_id)) {
      const err = new Error("You don't have access to this pet's history.");
      err.statusCode = 403;
      throw err;
    }
    return appointmentService.getAppointmentHistoryForPet(pets_id);
  }

  async getMyPetMedicalRecords({ pets_id, client_id }) {
    const pet = await clientRecordsService.getPetById(pets_id); // throws if missing
    if (String(pet.client_id) !== String(client_id)) {
      const err = new Error("You don't have access to this pet's medical records.");
      err.statusCode = 403;
      throw err;
    }
    return medicalRecordsService.getPetMedicalRecords(pets_id);
  }

  async addMyPet({
    client_id,
    pets_name,
    breed,
    is_spayed_neutered,
    date_of_birth,
    weight_kg,
    species_id,
    gender_id,
    allergies,
    medical_conditions,
    temperament,
  }) {
    const pet_status_id = await clientPortalModel.getDefaultPetStatusId();
    if (!pet_status_id) {
      const err = new Error("Pet status is not configured. Please contact the clinic.");
      err.statusCode = 500;
      throw err;
    }

    return clientRecordsService.addPet({
      client_id,
      pets_name,
      breed,
      is_spayed_neutered,
      date_of_birth,
      weight_kg,
      pet_status_id,
      species_id,
      gender_id,
      pet_image: null,
      allergies,
      medical_conditions,
      temperament,
      created_by: "Client Portal",
    });
  }

  // Both show which slots are taken — release abandoned online bookings first.
  async getClinicSchedule({ start_date, end_date }) {
    await appointmentService.expireUnpaidOnlineBookings();
    return clientPortalModel.getClinicSchedule({ start_date, end_date });
  }

  async getStaffBookedSlots({ assigned_staff_id, appointment_date }) {
    await appointmentService.expireUnpaidOnlineBookings();
    return clientPortalModel.getStaffBookedSlots({
      assigned_staff_id,
      appointment_date,
    });
  }

  // Read-only lookups the booking form needs — same underlying data the
  // staff booking form uses, just re-exposed behind client-portal auth
  // instead of staff RBAC permissions.
  async selectSpecies() {
    return clientRecordsService.selectSpecies();
  }

  async selectGender() {
    return clientRecordsService.selectGender();
  }

  async getPublicProducts() {
    return clientPortalModel.getPublicProducts();
  }

  async selectAppointmentServices() {
    return appointmentService.selectAppointmentServices();
  }

  async selectStaff() {
    return appointmentService.selectStaff();
  }

  // client_id is always taken from the authenticated JWT (passed in here
  // by the controller) — never trusted from the request body — so a
  // client can only ever book an appointment for themselves. pets_id DOES
  // come from the body though, so it still needs an explicit ownership
  // check here — otherwise any authenticated client could book (and later
  // pay for) an appointment against another client's pet just by guessing
  // or enumerating a pets_id.
  async bookAppointment({
    client_id,
    pets_id,
    appointment_services_id,
    assigned_staff_id,
    appointment_date,
    start_time,
    notes,
  }) {
    const pet = await clientRecordsService.getPetById(pets_id);
    if (String(pet.client_id) !== String(client_id)) {
      const err = new Error("You can only book appointments for your own pets.");
      err.statusCode = 403;
      throw err;
    }

    // A sub-service with no fixed price can still be booked: its bill opens
    // at ₱0 and staff enter the real amount when the client pays at the
    // clinic. (Online GCash payment is refused for it — see
    // Payment_Service.submitOnlinePaymentProof.)
    const appointment = await appointmentService.addAppointment({
      client_id,
      pets_id,
      appointment_services_id,
      assigned_staff_id,
      appointment_date,
      start_time,
      notes,
      created_by: "Client Portal",
    });

    // addAppointment creates a Pending payment row as a side effect but
    // doesn't return it (see Appointment_Model.js) — fetched separately so
    // the portal can open the GCash payment modal immediately with a real
    // payment_id, instead of the client having to find it later under
    // Payment History.
    const payment = await paymentService.getPaymentByAppointmentId(
      appointment.appointment_id,
    );

    this.#emailBookingReceipt(
      appointmentService
        .getAppointmentById(appointment.appointment_id) // full row: email, pet, service, staff
        .then((details) => [{ appointment: details, payment }]),
    );

    return { ...appointment, payment };
  }

  // Several pets / services / times in ONE booking: all-or-nothing, one
  // bill per appointment tagged with a shared booking_group, paid together
  // with one GCash proof (submitGroupPaymentProof).
  async bookAppointmentGroup({ client_id, items }) {
    // The group is paid online in one go, so every item needs a price; a
    // service priced at the clinic is booked on its own.
    for (const [index, item] of items.entries()) {
      const price = await appointmentService.getEffectivePrice(item.appointment_services_id, item.pets_id);
      if (price == null) {
        const err = new Error(
          `Item ${index + 1}: this service is priced at the clinic, so it can't be paid online with other appointments. Book it on its own.`,
        );
        err.statusCode = 400;
        throw err;
      }
    }
    // Pet ownership is also checked per item inside the booking transaction.
    const result = await appointmentService.addAppointmentGroup({
      client_id,
      items,
      created_by: "Client Portal",
    });
    const rows = await appointmentService.getBookingGroup(result.booking_group);
    this.#emailBookingReceipt(Promise.resolve(groupItems(rows)));
    return {
      booking_group: result.booking_group,
      items: groupItems(rows),
      total_amount: centsSum(rows.map((r) => Number(r.total_amount))),
      reservation_fee: centsSum(rows.map((r) => minDeposit(Number(r.total_amount)))),
      unpriced: rows.some((r) => !(Number(r.total_amount) > 0)),
    };
  }

  // Throws unless every appointment in the group is this client's.
  async #getOwnGroup(booking_group, client_id) {
    const rows = await appointmentService.getBookingGroup(booking_group); // 404 if none
    if (rows.some((r) => String(r.client_id) !== String(client_id))) {
      const err = new Error("You don't have access to this booking.");
      err.statusCode = 403;
      throw err;
    }
    return rows;
  }

  // One GCash payment (reservation fee or full) for a whole group booking.
  async submitGroupPaymentProof({ booking_group, client_id, gcash_reference_number, amount_paid, payment_proof_image }) {
    // Apply the 10-minute hold first, so a late proof is refused consistently.
    await appointmentService.expireUnpaidOnlineBookings();
    const rows = await this.#getOwnGroup(booking_group, client_id);
    if (rows.every((r) => r.payment_status_name === "Cancelled")) {
      const err = new Error(
        "This booking expired because no payment was submitted within 10 minutes, and the time slots were released. Please book again. If you already sent money by GCash, contact the clinic with your reference number.",
      );
      err.statusCode = 409;
      throw err;
    }
    return paymentService.submitGroupOnlinePaymentProof({
      booking_group,
      gcash_reference_number,
      payment_proof_image,
      amount_sent: amount_paid,
    });
  }

  // Backs out of a whole unpaid group booking (same rules as one booking).
  async cancelMyUnpaidGroup({ booking_group, client_id }) {
    const rows = await this.#getOwnGroup(booking_group, client_id);
    const open = rows.filter((r) => !["Cancelled", "No Show", "Completed"].includes(r.appointment_status_name));
    for (const r of open) {
      await this.cancelMyUnpaidAppointment({ appointment_id: r.appointment_id, client_id });
    }
    return { cancelled: open.length };
  }

  // Booking receipt to the client's email. Not awaited: the booking already
  // succeeded, and a slow or failing mail server must not change that
  // (sendMail itself never throws). itemsPromise: [{ appointment, payment }].
  #emailBookingReceipt(itemsPromise) {
    itemsPromise
      .then((items) => {
        const { subject, html } = bookingReceiptEmail({
          items,
          reservationFee: centsSum(items.map((i) => minDeposit(Number(i.payment?.total_amount) || 0))),
          holdMinutes: UNPAID_HOLD_MINUTES,
        });
        return sendMail({ to: items[0].appointment.email, subject, html });
      })
      .catch((error) => console.log("Booking receipt email failed:", error.message));
  }

  // A client backing out of a booking they haven't paid for. Only their own,
  // only while still unpaid (Pending, no GCash proof sent) — a paid one needs
  // a refund, which stays with the clinic. Goes through the normal cancel,
  // so the 2-hour rule applies, the unpaid bill is cancelled and the time
  // slot is released.
  async cancelMyUnpaidAppointment({ appointment_id, client_id }) {
    const appointment = await appointmentService.getAppointmentById(appointment_id);
    if (String(appointment.client_id) !== String(client_id)) {
      const err = new Error("You can only cancel your own appointments.");
      err.statusCode = 403;
      throw err;
    }
    if (["Cancelled", "No Show", "Completed"].includes(appointment.appointment_status_name)) {
      const err = new Error(`This booking is already ${appointment.appointment_status_name}.`);
      err.statusCode = 409;
      throw err;
    }
    const payment = await paymentService
      .getPaymentByAppointmentId(appointment_id)
      .catch(() => null);
    if (
      appointment.appointment_status_name !== "Pending" ||
      (payment && payment.payment_status_name !== "Pending")
    ) {
      const err = new Error(
        "This appointment is already paid or being verified — please contact the clinic to cancel it.",
      );
      err.statusCode = 409;
      throw err;
    }
    return appointmentService.cancelAppointment(appointment_id, {
      name: "Client Portal",
      role: "Client",
      roles: [],
    });
  }

  // Anyone with a valid client JWT could otherwise submit proof for ANY
  // payment_id by guessing — this is the ownership check that stops that.
  // A payment with no appointment_id is a cart/INV checkout, which the
  // client portal has no concept of at all, so that's also rejected.
  async submitPaymentProof({
    payment_id,
    client_id,
    gcash_reference_number,
    amount_paid,
    payment_proof_image,
  }) {
    // Apply the 10-minute hold first, so a late proof is refused consistently.
    await appointmentService.expireUnpaidOnlineBookings();
    const payment = await paymentService.getPaymentById(payment_id); // throws 404 if missing

    if (payment.is_deleted && payment.deleted_by === "System") {
      const err = new Error(
        "This booking expired because no payment was submitted within 10 minutes, and the time slot was released. Please book again. If you already sent money by GCash, contact the clinic with your reference number.",
      );
      err.statusCode = 409;
      throw err;
    }

    if (!payment.appointment_id) {
      const err = new Error("Payment not found");
      err.statusCode = 404;
      throw err;
    }

    const appointment = await appointmentService.getAppointmentById(
      payment.appointment_id,
    );
    if (String(appointment.client_id) !== String(client_id)) {
      const err = new Error("You don't have access to this payment.");
      err.statusCode = 403;
      throw err;
    }

    // At least 50% online, up to the full bill; the rest is paid at the
    // clinic. Staff verify this amount against the screenshot.
    const amountError = depositError(payment.total_amount, amount_paid);
    if (amountError) {
      const err = new Error(amountError);
      err.statusCode = 400;
      throw err;
    }

    return paymentService.submitOnlinePaymentProof({
      payment_id,
      gcash_reference_number,
      payment_proof_image,
      amount_sent: amount_paid,
    });
  }

  // Read-only for clients — only staff can upload/replace the QR code
  // (see Payment_Route.js:PATCH /payments/gcash-qr-code).
  async getGcashQrCode() {
    return paymentService.getGcashQrCode();
  }
}

// getBookingGroup rows (appointment + bill columns) -> [{ appointment, payment }].
function groupItems(rows) {
  return rows.map((r) => ({
    appointment: r,
    payment: {
      payment_id: r.payment_id,
      total_amount: r.total_amount,
      payment_status_name: r.payment_status_name,
      control_number: r.control_number,
    },
  }));
}

// Adds peso amounts without floating-point drift (to the centavo).
const centsSum = (amounts) => amounts.reduce((sum, a) => sum + Math.round(a * 100), 0) / 100;
