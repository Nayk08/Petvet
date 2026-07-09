import isAuth from "../../../middleware/is-auth.js";
import UserController from "./Users_Controller.js";
import express from "express";
const router = express.Router();
const userController = new UserController();

router.get("/users", (req, res) => userController.getUsers(req, res));

router.get("/users/:user_id", (req, res) =>
  userController.getUserById(req, res),
);

router.post("/addUser", (req, res) => userController.addUser(req, res));

router.put("/updateUser/:user_id", (req, res) =>
  userController.updateUser(req, res),
);

router.put("/deleteUser/:user_id", (req, res) =>
  userController.deleteUser(req, res),
);
export default router;
