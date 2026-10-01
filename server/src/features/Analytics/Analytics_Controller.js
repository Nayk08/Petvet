import AnalyticsService from "./Analytics_Service.js";
import { sendError } from "../../../utils/errorResponse.js";

const analyticsService = new AnalyticsService();

export default class AnalyticsController {
  async getRevenueTrend(req, res) {
    try {
      const { start_date, end_date } = req.query;
      const result = await analyticsService.getRevenueTrend({
        start_date,
        end_date,
      });
      res.json(result);
    } catch (error) {
      console.log("Error on Controller getRevenueTrend function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async getAppointmentsBreakdown(req, res) {
    try {
      const { start_date, end_date } = req.query;
      const result = await analyticsService.getAppointmentsBreakdown({
        start_date,
        end_date,
      });
      res.json(result);
    } catch (error) {
      console.log("Error on Controller getAppointmentsBreakdown function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async getTopProducts(req, res) {
    try {
      const { start_date, end_date, limit } = req.query;
      const result = await analyticsService.getTopProducts({
        start_date,
        end_date,
        limit,
      });
      res.json(result);
    } catch (error) {
      console.log("Error on Controller getTopProducts function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async getClientGrowth(req, res) {
    try {
      const { start_date, end_date } = req.query;
      const result = await analyticsService.getClientGrowth({
        start_date,
        end_date,
      });
      res.json(result);
    } catch (error) {
      console.log("Error on Controller getClientGrowth function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async getProductMovers(req, res) {
    try {
      const { month } = req.query;
      const result = await analyticsService.getProductMovers({ month });
      res.json(result);
    } catch (error) {
      console.log("Error on Controller getProductMovers function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async getPeakTimes(req, res) {
    try {
      const { start_date, end_date } = req.query;
      const result = await analyticsService.getPeakTimes({ start_date, end_date });
      res.json(result);
    } catch (error) {
      console.log("Error on Controller getPeakTimes function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }

  async getCriticalStock(req, res) {
    try {
      const result = await analyticsService.getCriticalStock();
      res.json(result);
    } catch (error) {
      console.log("Error on Controller getCriticalStock function");
      sendError(res, error, "Something went wrong. Please try again.");
    }
  }
}
