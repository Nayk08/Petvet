import CommonService from "./Common_Service.js"; // ✅ fixed typo

const commonService = new CommonService();

export default class CommonController {
  // commonController.js
  async getNavbarData(req, res) {
    try {
      const user = req.session.user;

      if (!user?.level_ids?.length) {
        return res.status(403).json({ error: "User has no assigned roles" });
      }

      const data = await commonService.getNavbarData(user.level_ids);
      res.json({ user, modules: data });
    } catch (error) {
      console.error("Error in CommonController.getNavbarData:", error);
      res.status(500).json({ error: "Failed to fetch navbar data" });
    }
  }

  async getCategoryUserLevel(req, res) {
    try {
      const data = await commonService.getCategoryUserLevel();
      res.json(data);
    } catch (error) {
      console.error("Error in CommonController.getUserLevel:", error); // ✅ error not err
      res.status(500).json({ error: "Failed to fetch navbar data" });
    }
  }
}
