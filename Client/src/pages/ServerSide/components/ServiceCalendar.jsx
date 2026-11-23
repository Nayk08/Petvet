import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { STATUS_BADGE, formatTime, dateKey } from "../Appointment.jsx";

// Month calendar for one service queue (Grooming / Consultation /
// Operation). Same look as the main Appointments calendar, but the day panel
// shows this queue's row actions (Mark Completed, Collect balance, Add
// Medical Record) — the same `actions` the table view uses.
export default function ServiceCalendar({ appointments, actions, dotClass = "bg-indigo-500" }) {
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const appointmentsByDay = useMemo(() => {
    const map = new Map();
    for (const appt of appointments) {
      const key = dateKey(appt.appointment_date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(appt);
    }
    return map;
  }, [appointments]);

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysArray = [];
  for (let i = 0; i < firstDayOfMonth; i++) daysArray.push(null);
  for (let d = 1; d <= daysInMonth; d++) daysArray.push(new Date(year, month, d));

  const todayKey = dateKey(new Date());
  const selectedKey = dateKey(selectedDate);
  const selectedDayAppointments = [...(appointmentsByDay.get(selectedKey) || [])].sort(
    (a, b) => new Date(a.start_time) - new Date(b.start_time),
  );

  const goToToday = () => {
    const now = new Date();
    setCurrentMonthDate(now);
    setSelectedDate(now);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <button
            type="button"
            onClick={() => setCurrentMonthDate(new Date(year, month - 1, 1))}
            aria-label="Previous month"
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {currentMonthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
            <button
              type="button"
              onClick={goToToday}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Today
            </button>
          </div>
          <button
            type="button"
            onClick={() => setCurrentMonthDate(new Date(year, month + 1, 1))}
            aria-label="Next month"
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {daysArray.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} />;
            const key = dateKey(date);
            const count = (appointmentsByDay.get(key) || []).length;
            const isSelected = selectedKey === key;
            const isToday = todayKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(date)}
                aria-label={`${date.toDateString()}, ${count} appointment${count === 1 ? "" : "s"}`}
                className={`flex flex-col items-center justify-between p-1.5 sm:p-2 rounded-lg border transition-all h-16 ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : isToday
                      ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-800 text-slate-900 dark:text-slate-100"
                      : "bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="text-base font-bold">{date.getDate()}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] font-bold leading-none px-1.5 py-0.5 rounded-full ${
                      isSelected ? "bg-white text-indigo-700" : `${dotClass} text-white`
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day */}
      <div className="lg:col-span-1">
        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 rounded-xl space-y-4">
          <h3 className="text-lg font-bold text-slate-950 dark:text-white">
            {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </h3>

          {selectedDayAppointments.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">No appointments on this day.</p>
          ) : (
            <div className="space-y-3 max-h-120 overflow-y-auto pr-1">
              {selectedDayAppointments.map((appt) => {
                const rowActions = actions.filter((a) =>
                  typeof a.show === "function" ? a.show(appt) : a.show ?? true,
                );
                return (
                  <div
                    key={appt.appointment_id}
                    className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {formatTime(appt.start_time)} – {formatTime(appt.end_time)}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded tracking-wide border whitespace-nowrap ${
                          STATUS_BADGE[appt.appointment_status_name] || STATUS_BADGE.Pending
                        }`}
                      >
                        {appt.appointment_status_name}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-950 dark:text-white">{appt.pets_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Owner: {appt.client_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {appt.service_name}
                        {appt.staff_name ? ` · ${appt.staff_name}` : ""}
                      </p>
                    </div>
                    {rowActions.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {rowActions.map((a, i) => {
                          const Icon = typeof a.icon === "function" ? a.icon(appt) : a.icon;
                          const label = typeof a.label === "function" ? a.label(appt) : a.label;
                          const cls = typeof a.className === "function" ? a.className(appt) : a.className;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => a.onClick(appt)}
                              disabled={a.isLoading?.(appt)}
                              className={`flex items-center gap-1 text-xs font-medium px-2 py-1 max-sm:min-h-10 max-sm:px-3 rounded-md transition-colors disabled:opacity-50 ${cls ?? ""}`}
                            >
                              {Icon && <Icon size={12} />} {label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
