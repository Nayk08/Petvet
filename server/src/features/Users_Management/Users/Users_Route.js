import isAuth from "../../../middleware/is-auth.js";
import UserController from "./Users_Controller.js";
import express from "express";
const router = express.Router();
const userController = new UserController();

router.get("/users", (req, res) => userController.getUsers(req, res));

export default router;
