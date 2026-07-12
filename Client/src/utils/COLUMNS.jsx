export const usersColumns = [
  { key: "user_name", label: "NAME" },
  { key: "user_email", label: "EMAIL" },
  { key: "user_level", label: "ROLE" },
  {
    key: "is_active",
    label: "STATUS",
    filterOptions: [
      { key: "active", value: "true", label: "Active" },
      { key: "inactive", value: "false", label: "Inactive" },
    ],
    render: (value) =>
      value === true || value === "true" ? (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full border border-green-500 text-green-400 bg-green-500/10">
          Active
        </span>
      ) : (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full border border-slate-600 text-slate-400 bg-slate-800/50">
          Inactive
        </span>
      ),
  },
];

export const usersActions = [
  {
    label: "Edit",
    className: "text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10",
    onClick: (row) => console.log("Edit", row),
  },
  {
    label: "Delete",
    className: "text-rose-400 hover:text-rose-300 hover:bg-rose-500/10",
    onClick: (row) => console.log("Delete", row),
  },
];

export const usersLevelColumns = [
  { key: "user_level", label: "ROLE" },
  { key: "description", label: "DESCRIPTION" },

  {
    key: "is_active",
    label: "STATUS",
    filterOptions: [
      { key: "active", value: "true", label: "Active" },
      { key: "inactive", value: "false", label: "Inactive" },
    ],
    render: (value) =>
      value === true || value === "true" ? (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full border border-green-500 text-green-400 bg-green-500/10">
          Active
        </span>
      ) : (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full border border-slate-600 text-slate-400 bg-slate-800/50">
          Inactive
        </span>
      ),
  },
];

export const usersLevelActions = [
  {
    label: "Edit",
    className: "text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10",
    onClick: (row) => console.log("Edit role", row),
  },
  {
    label: "Delete",
    className: "text-rose-400 hover:text-rose-300 hover:bg-rose-500/10",
    onClick: (row) => console.log("Delete role", row),
  },
];
