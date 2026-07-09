import express from "express";
import UserLevelController from "./User_Level_Controller.js";
import isAuth from "../../../middleware/is-auth.js";

const router = express.Router();
const userLevelController = new UserLevelController();

router.get("/usersLevel", (req, res) =>
  userLevelController.getUserLevel(req, res),
);

router.get("/usersLevel/:user_level_id", (req, res) =>
  userLevelController.getUserLevelById(req, res),
);

router.post("/addUserLevel", (req, res) =>
  userLevelController.addUserLevel(req, res),
);
router.put("/updateUserLevel/:user_level_id", (req, res) =>
  userLevelController.updateUserLevel(req, res),
);

router.put("/deleteUserLevel/:user_level_id", (req, res) =>
  userLevelController.deleteUserLevel(req, res),
);

export default router;
