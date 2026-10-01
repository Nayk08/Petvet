import ClientPortalService from "./ClientPortal_Service.js";
import { sendError } from "../../../utils/errorResponse.js";
import { CLIENT_TOKEN_COOKIE } from "../../middleware/is-client-auth.js";

const clientPortalService = new ClientPortalService();

// Same security properties as the staff session cookie (see app.js) —
// httpOnly so no script on the page can read it, secure in production,
// sameSite matching. 7 days to match the JWT's own expiresIn.
const CLIENT_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 1000 * 60 * 60 * 24 * 7,
};

export default class ClientPortalController {
  async loginWithGoogle(req, res) {
    try {
      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({ message: "Missing Google credential" });
      }
      const { token, client } = await clientPortalService.loginWithGoogle(credential);
      res.cookie(CLIENT_TOKEN_COOKIE, token, CLIENT_TOKEN_COOKIE_OPTIONS);
      // Deliberately NOT echoing the token back in the body — an httpOnly
      // cookie the browser stores for us defeats the purpose if the JSON
      // response then hands the same token to page JS anyway.
      res.json({ client });
    } catch (error) {
      console.log("Error on Controller loginWithGoogle function");
      sendError(res, error, "Could not sign in with Google. Please try again.");
    }
  }

  async logout(req, res) {
    res.clearCookie(CLIENT_TOKEN_COOKIE, CLIENT_TOKEN_COOKIE_OPTIONS);
    res.json({ message: "Logged out" });
  }

  async getMe(req, res) {
    try {
      const client = await clientPortalService.getMe(req.clientUser.client_id);
      res.json(client);
    } catch (error) {
      console.log("Error on Controller getMe function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async getMyAppointments(req, res) {
    try {
      const {
        page,
        limit,
        search,
        appointment_status_name,
      } = req.query;
      const result = await clientPortalService.getMyAppointments({
        client_id: req.clientUser.client_id,
        page,
        limit,
        search,
        filters: { appointment_status_name },
      });
      res.json(result);
    } catch (error) {
      console.log("Error on Controller getMyAppointments function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async getMyPayments(req, res) {
    try {
      const { page, limit } = req.query;
      const result = await clientPortalService.getMyPayments({
        client_id: req.clientUser.client_id,
        page,
        limit,
      });
      res.json(result);
    } catch (error) {
      console.log("Error on Controller getMyPayments function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async getMyPaymentReceipt(req, res) {
    try {
      const receipt = await clientPortalService.getMyPaymentReceipt({
        payment_id: req.params.id,
        client_id: req.clientUser.client_id,
      });
      res.json(receipt);
    } catch (error) {
      console.log("Error on Controller getMyPaymentReceipt function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async getMyPets(req, res) {
    try {
      const { page, limit, search } = req.query;
      const result = await clientPortalService.getMyPets({
        client_id: req.clientUser.client_id,
        page,
        limit,
        search,
      });
      res.json(result);
    } catch (error) {
      console.log("Error on Controller getMyPets function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async getMyPetHistory(req, res) {
    try {
      const history = await clientPortalService.getMyPetHistory({
        pets_id: req.params.pets_id,
        client_id: req.clientUser.client_id,
      });
      res.json(history);
    } catch (error) {
      console.log("Error on Controller getMyPetHistory function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async addMyPet(req, res) {
    try {
      const {
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
      } = req.body;
      const pet = await clientPortalService.addMyPet({
        client_id: req.clientUser.client_id,
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
      });
      res.status(201).json(pet);
    } catch (error) {
      console.log("Error on Controller addMyPet function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async getClinicSchedule(req, res) {
    try {
      const { start_date, end_date } = req.query;
      const result = await clientPortalService.getClinicSchedule({
        start_date,
        end_date,
      });
      res.json(result);
    } catch (error) {
      console.log("Error on Controller getClinicSchedule function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async getStaffBookedSlots(req, res) {
    try {
      const { assigned_staff_id, appointment_date } = req.query;
      const result = await clientPortalService.getStaffBookedSlots({
        assigned_staff_id,
        appointment_date,
      });
      res.json(result);
    } catch (error) {
      console.log("Error on Controller getStaffBookedSlots function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async selectSpecies(req, res) {
    try {
      const species = await clientPortalService.selectSpecies();
      res.json(species);
    } catch (error) {
      console.log("Error on Controller selectSpecies function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async selectGender(req, res) {
    try {
      const gender = await clientPortalService.selectGender();
      res.json(gender);
    } catch (error) {
      console.log("Error on Controller selectGender function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async selectAppointmentServices(req, res) {
    try {
      const services = await clientPortalService.selectAppointmentServices();
      res.json(services);
    } catch (error) {
      console.log("Error on Controller selectAppointmentServices function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async selectStaff(req, res) {
    try {
      const staff = await clientPortalService.selectStaff();
      res.json(staff);
    } catch (error) {
      console.log("Error on Controller selectStaff function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async getGroomingPriceTiers(req, res) {
    try {
      const tiers = await clientPortalService.getGroomingPriceTiers();
      res.json(tiers);
    } catch (error) {
      console.log("Error on Controller getGroomingPriceTiers function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async bookAppointment(req, res) {
    try {
      const {
        pets_id,
        appointment_services_id,
        assigned_staff_id,
        appointment_date,
        start_time,
        end_time,
        notes,
      } = req.body;
      const appointment = await clientPortalService.bookAppointment({
        client_id: req.clientUser.client_id,
        pets_id,
        appointment_services_id,
        assigned_staff_id,
        appointment_date,
        start_time,
        end_time,
        notes,
      });
      res.status(201).json(appointment);
    } catch (error) {
      console.log("Error on Controller bookAppointment function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async submitPaymentProof(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No payment screenshot uploaded" });
      }
      const { gcash_reference_number } = req.body;
      const payment = await clientPortalService.submitPaymentProof({
        payment_id: req.params.id,
        client_id: req.clientUser.client_id,
        gcash_reference_number,
        payment_proof_image: req.file.path,
      });
      res.json(payment);
    } catch (error) {
      console.log("Error on Controller submitPaymentProof function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async getGcashQrCode(req, res) {
    try {
      const settings = await clientPortalService.getGcashQrCode();
      res.json(settings);
    } catch (error) {
      console.log("Error on Controller getGcashQrCode function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }
}
