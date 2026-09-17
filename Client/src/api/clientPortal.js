// Client-portal API — deliberately separate from http.js, which uses
// cookie sessions (credentials: "include") for staff/admin. This module
// uses a JWT bearer token instead, stored in localStorage, since the
// client portal is a completely independent auth system.
import { queryClient } from "./http.js";

const baseUrl = `${import.meta.env.VITE_API_BASE_URL}/client-portal`;
const TOKEN_KEY = "clientToken";

export function getClientToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setClientToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearClientToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function handlePortalResponse(response, fallbackMessage) {
  if (response.status === 401) {
    // The token is missing/expired/invalid — cached portal data is now
    // stale for a session that no longer exists server-side.
    clearClientToken();
    queryClient.removeQueries({ queryKey: ["clientPortal"] });
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      window.location.assign("/login");
    }
    throw new Error("Session expired. Please log in again.");
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

function authHeaders() {
  const token = getClientToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Auth ──────────────────────────────────────────────

export async function loginWithGoogle(credential) {
  const response = await fetch(`${baseUrl}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  return handlePortalResponse(response, "Failed to sign in with Google");
}

export async function fetchMyProfile({ signal } = {}) {
  const response = await fetch(`${baseUrl}/me`, {
    headers: authHeaders(),
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

  const response = await fetch(`${baseUrl}/appointments?${params}`, {
    headers: authHeaders(),
    signal,
  });
  return handlePortalResponse(response, "Failed to fetch appointments");
}

export async function bookMyAppointment(payload) {
  const response = await fetch(`${baseUrl}/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handlePortalResponse(response, "Failed to book appointment");
}

export async function fetchStaffBookedSlots({
  assigned_staff_id,
  appointment_date,
  signal,
} = {}) {
  const params = new URLSearchParams({ assigned_staff_id, appointment_date });
  const response = await fetch(
    `${baseUrl}/appointments/booked-slots?${params}`,
    { headers: authHeaders(), signal },
  );
  return handlePortalResponse(response, "Failed to fetch booked slots");
}

// Clinic-wide schedule for today/future days — times and service type only,
// no client/pet names (see ClientPortal_Model.js:getClinicSchedule).
export async function fetchClinicSchedule({ start_date, end_date, signal } = {}) {
  const params = new URLSearchParams({ start_date, end_date });
  const response = await fetch(`${baseUrl}/clinic-schedule?${params}`, {
    headers: authHeaders(),
    signal,
  });
  return handlePortalResponse(response, "Failed to fetch clinic schedule");
}

// ── Payments ──────────────────────────────────────────

export async function fetchMyPayments({ page = 1, limit = 10, signal } = {}) {
  const params = new URLSearchParams({ page, limit });
  const response = await fetch(`${baseUrl}/payments?${params}`, {
    headers: authHeaders(),
    signal,
  });
  return handlePortalResponse(response, "Failed to fetch payment history");
}

// formData carries gcash_reference_number + the payment_proof_image file.
// No Content-Type set — the browser fills in the multipart boundary.
export async function submitPaymentProof(paymentId, formData) {
  const response = await fetch(`${baseUrl}/payments/${paymentId}/proof`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  return handlePortalResponse(response, "Failed to submit payment proof");
}

export async function fetchClinicQrCode({ signal } = {}) {
  const response = await fetch(`${baseUrl}/gcash-qr-code`, {
    headers: authHeaders(),
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
  const response = await fetch(`${baseUrl}/pets?${params}`, {
    headers: authHeaders(),
    signal,
  });
  return handlePortalResponse(response, "Failed to fetch pets");
}

// ── Booking form lookups ──────────────────────────────

export async function fetchPortalAppointmentServices({ signal } = {}) {
  const response = await fetch(`${baseUrl}/appointment-services`, {
    headers: authHeaders(),
    signal,
  });
  return handlePortalResponse(response, "Failed to fetch services");
}

export async function fetchPortalAppointmentStaff({ signal } = {}) {
  const response = await fetch(`${baseUrl}/appointment-staff`, {
    headers: authHeaders(),
    signal,
  });
  return handlePortalResponse(response, "Failed to fetch staff");
}

export async function fetchPortalGroomingPriceTiers({ signal } = {}) {
  const response = await fetch(`${baseUrl}/grooming-price-tiers`, {
    headers: authHeaders(),
    signal,
  });
  return handlePortalResponse(response, "Failed to fetch grooming price tiers");
}
