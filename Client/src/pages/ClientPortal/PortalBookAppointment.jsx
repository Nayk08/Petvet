import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { formatDate } from "@/utils/COLUMNS";
import {
  fetchMyPets,
  fetchPortalAppointmentServices,
  fetchPortalAppointmentStaff,
  fetchStaffBookedSlots,
  bookMyAppointment,
} from "@/api/clientPortal.js";
import PortalPaySubmitModal from "./components/PortalPaySubmitModal.jsx";

const BOOKING_START_HOUR = 9;
const BOOKING_LAST_START_HOUR = 17;
const BOOKING_CLOSE_HOUR = 18;

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
    };
  },
);

function formatDateString(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayDateString() {
  return formatDateString(new Date());
}

function earliestBookableDateString() {
  const now = new Date();
  if (now.getHours() >= BOOKING_CLOSE_HOUR) now.setDate(now.getDate() + 1);
  return formatDateString(now);
}

export function Component() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const prefillDate = searchParams.get("date"); // set when booking from the calendar

  const [selectedPetId, setSelectedPetId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    () => prefillDate ?? earliestBookableDateString(),
  );
  const [selectedSlot, setSelectedSlot] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  // Set once booking succeeds — opens the GCash payment modal immediately
  // instead of sending the client to Payment History to find it themselves.
  const [paymentId, setPaymentId] = useState(null);

  const { data: pets, isPending: isPetsPending } = useQuery({
    queryKey: ["clientPortal", "pets", "all"],
    queryFn: ({ signal }) =>
      fetchMyPets({ limit: "all", signal }).then((r) => r.rows ?? []),
  });

  const { data: services } = useQuery({
    queryKey: ["clientPortal", "appointment-services"],
    queryFn: ({ signal }) => fetchPortalAppointmentServices({ signal }),
  });

  const { data: staff } = useQuery({
    queryKey: ["clientPortal", "appointment-staff"],
    queryFn: ({ signal }) => fetchPortalAppointmentStaff({ signal }),
  });

  const selectedService = services?.find(
    (s) => String(s.appointment_services_id) === selectedServiceId,
  );
  const selectedServiceName = selectedService?.appointment_services;
  // Set via the Maintenance module (tbl_appointment_services.allowed_roles)
  // — not a hardcoded map.
  const allowedStaffRoles = selectedService?.allowed_roles ?? [];
  const filteredStaff = (staff ?? []).filter((s) =>
    allowedStaffRoles.includes(s.user_level?.trim()),
  );

  const isToday = selectedDate === todayDateString();
  const availableSlots = TIME_SLOTS.filter((slot) => {
    if (!isToday) return true;
    return new Date(`${selectedDate}T${slot.value}:00`).getTime() > Date.now();
  });

  const { data: bookedSlotRows } = useQuery({
    queryKey: ["clientPortal", "booked-slots", selectedStaffId, selectedDate],
    queryFn: ({ signal }) =>
      fetchStaffBookedSlots({
        assigned_staff_id: selectedStaffId,
        appointment_date: selectedDate,
        signal,
      }),
    enabled: Boolean(selectedStaffId && selectedDate),
  });

  const bookedSlots = new Set(
    (bookedSlotRows ?? []).map(
      (row) => String(new Date(row.start_time).getHours()).padStart(2, "0") + ":00",
    ),
  );

  const selectedPet = pets?.find((p) => String(p.pet_id) === selectedPetId);

  async function handleSubmit(event) {
    event.preventDefault();
    const [slotHour] = selectedSlot.split(":").map(Number);
    // Bare "HH:mm:ss" time-of-day, not a combined "<date>T<time>" datetime
    // string — matches AddAppointmentModal.jsx's buildAppointmentPayload and
    // what Appointment_Model.js's toTimestampString expects. A full ISO
    // string here silently produces a garbled, unparseable timestamp when
    // the model concatenates it with appointment_date.
    const start_time = `${selectedSlot}:00`;
    const end_time = `${String(slotHour + 1).padStart(2, "0")}:00:00`;

    setBookingError(null);
    setIsSubmitting(true);
    try {
      const result = await bookMyAppointment({
        pets_id: selectedPetId,
        appointment_services_id: selectedServiceId,
        assigned_staff_id: selectedStaffId,
        appointment_date: selectedDate,
        start_time,
        end_time,
        notes,
      });
      await queryClient.invalidateQueries({
        queryKey: ["clientPortal", "appointments"],
      });
      // Booking also opens a Pending payment row (see Appointment_Model.js:
      // addAppointment) — if we got its id back, go straight into the GCash
      // payment flow instead of leaving the client to find it later under
      // Payment History.
      if (result?.payment?.payment_id) {
        setPaymentId(result.payment.payment_id);
      } else {
        navigate("/portal/appointments");
      }
    } catch (error) {
      setBookingError(error.message || "Failed to book appointment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function closeAfterPayment() {
    setPaymentId(null);
    navigate("/portal/appointments");
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <button
        type="button"
        onClick={() => navigate("/portal/appointments")}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-transparent border-none cursor-pointer"
      >
        <ArrowLeft size={16} />
        Back to my appointments
      </button>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Book an Appointment
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Your appointment will be marked Pending — payment is collected at
          the clinic.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6"
      >
        <div className="space-y-1.5">
          <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
            Pet
          </label>
          <select
            required
            value={selectedPetId}
            onChange={(e) => setSelectedPetId(e.target.value)}
            className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-2 text-slate-900 dark:text-slate-100"
          >
            <option value="">
              {isPetsPending ? "Loading pets..." : "Select a pet"}
            </option>
            {pets?.map((p) => (
              <option key={p.pet_id} value={p.pet_id}>
                {p.pet_name}
              </option>
            ))}
          </select>
        </div>

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
                {selectedPet.weight_kg != null ? `${selectedPet.weight_kg} kg` : "—"}
              </div>
              <div className="col-span-2 text-slate-500 dark:text-slate-400">
                Born {formatDate(selectedPet.date_of_birth) || "—"}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Service
            </label>
            <select
              required
              value={selectedServiceId}
              onChange={(e) => {
                setSelectedServiceId(e.target.value);
                setSelectedStaffId("");
              }}
              className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-2 text-slate-900 dark:text-slate-100"
            >
              <option value="">Select a service</option>
              {services?.map((s) => (
                <option key={s.appointment_services_id} value={s.appointment_services_id}>
                  {s.appointment_services}
                </option>
              ))}
            </select>
            {selectedService?.duration_minutes && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Estimated duration: {selectedService.duration_minutes} min
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Staff
            </label>
            <select
              required
              disabled={!selectedServiceId}
              value={selectedStaffId}
              onChange={(e) => {
                setSelectedStaffId(e.target.value);
                setSelectedSlot("");
              }}
              className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-2 text-slate-900 dark:text-slate-100 disabled:opacity-50"
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Appointment Date
            </label>
            <Input
              type="date"
              required
              min={earliestBookableDateString()}
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedSlot("");
              }}
              className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 h-10 rounded-lg [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Time Slot
            </label>
            <select
              required
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-2 text-slate-900 dark:text-slate-100"
            >
              <option value="">
                {availableSlots.length === 0 ? "No slots left today" : "Select a slot"}
              </option>
              {availableSlots.map((slot) => {
                const isBooked = bookedSlots.has(slot.value);
                return (
                  <option key={slot.value} value={slot.value} disabled={isBooked}>
                    {slot.label}
                    {isBooked ? " (Booked)" : ""}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        <p className="text-[11px] -mt-2 text-slate-500 dark:text-slate-400">
          Appointments are booked in fixed one-hour slots, 9:00 AM to 6:00 PM.
        </p>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
            Notes
          </label>
          <textarea
            rows={3}
            placeholder="Reason for visit, special instructions, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        {bookingError && (
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 text-xs leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span className="flex-1">{bookingError}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/portal/appointments")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Booking..." : "Book appointment"}
          </Button>
        </div>
      </form>

      {paymentId && (
        <PortalPaySubmitModal paymentId={paymentId} onClose={closeAfterPayment} />
      )}
    </div>
  );
}
