import UsersService from "./Users_Service.js";
const userService = new UsersService();
export default class UsersController {
  async getUsers(req, res) {
    try {
      const users = await userService.getUsers();
      res.json(users);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "An error occurred while fetching users." });
    }
  }

  async getUserById(req, res) {
    try {
      const userId = req.params.user_id;
      const user = await userService.getUserById(userId);
      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "An error occurred while fetching user." });
    }
  }

  async addUser(req, res) {
    try {
      const user = await userService.addUser(req.body);
      return res.status(201).json(user);
    } catch (error) {
      const status = error.status || 500;
      return res
        .status(status)
        .json({ message: error.message || "Something went wrong" });
    }
  }

  async updateUser(req, res) {
    try {
      const userId = req.params.user_id;
      const updatedData = req.body;
      const user = await userService.updateUser(userId, updatedData);
      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "An error occurred while updating user." });
    }
  }

  async deleteUser(req, res) {
    try {
      const userId = req.params.user_id;
      await userService.deleteUser(userId);
      res.json({ ok: true, message: "User deactivated" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "An error occurred while deleting user." });
    }
  }
}
