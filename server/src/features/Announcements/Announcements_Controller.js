import AnnouncementsModel from "./Announcements_Model.js";
import { sendError } from "../../../utils/errorResponse.js";

const model = new AnnouncementsModel();

export default class AnnouncementsController {
  async getAll(req, res) {
    try {
      res.json(await model.getAll());
    } catch (error) {
      sendError(res, error, "Failed to fetch announcements.");
    }
  }

  async getPublished(req, res) {
    try {
      res.json(await model.getPublished());
    } catch (error) {
      sendError(res, error, "Failed to fetch announcements.");
    }
  }

  async create(req, res) {
    try {
      const announcement = await model.create({
        ...req.body,
        image_url: req.file?.path ?? null,
        created_by: req.session.user.name,
      });
      res.status(201).json(announcement);
    } catch (error) {
      sendError(res, error, "Failed to add the announcement.");
    }
  }

  async update(req, res) {
    try {
      // New picture replaces; remove_image clears; otherwise keep it.
      const image_url = req.file?.path ?? (req.body.remove_image === "true" ? null : undefined);
      const announcement = await model.update({
        ...req.body,
        image_url,
        announcement_id: req.params.announcement_id,
        updated_by: req.session.user.name,
      });
      res.json(announcement);
    } catch (error) {
      sendError(res, error, "Failed to update the announcement.");
    }
  }

  async remove(req, res) {
    try {
      res.json(
        await model.remove({
          announcement_id: req.params.announcement_id,
          deleted_by: req.session.user.name,
        }),
      );
    } catch (error) {
      sendError(res, error, "Failed to delete the announcement.");
    }
  }

  async getClinicAddress(req, res) {
    try {
      res.json({ clinic_address: await model.getClinicAddress() });
    } catch (error) {
      sendError(res, error, "Failed to fetch the clinic address.");
    }
  }

  async setClinicAddress(req, res) {
    try {
      res.json(
        await model.setClinicAddress({
          clinic_address: req.body.clinic_address,
          updated_by: req.session.user.name,
        }),
      );
    } catch (error) {
      sendError(res, error, "Failed to save the clinic address.");
    }
  }
}
