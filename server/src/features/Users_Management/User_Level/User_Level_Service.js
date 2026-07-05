import UserLevelModel from "./User_Level_Model.js";

const userLevelModel = new UserLevelModel();

export default class UserLevelService {
  async getUserLevel() {
    try {
      const data = await userLevelModel.getUserLevel();
      return data;
    } catch (error) {
      console.error("Error in UserLevelService", error); // ✅ error not err
      throw error;
    }
  }
}
