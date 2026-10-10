// Client-portal API — deliberately separate from http.js, which uses
// cookie sessions (credentials: "include") for staff/admin. This module
// used to use a JWT bearer token stored in localStorage (readable by any
// script on the page — a single XSS anywhere meant full account takeover).
// It now uses an httpOnly cookie instead (see is-client-auth.js), issued by
// the server on login — no client-side token handling at all, just
// `credentials: "include"` on every request, same as the staff side.
import { queryClient, fetchWithTimeout, getCsrfToken } from "./http.js";

const rootBaseUrl = import.meta.env.VITE_API_BASE_URL;
const baseUrl = `${rootBaseUrl}/client-portal`;

async function handlePortalResponse(response, fallbackMessage) {
  if (response.status === 401) {
    // The cookie is missing/expired/invalid — cached portal data is now
    // stale for a session that no longer exists server-side. Cleared on the
    // next tick, not now: removing a query that is still running (e.g. the
    // route guard's "me" check, which is the request failing right here)
    // cancels it, so the guard got a CancelledError instead of this 401 and
    // showed the 500 page instead of redirecting to login.
    setTimeout(() => queryClient.removeQueries({ queryKey: ["clientPortal"] }), 0);
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      window.location.assign("/login");
    }
    const error = new Error("Session expired. Please log in again.");
    error.code = 401; // requireClientAuth keys its redirect off this
    throw error;
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.message || fallbackMessage);
    error.code = response.status;
    error.details = body;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

// ── Auth ──────────────────────────────────────────────

export async function loginWithGoogle(credential) {
  const response = await fetchWithTimeout(`${baseUrl}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ credential }),
  });
  return handlePortalResponse(response, "Failed to sign in with Google");
}

// First Google sign-in: creates the client record, then signs in.
export async function registerWithGoogle({ registration_token, client_name, contact_no }) {
  const response = await fetchWithTimeout(`${baseUrl}/auth/google/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ registration_token, client_name, contact_no }),
  });
  return handlePortalResponse(response, "Failed to complete registration");
}

// After Google: the 6-digit code emailed to the client. Sets the session cookie.
export async function verifyClientOtp({ otp_token, code }) {
  const response = await fetchWithTimeout(`${baseUrl}/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ otp_token, code }),
  });
  return handlePortalResponse(response, "Could not verify your code");
}

// Emails a new code; returns a new otp_token to verify it with.
export async function resendClientOtp(otp_token) {
  const response = await fetchWithTimeout(`${baseUrl}/auth/otp/resend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ otp_token }),
  });
  return handlePortalResponse(response, "Could not send a new code");
}

export async function logoutClient() {
  const csrfToken = await getCsrfToken();
  const response = await fetchWithTimeout(`${baseUrl}/logout`, {
    method: "POST",
    headers: { "x-csrf-token": csrfToken },
    credentials: "include",
  });
  return handlePortalResponse(response, "Failed to log out");
}

export async function fetchMyProfile({ signal } = {}) {
  const response = await fetchWithTimeout(`${baseUrl}/me`, {
    credentials: "include",
    signal,
  });
  return handlePortalResponse(response, "Failed to fetch profile");
}

// ── Appointments ──────────────────────────────────────

export async function fetchMyAppointments({
  page = 1,
  limit = 10,
  search = "",
  filters = {},
  signal,
} = {}) {
  const params = new URLSearchParams({
    page,
    limit,
    ...(search && { search }),
  });
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const response = await fetchWithTimeout(`${baseUrl}/appointments?${params}`, {
    credentials: "include",
    signal,
  });
  return handlePortalResponse(response, "Failed to fetch appointments");
}

// Back out of a booking that hasn't been paid yet (releases the time slot
// and cancels its unpaid bill).
export async function cancelMyUnpaidAppointment(appointment_id) {
  const csrfToken = await getCsrfToken();
  const response = await fetchWithTimeout(`${baseUrl}/appointments/${appointment_id}/cancel`, {
    method: "PATCH",
    headers: { "x-csrf-token": csrfToken },
    credentials: "include",
  });
  return handlePortalResponse(response, "Failed to cancel the booking");
}

