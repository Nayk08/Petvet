import UsersService from "./Users_Service.js";
const userService = new UsersService();
export default class UsersController {
  async getUsers(req, res) {
    try {
      const { page, limit, search, name, email, role, status } = req.query;

      const { rows, pagination } = await userService.getUsers({
        page,
        limit,
        search,
        filters: { name, email, role, status },
      });

      res.json({ data: rows, pagination });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "An error occurred while fetching users." });
    }
  }

  async getUsers(req, res) {
    try {
      const { page, limit, search, user_level_id, user_level, is_active } =
        req.query;

      const { rows, pagination } = await userService.getUsers({
        page,
        limit,
        search,
        filters: { user_level_id, user_level, is_active },
      });

      res.json({ data: rows, pagination });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "An error occurred while fetching users." });
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
