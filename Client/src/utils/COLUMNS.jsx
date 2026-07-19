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

export const InventoryColumns = [
  { key: "product_id", label: "PRODUCT ID" },
  { key: "product_name", label: "PRODUCT NAME" },
  {
    key: "product_image",
    label: "PRODUCT IMAGE",
    render: (value) =>
      value ? (
        <img
          src={value}
          alt="Product"
          className="w-10 h-10 object-cover rounded-md border border-[#1e253a]"
        />
      ) : (
        <span className="text-slate-500 italic text-xs">No image</span>
      ),
  },
  { key: "product_quantity", label: "PRODUCT QUANTITY" },
  { key: "product_price", label: "PRODUCT PRICE" },
  {
    key: "status_name",
    label: "Status",
    multiSelect: true,
    filterOptions: [
      { key: "high", value: "High stock", label: "High stock" },
      { key: "average", value: "Average stock", label: "Average stock" },
      { key: "low", value: "Low Stock", label: "Low Stock" },
      { key: "out", value: "Out of Stock", label: "Out of Stock" },
    ],
    render: (value) => {
      const styles = {
        "High stock": "border-green-600 text-green-400 bg-green-800/50",
        "Average stock": "border-blue-500 text-blue-400 bg-blue-500/10",
        "Low Stock": "border-yellow-500 text-yellow-400 bg-yellow-500/10",
        "Out of Stock": "border-red-500 text-red-400 bg-red-500/10",
      };
      return (
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
            styles[value] ?? "border-slate-600 text-slate-400 bg-slate-800/50"
          }`}
        >
          {value ?? "Unknown"}
        </span>
      );
    },
  },
  {
    key: "is_expired",
    label: "Expired",
    filterOptions: [
      { key: "expired", value: "true", label: "Expired" },
      { key: "not_expired", value: "false", label: "Not Expired" },
    ],
    render: (value) =>
      value === true || value === "true" ? (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full border border-red-500 text-red-400 bg-red-500/10">
          Expired
        </span>
      ) : (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full border border-green-600 text-green-400 bg-green-800/50">
          Not Expired
        </span>
      ),
  },
];
