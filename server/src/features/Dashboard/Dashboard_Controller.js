import DashboardService from "./Dashboard_Service.js";
import { sendError } from "../../../utils/errorResponse.js";

const dashboardService = new DashboardService();

export default class DashboardController {
  async getTodayAppointments(req, res) {
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

      const result = await dashboardService.getTodayAppointments({
        page,
        limit,
        search,
        filters,
      });
      res.json(result);
    } catch (error) {
      console.log("Error on Controller getTodayAppointments function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async getTodayPayments(req, res) {
    try {
      const { page, limit, search, ...filters } = req.query;
      const result = await dashboardService.getTodayPayments({
        page,
        limit,
        search,
        filters,
      });
      res.json(result);
    } catch (error) {
      console.log("Error on Controller getTodayPayments function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async getTodayRevenueTransactions(req, res) {
    try {
      const { type, method, search, page, limit } = req.query;
      const result = await dashboardService.getTodayRevenueTransactions({
        type,
        method,
        search,
        page,
        limit,
      });
      res.json(result);
    } catch (error) {
      console.log("Error on Controller getTodayRevenueTransactions function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }
}
