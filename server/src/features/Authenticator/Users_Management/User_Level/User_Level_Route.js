import express from "express";
import UserLevelController from "./User_Level_Controller.js";
import hasPermission from "../../../../middleware/has-permission.js";

const router = express.Router();
const userLevelController = new UserLevelController();

router.get(
  "/usersLevel",
  hasPermission("USER_MGMT_ROLES", "can_view"),
  (req, res) => userLevelController.getUserLevel(req, res),
);

router.get(
  "/usersLevel/:user_level_id",
  hasPermission("USER_MGMT_ROLES", "can_view"),
  (req, res) => userLevelController.getUserLevelById(req, res),
);

router.post(
  "/usersLevel/add-user-level",
  hasPermission("USER_MGMT_ROLES", "can_create"),
  (req, res) => userLevelController.addUserLevel(req, res),
);

router.put(
  "/usersLevel/:user_level_id/edit-user-level",
  hasPermission("USER_MGMT_ROLES", "can_edit"),
  (req, res) => userLevelController.updateUserLevel(req, res),
);

router.delete(
  "/usersLevel/:user_level_id/delete-user-level",
  hasPermission("USER_MGMT_ROLES", "can_delete"),
  (req, res) => userLevelController.deleteUserLevel(req, res),
);

export default router;
