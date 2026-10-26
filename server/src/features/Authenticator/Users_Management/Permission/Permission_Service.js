import PermissionModel from "./Permission_Model.js";
import { isAdmin } from "../../../../../utils/isAdmin.js";

const permissionModel = new PermissionModel();
const ALLOWED_FIELDS = [
  "can_view",
  "can_create",
  "can_edit",
  "can_delete",
  "can_export",
];
const CRUD_FIELDS = ["can_create", "can_edit", "can_delete", "can_export"];

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
    requester = null,
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

    // Create/Edit/Delete/Export are meaningless on a module you can't even
    // view — don't let one get turned on ahead of (or without) can_view.
    if (CRUD_FIELDS.includes(field) && value === true) {
      const canView = await permissionModel.getCanView(userLevelId, userModuleId);
      if (!canView) {
        const error = new Error(
          "Enable View for this module before granting Create/Edit/Delete/Export.",
        );
        error.status = 400;
        throw error;
      }
    }

    // Disabling can_view on a parent (e.g. User Management) cascades to its
    // children below, so a child's can_view can be turned off by this one
    // edit without ever touching it directly. Collect every module code
    // that will actually lose can_view so the lockout check further down
    // can't be dodged by disabling the parent instead of Permissions itself.
    const childIds =
      field === "can_view" && value === false
        ? await permissionModel.getChildModuleIds(userModuleId)
        : [];
    let turningOffModuleCodes = [];
    if (field === "can_edit" && value === false) {
      turningOffModuleCodes = [await permissionModel.getModuleCode(userModuleId)];
    } else if (field === "can_view" && value === false) {
      turningOffModuleCodes = await Promise.all(
        [userModuleId, ...childIds].map((id) => permissionModel.getModuleCode(id)),
      );
    }

    // Editing a role you hold yourself is how a non-admin would grant
    // themselves extra access. Admins (who already have everything) may
    // edit their own role — e.g. to grant it a newly added module — but not
    // switch off its access to this Permissions page, which would leave
    // nobody able to manage permissions.
    const holdsRole = (requester?.level_ids ?? [])
      .map(Number)
      .includes(Number(userLevelId));
    if (holdsRole) {
      const lockingOut = turningOffModuleCodes.includes("USER_MGMT_PERMS");
      if (!isAdmin(requester) || lockingOut) {
        const error = new Error(
          lockingOut
            ? "You can't remove your own role's access to Permissions — that would lock everyone out."
            : "You can't change the permissions of a role you hold. Ask an administrator.",
        );
        error.status = 403;
        throw error;
      }
    }

    const updated = await permissionModel.upsertPermission({
      userLevelId,
      userModuleId,
      field,
      value,
      updatedBy,
    });

    // The sidebar only shows a child module (e.g. Permissions) nested under
    // its parent (User Management) when the parent itself has can_view, and
    // only shows a parent that still has visible children — so the two must
    // stay in lockstep or one half becomes an invisible, unreachable grant.
    if (field === "can_view" && value === true) {
      const parentModuleId = await permissionModel.getParentModuleId(userModuleId);
      if (parentModuleId) {
        await permissionModel.upsertPermission({
          userLevelId,
          userModuleId: parentModuleId,
          field: "can_view",
          value: true,
          updatedBy,
        });
      }
    } else if (field === "can_view" && value === false && childIds.length) {
      await Promise.all(
        childIds.map((childId) =>
          permissionModel.upsertPermission({
            userLevelId,
            userModuleId: childId,
            field: "can_view",
            value: false,
            updatedBy,
          }),
        ),
      );
    }

    // Create/Edit/Delete/Export are meaningless once a module can't even be
    // viewed, so turning off can_view clears them too — for this module and
    // for every child it just cascaded can_view off to above.
    if (field === "can_view" && value === false) {
      await Promise.all(
        [userModuleId, ...childIds].flatMap((id) =>
          CRUD_FIELDS.map((crudField) =>
            permissionModel.upsertPermission({
              userLevelId,
              userModuleId: id,
              field: crudField,
              value: false,
              updatedBy,
            }),
          ),
        ),
      );
    }

    return updated;
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
