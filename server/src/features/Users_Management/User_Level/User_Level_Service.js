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
  async getUserLevelById(userLevelId) {
    try {
      const data = await userLevelModel.getUserLevelById(userLevelId);
      return data;
    } catch (error) {
      console.error("Error in UserLevelService", error);
      throw error;
    }
  }

  async addUserLevel(userLevel, description) {
    try {
      const data = await userLevelModel.addUserLevel(userLevel, description);
      return data;
    } catch (error) {
      console.error("Error in UserLevelService", error); // ✅ error not err
      throw error;
    }
  }

  async updateUserLevel(userLevelId, userLevel, description) {
    try {
      const data = await userLevelModel.updateUserLevel(
        userLevelId,
        userLevel,
        description,
      );
      return data;
    } catch (error) {
      console.error("Error in UserLevelService", error);
      throw error;
    }
  }

  async deleteUserLevel(userLevelId) {
    try {
      const data = await userLevelModel.deleteUserLevel(userLevelId);
      return data;
    } catch (error) {
      console.error("Error in UserLevelService", error);
      throw error;
    }
  }
}
