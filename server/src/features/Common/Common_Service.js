import CommonModel from "./Common_Model.js";

const commonModel = new CommonModel();

export default class CommonService {
  // service
  // commonService.js
  async getNavbarData(levelIds) {
    try {
      return await commonModel.getNavbarData(levelIds);
    } catch (error) {
      console.error("Error in CommonService", error);
      throw error;
    }
  }

  async getCategoryUserLevel() {
    try {
      const data = await commonModel.getCategoryUserLevel();
      return data;
    } catch (error) {
      console.error("Error in CommonService", error); // ✅ error not err
      throw error;
    }
  }
}
