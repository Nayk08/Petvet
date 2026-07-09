import UsersModel from "./Users_Model.js";

const userModel = new UsersModel();
export default class UsersService {
  async getUsers() {
    try {
      const users = await userModel.getUsers();
      return users;
    } catch (error) {
      console.error(error);
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

  async addUser(userData) {
    try {
      const newUser = await userModel.addUser(userData);
      return newUser;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async updateUser(userId, updatedData) {
    try {
      const updatedUser = await userModel.updateUser(userId, updatedData);
      return updatedUser;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async deleteUser(userId) {
    try {
      await userModel.deleteUser(userId);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
