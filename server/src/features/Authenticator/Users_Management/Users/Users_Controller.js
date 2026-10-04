import UsersService from "./Users_Service.js";
import { sendError } from "../../../../../utils/errorResponse.js";

const userService = new UsersService();
export default class UsersController {
  async getUsers(req, res) {
    try {
      const { page, limit, search, user_level, is_active } = req.query;
      const filters = { user_level, is_active };

      const { rows, pagination } = await userService.getUsers({
        page,
        limit,
        search,
        filters,
      });

      res.json({ rows, pagination });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Failed to fetch users." });
    }
  }
  async getUserById(req, res) {
    try {
      const userId = req.params.user_id;
      const user = await userService.getUserById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      res.json(user);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Failed to fetch user." });
    }
  }

  async addUser(req, res) {
    try {
      const user = await userService.addUser(
        req.body,
        req.session.user.name,
      );
      return res.status(201).json(user);
    } catch (error) {
      return sendError(res, error, "Failed to add user.");
    }
  }

  async updateUser(req, res) {
    try {
      const userId = req.params.user_id;
      const updatedData = req.body;
      const user = await userService.updateUser(
        userId,
        updatedData,
        req.session.user.name,
        req.session.user,
      );
      res.json(user);
    } catch (error) {
      return sendError(res, error, "Failed to update user.");
    }
  }

  async getArchivedUsers(req, res) {
    try {
      const { page, limit, search } = req.query;
      const { rows, pagination } = await userService.getArchivedUsers({
        page,
        limit,
        search,
      });
      res.json({ rows, pagination });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Failed to fetch archived users." });
    }
  }

  async restoreUser(req, res) {
    try {
      const userId = req.params.user_id;
      await userService.restoreUser(userId, req.session.user.name);
      res.json({ ok: true, message: "User restored" });
    } catch (error) {
      return sendError(res, error, "Failed to restore user.");
    }
  }

  async permanentlyDeleteUser(req, res) {
    try {
      const userId = req.params.user_id;
      const deleted = await userService.permanentlyDeleteUser(userId);
      if (!deleted) {
        return res.status(404).json({ message: "Archived user not found." });
      }
      res.json(deleted);
    } catch (error) {
      return sendError(res, error, "Failed to permanently delete user.");
    }
  }

  async deleteUser(req, res) {
    try {
      const userId = req.params.user_id;
      await userService.deleteUser(
        userId,
        req.session.user.name,
        req.session.user.id,
      );
      res.json({ ok: true, message: "User deactivated" });
    } catch (error) {
      return sendError(res, error, "Failed to delete user.");
    }
  }
}
