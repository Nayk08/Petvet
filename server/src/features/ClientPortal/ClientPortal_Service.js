import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import ClientPortalModel from "./ClientPortal_Model.js";
import ClientRecordsService from "../Client_Records/Client_Records_Service.js";
import AppointmentService from "../Appointment/Appointment_Service.js";
import PaymentService from "../Payment/Payment_Service.js";

const clientPortalModel = new ClientPortalModel();
const clientRecordsService = new ClientRecordsService();
const appointmentService = new AppointmentService();
const paymentService = new PaymentService();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export default class ClientPortalService {
  // Verifies the Google ID token server-side (signature, audience, issuer),
  // then looks up a matching tbl_clients row by email. Never creates a new
  // client record — Google sign-in only links an EXISTING record a staff
  // member already created; someone the clinic has never seen gets a
  // clear rejection instead of a self-registered account.
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
      const err = new Error(
        "No client record found for this email. Please visit the clinic to register first.",
      );
      err.statusCode = 403;
      throw err;
    }

    await clientPortalModel.linkGoogleAccount({
      client_id: existingClient.client_id,
      google_sub: payload.sub,
    });

    const token = jwt.sign(
      { client_id: existingClient.client_id, email: existingClient.email },
      process.env.CLIENT_JWT_SECRET,
      { expiresIn: "7d" },
    );

    return {
      token,
      client: {
        client_id: existingClient.client_id,
        name: existingClient.name,
        email: existingClient.email,
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
    return clientPortalModel.getMyAppointments({
      client_id,
      page,
      limit,
      search,
      filters,
    });
  }

  async getMyPayments({ client_id, page, limit }) {
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

    if (payment.payment_status_name !== "Completed") {
      const err = new Error(
        "A receipt is only available once this payment is completed.",
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

  async getClinicSchedule({ start_date, end_date }) {
    return clientPortalModel.getClinicSchedule({ start_date, end_date });
  }

  async getStaffBookedSlots({ assigned_staff_id, appointment_date }) {
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

  async selectAppointmentServices() {
    return appointmentService.selectAppointmentServices();
  }

  async selectStaff() {
    return appointmentService.selectStaff();
  }

  async getGroomingPriceTiers() {
    return appointmentService.getGroomingPriceTiers();
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
    end_time,
    notes,
  }) {
    const pet = await clientRecordsService.getPetById(pets_id);
    if (String(pet.client_id) !== String(client_id)) {
      const err = new Error("You can only book appointments for your own pets.");
      err.statusCode = 403;
      throw err;
    }

    const appointment = await appointmentService.addAppointment({
      client_id,
      pets_id,
      appointment_services_id,
      assigned_staff_id,
      appointment_date,
      start_time,
      end_time,
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

    return { ...appointment, payment };
  }

  // Anyone with a valid client JWT could otherwise submit proof for ANY
  // payment_id by guessing — this is the ownership check that stops that.
  // A payment with no appointment_id is a cart/INV checkout, which the
  // client portal has no concept of at all, so that's also rejected.
  async submitPaymentProof({
    payment_id,
    client_id,
    gcash_reference_number,
    payment_proof_image,
  }) {
    const payment = await paymentService.getPaymentById(payment_id); // throws 404 if missing

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

    return paymentService.submitOnlinePaymentProof({
      payment_id,
      gcash_reference_number,
      payment_proof_image,
    });
  }

  // Read-only for clients — only staff can upload/replace the QR code
  // (see Payment_Route.js:PATCH /payments/gcash-qr-code).
  async getGcashQrCode() {
    return paymentService.getGcashQrCode();
  }
}
