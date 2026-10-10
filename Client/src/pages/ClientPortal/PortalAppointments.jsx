import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Receipt } from "lucide-react";
import PortalReceiptModal from "./components/PortalReceiptModal.jsx";
import { Button } from "@/components/ui/button.jsx";
import { fetchMyAppointments, fetchClinicSchedule } from "@/api/clientPortal.js";

const SERVICE_DOT = {
  Grooming: "bg-indigo-500",
  Consultation: "bg-emerald-500",
  Operation: "bg-rose-500",
};

const STATUS_BADGE = {
  Pending:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
  "In Queue":
    "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800",
  Completed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  Cancelled:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
  "No Show":
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
};

// Still ahead: not finished/cancelled and the visit hasn't ended yet.
const isUpcoming = (appt) =>
  ["Pending", "In Queue"].includes(appt.appointment_status_name) &&
  new Date(appt.end_time) >= new Date();

const LIST_FILTERS = ["All", "Upcoming", "Past"];

// A receipt exists once money was received: paid in full, or the online
// reservation fee verified (its receipt shows the balance still due).
const hasReceipt = (appt) =>
  Boolean(appt.payment_id) && ["Completed", "Partially Paid"].includes(appt.payment_status_name);

function formatTime(value) {
  return value
    ? new Date(value).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
}

function dateKey(value) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const BOOKING_CLOSE_HOUR = 18;

function isPastDay(date) {
  const now = new Date();
  if (dateKey(date) < dateKey(now)) return true;
  return dateKey(date) === dateKey(now) && now.getHours() >= BOOKING_CLOSE_HOUR;
}

