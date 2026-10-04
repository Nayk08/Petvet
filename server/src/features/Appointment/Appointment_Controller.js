import { isAdmin as isAdminUser } from "../../../utils/isAdmin.js";
import AppointmentService from "./Appointment_Service.js";
import { sendError } from "../../../utils/errorResponse.js";

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
        category_name,
        assigned_staff_id,
        appointment_date,
      } = req.query;
      const filters = {
        appointment_status_name,
        service_name,
        category_name,
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
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  // Non-admin staff only ever see their own caseload on the
  // Consultation/Grooming/Operation module pages — the assigned_staff_id
  // filter is forced to their own id, overriding whatever the client sent,
  // so it can't be bypassed by editing the query string. Admin keeps full
  // visibility and can still use the staff filter normally.
  resolveStaffFilter(req, requestedStaffId) {
    const isAdmin = isAdminUser(req.session.user);
    return isAdmin ? requestedStaffId : String(req.session.user.id);
  }

  async getConsultationAppointments(req, res) {
    try {
      const { page, limit, search, appointment_status_name, assigned_staff_id, appointment_date } =
        req.query;
      const filters = {
        appointment_status_name,
        assigned_staff_id: this.resolveStaffFilter(req, assigned_staff_id),
        appointment_date,
        category_name: "Consultation",
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
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async getGroomingAppointments(req, res) {
    try {
      const { page, limit, search, appointment_status_name, assigned_staff_id, appointment_date } =
        req.query;
      const filters = {
        appointment_status_name,
        assigned_staff_id: this.resolveStaffFilter(req, assigned_staff_id),
        appointment_date,
        category_name: "Grooming",
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
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async getOperationAppointments(req, res) {
    try {
      const { page, limit, search, appointment_status_name, assigned_staff_id, appointment_date } =
        req.query;
      const filters = {
        appointment_status_name,
        assigned_staff_id: this.resolveStaffFilter(req, assigned_staff_id),
        appointment_date,
        category_name: "Operation",
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
      sendError(res, error, "Something went wrong. Please try again.");
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
      sendError(res, error, "Something went wrong. Please try again.");
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
        notes,
      } = req.body;

      const appointment = await appointmentService.addAppointment({
        client_id,
        pets_id,
        appointment_services_id,
        assigned_staff_id,
        appointment_date,
        start_time,
        notes,
        created_by: req.session.user.name,
      });
      res.status(201).json(appointment);
    } catch (error) {
      console.log("Error on Controller addAppointment function");
      sendError(res, error, "Something went wrong. Please try again.");
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
        status_name,
        notes,
        updated_by: req.session.user.name,
      });
      res.json(appointment);
    } catch (error) {
      console.log("Error on Controller editAppointment function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async cancelAppointment(req, res) {
    try {
      const appointment = await appointmentService.cancelAppointment(
        req.params.appointment_id,
        req.session.user,
      );
      res.json(appointment);
    } catch (error) {
      console.log("Error on Controller cancelAppointment function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async markNoShow(req, res) {
    try {
      const appointment = await appointmentService.markNoShow(
        req.params.appointment_id,
        req.session.user.name,
      );
      res.json(appointment);
    } catch (error) {
      console.log("Error on Controller markNoShow function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async completeAppointment(req, res) {
    try {
      const appointment = await appointmentService.completeAppointment(
        req.params.appointment_id,
        req.session.user,
      );
      res.json(appointment);
    } catch (error) {
      console.log("Error on Controller completeAppointment function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async selectAppointmentServices(req, res) {
    try {
      const services = await appointmentService.selectAppointmentServices();
      res.json(services);
    } catch (error) {
      console.log("Error on Controller selectAppointmentServices function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async selectStaff(req, res) {
    try {
      const staff = await appointmentService.selectStaff();
      res.json(staff);
    } catch (error) {
      console.log("Error on Controller selectStaff function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async bookAppointmentWithPayment(req, res) {
    try {
      const {
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
      } = req.body;

      const result = await appointmentService.bookAppointmentWithPayment({
        client_id,
        pets_id,
        appointment_services_id,
        assigned_staff_id,
        appointment_date,
        start_time,
        notes,
        payment_method,
        gcash_reference_number,
        cash_received,
        gcash_received,
        additional_fee_label,
        additional_fee_amount,
        amount,
        created_by: req.session.user.name,
      });
      res.status(201).json(result);
    } catch (error) {
      console.log("Error on Controller bookAppointmentWithPayment function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async completeAppointmentPayment(req, res) {
    try {
      const {
        amount,
        payment_method,
        gcash_reference_number,
        cash_received,
        gcash_received,
        additional_fee_label,
        additional_fee_amount,
      } = req.body;

      const result = await appointmentService.completeAppointmentPayment({
        appointment_id: req.params.appointment_id,
        amount,
        payment_method,
        gcash_reference_number,
        cash_received,
        gcash_received,
        additional_fee_label,
        additional_fee_amount,
        updated_by: req.session.user.name,
      });
      res.json(result);
    } catch (error) {
      console.log("Error on Controller completeAppointmentPayment function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }
}