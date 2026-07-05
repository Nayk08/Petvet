import express from "express";
import UserLevelController from "./User_Level_Controller.js";
import isAuth from "../../../middleware/is-auth.js";

const router = express.Router();
const userLevelController = new UserLevelController();

router.get("/usersLevel", (req, res) =>
  userLevelController.getUserLevel(req, res),
);

export default router;
