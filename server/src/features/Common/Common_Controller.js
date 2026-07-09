import CommonService from "./Common_Service.js"; // ✅ fixed typo

const commonService = new CommonService();

export default class CommonController {
  async getNavbarData(req, res) {
    try {
      const user = req.session.user;

      if (!user?.role) {
        return res.status(403).json({ error: "User has no assigned role" });
      }

      const data = await commonService.getNavbarData(user.role);
      res.json({ user, modules: data });
    } catch (error) {
      console.error("Error in CommonController.getNavbarData:", error); // ✅ error not err
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
