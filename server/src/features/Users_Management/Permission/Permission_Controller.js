import PermissionService from "./Permission_Service.js";
const permissionService = new PermissionService();
export default class PermissionController {
  // GET /api/permissions/user-levels
  async getUserLevels(req, res, next) {
    try {
      const userLevels = await permissionService.getUserLevels();
      res.status(200).json({ success: true, data: userLevels });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/permissions/:userLevelId
  async getPermissionMatrix(req, res, next) {
    try {
      const { userLevelId } = req.params;
      const matrix = await permissionService.getPermissionMatrix(userLevelId);
      res.status(200).json({ success: true, data: matrix });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/permissions
  // body: { userLevelId, userModuleId, field, value }
  async updatePermission(req, res, next) {
    try {
      const { userLevelId, userModuleId, field, value } = req.body;
      const updatedBy = req.user?.users_id ?? null; // TODO: wire to your auth middleware

      const updated = await permissionService.updatePermission({
        userLevelId,
        userModuleId,
        field,
        value,
        updatedBy,
      });

      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
}
