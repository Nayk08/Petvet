import CommonModel from "./Common_Model.js";

const commonModel = new CommonModel();

export default class CommonService {
  async getNavbarData(role) {
    try {
      const data = await commonModel.getNavbarData(role);
      return data;
    } catch (error) {
      console.error("Error in CommonService", error); // ✅ error not err
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
