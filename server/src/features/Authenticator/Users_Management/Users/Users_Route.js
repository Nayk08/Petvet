import hasPermission from "../../../../middleware/has-permission.js";
import UserController from "./Users_Controller.js";
import express from "express";
import { validateBody, validateParams } from "../../../../middleware/validate.js";
import {
  addUserSchema,
  updateUserSchema,
  userIdParamSchema,
} from "../../../../validators/userSchema.js";

const router = express.Router();
const userController = new UserController();

router.get("/users", hasPermission("USER_MGMT_USERS", "can_view"), (req, res) =>
  userController.getUsers(req, res),
);

// Registered before /users/:user_id — otherwise Express would try to
// match "archived" itself as the :user_id param.
router.get(
  "/users/archived",
  hasPermission("USER_MGMT_USERS", "can_view"),
  (req, res) => userController.getArchivedUsers(req, res),
);

router.put(
  "/users/:user_id/restore",
  hasPermission("USER_MGMT_USERS", "can_delete"),
  (req, res) => userController.restoreUser(req, res),
);

router.delete(
  "/users/:user_id/permanent",
  hasPermission("USER_MGMT_USERS", "can_delete"),
  (req, res) => userController.permanentlyDeleteUser(req, res),
);

router.get(
  "/users/:user_id",
  hasPermission("USER_MGMT_USERS", "can_view"),
  validateParams(userIdParamSchema),
  (req, res) => userController.getUserById(req, res),
);

router.post(
  "/users/add-user",
  hasPermission("USER_MGMT_USERS", "can_create"),
  validateBody(addUserSchema),
  (req, res) => userController.addUser(req, res),
);

router.put(
  "/users/:user_id/edit-user",
  hasPermission("USER_MGMT_USERS", "can_edit"),
  validateParams(userIdParamSchema),
  validateBody(updateUserSchema),
  (req, res) => userController.updateUser(req, res),
);

router.delete(
  "/users/:user_id/delete-user",
  hasPermission("USER_MGMT_USERS", "can_delete"),
  validateParams(userIdParamSchema),
  (req, res) => userController.deleteUser(req, res),
);

export default router;
