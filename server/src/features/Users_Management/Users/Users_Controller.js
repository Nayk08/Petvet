import UsersService from "./Users_Service.js";
const userService = new UsersService();

export default class UserController {
  async getUsers(req, res) {
    try {
      const data = await  userService.getUsers();
      res.json(data);
    } catch (error) {
      console.error("Error in UserController", error); // ✅ error not err
      res.status(500).json({ error: "Failed to fetch navbar data" });
    }
  }
}
