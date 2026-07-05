import UsersModel from "./Users_Model.js";

const usersModel = new UsersModel();

export default class UsersService {
  async getUsers() {
    try {
      const data = await usersModel.getUsers();
      return data;
    } catch (error) {
      console.error("Error in UserService", error); // ✅ error not err
      throw error;
    }
  }
}
