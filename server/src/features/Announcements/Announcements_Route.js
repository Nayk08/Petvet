import express from "express";
import AnnouncementsController from "./Announcements_Controller.js";
import hasPermission from "../../middleware/has-permission.js";
import { uploadAnnouncementImage } from "../../middleware/upload.js";
import { validateBody, validateParams, validateImage } from "../../middleware/validate.js";
import {
  announcementSchema,
  announcementIdParamSchema,
  clinicAddressSchema,
} from "../../validators/announcementSchema.js";

// Staff side (mounted behind isAuth + CSRF in app.js). The landing page's
// public reads live on the client-portal router (/public/announcements,
// /public/clinic-info).
const router = express.Router();
const controller = new AnnouncementsController();

router.get(
  "/announcements",
  hasPermission("ANNOUNCEMENTS", "can_view"),
  (req, res) => controller.getAll(req, res),
);

router.post(
  "/announcements",
  hasPermission("ANNOUNCEMENTS", "can_create"),
  uploadAnnouncementImage.single("image"),
  validateImage({ required: false }),
  validateBody(announcementSchema),
  (req, res) => controller.create(req, res),
);

router.put(
  "/announcements/:announcement_id",
  hasPermission("ANNOUNCEMENTS", "can_edit"),
  validateParams(announcementIdParamSchema),
  uploadAnnouncementImage.single("image"),
  validateImage({ required: false }),
  validateBody(announcementSchema),
  (req, res) => controller.update(req, res),
);

router.delete(
  "/announcements/:announcement_id",
  hasPermission("ANNOUNCEMENTS", "can_delete"),
  validateParams(announcementIdParamSchema),
  (req, res) => controller.remove(req, res),
);

// Clinic address for the landing page map — managed on the same page.
router.get(
  "/clinic-address",
  hasPermission("ANNOUNCEMENTS", "can_view"),
  (req, res) => controller.getClinicAddress(req, res),
);

router.put(
  "/clinic-address",
  hasPermission("ANNOUNCEMENTS", "can_edit"),
  validateBody(clinicAddressSchema),
  (req, res) => controller.setClinicAddress(req, res),
);

export default router;
