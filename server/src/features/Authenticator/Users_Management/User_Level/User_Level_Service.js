import UserLevelModel from "./User_Level_Model.js";
import { ADMIN_ROLE } from "../../../../../utils/isAdmin.js";

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

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

  // Admin is the one role the code keys on by name (utils/isAdmin.js,
  // last-admin protection), so it can't be renamed or deleted.
  async _assertNotAdminRole(userLevelId, action) {
    const role = await userLevelModel.getRoleNameAndActiveUsers(userLevelId);
    if (!role) {
      throw httpError(404, "User level not found");
    }
    if (role.user_level?.trim() === ADMIN_ROLE) {
      throw httpError(409, `The Admin role can't be ${action}.`);
    }
    return role;
  }

  async updateUserLevel(userLevelId, userLevel, description, updatedBy) {
    const role = await userLevelModel.getRoleNameAndActiveUsers(userLevelId);
    if (role?.user_level?.trim() === ADMIN_ROLE && userLevel.trim() !== ADMIN_ROLE) {
      throw httpError(409, "The Admin role can't be renamed.");
    }
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
    const role = await this._assertNotAdminRole(userLevelId, "deleted");
    // Deleting a role people still hold would silently strip their access.
    if (role.active_users > 0) {
      throw httpError(
        409,
        `${role.active_users} user(s) still have this role — reassign them first.`,
      );
    }
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
