// Booking time slots for a sub-service, derived from its duration — never a
// hardcoded slot length. Mirrors the server's rule (Appointment_Model.js
// resolveSlot): start at 9:00 AM, step by the sub-service's duration, and
// the service must end by 6:00 PM. The server re-checks all of this.
export const CLINIC_OPEN_MINUTE = 9 * 60;
export const CLINIC_CLOSE_MINUTE = 18 * 60;

const pad2 = (n) => String(n).padStart(2, "0");

// 570 -> "09:30" (the value sent to the API as start_time)
export function minutesToTimeValue(minutes) {
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
}

// 570 -> "9:30 AM"
export function formatClockMinutes(minutes) {
  const h = Math.floor(minutes / 60);
  const period = h < 12 ? "AM" : "PM";
  return `${h % 12 === 0 ? 12 : h % 12}:${pad2(minutes % 60)} ${period}`;
}

// "2026-10-07 09:30:00" or "09:30" -> 570. Plain string parsing on purpose:
// these are Manila wall-clock values, and new Date() would shift them into
// the browser's own timezone.
export function timeToMinutes(value) {
  if (!value) return null;
  const time = value.includes(" ") ? value.split(" ")[1] : value;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Every start time for a sub-service of `durationMinutes`:
// 30 min -> 9:00-9:30, 9:30-10:00, …, 5:30-6:00 PM.
export function buildServiceSlots(durationMinutes) {
  const duration = Number(durationMinutes);
  if (!duration || duration <= 0) return [];
  const slots = [];
  for (
    let start = CLINIC_OPEN_MINUTE;
    start + duration <= CLINIC_CLOSE_MINUTE;
    start += duration
  ) {
    slots.push({
      value: minutesToTimeValue(start),
      startMinute: start,
      endMinute: start + duration,
      label: `${formatClockMinutes(start)} - ${formatClockMinutes(start + duration)}`,
    });
  }
  return slots;
}

// Appointments (with "YYYY-MM-DD HH:mm:ss" start_time/end_time) -> minute
// ranges, for checking a candidate slot against what's already booked.
export function toBookedRanges(appointments) {
  return (appointments ?? []).map((a) => ({
    start: timeToMinutes(a.start_time),
    end: timeToMinutes(a.end_time),
  }));
}

export function overlapsBooked(slot, bookedRanges) {
  return bookedRanges.some(
    (r) => slot.startMinute < r.end && slot.endMinute > r.start,
  );
}
