import express from "express";
const router = express.Router();
import PermissionController from "./Permission_Controller.js";
const permissionController = new PermissionController();
router.get("/user-levels", permissionController.getUserLevels);
router.get(
  "/permissions/:userLevelId",
  permissionController.getPermissionMatrix,
);
router.patch("/permissions", permissionController.updatePermission);

export default router;
