import MaintenanceModel from "./Maintenance_Model.js";

const maintenanceModel = new MaintenanceModel();

export default class MaintenanceService {
  async getServices() {
    return maintenanceModel.getServices();
  }

  async addService(payload) {
    return maintenanceModel.addService(payload);
  }

  async updateService(payload) {
    return maintenanceModel.updateService(payload);
  }

  async setServiceActive(payload) {
    return maintenanceModel.setServiceActive(payload);
  }

  async getGroomingTiers() {
    return maintenanceModel.getGroomingTiers();
  }

  async addGroomingTier(payload) {
    return maintenanceModel.addGroomingTier(payload);
  }

  async updateGroomingTier(payload) {
    return maintenanceModel.updateGroomingTier(payload);
  }

  async deleteGroomingTier(tier_id) {
    return maintenanceModel.deleteGroomingTier(tier_id);
  }
}
