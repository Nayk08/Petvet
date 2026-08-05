import React from "react";

const StatusBadge = ({ label, variant = "default" }) => {
  const variantStyles = {
    active:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
    inactive:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    high: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
    average:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
    low: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800",
    out: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
    pending:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
    completed:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
    cancelled:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
    default:
      "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  };

  return (
    <span
      className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full border transition-colors ${
        variantStyles[variant] || variantStyles.default
      }`}
    >
      {label}
    </span>
  );
};

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
    render: (value) => {
      const isActive = value === true || value === "true";
      return (
        <StatusBadge
          label={isActive ? "Active" : "Inactive"}
          variant={isActive ? "active" : "inactive"}
        />
      );
    },
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
    render: (value) => {
      const isActive = value === true || value === "true";
      return (
        <StatusBadge
          label={isActive ? "Active" : "Inactive"}
          variant={isActive ? "active" : "inactive"}
        />
      );
    },
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
          className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
        />
      ) : (
        <span className="text-slate-400 dark:text-slate-500 italic text-xs">
          No image
        </span>
      ),
  },
  { key: "product_quantity", label: "PRODUCT QUANTITY" },
  {
    key: "product_price",
    label: "PRODUCT PRICE",
    render: (value) =>
      value != null ? (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          ₱{Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      ) : (
        <span className="text-slate-400 dark:text-slate-500">—</span>
      ),
  },
  {
    key: "status_name",
    label: "Status",
    multiSelect: true,
    filterOptions: [
      { key: "high", value: "High Stock", label: "High Stock" },
      { key: "average", value: "Average Stock", label: "Average Stock" },
      { key: "low", value: "Low Stock", label: "Low Stock" },
      { key: "out", value: "Out of Stock", label: "Out of Stock" },
    ],
    render: (value) => {
      const variantMap = {
        "High Stock": "high",
        "Average Stock": "average",
        "Low Stock": "low",
        "Out of Stock": "out",
      };
      return (
        <StatusBadge
          label={value ?? "Unknown"}
          variant={variantMap[value] || "default"}
        />
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
    render: (value) => {
      const isExpired = value === true || value === "true";
      return (
        <StatusBadge
          label={isExpired ? "Expired" : "Not Expired"}
          variant={isExpired ? "out" : "active"}
        />
      );
    },
  },
];

export const PaymentColumns = [
  { key: "payment_id", label: "PAYMENT ID" },
  {
    key: "date_created",
    label: "PAYMENT DATE",
    render: (value) => (
      <span className="text-slate-700 dark:text-slate-300">
        {formatDate(value)}
      </span>
    ),
  },
  {
    key: "total_amount",
    label: "PAYMENT AMOUNT",
    align: "right",
    render: (value) =>
      value != null ? (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          ₱{Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      ) : (
        <span className="text-slate-400 dark:text-slate-500">—</span>
      ),
  },
  {
    key: "payment_status_name",
    label: "PAYMENT STATUS",
    align: "right",
    filterOptions: [
      { key: "pending", value: "Pending", label: "Pending" },
      { key: "completed", value: "Completed", label: "Completed" },
      { key: "cancelled", value: "Cancelled", label: "Cancelled" },
    ],
    render: (value) => {
      const variantMap = {
        Pending: "pending",
        Completed: "completed",
        Cancelled: "cancelled",
      };
      return (
        <StatusBadge
          label={value ?? "Unknown"}
          variant={variantMap[value] || "default"}
        />
      );
    },
  },
];

export function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
