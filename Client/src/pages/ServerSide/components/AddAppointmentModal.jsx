import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import {
  redirect,
  useNavigate,
  useParams,
  useSearchParams,
  useSubmit,
  useNavigation,
  useActionData,
} from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Search, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  queryClient,
  invalidateAppointmentQueries,
  addAppointment,
  editAppointment,
  fetchAppointmentById,
  fetchAppointments,
  fetchClientRecords,
  fetchPetRecordsByClientId,
  selectAppointmentServices,
  selectAppointmentStaff,
} from "@/api/http";
import { formatDate } from "@/utils/COLUMNS";

const STATUS_OPTIONS = ["Pending", "In Queue", "Completed"];

// Which staff roles can be assigned to each service type.
const SERVICE_STAFF_ROLES = {
  Grooming: ["Groomer"],
  Consultation: ["Veterinarian"],
  Operation: ["Veterinarian"],
};

const BOOKING_START_HOUR = 9; // 9 AM
const BOOKING_LAST_START_HOUR = 17; // 5 PM start -> 6 PM end is the last slot

const TIME_SLOTS = Array.from(
  { length: BOOKING_LAST_START_HOUR - BOOKING_START_HOUR + 1 },
  (_, i) => {
    const hour = BOOKING_START_HOUR + i;
    const fmt = (h) => {
      const period = h < 12 || h === 24 ? "AM" : "PM";
      const display = h % 12 === 0 ? 12 : h % 12;
      return `${display}:00 ${period}`;
    };
    return {
      value: String(hour).padStart(2, "0") + ":00",
      label: `${fmt(hour)} - ${fmt(hour + 1)}`,
      hour,
    };
  },
);

const BOOKING_CLOSE_HOUR = 18; // 6 PM — last slot (5-6 PM) has already started by then

