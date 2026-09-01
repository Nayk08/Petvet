import AppointmentService from "./Appointment_Service.js";

const appointmentService = new AppointmentService();

export default class AppointmentController {
  async getAppointments(req, res) {
    try {
      const {
        page,
        limit,
        search,
        appointment_status_name,
        service_name,
        assigned_staff_id,
        appointment_date,
      } = req.query;
      const filters = {
        appointment_status_name,
        service_name,
        assigned_staff_id,
        appointment_date,
      };

      const result = await appointmentService.getAppointments({
        page,
        limit,
        search,
        filters,
      });
      res.json(result);
    } catch (error) {
      console.log("Error on Controller getAppointments function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async getConsultationAppointments(req, res) {
    try {
      const { page, limit, search, appointment_status_name, assigned_staff_id, appointment_date } =
        req.query;
      const filters = {
        appointment_status_name,
        assigned_staff_id,
        appointment_date,
        service_name: "Consultation",
      };

      const result = await appointmentService.getAppointments({
        page,
        limit,
        search,
        filters,
      });
      res.json(result);
    } catch (error) {
      console.log("Error on Controller getConsultationAppointments function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async getGroomingAppointments(req, res) {
    try {
      const { page, limit, search, appointment_status_name, assigned_staff_id, appointment_date } =
        req.query;
      const filters = {
        appointment_status_name,
        assigned_staff_id,
        appointment_date,
        service_name: "Grooming",
      };

      const result = await appointmentService.getAppointments({
        page,
        limit,
        search,
        filters,
      });
      res.json(result);
    } catch (error) {
      console.log("Error on Controller getGroomingAppointments function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async getOperationAppointments(req, res) {
    try {
      const { page, limit, search, appointment_status_name, assigned_staff_id, appointment_date } =
        req.query;
      const filters = {
        appointment_status_name,
        assigned_staff_id,
        appointment_date,
        service_name: "Operation",
      };

      const result = await appointmentService.getAppointments({
        page,
        limit,
        search,
        filters,
      });
      res.json(result);
    } catch (error) {
      console.log("Error on Controller getOperationAppointments function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async getAppointmentById(req, res) {
    try {
      const appointment = await appointmentService.getAppointmentById(
        req.params.appointment_id,
      );
      res.json(appointment);
    } catch (error) {
      console.log("Error on Controller getAppointmentById function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async addAppointment(req, res) {
    try {
      const {
        client_id,
        pets_id,
        appointment_services_id,
        assigned_staff_id,
        appointment_date,
        start_time,
        end_time,
        notes,
      } = req.body;

      const appointment = await appointmentService.addAppointment({
        client_id,
        pets_id,
        appointment_services_id,
        assigned_staff_id,
        appointment_date,
        start_time,
        end_time,
        notes,
        created_by: req.session.user.name,
      });
      res.status(201).json(appointment);
    } catch (error) {
      console.log("Error on Controller addAppointment function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async editAppointment(req, res) {
    try {
      const {
        pets_id,
        appointment_services_id,
        assigned_staff_id,
        appointment_date,
        start_time,
        end_time,
        status_name,
        notes,
      } = req.body;

      const appointment = await appointmentService.editAppointment({
        appointment_id: req.params.appointment_id,
        pets_id,
        appointment_services_id,
        assigned_staff_id,
        appointment_date,
        start_time,
        end_time,
        status_name,
        notes,
        updated_by: req.session.user.name,
      });
      res.json(appointment);
    } catch (error) {
      console.log("Error on Controller editAppointment function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async cancelAppointment(req, res) {
    try {
      const appointment = await appointmentService.cancelAppointment(
        req.params.appointment_id,
        req.session.user.name,
      );
      res.json(appointment);
    } catch (error) {
      console.log("Error on Controller cancelAppointment function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async selectAppointmentServices(req, res) {
    try {
      const services = await appointmentService.selectAppointmentServices();
      res.json(services);
    } catch (error) {
      console.log("Error on Controller selectAppointmentServices function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async selectStaff(req, res) {
    try {
      const staff = await appointmentService.selectStaff();
      res.json(staff);
    } catch (error) {
      console.log("Error on Controller selectStaff function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }
}