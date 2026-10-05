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
  cancelMyUnpaidAppointment,
} from "@/api/clientPortal.js";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import PortalPaySubmitModal from "./components/PortalPaySubmitModal.jsx";
import { priceForPet } from "@/utils/groomingTier.js";
import {
  CLINIC_CLOSE_MINUTE,
  buildServiceSlots,
  overlapsBooked,
  toBookedRanges,
} from "@/utils/serviceSlots";

function formatDateString(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayDateString() {
  return formatDateString(new Date());
}

function earliestBookableDateString() {
  const now = new Date();
  if (now.getHours() * 60 + now.getMinutes() >= CLINIC_CLOSE_MINUTE) now.setDate(now.getDate() + 1);
  return formatDateString(now);
}

export function Component() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const prefillDate = searchParams.get("date"); // set when booking from the calendar

  const [selectedPetId, setSelectedPetId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
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
  const [booking, setBooking] = useState(null); // { appointmentId, paymentId, amount }
  // Closed the GCash step without paying: offer "pay later" or "cancel".
  const [askKeepOrCancel, setAskKeepOrCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  // Booked a sub-service with no price yet: show the "coordinate with
  // staff" alert instead of the GCash step.
  const [noPriceServiceName, setNoPriceServiceName] = useState(null);

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

  // Category first, then one of ITS sub-services (categories come from the
  // active sub-services, already in category order).
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
  // Set via the Maintenance module (tbl_appointment_services.allowed_roles)
  // — not a hardcoded map.
  const allowedStaffRoles = selectedService?.allowed_roles ?? [];
  const filteredStaff = (staff ?? []).filter((s) =>
    allowedStaffRoles.includes(s.user_level?.trim()),
  );

  const isToday = selectedDate === todayDateString();
  // Start times follow the sub-service's duration (30 min: 9:00, 9:30, …).
  const availableSlots = buildServiceSlots(selectedService?.duration_minutes).filter((slot) => {
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

  // Durations differ, so a start time is taken if it OVERLAPS any booking.
  const bookedRanges = toBookedRanges(bookedSlotRows);

  const selectedPet = pets?.find((p) => String(p.pet_id) === selectedPetId);
  // Grooming is priced by this pet's weight tier.
  const petPrice = priceForPet(selectedService, selectedPet?.weight_kg);
  const petPriceLabel =
    petPrice.price != null
      ? `₱${Number(petPrice.price).toFixed(2)}${petPrice.tier ? ` (${petPrice.tier.tier_name})` : ""}`
      : selectedService?.grooming_tiers && !selectedPet
        ? "price depends on your pet's weight"
        : "price set at the clinic";

  async function handleSubmit(event) {
    event.preventDefault();
    // Bare "HH:mm:ss" start time only — the server computes the end time
    // from the sub-service's duration.
    const start_time = `${selectedSlot}:00`;

    setBookingError(null);
    setIsSubmitting(true);
    try {
      const result = await bookMyAppointment({
        pets_id: selectedPetId,
        appointment_services_id: selectedServiceId,
        assigned_staff_id: selectedStaffId,
        appointment_date: selectedDate,
        start_time,
        notes,
      });
      await queryClient.invalidateQueries({
        queryKey: ["clientPortal", "appointments"],
      });
      // Booking also opens a Pending payment row (see Appointment_Model.js:
      // addAppointment) — if we got its id back, go straight into the GCash
      // payment flow instead of leaving the client to find it later under
      // Payment History.
      if (!(Number(result?.payment?.total_amount) > 0)) {
        // No fixed price (e.g. Grooming priced at the clinic): nothing to
        // pay online — tell the client to coordinate the price with staff.
        setNoPriceServiceName(selectedService?.appointment_services ?? "This service");
      } else if (result?.payment?.payment_id) {
        setBooking({
          appointmentId: result.appointment_id,
          paymentId: result.payment.payment_id,
          amount: result.payment.total_amount,
          details: {
            pets_name: selectedPet?.pet_name,
            service_name: selectedService?.appointment_services,
            staff_name: filteredStaff.find(
              (s) => String(s.users_id) === selectedStaffId,
            )?.user_name,
            appointment_date: result.appointment_date ?? selectedDate,
            start_time: result.start_time,
            end_time: result.end_time,
          },
        });
      } else {
        navigate("/portal/appointments");
      }
    } catch (error) {
      setBookingError(error.message || "Failed to book appointment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function closeAfterPayment(submitted) {
    if (!submitted) {
      setAskKeepOrCancel(true); // backed out without paying
      return;
    }
    setBooking(null);
    navigate("/portal/appointments");
  }

  async function cancelUnpaidBooking() {
    setIsCancelling(true);
    try {
      await cancelMyUnpaidAppointment(booking.appointmentId);
      await queryClient.invalidateQueries({ queryKey: ["clientPortal"] });
      toast.success("Booking cancelled", {
        description: "The time slot has been released.",
      });
      setBooking(null);
      setAskKeepOrCancel(false);
      navigate("/portal/appointments");
    } catch (error) {
      toast.error("Couldn't cancel the booking", { description: error.message });
    } finally {
      setIsCancelling(false);
    }
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Category
            </label>
            <select
              required
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                setSelectedServiceId("");
                setSelectedStaffId("");
                setSelectedSlot("");
              }}
              className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-2 text-slate-900 dark:text-slate-100"
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
              Service
            </label>
            <select
              required
              disabled={!selectedCategoryId}
              value={selectedServiceId}
              onChange={(e) => {
                setSelectedServiceId(e.target.value);
                setSelectedStaffId("");
                setSelectedSlot("");
              }}
              className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-2 text-slate-900 dark:text-slate-100 disabled:opacity-50"
            >
              <option value="">
                {selectedCategoryId ? "Select a service" : "Select a category first"}
              </option>
              {categoryServices.map((s) => (
                <option
                  key={s.appointment_services_id}
                  value={s.appointment_services_id}
                >
                  {s.appointment_services}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              Start Time
            </label>
            <select
              required
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm px-2 text-slate-900 dark:text-slate-100"
            >
              <option value="">
                {availableSlots.length === 0
                  ? selectedServiceId
                    ? "No times left today"
                    : "Select a service first"
                  : "Select a start time"}
              </option>
              {availableSlots.map((slot) => {
                const isBooked = overlapsBooked(slot, bookedRanges);
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
          {selectedService
            ? `${selectedService.appointment_services} takes ${selectedService.duration_minutes} minutes · ${petPriceLabel}. The end time is set automatically. Clinic hours: 9:00 AM to 6:00 PM.`
            : "Pick a service to see its start times. Clinic hours: 9:00 AM to 6:00 PM."}
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

      {booking && !askKeepOrCancel && (
        <PortalPaySubmitModal
          paymentId={booking.paymentId}
          amount={booking.amount}
          details={booking.details}
          onClose={closeAfterPayment}
        />
      )}

      <Dialog
        open={Boolean(noPriceServiceName)}
        onOpenChange={(open) => {
          if (open) return;
          setNoPriceServiceName(null);
          navigate("/portal/appointments");
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              No price set for this service
            </DialogTitle>
            <DialogDescription>
              Your appointment is booked (Pending), but {noPriceServiceName} doesn't
              have a price yet, so it can't be paid online. Please coordinate
              with the clinic staff — they'll confirm the price and you'll pay
              at the clinic.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setNoPriceServiceName(null);
                navigate("/portal/appointments");
              }}
            >
              OK, got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={askKeepOrCancel}
        onOpenChange={(open) => {
          if (open) return;
          // "Keep & pay later": the booking stays Pending; Pay Now is under Payments.
          setAskKeepOrCancel(false);
          setBooking(null);
          navigate("/portal/appointments");
        }}
        title="Your booking isn't paid yet"
        description="It's saved as Pending and holds your time slot. Pay any time before the visit from Payments → Pay Now. Unpaid bookings are marked No Show once their time passes."
        cancelLabel="Keep & pay later"
        confirmLabel="Cancel booking"
        confirmingLabel="Cancelling..."
        isConfirming={isCancelling}
        onConfirm={cancelUnpaidBooking}
      />
    </div>
  );
}