export async function bookMyAppointment(payload) {
  const csrfToken = await getCsrfToken();
  const response = await fetchWithTimeout(`${baseUrl}/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handlePortalResponse(response, "Failed to book appointment");
}

// Several pets / services / times in one booking (all-or-nothing).
// Returns { booking_group, items, total_amount, reservation_fee, unpriced }.
export async function bookMyAppointmentGroup(items) {
  const csrfToken = await getCsrfToken();
  const response = await fetchWithTimeout(`${baseUrl}/appointments/group`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    credentials: "include",
    body: JSON.stringify({ items }),
  });
  return handlePortalResponse(response, "Failed to book appointments");
}

// One GCash proof for every item of a group booking.
export async function submitGroupPaymentProof(bookingGroup, formData) {
  const csrfToken = await getCsrfToken();
  const response = await fetchWithTimeout(`${baseUrl}/booking-groups/${bookingGroup}/proof`, {
    method: "POST",
    headers: { "x-csrf-token": csrfToken },
    credentials: "include",
    body: formData,
  });
  return handlePortalResponse(response, "Failed to submit payment proof");
}

export async function cancelMyUnpaidGroup(bookingGroup) {
  const csrfToken = await getCsrfToken();
  const response = await fetchWithTimeout(`${baseUrl}/booking-groups/${bookingGroup}/cancel`, {
    method: "PATCH",
    headers: { "x-csrf-token": csrfToken },
    credentials: "include",
  });
  return handlePortalResponse(response, "Failed to cancel the booking");
}

export async function fetchStaffBookedSlots({
  assigned_staff_id,
  appointment_date,
  signal,
} = {}) {
  const params = new URLSearchParams({ assigned_staff_id, appointment_date });
  const response = await fetchWithTimeout(
    `${baseUrl}/appointments/booked-slots?${params}`,
    { credentials: "include", signal },
  );
  return handlePortalResponse(response, "Failed to fetch booked slots");
}

// Clinic-wide schedule for today/future days — times and service type only,
// no client/pet names (see ClientPortal_Model.js:getClinicSchedule).
export async function fetchClinicSchedule({ start_date, end_date, signal } = {}) {
  const params = new URLSearchParams({ start_date, end_date });
  const response = await fetchWithTimeout(`${baseUrl}/clinic-schedule?${params}`, {
    credentials: "include",
    signal,
  });
  return handlePortalResponse(response, "Failed to fetch clinic schedule");
}

// Public version for the landing page — no auth, since a visitor here isn't
// signed in at all. Deliberately does NOT go through handlePortalResponse:
// that helper bounces to /login on a 401, which would be wrong for a page
// anonymous visitors land on directly.
// Landing page: the clinic's active services (no sign-in needed).
export async function fetchPublicAnnouncements({ signal } = {}) {
  const response = await fetchWithTimeout(`${baseUrl}/public/announcements`, { signal });
  if (!response.ok) throw new Error("Failed to load announcements");
  return response.json();
}

export async function fetchPublicClinicInfo({ signal } = {}) {
  const response = await fetchWithTimeout(`${baseUrl}/public/clinic-info`, { signal });
  if (!response.ok) throw new Error("Failed to load clinic info");
  return response.json();
}

export async function fetchPublicProducts({ signal } = {}) {
  const response = await fetchWithTimeout(`${baseUrl}/public/products`, { signal });
  if (!response.ok) throw new Error("Failed to load products");
  return response.json();
}

export async function fetchPublicServices({ signal } = {}) {
  const response = await fetchWithTimeout(`${baseUrl}/public/services`, { signal });
  if (!response.ok) throw new Error("Failed to load services");
  return response.json();
}

export async function fetchPublicClinicSchedule({
  start_date,
  end_date,
  signal,
} = {}) {
  const params = new URLSearchParams({ start_date, end_date });
  const response = await fetchWithTimeout(
    `${baseUrl}/public/clinic-schedule?${params}`,
    { signal },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Failed to fetch clinic schedule");
  }
  return response.json();
}

// ── Payments ──────────────────────────────────────────

export async function fetchMyPayments({ page = 1, limit = 10, signal } = {}) {
  const params = new URLSearchParams({ page, limit });
  const response = await fetchWithTimeout(`${baseUrl}/payments?${params}`, {
    credentials: "include",
    signal,
  });
  return handlePortalResponse(response, "Failed to fetch payment history");
}

// Returns { payment, appointment } — both needed by the shared
// ReceiptContent component (see Payment/Components/ReceiptContent.jsx).
export async function fetchMyPaymentReceipt(paymentId, { signal } = {}) {
  const response = await fetchWithTimeout(`${baseUrl}/payments/${paymentId}/receipt`, {
    credentials: "include",
    signal,
  });
  return handlePortalResponse(response, "Failed to load receipt");
}

// formData carries gcash_reference_number + the payment_proof_image file.
// No Content-Type set — the browser fills in the multipart boundary.
export async function submitPaymentProof(paymentId, formData) {
  const csrfToken = await getCsrfToken();
  const response = await fetchWithTimeout(`${baseUrl}/payments/${paymentId}/proof`, {
    method: "POST",
    headers: { "x-csrf-token": csrfToken },
    credentials: "include",
    body: formData,
  });
  return handlePortalResponse(response, "Failed to submit payment proof");
}

export async function fetchClinicQrCode({ signal } = {}) {
  const response = await fetchWithTimeout(`${baseUrl}/gcash-qr-code`, {
    credentials: "include",
    signal,
  });
  return handlePortalResponse(response, "Failed to fetch QR code");
}

// ── Pets ──────────────────────────────────────────────

export async function fetchMyPets({
  page = 1,
  limit = 10,
  search = "",
  signal,
} = {}) {
  const params = new URLSearchParams({
    page,
    limit,
    ...(search && { search }),
  });
  const response = await fetchWithTimeout(`${baseUrl}/pets?${params}`, {
    credentials: "include",
    signal,
  });
  return handlePortalResponse(response, "Failed to fetch pets");
}

export async function addMyPet(payload) {
  const csrfToken = await getCsrfToken();
  const response = await fetchWithTimeout(`${baseUrl}/pets`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handlePortalResponse(response, "Failed to add pet");
}

// A simple timeline of this pet's past appointments (service, staff, date,
// status, notes) — not a full EMR, just what's already on file.
export async function fetchMyPetHistory(petsId, { signal } = {}) {
  const response = await fetchWithTimeout(`${baseUrl}/pets/${petsId}/history`, {
    credentials: "include",
    signal,
  });
  return handlePortalResponse(response, "Failed to load pet history");
}

// Consultations, vaccinations, and prescriptions on file for this pet.
export async function fetchMyPetMedicalRecords(petsId, { signal } = {}) {
  const response = await fetchWithTimeout(`${baseUrl}/pets/${petsId}/medical-records`, {
    credentials: "include",
    signal,
  });
  return handlePortalResponse(response, "Failed to load medical records");
}

export async function fetchPortalSpecies({ signal } = {}) {
  const response = await fetchWithTimeout(`${baseUrl}/species`, {
    credentials: "include",
    signal,
  });
  return handlePortalResponse(response, "Failed to fetch species");
}

export async function fetchPortalGender({ signal } = {}) {
  const response = await fetchWithTimeout(`${baseUrl}/gender`, {
    credentials: "include",
    signal,
  });
  return handlePortalResponse(response, "Failed to fetch gender options");
}

// ── Booking form lookups ──────────────────────────────

export async function fetchPortalAppointmentServices({ signal } = {}) {
  const response = await fetchWithTimeout(`${baseUrl}/appointment-services`, {
    credentials: "include",
    signal,
  });
  return handlePortalResponse(response, "Failed to fetch services");
}

export async function fetchPortalAppointmentStaff({ signal } = {}) {
  const response = await fetchWithTimeout(`${baseUrl}/appointment-staff`, {
    credentials: "include",
    signal,
  });
  return handlePortalResponse(response, "Failed to fetch staff");
}

