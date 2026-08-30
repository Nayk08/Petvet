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
      const newUser = await userModel.addUser(userData, createdBy);
      return newUser;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async updateUser(userId, updatedData, updatedBy) {
    try {
      const updatedUser = await userModel.updateUser(
        userId,
        updatedData,
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
