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
import { Search, ChevronDown, Plus, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  queryClient,
  invalidateAppointmentQueries,
  addAppointment,
  addAppointmentGroup,
  editAppointment,
  fetchAppointmentById,
  fetchAppointments,
  fetchClientRecords,
  fetchPetRecordsByClientId,
  selectAppointmentServices,
  selectAppointmentStaff,
} from "@/api/http";
import { formatDate } from "@/utils/COLUMNS";
import { priceForPet } from "@/utils/groomingTier.js";
import {
  CLINIC_CLOSE_MINUTE,
  buildServiceSlots,
  formatClockMinutes,
  overlapsBooked,
  timeToMinutes,
  toBookedRanges,
  dayClosedReason,
  staffOnDuty,
} from "@/utils/serviceSlots";

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

function buildAppointmentPayload(formData) {
  const appointment_date = formData.get("appointment_date");
  const time_slot = formData.get("time_slot"); // start time, e.g. "09:30"

  // Only the start is sent, as a bare "HH:mm:ss" Manila wall-clock time
  // (the date travels separately in appointment_date). The server computes
  // end_time from the sub-service's current duration and stores both.
  const start_time = `${time_slot}:00`;

  return {
    client_id: formData.get("client_id"),
    pets_id: formData.get("pets_id"),
    appointment_services_id: formData.get("appointment_services_id"),
    assigned_staff_id: formData.get("assigned_staff_id"),
    appointment_date,
    start_time,
    notes: formData.get("notes"),
  };
}

