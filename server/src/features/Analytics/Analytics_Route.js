import { Router } from "express";
import hasPermission from "../../middleware/has-permission.js";
import AnalyticsController from "./Analytics_Controller.js";

const router = Router();
const analyticsController = new AnalyticsController();

router.get(
  "/analytics/revenue-trend",
  hasPermission("ANALYTICS", "can_view"),
  (req, res) => analyticsController.getRevenueTrend(req, res),
);

router.get(
  "/analytics/appointments-breakdown",
  hasPermission("ANALYTICS", "can_view"),
  (req, res) => analyticsController.getAppointmentsBreakdown(req, res),
);

router.get(
  "/analytics/top-products",
  hasPermission("ANALYTICS", "can_view"),
  (req, res) => analyticsController.getTopProducts(req, res),
);

router.get(
  "/analytics/client-growth",
  hasPermission("ANALYTICS", "can_view"),
  (req, res) => analyticsController.getClientGrowth(req, res),
);

router.get(
  "/analytics/product-movers",
  hasPermission("ANALYTICS", "can_view"),
  (req, res) => analyticsController.getProductMovers(req, res),
);

router.get(
  "/analytics/peak-times",
  hasPermission("ANALYTICS", "can_view"),
  (req, res) => analyticsController.getPeakTimes(req, res),
);

router.get(
  "/analytics/critical-stock",
  hasPermission("ANALYTICS", "can_view"),
  (req, res) => analyticsController.getCriticalStock(req, res),
);

export default router;
