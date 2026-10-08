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
    awaiting:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
    completed:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
    cancelled:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
    no_show:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
    partial:
      "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800",
    refund:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
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

export function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// "2026-10-05 13:22:10" (clinic time, as the API sends it) → "Oct 5, 2026, 1:22 PM".
export function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(String(value).replace(" ", "T"));
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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

// Archive tab — deliberately lighter than usersColumns: is_active reflects
// the joined role's status, not the archived user's own, so showing it here
// would misleadingly read as "Active"/"Inactive" for a soft-deleted account.
export const ArchivedUsersColumns = [
  { key: "user_name", label: "NAME" },
  { key: "user_email", label: "EMAIL" },
  { key: "user_level", label: "ROLE" },
  {
    key: "deleted_by",
    label: "ARCHIVED BY",
    render: (value) => value ?? <span className="text-slate-400 dark:text-slate-500">—</span>,
  },
  {
    key: "date_updated",
    label: "DATE ARCHIVED",
    render: (value) => (
      <span className="text-slate-700 dark:text-slate-300">
        {formatDate(value)}
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

// A function rather than a plain array — categories are user-created at
// runtime, so the "Category" filter's options can't be a fixed list like
// status_name's; the caller fetches categories and passes them in.
export function getInventoryColumns(categories = []) {
  return [
  {
    key: "product_id",
    label: "PRODUCT ID",
    render: (value, row) =>
      row.batch_count > 1 ? (
        <span className="text-slate-400 dark:text-slate-500 italic text-xs">
          {row.batch_count} batches
        </span>
      ) : (
        <span className="font-mono text-xs text-slate-500 font-semibold dark:text-slate-400">
          {value}
        </span>
      ),
  },
  {
    key: "product_name",
    label: "PRODUCT NAME",
    render: (value, row) => (
      <span className="inline-flex items-center gap-2">
        <span>{value}</span>
        {row.batch_count > 1 && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800 whitespace-nowrap">
            ×{row.batch_count} batches
          </span>
        )}
      </span>
    ),
  },
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
    render: (value, row) => {
      const min = row.min_price ?? value;
      const max = row.max_price ?? value;
      if (min == null) {
        return <span className="text-slate-400 dark:text-slate-500">—</span>;
      }
      const fmt = (n) =>
        Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 });
      return (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {Number(min) === Number(max)
            ? `₱${fmt(min)}`
            : `₱${fmt(min)} – ₱${fmt(max)}`}
        </span>
      );
    },
  },
  {
    key: "category_name",
    label: "Category",
    filterOptions: categories.map((c) => ({
      key: c.category_id,
      value: c.category_name,
      label: c.category_name,
    })),
    render: (value) =>
      value ? (
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 whitespace-nowrap">
          {value}
        </span>
      ) : (
        <span className="text-slate-400 dark:text-slate-500 italic text-xs">
          Uncategorized
        </span>
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
  {
    key: "expiring_soon",
    label: "Expiring Soon",
    filterOptions: [
      { key: "expiring_soon", value: "true", label: "Expiring Soon" },
      { key: "not_expiring_soon", value: "false", label: "Not Expiring Soon" },
    ],
    // Only ever true for a batch that ISN'T already expired (within 5
    // months of its expiry date) — a product that's already expired shows
    // that via the Expired column instead, not both at once.
    render: (value) => {
      const isExpiringSoon = value === true || value === "true";
      return isExpiringSoon ? (
        <StatusBadge label="Expiring Soon" variant="average" />
      ) : (
        <span className="text-slate-400 dark:text-slate-500">—</span>
      );
    },
  },
  ];
}

// Archive tab — the same product columns plus who archived it and when.
export function getArchivedInventoryColumns(categories = []) {
  return [
    ...getInventoryColumns(categories),
    {
      key: "deleted_by",
      label: "ARCHIVED BY",
      render: (value) => value ?? <span className="text-slate-400 dark:text-slate-500">—</span>,
    },
    {
      key: "date_updated",
      label: "DATE ARCHIVED",
      render: (value) => (
        <span className="text-slate-700 dark:text-slate-300">
          {formatDate(value)}
        </span>
      ),
    },
  ];
}

export const PaymentColumns = [
  {
    key: "control_number",
    label: "CONTROL NO.",
    render: (value) => (
      <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
        {value ?? "—"}
      </span>
    ),
  },
  {
    key: "payment_type",
    label: "TYPE",
    filterOnly: true,
    filterOptions: [
      { key: "inv", value: "INV", label: "Invoice (INV)" },
      { key: "apt", value: "APT", label: "Appointment (APT)" },
    ],
  },
  {
    key: "payment_date",
    label: "Date",
    filterOnly: true,
    filterType: "dateRange",
  },
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
    render: (value, row) =>
      value != null ? (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          ₱{Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          {/* Deposit received online; the rest is due at the clinic. */}
          {row.payment_status_name === "Partially Paid" && (
            <span className="block text-[11px] font-medium text-teal-700 dark:text-teal-300">
              Balance ₱
              {(Number(value) - Number(row.gcash_amount ?? 0)).toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </span>
          )}
        </span>
      ) : (
        <span className="text-slate-400 dark:text-slate-500">—</span>
      ),
  },
  {
    key: "payment_method",
    label: "METHOD",
    render: (value) => (
      <span className="text-slate-700 dark:text-slate-300">{value ?? "—"}</span>
    ),
  },
  {
    key: "payment_status_name",
    label: "PAYMENT STATUS",
    align: "right",
    filterOptions: [
      { key: "pending", value: "Pending", label: "Pending" },
      {
        key: "awaiting_verification",
        value: "Awaiting Verification",
        label: "Awaiting Verification",
      },
      { key: "partially_paid", value: "Partially Paid", label: "Partially Paid" },
      { key: "completed", value: "Completed", label: "Completed" },
      { key: "cancelled", value: "Cancelled", label: "Cancelled" },
      { key: "refund_needed", value: "Refund Needed", label: "Refund Needed" },
    ],
    render: (value) => {
      const variantMap = {
        Pending: "pending",
        "Awaiting Verification": "awaiting",
        "Partially Paid": "partial",
        Completed: "completed",
        Cancelled: "cancelled",
        "Refund Needed": "refund",
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

// For the revenue cards' click-through modal: every row is already
// Completed and scoped to whatever the clicked card meant (a day, a
// method, a type), so the Date Range and Status filters would just be
// redundant clutter — drop the date-range filter column entirely and
// strip the status column's filter (keeping the column itself, since it's
// still useful to see at a glance).
// Cash / Cashless lists: a Split payment counts only its cash (or GCash)
// part there, so the amount shows that part, with the full bill under it —
// otherwise a ₱2,000 cash + ₱450 GCash bill read as ₱2,450 in both lists.
// Each row is one money-in event from the revenue ledger (v_revenue): a
// reservation fee when it was verified, or a payment/balance when completed.
// So the amount is what came in THAT time (by method on the Cash/Cashless
// lists) and the date is when it came in — the bill's total shows under it.
export const paymentTransactionColumnsFor = (method) => {
  const amountKey =
    method === "cash" ? "received_cash" : method === "gcash" ? "received_gcash" : "received_amount";
  const peso = (v) => `₱${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  return PaymentTransactionModalColumns.map((col) => {
    if (col.key === "date_created") {
      return {
        ...col,
        render: (value, row) => (
          <span className="text-slate-700 dark:text-slate-300">
            {formatDate(row.received_at ?? value)}
          </span>
        ),
      };
    }
    if (col.key !== "total_amount") return col;
    return {
      ...col,
      label: method === "cash" ? "CASH AMOUNT" : method === "gcash" ? "GCASH AMOUNT" : "AMOUNT RECEIVED",
      render: (value, row) => {
        const received = row[amountKey] ?? value;
        return (
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {peso(received)}
            {(row.kind === "deposit" || Number(received) !== Number(value)) && (
              <span className="block text-[11px] font-normal text-slate-500 dark:text-slate-400">
                {row.kind === "deposit" ? "Reservation fee · " : row.amount_sent != null ? "Balance · " : ""}
                of {peso(value)} ({row.payment_method})
              </span>
            )}
          </span>
        );
      },
    };
  });
};

export const PaymentTransactionModalColumns = PaymentColumns.filter(
  (col) => col.key !== "payment_date",
).map((col) =>
  col.key === "payment_status_name" ? { ...col, filterOptions: undefined } : col,
);

export const ClientRecordsColumns = [
  { key: "client_id", label: "CLIENT ID" },
  { key: "name", label: "CLIENT NAME" },
  { key: "mobile_no", label: "CONTACT NUMBER" },
  { key: "email", label: "EMAIL" },
];

export const ArchivedClientRecordsColumns = [
  ...ClientRecordsColumns,
  {
    key: "deleted_by",
    label: "ARCHIVED BY",
    render: (value) => value ?? <span className="text-slate-400 dark:text-slate-500">—</span>,
  },
  {
    key: "date_updated",
    label: "DATE ARCHIVED",
    render: (value) => (
      <span className="text-slate-700 dark:text-slate-300">
        {formatDate(value)}
      </span>
    ),
  },
];

export const PetRecordsColumns = [
  {
    key: "pet_image",
    label: "PET IMAGE",
    render: (value) =>
      value ? (
        <img
          src={value}
          alt="Pet"
          className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
        />
      ) : (
        <span className="text-slate-400 dark:text-slate-500 italic text-xs">
          No image
        </span>
      ),
  },
  { key: "pet_name", label: "PET NAME" },
  { key: "date_of_birth", label: "BIRTH DATE" },
  { key: "weight_kg", label: "WEIGHT" },
  { key: "breed", label: "BREED" },
  { key: "microchip_number", label: "MICROCHIP NUMBER" },
  { key: "is_spayed_neutered", label: "SPAY/NEUTERED" },
  { key: "species_name", label: "SPECIES" },
  { key: "gender_name", label: "GENDER" },
];

export const AppointmentColumns = [
  { key: "appointment_id", label: "ID" },
  { key: "client_name", label: "CLIENT" },
  { key: "pets_name", label: "PET" },
  // Filter by the three fixed categories; the sub-service is its own column.
  {
    key: "category_name",
    label: "CATEGORY",
    multiSelect: true,
    filterOptions: [
      { key: "grooming", value: "Grooming", label: "Grooming" },
      { key: "consultation", value: "Consultation", label: "Consultation" },
      { key: "operation", value: "Operation", label: "Operation" },
    ],
  },
  { key: "service_name", label: "SERVICE" },
  {
    key: "staff_name",
    label: "STAFF",
    render: (value) =>
      value ?? <span className="text-slate-400 dark:text-slate-500">—</span>,
  },
  {
    key: "appointment_date",
    label: "DATE",
    render: (value) => (
      <span className="text-slate-700 dark:text-slate-300">
        {formatDate(value)}
      </span>
    ),
  },
  {
    key: "start_time",
    label: "TIME",
    render: (value, row) => {
      const fmt = (v) =>
        v
          ? new Date(v).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";
      return (
        <span className="text-slate-700 dark:text-slate-300">
          {fmt(row.start_time)} - {fmt(row.end_time)}
        </span>
      );
    },
  },
  {
    key: "appointment_status_name",
    label: "STATUS",
    align: "left",
    filterOptions: [
      { key: "pending", value: "Pending", label: "Pending" },
      { key: "in_queue", value: "In Queue", label: "In Queue" },
      { key: "completed", value: "Completed", label: "Completed" },
      { key: "cancelled", value: "Cancelled", label: "Cancelled" },
      { key: "no_show", value: "No Show", label: "No Show" },
    ],
    render: (value) => {
      const variantMap = {
        Pending: "pending",
        "In Queue": "active",
        Completed: "completed",
        Cancelled: "cancelled",
        "No Show": "no_show",
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

// Client portal's own "My Appointments" — same as AppointmentColumns minus
// client_name (always the logged-in client themselves) and any staff/date
// filter chips that assume a staff-wide view.
export const PortalAppointmentColumns = AppointmentColumns.filter(
  (col) => col.key !== "client_name",
);

// Dashboard's "Today's Live Queue" widget — a dedicated, lighter column set
// (no Control No./Date, since the whole table is already scoped to today)
// backed by GET /appointments/today.
export const TodayQueueColumns = [
  { key: "appointment_id", label: "ID" },
  { key: "pets_name", label: "PATIENT NAME" },
  { key: "client_name", label: "OWNER" },
  // Filter by the three fixed categories; the sub-service is its own column.
  {
    key: "category_name",
    label: "CATEGORY",
    multiSelect: true,
    filterOptions: [
      { key: "grooming", value: "Grooming", label: "Grooming" },
      { key: "consultation", value: "Consultation", label: "Consultation" },
      { key: "operation", value: "Operation", label: "Operation" },
    ],
  },
  { key: "service_name", label: "SERVICE TYPE" },
  {
    key: "start_time",
    label: "APPOINTMENT TIME",
    render: (value, row) => {
      const fmt = (v) =>
        v
          ? new Date(v).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";
      return (
        <span className="text-slate-700 dark:text-slate-300">
          {fmt(row.start_time)} - {fmt(row.end_time)}
        </span>
      );
    },
  },
  {
    key: "appointment_status_name",
    label: "LIVE STATUS",
    align: "right",
    filterOptions: [
      { key: "pending", value: "Pending", label: "Pending" },
      { key: "in_queue", value: "In Queue", label: "In Queue" },
      { key: "completed", value: "Completed", label: "Completed" },
      { key: "cancelled", value: "Cancelled", label: "Cancelled" },
      { key: "no_show", value: "No Show", label: "No Show" },
    ],
    render: (value) => {
      const variantMap = {
        Pending: "pending",
        "In Queue": "active",
        Completed: "completed",
        Cancelled: "cancelled",
        "No Show": "no_show",
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

// ── Maintenance (service catalog) ──────────────────────

export const MaintenanceServiceColumns = [
  // Listed per category tab in Maintenance, so no category column here.
  { key: "appointment_services", label: "SUB-SERVICE" },
  {
    key: "service_price",
    label: "PRICE",
    render: (value, row) =>
      // A grooming sub-service with its own weight tiers is priced by them.
      row.category_id === 1 && row.tier_count > 0 ? (
        <span className="text-indigo-600 dark:text-indigo-400 text-xs font-medium">
          By pet weight ({row.tier_count} {row.tier_count === 1 ? "tier" : "tiers"})
        </span>
      ) : value != null ? (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          ₱{Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      ) : (
        // No fixed price — entered by staff when the client pays.
        <span className="text-slate-400 dark:text-slate-500 italic text-xs">
          Priced at clinic
        </span>
      ),
  },
  {
    key: "duration_minutes",
    label: "DURATION",
    render: (value) =>
      value ? (
        <span className="text-slate-700 dark:text-slate-300">{value} min</span>
      ) : (
        <span className="text-slate-400 dark:text-slate-500">—</span>
      ),
  },
  {
    key: "allowed_roles",
    label: "ASSIGNED PERSONNEL",
    render: (value) =>
      Array.isArray(value) && value.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {value.map((role) => (
            <span
              key={role}
              className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 whitespace-nowrap"
            >
              {role}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-slate-400 dark:text-slate-500 italic text-xs">
          Unassigned
        </span>
      ),
  },
  {
    key: "is_active",
    label: "STATUS",
    filterOptions: [
      { key: "active", value: "true", label: "Active" },
      { key: "deleted", value: "false", label: "Deleted" },
    ],
    render: (value) => (
      <StatusBadge
        label={value ? "Active" : "Deleted"}
        variant={value ? "active" : "inactive"}
      />
    ),
  },
  // Last: long free text, so the key facts (price, duration, staff) stay in view.
  {
    key: "description",
    label: "DESCRIPTION",
    render: (value) => (
      <span className="text-slate-600 dark:text-slate-300 line-clamp-2 whitespace-normal min-w-56 max-w-xs block">
        {value ?? <span className="text-slate-400 dark:text-slate-500">—</span>}
      </span>
    ),
  },
];

export const MaintenanceGroomingTierColumns = [
  { key: "tier_name", label: "TIER" },
  {
    key: "max_weight_kg",
    label: "PET WEIGHT",
    render: (value) =>
      value != null ? `Up to ${Number(value)} kg` : "No upper limit",
  },
  {
    key: "price",
    label: "PRICE",
    render: (value) => (
      <span className="font-medium text-slate-900 dark:text-slate-100">
        ₱{Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    key: "description",
    label: "DESCRIPTION",
    render: (value) => value ?? <span className="text-slate-400 dark:text-slate-500">—</span>,
  },
];

