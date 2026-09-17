import ClientPortalService from "./ClientPortal_Service.js";

const clientPortalService = new ClientPortalService();

export default class ClientPortalController {
  async loginWithGoogle(req, res) {
    try {
      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({ message: "Missing Google credential" });
      }
      const result = await clientPortalService.loginWithGoogle(credential);
      res.json(result);
    } catch (error) {
      console.log("Error on Controller loginWithGoogle function");
      res.status(error.statusCode || 401).json({ message: error.message });
    }
  }

  async getMe(req, res) {
    try {
      const client = await clientPortalService.getMe(req.clientUser.client_id);
      res.json(client);
    } catch (error) {
      console.log("Error on Controller getMe function");
      res.status(error.statusCode || 500).json({ message: error.message });
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
      res.status(error.statusCode || 500).json({ message: error.message });
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
      res.status(error.statusCode || 500).json({ message: error.message });
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
      res.status(error.statusCode || 500).json({ message: error.message });
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
      res.status(error.statusCode || 500).json({ message: error.message });
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
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async selectAppointmentServices(req, res) {
    try {
      const services = await clientPortalService.selectAppointmentServices();
      res.json(services);
    } catch (error) {
      console.log("Error on Controller selectAppointmentServices function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async selectStaff(req, res) {
    try {
      const staff = await clientPortalService.selectStaff();
      res.json(staff);
    } catch (error) {
      console.log("Error on Controller selectStaff function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async getGroomingPriceTiers(req, res) {
    try {
      const tiers = await clientPortalService.getGroomingPriceTiers();
      res.json(tiers);
    } catch (error) {
      console.log("Error on Controller getGroomingPriceTiers function");
      res.status(error.statusCode || 500).json({ message: error.message });
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
      res.status(error.statusCode || 500).json({ message: error.message });
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
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async getGcashQrCode(req, res) {
    try {
      const settings = await clientPortalService.getGcashQrCode();
      res.json(settings);
    } catch (error) {
      console.log("Error on Controller getGcashQrCode function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }
}
