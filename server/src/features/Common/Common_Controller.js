import CommonService from "./Common_Service.js"; // ✅ fixed typo

const commonService = new CommonService();

export default class CommonController {
  async getNavbarData(req, res) {
    try {
      const user = req.session.user;
      const data = await commonService.getNavbarData(user.role);
      res.json({ user, modules: data });
    } catch (error) {
      console.error("Error in CommonController.getNavbarData:", error); // ✅ error not err
      res.status(500).json({ error: "Failed to fetch navbar data" });
    }
  }
}
