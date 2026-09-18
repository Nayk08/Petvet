import AnalyticsService from "./Analytics_Service.js";

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
      res.status(error.statusCode || 500).json({ message: error.message });
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
      res.status(error.statusCode || 500).json({ message: error.message });
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
      res.status(error.statusCode || 500).json({ message: error.message });
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
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  async getProductMovers(req, res) {
    try {
      const { month } = req.query;
      const result = await analyticsService.getProductMovers({ month });
      res.json(result);
    } catch (error) {
      console.log("Error on Controller getProductMovers function");
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  }
}
