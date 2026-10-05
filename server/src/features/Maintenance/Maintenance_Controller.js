import MaintenanceService from "./Maintenance_Service.js";
import { sendError } from "../../../utils/errorResponse.js";

const maintenanceService = new MaintenanceService();

export default class MaintenanceController {
  async getServiceCategories(req, res) {
    try {
      const categories = await maintenanceService.getServiceCategories();
      return res.status(200).json(categories);
    } catch (error) {
      return sendError(res, error, "Failed to fetch service categories.");
    }
  }

  async getServices(req, res) {
    try {
      const services = await maintenanceService.getServices();
      return res.status(200).json(services);
    } catch (error) {
      return sendError(res, error, "Failed to fetch services.");
    }
  }

  async addService(req, res) {
    try {
      const service = await maintenanceService.addService({
        ...req.body,
        created_by: req.session.user.name,
      });
      return res.status(201).json(service);
    } catch (error) {
      return sendError(res, error, "Failed to add service.");
    }
  }

  async updateService(req, res) {
    try {
      const service = await maintenanceService.updateService({
        ...req.body,
        service_id: req.params.service_id,
        updated_by: req.session.user.name,
      });
      return res.status(200).json(service);
    } catch (error) {
      return sendError(res, error, "Failed to update service.");
    }
  }

  async setServiceActive(req, res) {
    try {
      const service = await maintenanceService.setServiceActive({
        service_id: req.params.service_id,
        is_active: req.body.is_active,
        updated_by: req.session.user.name,
      });
      return res.status(200).json(service);
    } catch (error) {
      return sendError(res, error, "Failed to update service status.");
    }
  }

  async getGroomingTiers(req, res) {
    try {
      return res.status(200).json(await maintenanceService.getGroomingTiers());
    } catch (error) {
      return sendError(res, error, "Failed to fetch grooming tiers.");
    }
  }

  async addGroomingTier(req, res) {
    try {
      return res.status(201).json(await maintenanceService.addGroomingTier(req.body));
    } catch (error) {
      return sendError(res, error, "Failed to add grooming tier.");
    }
  }

  async updateGroomingTier(req, res) {
    try {
      const tier = await maintenanceService.updateGroomingTier({
        ...req.body,
        tier_id: req.params.tier_id,
      });
      return res.status(200).json(tier);
    } catch (error) {
      return sendError(res, error, "Failed to update grooming tier.");
    }
  }

  async deleteGroomingTier(req, res) {
    try {
      return res.status(200).json(await maintenanceService.deleteGroomingTier(req.params.tier_id));
    } catch (error) {
      return sendError(res, error, "Failed to delete grooming tier.");
    }
  }
}
