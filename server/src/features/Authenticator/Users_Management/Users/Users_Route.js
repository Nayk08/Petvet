import hasPermission from "../../../../middleware/has-permission.js";
import UserController from "./Users_Controller.js";
import express from "express";

const router = express.Router();
const userController = new UserController();

router.get("/users", hasPermission("USER_MGMT_USERS", "can_view"), (req, res) =>
  userController.getUsers(req, res),
);

router.get(
  "/users/:user_id",
  hasPermission("USER_MGMT_USERS", "can_view"),
  (req, res) => userController.getUserById(req, res),
);

router.post(
  "/users/add-user",
  hasPermission("USER_MGMT_USERS", "can_create"),
  (req, res) => userController.addUser(req, res),
);

router.put(
  "/users/:user_id/edit-user",
  hasPermission("USER_MGMT_USERS", "can_edit"),
  (req, res) => userController.updateUser(req, res),
);

router.delete(
  "/users/:user_id/delete-user",
  hasPermission("USER_MGMT_USERS", "can_delete"),
  (req, res) => userController.deleteUser(req, res),
);

export default router;
