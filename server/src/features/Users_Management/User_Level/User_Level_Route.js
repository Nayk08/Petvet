import express from "express";
import UserLevelController from "./User_Level_Controller.js";
import isAuth from "../../../middleware/is-auth.js";
import hasPermission from "../../../middleware/has-permission.js";
import hasRole from "../../../middleware/has-role.js";

const router = express.Router();
const userLevelController = new UserLevelController();

// User_Level_Routes.js

router.get(
  "/usersLevel",
  isAuth,
  hasPermission("USER_MGMT_ROLES", "can_view"),
  (req, res) => userLevelController.getUserLevel(req, res),
);

router.get(
  "/usersLevel/:user_level_id",
  isAuth,
  hasPermission("USER_MGMT_ROLES", "can_view"),
  (req, res) => userLevelController.getUserLevelById(req, res),
);
router.post(
  "/addUserLevel",
  isAuth,
  hasPermission("USER_MGMT_ROLES", "can_create"),
  (req, res) => userLevelController.addUserLevel(req, res),
);

router.put(
  "/updateUserLevel/:user_level_id",
  isAuth,
  hasPermission("USER_MGMT_ROLES", "can_edit"),
  (req, res) => userLevelController.updateUserLevel(req, res),
);

router.put(
  "/deleteUserLevel/:user_level_id",
  isAuth,
  hasPermission("USER_MGMT_ROLES", "can_delete"),
  (req, res) => userLevelController.deleteUserLevel(req, res),
);
export default router;
