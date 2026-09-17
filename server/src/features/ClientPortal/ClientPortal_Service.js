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

  async getMyPets({ client_id, page, limit, search }) {
    return clientRecordsService.getClienPetById({
      client_id,
      page,
      limit,
      search,
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
  // client can only ever book an appointment for themselves.
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
    return appointmentService.addAppointment({
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
