import express from "express";
const router = express.Router();
import PermissionController from "./Permission_Controller.js";
import isAuth from "../../../middleware/is-auth.js";
import hasPermission from "../../../middleware/has-permission.js";

const permissionController = new PermissionController();




router.get(
  "/user-levels",
  isAuth,
  hasPermission("USER_MGMT_PERMS", "can_view"),
  (req, res, next) => permissionController.getUserLevels(req, res, next),
);

router.get(
  "/permissions/:userLevelId",
  isAuth,
  hasPermission("USER_MGMT_PERMS", "can_view"),
  (req, res, next) => permissionController.getPermissionMatrix(req, res, next),
);

router.patch(
  "/permissions",
  isAuth,
  hasPermission("USER_MGMT_PERMS", "can_edit"),
  (req, res, next) => permissionController.updatePermission(req, res, next),
);

export default router;
