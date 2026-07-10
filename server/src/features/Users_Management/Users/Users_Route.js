// Users_Routes.js
import isAuth from "../../../middleware/is-auth.js";
import hasRole from "../../../middleware/has-role.js";
import hasPermission from "../../../middleware/has-permission.js";
import UserController from "./Users_Controller.js";
import express from "express";
const router = express.Router();
const userController = new UserController();

// Users_Routes.js
router.get(
  "/users",
  isAuth,
  hasPermission("USER_MGMT_USERS", "can_view"),
  (req, res) => userController.getUsers(req, res),
);

router.get(
  "/users/:user_id",
  isAuth,
  hasPermission("USER_MGMT_USERS", "can_view"),
  (req, res) => userController.getUserById(req, res),
);

router.post(
  "/addUser",
  isAuth,
  hasPermission("USER_MGMT_USERS", "can_create"),
  (req, res) => userController.addUser(req, res),
);

router.put(
  "/updateUser/:user_id",
  isAuth,
  hasPermission("USER_MGMT_USERS", "can_edit"),
  (req, res) => userController.updateUser(req, res),
);

router.put(
  "/deleteUser/:user_id",
  isAuth,
  hasPermission("USER_MGMT_USERS", "can_delete"),
  (req, res) => userController.deleteUser(req, res),
);

export default router;
