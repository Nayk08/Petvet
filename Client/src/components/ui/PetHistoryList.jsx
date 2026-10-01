import { formatDate } from "@/utils/COLUMNS";

const STATUS_BADGE = {
  Pending: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
  "In Queue": "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  Cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
  "No Show": "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
};

function formatTime(value) {
  return value
    ? new Date(value).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
}

// A simple chronological timeline of a pet's past appointments — service,
// staff, date/time, status, and the visit notes already recorded on each
// one. Not a full EMR (no vitals/diagnosis/prescriptions); it's just what
// already exists on the appointment record, reused for both the staff Pet
// Records view and the client portal's own "my pet" view.
export default function PetHistoryList({ history }) {
  if (!history?.length) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 italic py-6 text-center">
        No visit history yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((entry) => (
        <div
          key={entry.appointment_id}
          className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              {entry.service_name}
            </span>
            <span
              className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded tracking-wide border ${
                STATUS_BADGE[entry.appointment_status_name] ||
                STATUS_BADGE.Pending
              }`}
            >
              {entry.appointment_status_name}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {formatDate(entry.appointment_date)} · {formatTime(entry.start_time)}
            {entry.staff_name ? ` · ${entry.staff_name}` : ""}
          </p>
          {entry.notes && (
            <p className="text-xs text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-800">
              {entry.notes}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
