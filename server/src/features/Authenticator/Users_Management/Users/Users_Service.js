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

  async updateUser(userId, updatedData, updatedBy) {
    try {
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

  async deleteUser(userId, deletedBy) {
    try {
      await userModel.deleteUser(userId, deletedBy);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