export function Component() {
  const navigate = useNavigate();
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [receiptPaymentId, setReceiptPaymentId] = useState(null);

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["clientPortal", "appointments", "calendar"],
    queryFn: ({ signal }) => fetchMyAppointments({ limit: "all", signal }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const appointments = data?.rows ?? [];

  const appointmentsByDay = useMemo(() => {
    const map = new Map();
    for (const appt of appointments) {
      // Cancelled bookings don't take up the day — keep them off the calendar.
      if (appt.appointment_status_name === "Cancelled") continue;
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

  // Clinic-wide schedule (busy slots, no names — see
  // ClientPortal_Model.js:getClinicSchedule) for today/future days only,
  // clamped to whichever part of the viewed month hasn't passed yet.
  const today = new Date();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const scheduleRangeStart = monthStart < today ? today : monthStart;
  const isMonthEntirelyPast = monthEnd < today && dateKey(monthEnd) !== dateKey(today);

  const { data: clinicSchedule } = useQuery({
    queryKey: [
      "clientPortal",
      "clinic-schedule",
      dateKey(scheduleRangeStart),
      dateKey(monthEnd),
    ],
    queryFn: ({ signal }) =>
      fetchClinicSchedule({
        start_date: dateKey(scheduleRangeStart),
        end_date: dateKey(monthEnd),
        signal,
      }),
    enabled: !isMonthEntirelyPast,
    staleTime: 1000 * 60,
  });

  const clinicScheduleByDay = useMemo(() => {
    const map = new Map();
    for (const slot of clinicSchedule ?? []) {
      const key = dateKey(slot.appointment_date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(slot);
    }
    return map;
  }, [clinicSchedule]);

  // Every booking, cancelled ones included: upcoming soonest first, then past
  // newest first.
  const [listFilter, setListFilter] = useState("All");
  const upcoming = appointments
    .filter(isUpcoming)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  const past = appointments
    .filter((a) => !isUpcoming(a))
    .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
  const listCounts = { All: appointments.length, Upcoming: upcoming.length, Past: past.length };
  const listRows =
    listFilter === "Upcoming" ? upcoming : listFilter === "Past" ? past : [...upcoming, ...past];

  // Clicking a booking in the list shows its day on the calendar.
  function showOnCalendar(appt) {
    const day = new Date(appt.start_time);
    setSelectedDate(day);
    setCurrentMonthDate(new Date(day.getFullYear(), day.getMonth(), 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const handlePrevMonth = () => setCurrentMonthDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentMonthDate(new Date(year, month + 1, 1));

  const selectedKey = selectedDate ? dateKey(selectedDate) : null;
  const selectedDayAppointments =
    (selectedKey && appointmentsByDay.get(selectedKey)) || [];
  const isSelectedDayPast = selectedDate ? isPastDay(selectedDate) : false;

  const bookLink = selectedDate
    ? `book?date=${dateKey(selectedDate)}`
    : "book";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-wide">
            My Appointments
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Click a day on the calendar, or see every booking in the list below.
          </p>
        </div>
        <Button
          disabled={isSelectedDayPast}
          title={isSelectedDayPast ? "Can't book an appointment in the past" : undefined}
          onClick={() => navigate(bookLink)}
          className="flex items-center justify-center gap-1.5 font-medium w-full sm:w-auto"
        >
          <Plus size={16} />
          <span>Book Appointment</span>
        </Button>
      </div>

      {isPending ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
      ) : isError ? (
        <p className="text-sm text-rose-500 dark:text-rose-400">
          {error?.message ?? "Failed to load appointments"}
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                {currentMonthDate.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {daysArray.map((date, idx) => {
                if (!date) return <div key={`empty-${idx}`} />;

                const key = dateKey(date);
                const dayAppointments = appointmentsByDay.get(key) || [];
                const clinicBusyCount = clinicScheduleByDay.get(key)?.length ?? 0;
                const isSelected = selectedKey === key;
                const isToday = dateKey(new Date()) === key;
                const isPast = isPastDay(date);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={`flex flex-col items-center justify-between p-2 rounded-lg border transition-all h-16 relative ${
                      isPast
                        ? isSelected
                          ? "bg-red-100 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400"
                          : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-400 dark:text-red-700 hover:bg-red-100 dark:hover:bg-red-950/30"
                        : isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : isToday
                            ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-800 text-slate-900 dark:text-slate-100"
                            : "bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <span className="text-base font-bold w-full text-center mt-0.5">
                      {date.getDate()}
                    </span>
                    {dayAppointments.length > 0 && (
                      <div className="flex items-center gap-0.5">
                        {dayAppointments.slice(0, 4).map((appt) => (
                          <span
                            key={appt.appointment_id}
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected
                                ? "bg-white"
                                : SERVICE_DOT[appt.service_name] || "bg-slate-400"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                    {!isPast && clinicBusyCount > 0 && (
                      <span
                        className={`absolute top-1 right-1 text-[8px] font-bold px-1 rounded-full leading-tight ${
                          isSelected
                            ? "bg-white/25 text-white"
                            : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                        title={`${clinicBusyCount} clinic-wide slot(s) booked`}
                      >
                        {clinicBusyCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected day panel */}
          <div className="lg:col-span-1">
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-xl space-y-4">
              <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                {selectedDate
                  ? selectedDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })
                  : "Select a day"}
              </h3>

              {selectedDayAppointments.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                  No appointments on this day.
                </p>
              ) : (
                <div className="space-y-3 max-h-120 overflow-y-auto pr-1">
                  {selectedDayAppointments
                    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                    .map((appt) => (
                      <div
                        key={appt.appointment_id}
                        className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded tracking-wide border ${
                              STATUS_BADGE[appt.appointment_status_name] ||
                              STATUS_BADGE.Pending
                            }`}
                          >
                            {appt.appointment_status_name}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {formatTime(appt.start_time)} - {formatTime(appt.end_time)}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-950 dark:text-white">
                            {appt.pets_name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {appt.service_name}
                            {appt.staff_name ? ` · ${appt.staff_name}` : ""}
                          </p>
                        </div>
                        {hasReceipt(appt) && (
                          <button
                            type="button"
                            onClick={() => setReceiptPaymentId(appt.payment_id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                          >
                            <Receipt size={13} />
                            Receipt
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              )}

              {selectedDate && !isSelectedDayPast && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Clinic Schedule
                  </h4>
                  {(clinicScheduleByDay.get(selectedKey) || []).length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                      No booked slots yet — the whole day is open.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {(clinicScheduleByDay.get(selectedKey) || [])
                        .slice()
                        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                        .map((slot, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5"
                          >
                            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  SERVICE_DOT[slot.service_name] || "bg-slate-400"
                                }`}
                              />
                              {slot.service_name}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Shows when the clinic is booked, not who by.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* All bookings as a list */}
      {!isPending && !isError && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              All My Appointments
            </h2>
            <div className="flex flex-wrap gap-2">
              {LIST_FILTERS.map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={listFilter === name}
                  onClick={() => setListFilter(name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    listFilter === name
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                  }`}
                >
                  {name} <span className="opacity-70">({listCounts[name]})</span>
                </button>
              ))}
            </div>
          </div>

          {listRows.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic py-6 text-center">
              {listFilter === "Upcoming"
                ? "No upcoming appointments. Use Book Appointment to schedule one."
                : "No appointments yet."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[32rem] overflow-y-auto -mx-2">
              {listRows.map((appt) => (
                <li key={appt.appointment_id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => showOnCalendar(appt)}
                    title="Show this day on the calendar"
                    className="min-w-0 flex-1 text-left px-2 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="sm:w-44 shrink-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {new Date(appt.start_time).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatTime(appt.start_time)} - {formatTime(appt.end_time)}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-950 dark:text-white flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            SERVICE_DOT[appt.category_name] || "bg-slate-400"
                          }`}
                        />
                        {appt.pets_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {appt.service_name}
                        {appt.staff_name ? ` · ${appt.staff_name}` : ""}
                      </p>
                    </div>
                    <span
                      className={`self-start sm:self-center text-[10px] uppercase font-extrabold px-2 py-0.5 rounded tracking-wide border ${
                        STATUS_BADGE[appt.appointment_status_name] || STATUS_BADGE.Pending
                      }`}
                    >
                      {appt.appointment_status_name}
                    </span>
                  </button>
                  {hasReceipt(appt) && (
                    <button
                      type="button"
                      onClick={() => setReceiptPaymentId(appt.payment_id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                    >
                      <Receipt size={13} />
                      Receipt
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {receiptPaymentId && (
        <PortalReceiptModal paymentId={receiptPaymentId} onClose={() => setReceiptPaymentId(null)} />
      )}
    </div>
  );
}