// The earliest date still worth showing in the picker: today, unless every
// slot (9 AM-6 PM) has already passed, in which case it's tomorrow.
function earliestBookableDateString() {
  const now = new Date();
  if (now.getHours() * 60 + now.getMinutes() >= CLINIC_CLOSE_MINUTE) {
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
    setCart([]); // a booking is for one client
  }

  // New bookings only: several pets / services / times booked together and
  // paid once (confirm-group-payment). Items wait here until "Book".
  const [cart, setCart] = useState([]);
  const formRef = useRef(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
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

  // Category first (Grooming / Consultation / Operation), then one of ITS
  // sub-services. Categories come from the active sub-services themselves,
  // already in category order — one with nothing bookable isn't offered.
  const categories = [
    ...new Map(
      (services ?? []).map((s) => [String(s.category_id), s.category_name]),
    ),
  ].map(([category_id, category_name]) => ({ category_id, category_name }));
  const categoryServices = (services ?? []).filter(
    (s) => String(s.category_id) === selectedCategoryId,
  );

  const selectedService = services?.find(
    (s) => String(s.appointment_services_id) === selectedServiceId,
  );
  const selectedServiceName = selectedService?.appointment_services;
  // Set via the Maintenance module (tbl_appointment_services.allowed_roles)
  // — not a hardcoded map, so a newly added service just works once an
  // admin configures who can perform it.
  const allowedStaffRoles = selectedService?.allowed_roles ?? [];
  const roleStaff = (staff ?? []).filter((s) =>
    allowedStaffRoles.includes(s.user_level?.trim()),
  );

  const { data: appointmentData, isPending: isAppointmentPending } = useQuery({
    queryKey: ["appointment", params.appointment_id],
    queryFn: ({ signal }) =>
      fetchAppointmentById(params.appointment_id, { signal }),
    enabled: isEditMode,
  });

  // No vets on Wednesdays — but an edit keeps the appointment's own staff.
  const onDuty = (dateStr) =>
    roleStaff.filter(
      (s) =>
        staffOnDuty([s], dateStr).length > 0 ||
        (isEditMode && String(s.users_id) === String(appointmentData?.assigned_staff_id)),
    );
  const filteredStaff = onDuty(selectedDate);

  // Slot values are the start time, "HH:mm" (see extractTimeOfDay above).
  const [selectedSlot, setSelectedSlot] = useState(
    extractTimeOfDay(appointmentData?.start_time),
  );

  // Once the appointment loads in edit mode, default the pickers to its
  // current values.
  useEffect(() => {
    if (appointmentData?.client_id) {
      setSelectedClientId(String(appointmentData.client_id));
      setClientSearch(appointmentData.client_name ?? "");
    }
    if (appointmentData?.appointment_date) {
      setSelectedDate(appointmentData.appointment_date.split("T")[0]);
    }
    if (appointmentData?.start_time) {
      setSelectedSlot(extractTimeOfDay(appointmentData.start_time));
    }
    if (appointmentData?.category_id) {
      setSelectedCategoryId(String(appointmentData.category_id));
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

  // Start times come from the selected sub-service's duration: a 30-min
  // Half Bath offers 9:00-9:30, 9:30-10:00, …; a 60-min service 9:00-10:00, …
  const serviceSlots = buildServiceSlots(
    selectedService?.duration_minutes,
    selectedService?.category_id,
  );
  const closedReason = dayClosedReason(selectedDate, selectedService?.category_id);

  // Editing without changing service/time keeps the appointment's stored
  // times (the server does the same), even if the duration has since been
  // changed in Maintenance — so offer its current slot as-is.
  const isOriginalService =
    isEditMode &&
    String(appointmentData?.appointment_services_id) === selectedServiceId;
  const originalStart = timeToMinutes(appointmentData?.start_time);
  const originalEnd = timeToMinutes(appointmentData?.end_time);
  if (
    isOriginalService &&
    originalStart != null &&
    !serviceSlots.some((s) => s.startMinute === originalStart)
  ) {
    serviceSlots.push({
      value: extractTimeOfDay(appointmentData.start_time),
      startMinute: originalStart,
      endMinute: originalEnd,
      label: `${formatClockMinutes(originalStart)} - ${formatClockMinutes(originalEnd)} (current)`,
    });
    serviceSlots.sort((a, b) => a.startMinute - b.startMinute);
  }

  const isToday = selectedDate === todayDateString();
  const availableSlots = serviceSlots.filter((slot) => {
    if (closedReason) return false;
    if (!isToday) return true;
    // Client-side convenience only; the server re-validates in Manila time.
    const slotStart = new Date(`${selectedDate}T${slot.value}:00`);
    return slotStart.getTime() > Date.now();
  });

  // This staff member's other appointments that day, so overlapping start
  // times can be disabled instead of failing on submit. Durations differ,
  // so this is a time-RANGE overlap check, not an exact-start match.
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
    staleTime: 0, // live availability: bookings/cancellations happen elsewhere too
  });

  const bookedRanges = [
    ...toBookedRanges(
      (staffAppointmentsForDate ?? []).filter(
        (appt) =>
          !appt.is_deleted &&
          appt.appointment_status_name !== "Cancelled" &&
          String(appt.appointment_id) !== String(params.appointment_id ?? ""),
      ),
    ),
    // Items already in this booking list for the same staff or pet.
    ...cart
      .filter(
        (c) =>
          c.appointment_date === selectedDate &&
          (c.assigned_staff_id === selectedStaffId || c.pets_id === selectedPetId),
      )
      .map((c) => ({ start: c.startMinute, end: c.endMinute })),
  ];

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
  const petPrice = priceForPet(selectedService, selectedPet?.weight_kg);

  function closeModal() {
    navigate(`..${location.search}`);
  }

  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState(null);

  const isFormComplete = Boolean(
    selectedClientId && selectedPetId && selectedServiceId && selectedStaffId && selectedDate && selectedSlot,
  );

  // The form's current choices as a booking-list item (with what to show).
  function currentItem() {
    const payload = buildAppointmentPayload(new FormData(formRef.current));
    const slot = availableSlots.find((s) => s.value === selectedSlot);
    return {
      ...payload,
      startMinute: slot?.startMinute,
      endMinute: slot?.endMinute,
      pets_name: selectedPet?.pet_name,
      service_name: selectedServiceName,
      staff_name: filteredStaff.find((s) => String(s.users_id) === selectedStaffId)?.user_name,
      slot_label: slot?.label,
      price: petPrice.price, // null = priced when paying
    };
  }

  function addToCart() {
    setBookingError(null);
    if (!isFormComplete) {
      setBookingError("Choose a client, pet, sub-service, staff, date and start time first.");
      return;
    }
    setCart((c) => [...c, currentItem()]);
    // Keep client, pet and date (the usual next item), clear the rest.
    setSelectedServiceId("");
    setSelectedStaffId("");
    setSelectedSlot("");
  }

  async function bookCart() {
    const items = isFormComplete ? [...cart, currentItem()] : cart;
    setBookingError(null);
    setIsBookingSubmitting(true);
    try {
      const result = await addAppointmentGroup({
        client_id: selectedClientId,
        items: items.map(({ pets_id, appointment_services_id, assigned_staff_id, appointment_date, start_time, notes }) => ({
          pets_id,
          appointment_services_id,
          assigned_staff_id,
          appointment_date,
          start_time,
          notes: notes ?? "",
        })),
      });
      await invalidateAppointmentQueries();
      await Promise.all(
        [["TodayAppointments"], ["TodayPayments"], ["TodayRevenueSummary"], ["Payments"]].map(
          (queryKey) => queryClient.invalidateQueries({ queryKey }),
        ),
      );
      navigate(`../confirm-group-payment${location.search}`, {
        state: { bookingGroup: result.booking_group, clientName: clientSearch },
      });
    } catch (error) {
      setBookingError(error.message || "Failed to book appointments.");
    } finally {
      setIsBookingSubmitting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isEditMode) {
      submit(event.currentTarget, { method: "PUT" });
      return;
    }
    if (cart.length) {
      await bookCart();
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
          serviceName: selectedServiceName,
          // Computed server-side from the sub-service's duration.
          endTime: appointment.end_time,
          // Grooming: this pet's weight-tier price (null = enter by hand).
          servicePrice: petPrice.price,
          tierName: petPrice.tier?.tier_name,
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
      <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 sm:max-w-lg max-h-[95vh] overflow-y-auto shadow-xl rounded-xl p-6 transition-colors duration-200">
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
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            {/* Items waiting to be booked together (one payment). */}
            {!isEditMode && cart.length > 0 && (
              <section className="rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Booking for {clientSearch} · {cart.length}{" "}
                  {cart.length === 1 ? "appointment" : "appointments"}
                </p>
                <ul className="divide-y divide-indigo-100 dark:divide-indigo-900/60">
                  {cart.map((c, i) => (
                    <li key={i} className="flex items-start justify-between gap-2 py-1.5 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {c.pets_name} · {c.service_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(c.appointment_date)}, {c.slot_label}
                          {c.staff_name ? ` · ${c.staff_name}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {c.price != null ? `₱${Number(c.price).toFixed(2)}` : "Price at payment"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCart((list) => list.filter((_, j) => j !== i))}
                          aria-label={`Remove ${c.pets_name} · ${c.service_name}`}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Add more below, or press Book to book everything and collect one payment.
                </p>
              </section>
            )}
            {/* Client / Pet */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      setCart([]);
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
                  required={!cart.length}
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
                  {selectedService?.grooming_tiers && (
                    <div className="col-span-2 font-medium text-indigo-700 dark:text-indigo-400">
                      {petPrice.tier
                        ? `Grooming: ₱${Number(petPrice.price).toFixed(2)} (${petPrice.tier.tier_name} tier)`
                        : "Grooming: no weight tier fits — enter the price at payment"}
                    </div>
                  )}
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

            {/* Category -> Sub-service (only that category's sub-services) */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Category
                </label>
                <select
                  name="category_id"
                  required={!cart.length}
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value);
                    // The previous sub-service/staff/slot belonged to another category.
                    setSelectedServiceId("");
                    setSelectedStaffId("");
                    setSelectedSlot("");
                  }}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-2"
                >
                  <option value="">Select a category</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Sub-service
                </label>
                <select
                  name="appointment_services_id"
                  required={!cart.length}
                  disabled={!selectedCategoryId}
                  value={selectedServiceId}
                  onChange={(e) => {
                    setSelectedServiceId(e.target.value);
                    setSelectedStaffId(""); // previously-picked staff may not offer this service
                    setSelectedSlot(""); // start times depend on the duration
                  }}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-2 disabled:opacity-50"
                >
                  <option value="">
                    {selectedCategoryId ? "Select a sub-service" : "Select a category first"}
                  </option>
                  {categoryServices.map((s) => (
                    <option
                      key={s.appointment_services_id}
                      value={s.appointment_services_id}
                    >
                      {s.appointment_services} ({s.duration_minutes} min)
                    </option>
                  ))}
                </select>
                {/* What the picked sub-service is (set in Maintenance). */}
                {selectedService?.description && (
                  <p className="text-xs rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/40 text-slate-700 dark:text-slate-300 px-3 py-2">
                    {selectedService.description}
                  </p>
                )}
              </div>
            </div>

            {/* Staff / Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Staff
                </label>
                <select
                  name="assigned_staff_id"
                  required={!cart.length}
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
                      ? "Select a sub-service first"
                      : filteredStaff.length === 0
                        ? "No staff available on this date"
                        : "Select staff"}
                  </option>
                  {filteredStaff.map((s) => (
                    <option key={s.users_id} value={s.users_id}>
                      {s.user_name} ({s.user_level?.trim()})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Appointment Date
                </label>
                <Input
                  name="appointment_date"
                  type="date"
                  required={!cart.length}
                  min={earliestBookableDateString()}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot(""); // previously-picked slot may no longer be valid
                    if (!onDuty(e.target.value).some((s) => String(s.users_id) === selectedStaffId)) {
                      setSelectedStaffId(""); // e.g. a vet, and the date moved to a Wednesday
                    }
                  }}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400 h-10 rounded-lg [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>

            </div>

            {/* Start time — full width; options follow the sub-service's duration */}
            <div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  Start Time
                </label>
                <select
                  name="time_slot"
                  required={!cart.length}
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-2"
                >
                  <option value="">
                    {availableSlots.length === 0
                      ? !selectedServiceId
                        ? "Select a sub-service first"
                        : (closedReason ?? "No times left today")
                      : "Select a start time"}
                  </option>
                  {availableSlots.map((slot) => {
                    const isBooked = overlapsBooked(slot, bookedRanges);
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
              {selectedService
                ? `${selectedServiceName} takes ${selectedService.duration_minutes} minutes — the end time is set automatically. Clinic hours: 9:00 AM to 6:00 PM.`
                : "Pick a sub-service to see its start times. Clinic hours: 9:00 AM to 6:00 PM."}
            </p>

            {/* Status is read-only here — it changes only through Confirm
                Payment, Mark Completed, Mark No Show and Cancel, which
                enforce payment/ownership. */}
            {isEditMode && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Status:{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {appointmentData?.appointment_status_name}
                </span>
              </p>
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

              {!isEditMode && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={addToCart}
                  disabled={isBookingSubmitting}
                  title="Book another pet, service or time together with this one"
                  className="flex items-center gap-1.5 h-10 rounded-lg"
                >
                  <Plus size={15} />
                  Add to booking
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
                ) : cart.length ? (
                  `Book ${cart.length + (isFormComplete ? 1 : 0)} appointments`
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
  // The edit re-prices the appointment's still-Pending bill (new service or
  // pet), so payment lists, the payment detail and revenue must refetch too.
  await Promise.all(
    [["Payments"], ["Payment"], ["TodayPayments"], ["TodayRevenueSummary"]].map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );

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
