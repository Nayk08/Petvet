import UserLevelService from "./User_Level_Service.js";
const userLevelService = new UserLevelService();

export default class UserLevelController {
  async getUserLevel(req, res) {
    try {
      const data = await userLevelService.getUserLevel();
      res.json(data);
    } catch (error) {
      console.error("Error in UserLevelController", error); // ✅ error not err
      res.status(500).json({ error: "Failed to fetch navbar data" });
    }
  }
}