function formatDateString(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayDateString() {
  return formatDateString(new Date());
}

// FIXED — added: extracts just the "HH:mm" portion from a raw time value,
// which may be:
//   - "2026-09-30 17:00:00" — what GET /appointments now returns, once
//     db.js's TIMESTAMP type parser (types.setTypeParser(types.builtins.TIMESTAMP,
//     v => v)) stops `pg` from turning it into a JS Date on read
//   - "17:00:00" — the bare time-of-day string this form now sends/receives
//     in its own payload
// Deliberately never routes through `new Date(...)`: browsers parse a
// non-ISO "YYYY-MM-DD HH:mm:ss" string (space instead of "T") in an
// implementation-defined way, which is exactly the class of bug that
// caused this app's original 8-hour display shift. Plain string slicing
// has no timezone behavior to get wrong.
function extractTimeOfDay(value) {
  if (!value) return "";
  const timePart = value.includes(" ") ? value.split(" ")[1] : value;
  return timePart.slice(0, 5); // "HH:mm"
}

function extractHour(value) {
  const timePart = extractTimeOfDay(value);
  return timePart ? Number(timePart.split(":")[0]) : null;
}

function buildAppointmentPayload(formData) {
  const appointment_date = formData.get("appointment_date");
  const time_slot = formData.get("time_slot"); // e.g. "09:00", a one-hour slot
  const [slotHour] = time_slot.split(":").map(Number);

  // FIXED: start_time/end_time are now sent as bare "HH:mm:ss" time-of-day
  // strings, not a combined "<date>T<time>" datetime string. Why: the
  // backend column (tbl_appointments.start_time/end_time) is TIMESTAMP
  // WITHOUT TIME ZONE storing a clinic-local wall-clock slot.
  // appointmentSchema.js validates these fields as plain time strings
  // (never z.coerce.date() / new Date(...)), and Appointment_Model.js
  // recombines them with appointment_date server-side, right before the
  // write, via a toTimestampString() helper — never through a Date object.
  // Sending a full "<date>T<time>" datetime string here, as this used to
  // do, either fails schema validation outright (safe) or — if the schema
  // and this payload fall out of sync — corrupts the write with a garbled
  // value. Keep this as bare time, always; the date travels separately in
  // appointment_date.
  const start_time = `${time_slot}:00`;
  const end_time = `${String(slotHour + 1).padStart(2, "0")}:00:00`;

  return {
    client_id: formData.get("client_id"),
    pets_id: formData.get("pets_id"),
    appointment_services_id: formData.get("appointment_services_id"),
    assigned_staff_id: formData.get("assigned_staff_id"),
    appointment_date,
    start_time,
    end_time,
    notes: formData.get("notes"),
  };
}

// The earliest date still worth showing in the picker: today, unless every
// slot (9 AM-6 PM) has already passed, in which case it's tomorrow.
function earliestBookableDateString() {
  const now = new Date();
  if (now.getHours() >= BOOKING_CLOSE_HOUR) {
    now.setDate(now.getDate() + 1);
  }
  return formatDateString(now);
}

export function Component() {
  const submit = useSubmit();
  const navigate = useNavigate();
  const { state } = useNavigation();
  const params = useParams(); // expects :appointment_id in edit mode
  const [searchParams] = useSearchParams();
  const prefillDate = searchParams.get("date"); // set when booking from the calendar
  const isEditMode = Boolean(params.appointment_id);
  const actionData = useActionData();
  const isActionError = Boolean(actionData?.error);
  const actionError = actionData?.error;

  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientComboboxRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(
    () => prefillDate ?? earliestBookableDateString(),
  );

  const { data: clients } = useQuery({
    queryKey: ["clients-all"],
    queryFn: ({ signal }) =>
      fetchClientRecords({ limit: "all", signal }).then((r) => r.rows ?? []),
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        clientComboboxRef.current &&
        !clientComboboxRef.current.contains(e.target)
      ) {
        setIsClientDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredClients = (clients ?? []).filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()),
  );

  function handleSelectClient(client) {
    setSelectedClientId(String(client.client_id));
    setClientSearch(client.name);
    setIsClientDropdownOpen(false);
    setSelectedPetId(""); // previously-picked pet belonged to a different client
  }

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedPetId, setSelectedPetId] = useState("");

  const { data: services } = useQuery({
    queryKey: ["appointment-services"],
    queryFn: ({ signal }) => selectAppointmentServices({ signal }),
  });

  const { data: staff } = useQuery({
    queryKey: ["appointment-staff"],
    queryFn: ({ signal }) => selectAppointmentStaff({ signal }),
  });

  const selectedServiceName = services?.find(
    (s) => String(s.appointment_services_id) === selectedServiceId,
  )?.appointment_services;
  const allowedStaffRoles = SERVICE_STAFF_ROLES[selectedServiceName] ?? [];
  const filteredStaff = (staff ?? []).filter((s) =>
    allowedStaffRoles.includes(s.user_level?.trim()),
  );

  const { data: appointmentData, isPending: isAppointmentPending } = useQuery({
    queryKey: ["appointment", params.appointment_id],
    queryFn: ({ signal }) =>
      fetchAppointmentById(params.appointment_id, { signal }),
    enabled: isEditMode,
  });

  // FIXED: was `new Date(appointmentData.start_time).getHours()...` — see
  // extractTimeOfDay/extractHour comment above for why that's unreliable
  // against the space-separated "YYYY-MM-DD HH:mm:ss" strings the API now
  // returns.
  const initialSlotValue = appointmentData?.start_time
    ? String(extractHour(appointmentData.start_time)).padStart(2, "0") + ":00"
    : "";
  const [selectedSlot, setSelectedSlot] = useState(initialSlotValue);

  // Once the appointment loads in edit mode, default the client/date/slot
  // pickers to its current values.
  useEffect(() => {
    if (appointmentData?.client_id) {
      setSelectedClientId(String(appointmentData.client_id));
      setClientSearch(appointmentData.client_name ?? "");
    }
    if (appointmentData?.appointment_date) {
      setSelectedDate(appointmentData.appointment_date.split("T")[0]);
    }
    if (appointmentData?.start_time) {
      // FIXED: was `new Date(appointmentData.start_time).getHours()` — see
      // extractHour comment above.
      const hour = extractHour(appointmentData.start_time);
      setSelectedSlot(String(hour).padStart(2, "0") + ":00");
    }
    if (appointmentData?.appointment_services_id) {
      setSelectedServiceId(String(appointmentData.appointment_services_id));
    }
    if (appointmentData?.assigned_staff_id) {
      setSelectedStaffId(String(appointmentData.assigned_staff_id));
    }
    if (appointmentData?.pets_id) {
      setSelectedPetId(String(appointmentData.pets_id));
    }
  }, [appointmentData]);

  const isToday = selectedDate === todayDateString();
  const availableSlots = TIME_SLOTS.filter((slot) => {
    if (!isToday) return true;
    // This comparison never leaves the browser (both sides are
    // browser-local), so it's unaffected by the server-side timezone bug —
    // left as-is. It's a client-side "disable past slots today" convenience;
    // the server independently re-validates via appointmentSchema.js's
    // validateSlot using Asia/Manila time regardless of what this produces.
    const slotStart = new Date(`${selectedDate}T${slot.value}:00`);
    return slotStart.getTime() > Date.now();
  });

  // Which hour-slots this staff member already has on the selected date,
  // so the picker can disable them instead of letting the user hit the
  // server's double-booking conflict error after filling out the form.
  const { data: staffAppointmentsForDate } = useQuery({
    queryKey: ["appointment-slots", selectedStaffId, selectedDate],
    queryFn: ({ signal }) =>
      fetchAppointments({
        limit: "all",
        filters: {
          assigned_staff_id: selectedStaffId,
          appointment_date: selectedDate,
        },
        signal,
      }).then((r) => r.rows ?? []),
    enabled: Boolean(selectedStaffId && selectedDate),
  });

  // FIXED: was `new Date(appt.start_time).getHours()` — see extractHour
  // comment above.
  const bookedSlots = new Set(
    (staffAppointmentsForDate ?? [])
      .filter(
        (appt) =>
          appt.appointment_status_name !== "Cancelled" &&
          String(appt.appointment_id) !== String(params.appointment_id ?? ""),
      )
      .map(
        (appt) => String(extractHour(appt.start_time)).padStart(2, "0") + ":00",
      ),
  );

  const { data: pets, isPending: isPetsPending } = useQuery({
    queryKey: ["pets-for-client", selectedClientId],
    queryFn: ({ signal }) =>
      fetchPetRecordsByClientId(selectedClientId, {
        limit: "all",
        signal,
      }).then((r) => r.rows ?? []),
    enabled: Boolean(selectedClientId),
  });

  const selectedPet = pets?.find((p) => String(p.pet_id) === selectedPetId);

  function closeModal() {
    navigate(`..${location.search}`);
  }

  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();

    if (isEditMode) {
      submit(event.currentTarget, { method: "PUT" });
      return;
    }

    // New bookings are created immediately as "Pending" so the appointment
    // still exists even if the payment step gets abandoned; the payment
    // step then upgrades it to "In Queue".
    const formData = new FormData(event.currentTarget);
    const payload = buildAppointmentPayload(formData);
    const selectedStaffMember = filteredStaff.find(
      (s) => String(s.users_id) === String(payload.assigned_staff_id),
    );

    setBookingError(null);
    setIsBookingSubmitting(true);
    try {
      const appointment = await addAppointment(payload);
      await invalidateAppointmentQueries();
      // Booking also opens a Pending payment row (see
      // Appointment_Model.js:addAppointment) — refresh the Dashboard's
      // Today's Live Queue/Sales and revenue cards, and the Payment
      // module's own list, so this shows up immediately everywhere.
      await queryClient.invalidateQueries({ queryKey: ["TodayAppointments"] });
      await queryClient.invalidateQueries({ queryKey: ["TodayPayments"] });
      await queryClient.invalidateQueries({
        queryKey: ["TodayRevenueSummary"],
      });
      await queryClient.invalidateQueries({ queryKey: ["Payments"] });

      navigate(`../confirm-payment${location.search}`, {
        state: {
          appointmentId: appointment.appointment_id,
          payload,
          clientName: clientSearch,
          petName: selectedPet?.pet_name,
          petWeightKg: selectedPet?.weight_kg,
          serviceName: selectedServiceName,
          servicePrice: services?.find(
            (s) =>
              String(s.appointment_services_id) ===
              payload.appointment_services_id,
          )?.service_price,
          staffName: selectedStaffMember?.user_name,
        },
      });
    } catch (error) {
      setBookingError(error.message || "Failed to book appointment.");
    } finally {
      setIsBookingSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && closeModal()}>
      <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-md shadow-xl rounded-xl overflow-hidden p-6 transition-colors duration-200">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
            {isEditMode ? "Edit Appointment" : "Book Appointment"}
          </DialogTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isEditMode
              ? "Update this appointment's details."
              : "Schedule a new appointment for a client's pet."}
          </p>
        </DialogHeader>

        {isEditMode && isAppointmentPending ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="w-6 h-6 border-2 border-indigo-500 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Loading appointment data...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Client / Pet */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5" ref={clientComboboxRef}>
                <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Client
                </label>
                <input
                  type="hidden"
                  name="client_id"
                  value={selectedClientId}
                />
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    required={!selectedClientId}
                    placeholder="Search clients..."
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setSelectedClientId("");
                      setSelectedPetId("");
                      setIsClientDropdownOpen(true);
                    }}
                    onFocus={() => setIsClientDropdownOpen(true)}
                    className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm pl-9 pr-8 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400"
                  />
                  <ChevronDown
                    className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none transition-transform ${
                      isClientDropdownOpen ? "rotate-180" : ""
                    }`}
                  />

                  {isClientDropdownOpen && (
                    <div className="absolute top-[calc(100%+4px)] left-0 right-0 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-50">
                      {filteredClients.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 italic">
                          No matching clients.
                        </p>
                      ) : (
                        filteredClients.map((c) => (
                          <button
                            key={c.client_id}
                            type="button"
                            onClick={() => handleSelectClient(c)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                              String(c.client_id) === selectedClientId
                                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {c.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Pet
                </label>
                <select
                  name="pets_id"
                  required
                  disabled={!selectedClientId}
                  value={selectedPetId}
                  onChange={(e) => setSelectedPetId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-2 disabled:opacity-50"
                >
                  <option value="">
                    {selectedClientId
                      ? isPetsPending
                        ? "Loading pets..."
                        : "Select a pet"
                      : "Select a client first"}
                  </option>
                  {pets?.map((p) => (
                    <option key={p.pet_id} value={p.pet_id}>
                      {p.pet_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pet details preview — shown once a pet is picked */}
            {selectedPet && (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                {selectedPet.pet_image ? (
                  <img
                    src={selectedPet.pet_image}
                    alt={selectedPet.pet_name}
                    className="w-14 h-14 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 text-[10px] font-medium shrink-0">
                    No photo
                  </div>
                )}
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs flex-1 min-w-0">
                  <div className="col-span-2 font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {selectedPet.pet_name}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    {selectedPet.species_name || "—"}
                    {selectedPet.breed ? ` · ${selectedPet.breed}` : ""}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    {selectedPet.gender_name || "—"}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    {selectedPet.weight_kg != null
                      ? `${selectedPet.weight_kg} kg`
                      : "—"}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    {selectedPet.is_spayed_neutered
                      ? "Spayed/Neutered"
                      : "Not spayed/neutered"}
                  </div>
                  <div className="col-span-2 text-slate-500 dark:text-slate-400">
                    Born {formatDate(selectedPet.date_of_birth) || "—"}
                  </div>
                </div>
              </div>
            )}

            {/* Service / Staff */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Service
                </label>
                <select
                  name="appointment_services_id"
                  required
                  value={selectedServiceId}
                  onChange={(e) => {
                    setSelectedServiceId(e.target.value);
                    setSelectedStaffId(""); // previously-picked staff may not offer this service
                  }}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-2"
                >
                  <option value="">Select a service</option>
                  {services?.map((s) => (
                    <option
                      key={s.appointment_services_id}
                      value={s.appointment_services_id}
                    >
                      {s.appointment_services}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Staff
                </label>
                <select
                  name="assigned_staff_id"
                  required
                  disabled={!selectedServiceId}
                  value={selectedStaffId}
                  onChange={(e) => {
                    setSelectedStaffId(e.target.value);
                    setSelectedSlot(""); // previously-picked slot may conflict with this staff member
                  }}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-2 disabled:opacity-50"
                >
                  <option value="">
                    {!selectedServiceId
                      ? "Select a service first"
                      : filteredStaff.length === 0
                        ? "No staff available"
                        : "Select staff"}
                  </option>
                  {filteredStaff.map((s) => (
                    <option key={s.users_id} value={s.users_id}>
                      {s.user_name} ({s.user_level?.trim()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date / Time slot — bookings are fixed one-hour blocks, 9 AM to 6 PM */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Appointment Date
                </label>
                <Input
                  name="appointment_date"
                  type="date"
                  required
                  min={earliestBookableDateString()}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot(""); // previously-picked slot may no longer be valid
                  }}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400 h-10 rounded-lg [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Time Slot
                </label>
                <select
                  name="time_slot"
                  required
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-2"
                >
                  <option value="">
                    {availableSlots.length === 0
                      ? "No slots left today"
                      : "Select a slot"}
                  </option>
                  {availableSlots.map((slot) => {
                    const isBooked = bookedSlots.has(slot.value);
                    return (
                      <option
                        key={slot.value}
                        value={slot.value}
                        disabled={isBooked}
                      >
                        {slot.label}
                        {isBooked ? " (Booked)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            <p className="text-[11px] -mt-2 text-slate-500 dark:text-slate-400">
              Appointments are booked in fixed one-hour slots, 9:00 AM to 6:00
              PM.
            </p>

            {/* Status (edit mode only — new appointments always start Pending) */}
            {isEditMode && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Status
                </label>
                <select
                  name="status_name"
                  defaultValue={appointmentData?.appointment_status_name}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-2"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                Notes
              </label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Reason for visit, special instructions, etc."
                defaultValue={appointmentData?.notes ?? ""}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400"
              />
            </div>

            {/* Error Message Section */}
            {(isActionError || bookingError) && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-xs leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <div className="flex-1">
                  <span className="font-semibold block mb-0.5">
                    Failed to save appointment
                  </span>
                  <span className="opacity-90">
                    {bookingError ||
                      actionError ||
                      "An unexpected network error occurred."}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <DialogFooter className="pt-2 sm:space-x-2">
              {state !== "submitting" && !isBookingSubmitting && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeModal}
                  className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 h-10 rounded-lg"
                >
                  Cancel
                </Button>
              )}

              <Button
                type="submit"
                disabled={state === "submitting" || isBookingSubmitting}
                className="disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 font-medium h-10 px-5 rounded-lg transition-colors duration-150 shadow-sm"
              >
                {state === "submitting" || isBookingSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </div>
                ) : isEditMode ? (
                  "Save changes"
                ) : (
                  "Book appointment"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export async function loader({ params }) {
  const queries = [
    queryClient.prefetchQuery({
      queryKey: ["clients-all"],
      queryFn: ({ signal }) =>
        fetchClientRecords({ limit: "all", signal }).then((r) => r.rows ?? []),
    }),
    queryClient.prefetchQuery({
      queryKey: ["appointment-services"],
      queryFn: ({ signal }) => selectAppointmentServices({ signal }),
    }),
    queryClient.prefetchQuery({
      queryKey: ["appointment-staff"],
      queryFn: ({ signal }) => selectAppointmentStaff({ signal }),
    }),
  ];

  if (params.appointment_id) {
    queries.push(
      queryClient.prefetchQuery({
        queryKey: ["appointment", params.appointment_id],
        queryFn: ({ signal }) =>
          fetchAppointmentById(params.appointment_id, { signal }),
      }),
    );
  }

  await Promise.all(queries);
  return null;
}

export async function action({ request, params }) {
  const formData = await request.formData();
  const payload = buildAppointmentPayload(formData);

  try {
    await editAppointment(params.appointment_id, {
      ...payload,
      status_name: formData.get("status_name"),
    });
  } catch (error) {
    const errorMessage = error.message || "Failed to save appointment.";

    toast.error("Failed to save appointment", {
      className:
        "bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 text-destructive flex items-center gap-3 p-4 rounded-lg shadow-lg",
      description: errorMessage,
      descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
      duration: 2000,
      icon: <XCircle className="h-5 w-5 text-destructive" />,
    });

    return { error: errorMessage };
  }

  await invalidateAppointmentQueries();
  await queryClient.invalidateQueries({
    queryKey: ["appointment", params.appointment_id],
  });

  toast.success("Appointment updated", {
    className:
      "bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 flex items-center gap-3 p-4 rounded-lg shadow-lg",
    description: "Appointment was updated successfully.",
    descriptionClassName: "text-muted-foreground text-sm font-normal mt-1",
    duration: 2000,
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  });

  return redirect("../");
}
