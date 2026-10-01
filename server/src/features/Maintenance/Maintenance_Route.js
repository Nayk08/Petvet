import express from "express";
import MaintenanceController from "./Maintenance_Controller.js";
import hasPermission from "../../middleware/has-permission.js";
import { validateBody, validateParams } from "../../middleware/validate.js";
import {
  addServiceSchema,
  updateServiceSchema,
  serviceIdParamSchema,
  addGroomingTierSchema,
  updateGroomingTierSchema,
  tierIdParamSchema,
} from "../../validators/maintenanceSchema.js";

const router = express.Router();
const maintenanceController = new MaintenanceController();

// ── Services ────────────────────────────────────────

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

router.patch(
  "/maintenance/services/:service_id/active",
  hasPermission("MAINTENANCE", "can_edit"),
  validateParams(serviceIdParamSchema),
  (req, res) => maintenanceController.setServiceActive(req, res),
);

// ── Grooming price tiers ───────────────────────────

router.get(
  "/maintenance/grooming-tiers",
  hasPermission("MAINTENANCE", "can_view"),
  (req, res) => maintenanceController.getGroomingTiers(req, res),
);

router.post(
  "/maintenance/grooming-tiers",
  hasPermission("MAINTENANCE", "can_create"),
  validateBody(addGroomingTierSchema),
  (req, res) => maintenanceController.addGroomingTier(req, res),
);

router.put(
  "/maintenance/grooming-tiers/:tier_id",
  hasPermission("MAINTENANCE", "can_edit"),
  validateParams(tierIdParamSchema),
  validateBody(updateGroomingTierSchema),
  (req, res) => maintenanceController.updateGroomingTier(req, res),
);

router.delete(
  "/maintenance/grooming-tiers/:tier_id",
  hasPermission("MAINTENANCE", "can_delete"),
  validateParams(tierIdParamSchema),
  (req, res) => maintenanceController.deleteGroomingTier(req, res),
);

export default router;
