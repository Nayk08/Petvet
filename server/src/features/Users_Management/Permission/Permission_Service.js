import PermissionModel from "./Permission_Model.js";

const permissionModel = new PermissionModel();
const ALLOWED_FIELDS = [
  "can_view",
  "can_create",
  "can_edit",
  "can_delete",
  "can_export",
];

export default class PermissionService {
  async getPermissionMatrix(userLevelId) {
    const flatModules =
      await permissionModel.getModulesWithPermissions(userLevelId);
    return this._buildModuleTree(flatModules);
  }

  async getUserLevels() {
    return permissionModel.getUserLevels();
  }

  async updatePermission({
    userLevelId,
    userModuleId,
    field,
    value,
    updatedBy,
  }) {
    if (!ALLOWED_FIELDS.includes(field)) {
      const error = new Error(`Invalid permission field: ${field}`);
      error.status = 400;
      throw error;
    }

    if (typeof value !== "boolean") {
      const error = new Error("Permission value must be boolean");
      error.status = 400;
      throw error;
    }

    if (!userLevelId || !userModuleId) {
      const error = new Error("userLevelId and userModuleId are required");
      error.status = 400;
      throw error;
    }

    return permissionModel.upsertPermission({
      userLevelId,
      userModuleId,
      field,
      value,
      updatedBy,
    });
  }

  // Turns the flat module list into a parent -> children tree using
  // parent_module_id, matching how the Permission Matrix UI indents
  // Users / Roles / Permissions under User Management.
  _buildModuleTree(modules) {
    const map = new Map();
    const roots = [];

    modules.forEach((m) => {
      map.set(m.user_module_id, { ...m, children: [] });
    });

    modules.forEach((m) => {
      const node = map.get(m.user_module_id);
      if (m.parent_module_id && map.has(m.parent_module_id)) {
        map.get(m.parent_module_id).children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }
}
