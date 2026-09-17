import { Router } from "express";
import hasPermission from "../../middleware/has-permission.js";
import DashboardController from "./Dashboard_Controller.js";

const router = Router();
const dashboardController = new DashboardController();

// Gated on DASHBOARD, not APPOINTMENT/PAYMENTS — these power the
// Dashboard's own widgets, so anyone who can see the Dashboard should see
// them regardless of whether they separately have Appointment/Payments
// module access (e.g. a Veterinarian without APPOINTMENT can_view).
router.get(
  "/dashboard/today-appointments",
  hasPermission("DASHBOARD", "can_view"),
  (req, res) => dashboardController.getTodayAppointments(req, res),
);

router.get(
  "/dashboard/today-payments",
  hasPermission("DASHBOARD", "can_view"),
  (req, res) => dashboardController.getTodayPayments(req, res),
);

router.get(
  "/dashboard/today-revenue-transactions",
  hasPermission("DASHBOARD", "can_view"),
  (req, res) => dashboardController.getTodayRevenueTransactions(req, res),
);

export default router;
