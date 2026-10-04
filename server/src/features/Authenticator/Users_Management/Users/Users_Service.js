import bcrypt from "bcrypt";
import UsersModel from "./Users_Model.js";

const userModel = new UsersModel();
export default class UsersService {
  async getUsers({ page, limit, search, filters } = {}) {
    try {
      return await userModel.getUsers({ page, limit, search, filters });
    } catch (error) {
      console.error("Error in UserService", error);
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const user = await userModel.getUserById(userId);
      return user;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async addUser(userData, createdBy) {
    try {
      const hashedPassword = await bcrypt.hash(userData.user_password, 10);
      const newUser = await userModel.addUser(
        { ...userData, user_password: hashedPassword },
        createdBy,
      );
      return newUser;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async updateUser(userId, updatedData, updatedBy, requestingUser) {
    try {
      // Nobody edits their own roles — otherwise anyone with Users edit
      // access could simply grant themselves Admin.
      const sameRoles = (a = [], b = []) =>
        [...a].map(Number).sort().join() === [...b].map(Number).sort().join();
      if (
        requestingUser &&
        String(userId) === String(requestingUser.id) &&
        updatedData.level_ids &&
        !sameRoles(updatedData.level_ids, requestingUser.level_ids)
      ) {
        const err = new Error(
          "You can't change your own roles. Ask another administrator.",
        );
        err.status = 403;
        throw err;
      }

      if (
        updatedData.level_ids &&
        (await userModel.isLastAdminAfterRoleChange(userId, updatedData.level_ids))
      ) {
        const err = new Error(
          "This is the last Admin account — removing its Admin role would lock everyone out. Assign Admin to another account first.",
        );
        err.status = 409;
        throw err;
      }

      // Editing leaves the password field blank to mean "keep the current
      // one" — only hash it when the admin actually typed a new one.
      const payload = updatedData.user_password
        ? {
            ...updatedData,
            user_password: await bcrypt.hash(updatedData.user_password, 10),
          }
        : updatedData;

      const updatedUser = await userModel.updateUser(
        userId,
        payload,
        updatedBy,
      );
      return updatedUser;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getArchivedUsers({ page, limit, search } = {}) {
    try {
      return await userModel.getArchivedUsers({ page, limit, search });
    } catch (error) {
      console.error("Error in UserService", error);
      throw error;
    }
  }

  async restoreUser(userId, updatedBy) {
    try {
      return await userModel.restoreUser(userId, updatedBy);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async permanentlyDeleteUser(userId) {
    try {
      return await userModel.permanentlyDeleteUser(userId);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async deleteUser(userId, deletedBy, requestingUserId) {
    try {
      if (String(userId) === String(requestingUserId)) {
        const err = new Error("You cannot delete your own account.");
        err.status = 400;
        throw err;
      }

      if (await userModel.isLastAdmin(userId)) {
        const err = new Error(
          "This is the last Admin account — deleting it would lock everyone out. Assign Admin to another account first.",
        );
        err.status = 409;
        throw err;
      }

      await userModel.deleteUser(userId, deletedBy);
    } catch (error) {
      if (!error.status) console.error(error);
      throw error;
    }
  }
}
