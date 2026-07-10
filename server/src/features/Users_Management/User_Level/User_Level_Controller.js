import UserLevelService from "./User_Level_Service.js";
const userLevelService = new UserLevelService();

export default class UserLevelController {
  async getUserLevel(req, res) {
    try {
      const { page, limit } = req.query;

      const { rows, pagination } = await userLevelService.getUserLevel({
        page,
        limit,
      });
      res.json({ data: rows, pagination });
    } catch (error) {
      console.error("Error in UserLevelController", error); // ✅ error not err
      res.status(500).json({ error: "Failed to fetch navbar data" });
    }
  }

  async getUserLevelById(req, res) {
    try {
      const { user_level_id } = req.params;
      console.log("user_level_id:", user_level_id);

      const data = await userLevelService.getUserLevelById(user_level_id);

      res.status(200).json(data[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch user level" });
    }
  }

  async addUserLevel(req, res) {
    try {
      const { userLevel, description } = req.body;

      if (!userLevel || !description) {
        return res
          .status(400)
          .json({ error: "userLevel and description are required" });
      }

      const data = await userLevelService.addUserLevel(userLevel, description);
      if (!data) {
        return res.status(500).json({ error: "Failed to create user level" });
      }

      res.status(201).json(data);
    } catch (error) {
      console.error("Error in UserLevelController", error);
      if (error.code === "23505") {
        return res.status(409).json({ error: "User level already exists" });
      }
      res.status(500).json({ error: "Failed to create user level" });
    }
  }

  async updateUserLevel(req, res) {
    try {
      const { user_level_id } = req.params;
      const { userLevel, description } = req.body;

      if (!userLevel || !description) {
        return res
          .status(400)
          .json({ error: "userLevel and description are required" });
      }

      const data = await userLevelService.updateUserLevel(
        user_level_id,
        userLevel,
        description,
      );

      if (!data || data.length === 0) {
        return res.status(404).json({ error: "User level not found" });
      }

      res.status(200).json(data);
    } catch (error) {
      console.error("Error in UserLevelController", error);
      if (error.code === "23505") {
        return res.status(409).json({ error: "User level already exists" });
      }
      res.status(500).json({ error: "Failed to update user level" });
    }
  }

  async deleteUserLevel(req, res) {
    try {
      const { user_level_id } = req.params;
      const data = await userLevelService.deleteUserLevel(user_level_id);
      res.status(200).json(data[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch user level" });
    }
  }
}
