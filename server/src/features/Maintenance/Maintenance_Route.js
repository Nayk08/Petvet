import express from "express";
import MaintenanceController from "./Maintenance_Controller.js";
import hasPermission from "../../middleware/has-permission.js";
import { validateBody, validateParams } from "../../middleware/validate.js";
import {
  addServiceSchema,
  updateServiceSchema,
  serviceIdParamSchema,
  setServiceActiveSchema,
} from "../../validators/maintenanceSchema.js";

const router = express.Router();
const maintenanceController = new MaintenanceController();

// ── Service categories (fixed: read-only) ──────────

router.get(
  "/maintenance/service-categories",
  hasPermission("MAINTENANCE", "can_view"),
  (req, res) => maintenanceController.getServiceCategories(req, res),
);

// ── Sub-services ────────────────────────────────────

router.get(
  "/maintenance/services",
  hasPermission("MAINTENANCE", "can_view"),
  (req, res) => maintenanceController.getServices(req, res),
);

router.post(
  "/maintenance/services",
  hasPermission("MAINTENANCE", "can_create"),
  validateBody(addServiceSchema),
  (req, res) => maintenanceController.addService(req, res),
);

router.put(
  "/maintenance/services/:service_id",
  hasPermission("MAINTENANCE", "can_edit"),
  validateParams(serviceIdParamSchema),
  validateBody(updateServiceSchema),
  (req, res) => maintenanceController.updateService(req, res),
);

// Soft delete / restore (is_active = false hides it from booking; old
// appointments keep pointing at it).
router.patch(
  "/maintenance/services/:service_id/active",
  hasPermission("MAINTENANCE", "can_delete"),
  validateParams(serviceIdParamSchema),
  validateBody(setServiceActiveSchema),
  (req, res) => maintenanceController.setServiceActive(req, res),
);

export default router;
