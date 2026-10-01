import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Outlet, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { fetchAppointments, markNoShow } from "@/api/http";
import QueryState from "@/components/ui/QueryState";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight, Pencil, XCircle, UserX } from "lucide-react";

const SERVICE_DOT = {
  Grooming: "bg-indigo-500",
  Consultation: "bg-emerald-500",
  Operation: "bg-rose-500",
};

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

function dateKey(value) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const BOOKING_CLOSE_HOUR = 18; // 6 PM — last slot (5-6 PM) has already started by then

function isPastDay(date) {
  const now = new Date();
  if (dateKey(date) < dateKey(now)) return true;
  // Today counts as unbookable too once every slot (9 AM-6 PM) has passed.
  return dateKey(date) === dateKey(now) && now.getHours() >= BOOKING_CLOSE_HOUR;
}

export function Component() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["appointments", "calendar"],
    queryFn: ({ signal }) => fetchAppointments({ limit: "all", signal }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const noShowMutation = useMutation({
    mutationFn: markNoShow,
    onSuccess: () => {
      toast.success("Appointment marked as a no-show");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error) => {
      toast.error("Could not mark as a no-show", {
        description: error.message,
      });
    },
  });

  const appointments = data?.rows ?? [];

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

  const handlePrevMonth = () => setCurrentMonthDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentMonthDate(new Date(year, month + 1, 1));

  const selectedKey = selectedDate ? dateKey(selectedDate) : null;
  const selectedDayAppointments = (selectedKey && appointmentsByDay.get(selectedKey)) || [];
  const isSelectedDayPast = selectedDate ? isPastDay(selectedDate) : false;

  const bookLink = selectedDate
    ? `add-appointment?date=${dateKey(selectedDate)}`
    : "add-appointment";

  return (
    <div className="w-full py-6 space-y-4">
      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-wide">
            Appointments
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Click a day to view or book appointments.
          </p>
        </div>
        {isSelectedDayPast ? (
          <Button
            disabled
            title="Can't book an appointment in the past"
            className="flex items-center gap-1.5 font-medium"
          >
            <Plus size={16} />
            <span>Book Appointment</span>
          </Button>
        ) : (
          <Button asChild>
            <Link to={bookLink} className="flex items-center gap-1.5 font-medium">
              <Plus size={16} />
              <span>Book Appointment</span>
            </Link>
          </Button>
        )}
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        loadingLabel="Loading appointments..."
        errorLabel="Error loading appointments"
      />

      {!isLoading && !isError && (
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
                  No appointments booked on this day.
                </p>
              ) : (
                <div className="space-y-3 max-h-120 overflow-y-auto pr-1">
                  {selectedDayAppointments
                    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                    .map((appt) => {
                      const isFinal = [
                        "Completed",
                        "Cancelled",
                        "No Show",
                      ].includes(appt.appointment_status_name);
                      const isPastAppointment = isPastDay(
                        new Date(appt.appointment_date),
                      );
                      const hasStartTimePassed =
                        new Date(appt.start_time).getTime() < Date.now();
                      return (
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
                              {formatTime(appt.start_time)} -{" "}
                              {formatTime(appt.end_time)}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-950 dark:text-white">
                              {appt.pets_name}{" "}
                              <span className="font-normal text-slate-500 dark:text-slate-400">
                                ({appt.client_name})
                              </span>
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {appt.service_name}
                              {appt.staff_name ? ` · ${appt.staff_name}` : ""}
                            </p>
                          </div>
                          {!isFinal && (
                            <div className="flex gap-2 pt-1">
                              {!isPastAppointment && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate(
                                      `${appt.appointment_id}/edit-appointment`,
                                    )
                                  }
                                  className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-2 py-1 rounded-md transition-colors"
                                >
                                  <Pencil size={12} /> Edit
                                </button>
                              )}
                              {hasStartTimePassed ? (
                                <button
                                  type="button"
                                  disabled={
                                    noShowMutation.isPending &&
                                    noShowMutation.variables ===
                                      appt.appointment_id
                                  }
                                  onClick={() =>
                                    noShowMutation.mutate(appt.appointment_id)
                                  }
                                  className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                                >
                                  <UserX size={12} /> Mark No Show
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate(
                                      `${appt.appointment_id}/cancel-appointment`,
                                    )
                                  }
                                  className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-2 py-1 rounded-md transition-colors"
                                >
                                  <XCircle size={12} /> Cancel
                                </button>
                              )}
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
      )}

      <Outlet />
    </div>
  );
}