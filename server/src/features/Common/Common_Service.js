import CommonModel from "./Common_Model.js";

const commonModel = new CommonModel();

export default class CommonService {
  async getNavbarData() {
    try {
      const data = await commonModel.getNavbarData();
      return data;
    } catch (error) {
      console.error("Error in CommonService", error); // ✅ error not err
      res.status(500).json({ error: "Failed to fetch navbar data" });
    }
  }
}
