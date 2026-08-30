import UserLevelModel from "./User_Level_Model.js";

const userLevelModel = new UserLevelModel();

export default class UserLevelService {
  async getUserLevel({ page, limit, search, filters } = {}) {
    try {
      const data = await userLevelModel.getUserLevel({
        page,
        limit,
        search,
        filters,
      });
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

  async addUserLevel(userLevel, description, createdBy) {
    try {
      const data = await userLevelModel.addUserLevel(
        userLevel,
        description,
        createdBy,
      );
      return data;
    } catch (error) {
      console.error("Error in UserLevelService", error); // ✅ error not err
      throw error;
    }
  }

  async updateUserLevel(userLevelId, userLevel, description, updatedBy) {
    try {
      const data = await userLevelModel.updateUserLevel(
        userLevelId,
        userLevel,
        description,
        updatedBy,
      );
      return data;
    } catch (error) {
      console.error("Error in UserLevelService", error);
      throw error;
    }
  }

  async deleteUserLevel(userLevelId, deletedBy) {
    try {
      const data = await userLevelModel.deleteUserLevel(
        userLevelId,
        deletedBy,
      );
      return data;
    } catch (error) {
      console.error("Error in UserLevelService", error);
      throw error;
    }
  }
}
