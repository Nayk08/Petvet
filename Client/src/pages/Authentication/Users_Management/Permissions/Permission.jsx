import React, { useEffect, useState } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getCategoryUserLevel,
  getPermissionMatrix,
  updatePermissionField,
} from "@/api/http.js";

const ACTIONS = ["VIEW", "CREATE", "EDIT", "DELETE", "EXPORT"];

const ACTION_FIELD_MAP = {
  VIEW: "can_view",
  CREATE: "can_create",
  EDIT: "can_edit",
  DELETE: "can_delete",
  EXPORT: "can_export",
};

function flattenModuleTree(tree) {
  const flat = [];
  (tree ?? []).forEach((root) => {
    flat.push({
      id: root.user_module_id,
      label: root.module_name,
      isSub: false,
      can_view: root.can_view,
      can_create: root.can_create,
      can_edit: root.can_edit,
      can_delete: root.can_delete,
      can_export: root.can_export,
    });
    (root.children ?? []).forEach((child) => {
      flat.push({
        id: child.user_module_id,
        label: child.module_name,
        isSub: true,
        can_view: child.can_view,
        can_create: child.can_create,
        can_edit: child.can_edit,
        can_delete: child.can_delete,
        can_export: child.can_export,
      });
    });
  });
  return flat;
}

export function Component() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState(null);

  const {
    data: userLevels,
    isPending: isLevelsPending,
    isError: isLevelsError,
    error: levelsError,
  } = useQuery({
    queryKey: ["userLevelCategory"],
    queryFn: ({ signal }) => getCategoryUserLevel({ signal }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (!selectedRole && userLevels?.length) {
      setSelectedRole(userLevels[0].user_level_id);
    }
  }, [userLevels, selectedRole]);

  const {
    data: moduleTree,
    isPending: isMatrixPending,
    isError: isMatrixError,
    error: matrixError,
  } = useQuery({
    queryKey: ["permissionMatrix", selectedRole],
    queryFn: ({ signal }) =>
      getPermissionMatrix({ userLevelId: selectedRole, signal }),
    enabled: !!selectedRole,
    staleTime: 1000 * 60,
  });

  const modules = flattenModuleTree(moduleTree);

  const { mutate: toggleField, isPending: isSaving } = useMutation({
    mutationFn: ({ userModuleId, field, value }) =>
      updatePermissionField({
        userLevelId: selectedRole,
        userModuleId,
        field,
        value,
      }),
    onMutate: async ({ userModuleId, field, value }) => {
      const queryKey = ["permissionMatrix", selectedRole];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old) => {
        if (!old) return old;
        const patchNode = (node) =>
          node.user_module_id === userModuleId
            ? { ...node, [field]: value }
            : { ...node, children: (node.children ?? []).map(patchNode) };
        return old.map(patchNode);
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["permissionMatrix", selectedRole],
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["permissionMatrix", selectedRole],
      });
    },
  });

  const handleToggle = (moduleId, action) => {
    const field = ACTION_FIELD_MAP[action];
    const mod = modules.find((m) => m.id === moduleId);
    const currentValue = !!mod?.[field];
    toggleField({ userModuleId: moduleId, field, value: !currentValue });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-slate-800 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">
      {/* Header Block */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-semibold text-slate-950 tracking-tight dark:text-white">
            Permission Matrix
          </h1>
          <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">
            Control what each role can do per module
          </p>
        </div>
        <button className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Role Filter Selector */}
      <div className="p-6 bg-slate-50 border-b border-slate-200 dark:bg-slate-950/50 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600 font-medium dark:text-slate-300">
            Role:
          </span>
          <div className="relative min-w-[180px]">
            <select
              value={selectedRole ?? ""}
              onChange={(e) => setSelectedRole(e.target.value)}
              disabled={isLevelsPending || isLevelsError}
              className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 pr-9 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer font-medium disabled:opacity-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:focus:border-indigo-400"
            >
              {isLevelsPending && <option>Loading roles...</option>}
              {isLevelsError && <option>Error loading roles</option>}
              {!isLevelsPending &&
                !isLevelsError &&
                userLevels.map((role) => (
                  <option key={role.user_level_id} value={role.user_level_id}>
                    {role.user_level}
                  </option>
                ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-3.5 top-3 text-slate-500 pointer-events-none dark:text-slate-400"
            />
          </div>
        </div>
        <div className="text-xs text-slate-500 max-w-[220px] sm:text-right leading-relaxed dark:text-slate-400">
          {isSaving ? "Saving..." : "Toggle checkboxes to update permissions"}
        </div>
      </div>

      {isLevelsError && (
        <div className="p-6 text-sm text-rose-500 dark:text-rose-400">
          Failed to load roles: {levelsError?.message}
        </div>
      )}

      {/* Grid Layout Table */}
      {selectedRole && (
        <div className="p-4 overflow-x-auto">
          {isMatrixPending && (
            <div className="flex items-center justify-center py-16 text-slate-500 text-sm dark:text-slate-400">
              Loading permissions...
            </div>
          )}

          {isMatrixError && (
            <div className="flex items-center justify-center py-16 text-rose-500 dark:text-rose-400 text-sm">
              Error: {matrixError?.message}
            </div>
          )}

          {!isMatrixPending && !isMatrixError && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-1/3 dark:text-slate-400">
                    Module
                  </th>
                  {ACTIONS.map((action) => (
                    <th
                      key={action}
                      className="p-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center dark:text-slate-400"
                    >
                      {action}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {modules.map((mod) => (
                  <tr
                    key={mod.id}
                    className="hover:bg-slate-50 transition-colors dark:hover:bg-slate-800/50"
                  >
                    {/* Module Title Cell */}
                    <td className="p-3.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-2">
                        {mod.isSub && (
                          <span className="text-slate-400 font-mono text-xs mr-1 select-none dark:text-slate-500">
                            ↳
                          </span>
                        )}
                        <span
                          className={
                            mod.isSub
                              ? "text-slate-500 font-normal dark:text-slate-400"
                              : ""
                          }
                        >
                          {mod.label}
                        </span>
                      </div>
                    </td>

                    {/* Action Matrix Toggle Switches */}
                    {ACTIONS.map((action) => {
                      const field = ACTION_FIELD_MAP[action];
                      const active = !!mod[field];
                      return (
                        <td key={action} className="p-3.5 text-center">
                          <button
                            onClick={() => handleToggle(mod.id, action)}
                            disabled={isSaving}
                            className={`mx-auto relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-60 ${
                              active
                                ? "bg-indigo-600 dark:bg-indigo-500"
                                : "bg-slate-300 dark:bg-slate-700"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                active ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
