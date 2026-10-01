import { QueryClient } from "@tanstack/react-query";

const AuthUrl = import.meta.env.VITE_API_AUTH_URL;
const baseUrl = import.meta.env.VITE_API_BASE_URL;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 1,
    },
  },
});

// The calendar, Consultation, Grooming, and Operation pages each read
// appointments through their own query key namespace, since they hit
// different endpoints. Any add/edit/cancel needs to refresh all four, or
// whichever view didn't trigger the mutation is left showing stale data.
export function invalidateAppointmentQueries() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["appointments"] }),
    queryClient.invalidateQueries({ queryKey: ["consultation-appointments"] }),
    queryClient.invalidateQueries({ queryKey: ["grooming-appointments"] }),
    queryClient.invalidateQueries({ queryKey: ["operation-appointments"] }),
  ]);
}

// Bumps the Dashboard/Payment revenue cards (Today + all-time) by the
// amount just collected, so they update the instant a payment completes
// instead of waiting on the round trip + refetch. `isAppointment` picks
// which of the Sales/Services buckets the total lands in, matching how
// getRevenueSummary/getTodayRevenueSummary split by control_number
// (INV = cart checkout, APT = appointment charge). Returns a rollback()
// to call if the request fails.
export function applyOptimisticRevenue({
  cashAmount = 0,
  gcashAmount = 0,
  totalAmount = 0,
  isAppointment,
}) {
  const keys = [["TodayRevenueSummary"], ["RevenueSummary"]];
  const previous = keys.map((key) => [key, queryClient.getQueryData(key)]);

  const patch = (old) => {
    if (!old) return old;
    return {
      ...old,
      total_cash: Number(old.total_cash ?? 0) + Number(cashAmount || 0),
      total_gcash: Number(old.total_gcash ?? 0) + Number(gcashAmount || 0),
      total_invoice:
        Number(old.total_invoice ?? 0) +
        (isAppointment ? 0 : Number(totalAmount || 0)),
      total_appointment:
        Number(old.total_appointment ?? 0) +
        (isAppointment ? Number(totalAmount || 0) : 0),
    };
  };

  keys.forEach((key) => queryClient.setQueryData(key, patch));

  return function rollback() {
    previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
  };
}

// Splits a payment's total into cash_amount/gcash_amount for the
// optimistic patch above, mirroring resolvePaymentSplit's shape closely
// enough for a UI estimate (Cash/GCash land the whole total on one side,
// Split uses exactly what the cashier entered) — the server remains the
// source of truth once the follow-up invalidateQueries reconciles it.
export function estimatePaymentSplit({
  paymentMethod,
  totalAmount,
  cashReceived,
  gcashReceived,
}) {
  if (paymentMethod === "GCash") {
    return { cashAmount: 0, gcashAmount: Number(totalAmount || 0) };
  }
  if (paymentMethod === "Split") {
    return {
      cashAmount: Number(cashReceived || 0),
      gcashAmount: Number(gcashReceived || 0),
    };
  }
  return { cashAmount: Number(totalAmount || 0), gcashAmount: 0 };
}

// Every route's loader calls requireAuth/requirePermission, and both await
// queryClient.ensureQueryData(["currentUser"], ...) — TanStack Query
// de-duplicates concurrent calls to the same key, so if this one fetch ever
// hangs (no response, no error — a stalled connection, which plain fetch()
// has no built-in timeout for; the `signal` passed in is tied to the
// query's own lifecycle, not to elapsed time), every subsequent navigation
// just awaits that same permanently-stuck promise instead of firing a new
// request. That freezes the ENTIRE app — every future navigation, on every
// page — with zero new network activity and no console error, since
// nothing ever actually fails. A hard timeout guarantees a stalled request
// eventually rejects instead of hanging forever, so at worst a query
// retries or errors out — it can no longer wedge every other page shut.
const FETCH_TIMEOUT_MS = 15000;

function fetchWithTimeout(url, { signal, ...options } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(new DOMException("Request timed out", "TimeoutError")),
    FETCH_TIMEOUT_MS,
  );

  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }

  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timeoutId),
  );
}

async function handleResponse(
  response,
  fallbackMessage = "Something went wrong",
) {
  if (response.status === 401) {
    // The session died (expired, or a background refetch after being idle
    // found it already gone) — cached currentUser/navData are now lying
    // about who's logged in, so every button/toggle relying on them just
    // silently fails instead of doing anything. A full reload to /login
    // clears that stale state and gets a real session again; a plain
    // thrown Error here would otherwise surface as a generic error page
    // instead of a clean re-login.
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      queryClient.clear();
      window.location.assign("/login?mode=login");
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

// ─────────────────────────────
// CSRF
// ─────────────────────────────
// Every mutating request (POST/PUT/PATCH/DELETE) needs a fresh CSRF
// token attached as the x-csrf-token header, since doubleCsrfProtection
// is applied globally on the backend for all non-GET routes.
async function getCsrfToken() {
  const response = await fetch(`${baseUrl}/csrf-token`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Could not fetch CSRF token.");
  }

  const { csrfToken } = await response.json();
  return csrfToken;
}

// ─────────────────────────────
// Auth
// ─────────────────────────────

export async function fetchCurrentUser({ signal }) {
  const response = await fetchWithTimeout(`${AuthUrl}/me`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch current user");
}

export async function logoutUser() {
  const csrfToken = await getCsrfToken();

  const response = await fetch(`${AuthUrl}/logout`, {
    method: "POST",
    headers: { "x-csrf-token": csrfToken },
    credentials: "include",
  });

  return handleResponse(response, "Failed to logout");
}

export async function updateMyProfilePicture(formData) {
  const csrfToken = await getCsrfToken();

  const response = await fetch(`${AuthUrl}/me/picture`, {
    method: "PATCH",
    headers: { "x-csrf-token": csrfToken },
    body: formData,
    credentials: "include",
  });

  return handleResponse(response, "Failed to update profile picture");
}

// ─────────────────────────────
// COMMON
// ─────────────────────────────

export async function fetchNavbar({ signal }) {
  const response = await fetchWithTimeout(`${baseUrl}/nav`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch navbar");
}

export async function getCategoryUserLevel({ signal }) {
  const response = await fetch(`${baseUrl}/categoryUserLevel`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch user level categories");
}

// ─────────────────────────────
// Users
// ─────────────────────────────

export async function fetchUsers({
  page,
  limit,
  search = "",
  filters = {},
  signal,
}) {
  const effectiveLimit = limit === "all" ? 999999 : limit;
  const effectivePage = limit === "all" ? 1 : page;

  const params = new URLSearchParams({
    page: effectivePage,
    limit: effectiveLimit,
    ...(search && { search }),
  });

  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(","));
    } else if (value) {
      params.set(key, value);
    }
  });

  const response = await fetch(`${baseUrl}/users?${params.toString()}`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch users");
}

export async function fetchUserById(id, { signal } = {}) {
  const response = await fetch(`${baseUrl}/users/${id}`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch user");
}

export async function addNewUser(user) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/users/add-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    credentials: "include",
    body: JSON.stringify(user),
  });
  return handleResponse(response, "Failed to add user");
}

export async function updateUser(id, user) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/users/${id}/edit-user`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    credentials: "include",
    body: JSON.stringify(user),
  });
  return handleResponse(response, "Failed to update user");
}

export async function deleteUser(id) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/users/${id}/delete-user`, {
    method: "DELETE",
    headers: { "x-csrf-token": csrfToken },
    credentials: "include",
  });
  return handleResponse(response, "Failed to delete user");
}

export async function fetchArchivedUsers({
  page,
  limit,
  search = "",
  signal,
}) {
  const effectiveLimit = limit === "all" ? 999999 : limit;
  const effectivePage = limit === "all" ? 1 : page;

  const params = new URLSearchParams({
    page: effectivePage,
    limit: effectiveLimit,
    ...(search && { search }),
  });

  const response = await fetch(`${baseUrl}/users/archived?${params}`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch archived users");
}

export async function restoreUser(id) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/users/${id}/restore`, {
    method: "PUT",
    headers: { "x-csrf-token": csrfToken },
    credentials: "include",
  });
  return handleResponse(response, "Failed to restore user");
}

// Hard delete — only succeeds on an already-archived user with no
// appointment history (the backend rejects it with a 409 otherwise).
export async function permanentlyDeleteUser(id) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/users/${id}/permanent`, {
    method: "DELETE",
    headers: { "x-csrf-token": csrfToken },
    credentials: "include",
  });
  return handleResponse(response, "Failed to permanently delete user");
}

// ─────────────────────────────
// User Levels
// ─────────────────────────────

export async function fetchUserLevel({
  page,
  limit,
  search = "",
  filters = {},
  signal,
}) {
  const effectiveLimit = limit === "all" ? 999999 : limit;
  const effectivePage = limit === "all" ? 1 : page;

  const params = new URLSearchParams({
    page: effectivePage,
    limit: effectiveLimit,
    ...(search && { search }),
  });

  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(","));
    } else if (value) {
      params.set(key, value);
    }
  });

  const response = await fetch(`${baseUrl}/usersLevel?${params.toString()}`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch user levels");
}

export async function fetchUserLevelById(id, { signal } = {}) {
  const response = await fetch(`${baseUrl}/usersLevel/${id}`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch user level");
}

export async function addNewUserLevel(userlevel, description) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/usersLevel/add-user-level`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    credentials: "include",
    body: JSON.stringify({ userLevel: userlevel, description }),
  });
  return handleResponse(response, "Failed to create new user level");
}

export async function updateUserLevel({ id, userLevel, description }) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/usersLevel/${id}/edit-user-level`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    credentials: "include",
    body: JSON.stringify({ userLevel, description }),
  });
  return handleResponse(response, "Failed to update user level");
}

export async function deleteUserLevel(id) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(
    `${baseUrl}/usersLevel/${id}/delete-user-level`,
    {
      method: "DELETE",
      headers: { "x-csrf-token": csrfToken },
      credentials: "include",
    },
  );
  return handleResponse(response, "Failed to delete user level");
}

// ─────────────────────────────
// Permissions
// ─────────────────────────────

export async function getPermissionMatrix({ userLevelId, signal }) {
  const response = await fetch(`${baseUrl}/permissions/${userLevelId}`, {
    signal,
    credentials: "include",
  });
  const result = await handleResponse(
    response,
    "Failed to fetch permission matrix",
  );
  return result.data;
}

export async function updatePermissionField({
  userLevelId,
  userModuleId,
  field,
  value,
}) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/permissions`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    credentials: "include",
    body: JSON.stringify({ userLevelId, userModuleId, field, value }),
  });
  const result = await handleResponse(response, "Failed to update permission");
  return result.data;
}

// ─────────────────────────────
// Inventory
// ─────────────────────────────

export async function fetchInventory({
  page = 1,
  limit = 10,
  search = "",
  filters = {},
  // Off by default so every existing caller (Cart/checkout) keeps getting
  // flat, individual batch rows exactly as before. Only the admin
  // Inventory list opts into the grouped-by-name view.
  grouped = false,
  signal,
}) {
  const effectiveLimit = limit === "all" ? 999999 : limit;
  const effectivePage = limit === "all" ? 1 : page;

  const params = new URLSearchParams({
    page: effectivePage,
    limit: effectiveLimit,
    ...(search && { search }),
    ...(grouped && { grouped: "true" }),
  });

  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(","));
    } else if (value) {
      params.set(key, value);
    }
  });

  const response = await fetch(`${baseUrl}/inventory?${params.toString()}`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch inventory");
}

export async function fetchInventoryById({ product_id, signal } = {}) {
  const response = await fetch(`${baseUrl}/inventory/${product_id}`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch inventory");
}

// The individual batches (own quantity/expiry/price) grouped under one
// product name in the main inventory list.
export async function fetchProductBatches({ product_name, signal } = {}) {
  const response = await fetch(
    `${baseUrl}/inventory/batches/${encodeURIComponent(product_name)}`,
    { signal, credentials: "include" },
  );
  return handleResponse(response, "Failed to fetch product batches");
}

export async function fetchProductCategories({ signal } = {}) {
  const response = await fetch(`${baseUrl}/inventory/categories`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch product categories");
}

export async function addProductCategory(category_name) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/inventory/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    credentials: "include",
    body: JSON.stringify({ category_name }),
  });
  return handleResponse(response, "Failed to add category");
}

export async function addProduct(formData) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/inventory/add-product`, {
    method: "POST",
    headers: { "x-csrf-token": csrfToken }, // no Content-Type — browser sets multipart boundary for FormData
    body: formData,
    credentials: "include",
  });
  return handleResponse(response, "Failed to add product");
}

export async function updateProduct(id, formData) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/inventory/${id}/edit-product`, {
    method: "PUT",
    headers: { "x-csrf-token": csrfToken },
    body: formData,
    credentials: "include",
  });
  return handleResponse(response, "Failed to update product");
}

// Restocks one specific batch — adds to its quantity and always overwrites
// its price/expiry with whatever's submitted.
export async function addProductQuantity(
  id,
  { quantity, product_price, product_expiry_date },
) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/inventory/${id}/add-quantity`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    body: JSON.stringify({ quantity, product_price, product_expiry_date }),
    credentials: "include",
  });
  return handleResponse(response, "Failed to add quantity");
}

export async function deleteProduct(id) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/inventory/${id}/delete-product`, {
    method: "DELETE",
    headers: { "x-csrf-token": csrfToken },
    credentials: "include",
  });
  return handleResponse(response, "Failed to delete product");
}

export async function fetchArchivedProducts({
  page,
  limit,
  search = "",
  signal,
}) {
  const effectiveLimit = limit === "all" ? 999999 : limit;
  const effectivePage = limit === "all" ? 1 : page;

  const params = new URLSearchParams({
    page: effectivePage,
    limit: effectiveLimit,
    ...(search && { search }),
  });

  const response = await fetch(`${baseUrl}/inventory/archived?${params}`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch archived products");
}

export async function restoreProduct(id) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/inventory/${id}/restore`, {
    method: "PATCH",
    headers: { "x-csrf-token": csrfToken },
    credentials: "include",
  });
  return handleResponse(response, "Failed to restore product");
}

// Hard delete — only succeeds on an already-archived product with no sales
// history (the backend rejects it with a 409 otherwise).
export async function permanentlyDeleteProduct(id) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/inventory/${id}/permanent`, {
    method: "DELETE",
    headers: { "x-csrf-token": csrfToken },
    credentials: "include",
  });
  return handleResponse(response, "Failed to permanently delete product");
}

// Bulk-removes every already-expired product batch in one call.
export async function pullExpiredProducts() {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/inventory/pull-expired`, {
    method: "DELETE",
    headers: { "x-csrf-token": csrfToken },
    credentials: "include",
  });
  return handleResponse(response, "Failed to remove expired products");
}

// ─────────────────────────────
// Payments / Checkout
// ─────────────────────────────

export async function checkoutOrder(cartItems) {
  const csrfToken = await getCsrfToken();

  // Keyed by product_name, not a specific batch — a product can have
  // several batches (same name, different expiry dates) sharing one shelf
  // quantity, and the server resolves which real batch(es) to draw from
  // (FEFO) and their real prices at checkout time.
  const payload = {
    cartItems: cartItems.map((item) => ({
      product_name: item.product_name,
      quantity: item.quantity,
    })),
  };

  const response = await fetch(`${baseUrl}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  return handleResponse(response, "Checkout failed");
}
export async function completePayment(paymentId, payload) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/checkout/${paymentId}/complete`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse(response, "Failed to complete payment");
}

// decision: "approve" | "reject" — staff reviewing a client's self-service
// GCash proof submission (see ClientPortal's submitPaymentProof).
export async function verifyPayment(paymentId, decision) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/payments/${paymentId}/verify`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    credentials: "include",
    body: JSON.stringify({ decision }),
  });
  return handleResponse(response, "Failed to verify payment");
}

export async function fetchGcashQrCode({ signal } = {}) {
  const response = await fetch(`${baseUrl}/payments/gcash-qr-code`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch QR code");
}

export async function updateGcashQrCode(formData) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/payments/gcash-qr-code`, {
    method: "PATCH",
    headers: { "x-csrf-token": csrfToken }, // no Content-Type — browser sets multipart boundary for FormData
    body: formData,
    credentials: "include",
  });
  return handleResponse(response, "Failed to update QR code");
}

export async function fetchPayments({
  page = 1,
  limit = 10,
  search = "",
  filters = {},
  signal,
}) {
  const effectiveLimit = limit === "all" ? 999999 : limit;
  const effectivePage = limit === "all" ? 1 : page;

  const params = new URLSearchParams({
    page: effectivePage,
    limit: effectiveLimit,
    ...(search && { search }),
  });

  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(","));
    } else if (value) {
      params.set(key, value);
    }
  });

  const response = await fetch(`${baseUrl}/payments?${params.toString()}`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch Payments");
}

export async function fetchTodayPayments({
  page = 1,
  limit = 10,
  search = "",
  filters = {},
  signal,
} = {}) {
  const effectiveLimit = limit === "all" ? 999999 : limit;
  const effectivePage = limit === "all" ? 1 : page;

  const params = new URLSearchParams({
    page: effectivePage,
    limit: effectiveLimit,
    ...(search && { search }),
  });

  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(","));
    } else if (value) {
      params.set(key, value);
    }
  });

  const response = await fetch(
    `${baseUrl}/dashboard/today-payments?${params.toString()}`,
    { signal, credentials: "include" },
  );
  return handleResponse(response, "Failed to fetch today's payments");
}

// Backs the Dashboard revenue cards' click-through modal. `type` is "INV"
// (Sales), "APT" (Services), or omitted for the full Revenue breakdown.
// `method` is "cash" or "gcash" for the Cash/Cashless row cards.
export async function fetchTodayRevenueTransactions({
  type,
  method,
  search = "",
  page = 1,
  limit = 10,
  signal,
} = {}) {
  const params = new URLSearchParams({
    page,
    limit,
    ...(type && { type }),
    ...(method && { method }),
    ...(search && { search }),
  });

  const response = await fetch(
    `${baseUrl}/dashboard/today-revenue-transactions?${params.toString()}`,
    { signal, credentials: "include" },
  );
  return handleResponse(response, "Failed to fetch today's revenue transactions");
}

export async function fetchPaymentById(payment_id, { signal } = {}) {
  const response = await fetch(`${baseUrl}/payments/${payment_id}`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch payment");
}

export async function fetchCartItemsByPaymentId(payment_id, { signal } = {}) {
  const response = await fetch(`${baseUrl}/payments/${payment_id}/cart-items`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch cart items");
}

export async function deletePayment(payment_id) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/payments/${payment_id}/cancel`, {
    method: "PATCH",
    headers: { "x-csrf-token": csrfToken },
    credentials: "include",
  });
  return handleResponse(response, "Failed to cancel payment");
}

export async function fetchRevenueSummary({ signal } = {}) {
  const response = await fetch(`${baseUrl}/revenue-summary`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch revenue summary");
}

export async function fetchTodayRevenue({ signal } = {}) {
  const response = await fetch(`${baseUrl}/revenue-summary/today`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch today's revenue");
}

// Backs the Payment page's revenue cards' click-through modal. `type` is
// "INV" (Sales) / "APT" (Services); `method` is "cash" / "gcash"
// (Cash/Cashless) — omit both for the full Revenue breakdown.
export async function fetchRevenueTransactions({
  type,
  method,
  search = "",
  page = 1,
  limit = 10,
  signal,
} = {}) {
  const params = new URLSearchParams({
    page,
    limit,
    ...(type && { type }),
    ...(method && { method }),
    ...(search && { search }),
  });

  const response = await fetch(
    `${baseUrl}/revenue-transactions?${params.toString()}`,
    { signal, credentials: "include" },
  );
  return handleResponse(response, "Failed to fetch revenue transactions");
}

// ─────────────────────────────
// Client Records
// ─────────────────────────────

export async function fetchClientRecords({
  page = 1,
  limit = 10,
  search = "",
  filters = {},
  signal,
}) {
  const effectiveLimit = limit === "all" ? 999999 : limit;
  const effectivePage = limit === "all" ? 1 : page;

  const params = new URLSearchParams({
    page: effectivePage,
    limit: effectiveLimit,
    ...(search && { search }),
  });

  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(","));
    } else if (value) {
      params.set(key, value);
    }
  });

  const response = await fetch(`${baseUrl}/client?${params.toString()}`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch Client Records");
}

export async function fetchClientById({ client_id, signal }) {
  const response = await fetch(`${baseUrl}/client/${client_id}`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch client");
}

export async function addClient(formData) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/client/add-client`, {
    method: "POST",
    headers: { "x-csrf-token": csrfToken }, // no Content-Type — browser sets multipart boundary for FormData
    body: formData,
    credentials: "include",
  });
  return handleResponse(response, "Failed to add client");
}

export async function editClient(id, formData) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/client/${id}/edit-client`, {
    method: "PUT",
    headers: { "x-csrf-token": csrfToken }, // no Content-Type — browser sets multipart boundary for FormData
    body: formData,
    credentials: "include",
  });
  return handleResponse(response, "Failed to update client");
}

export async function deleteClient(id) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/client/${id}/delete-client`, {
    method: "PUT",
    headers: { "x-csrf-token": csrfToken },
    credentials: "include",
  });
  return handleResponse(response, "Failed to delete client");
}

export async function fetchArchivedClients({
  page,
  limit,
  search = "",
  signal,
}) {
  const effectiveLimit = limit === "all" ? 999999 : limit;
  const effectivePage = limit === "all" ? 1 : page;

  const params = new URLSearchParams({
    page: effectivePage,
    limit: effectiveLimit,
    ...(search && { search }),
  });

  const response = await fetch(`${baseUrl}/client/archived?${params}`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch archived client records");
}

export async function restoreClient(id) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/client/${id}/restore`, {
    method: "PUT",
    headers: { "x-csrf-token": csrfToken },
    credentials: "include",
  });
  return handleResponse(response, "Failed to restore client");
}

// Hard delete — only succeeds on an already-archived client with no pets
// or appointment history (the backend rejects it with a 409 otherwise).
export async function permanentlyDeleteClient(id) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/client/${id}/permanent`, {
    method: "DELETE",
    headers: { "x-csrf-token": csrfToken },
    credentials: "include",
  });
  return handleResponse(response, "Failed to permanently delete client");
}

// ─────────────────────────────
// Pet Records
// ─────────────────────────────

export async function fetchPetRecordsByClientId(
  client_id,
  { page = 1, limit = 10, search = "", signal } = {},
) {
  const params = new URLSearchParams({
    page,
    limit,
    ...(search && { search }),
  });

  const response = await fetch(
    `${baseUrl}/client/${client_id}/pets?${params}`,
    {
      signal,
      credentials: "include",
    },
  );
  return handleResponse(response, "Failed to fetch pet records");
}

export async function addPet(client_id, formData) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/client/${client_id}/pets`, {
    method: "POST",
    headers: { "x-csrf-token": csrfToken }, // no Content-Type — browser sets multipart boundary for FormData
    body: formData,
    credentials: "include",
  });
  return handleResponse(response, "Failed to add pet");
}

export async function fetchPetById(pets_id, { signal } = {}) {
  const response = await fetch(`${baseUrl}/pets/${pets_id}`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch pet");
}

export async function editPet(pets_id, formData) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/pets/${pets_id}/edit-pet`, {
    method: "PUT",
    headers: { "x-csrf-token": csrfToken },
    body: formData,
    credentials: "include",
  });
  return handleResponse(response, "Failed to update pet");
}

export async function deletePet(pets_id) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/pets/${pets_id}/delete-pet`, {
    method: "PUT",
    headers: { "x-csrf-token": csrfToken },
    credentials: "include",
  });
  return handleResponse(response, "Failed to delete pet");
}

export async function transferPetOwner(pets_id, new_client_id) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/pets/${pets_id}/transfer-owner`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    credentials: "include",
    body: JSON.stringify({ new_client_id }),
  });
  return handleResponse(response, "Failed to transfer pet ownership");
}

export async function fetchPetHistory(pets_id, { signal } = {}) {
  const response = await fetch(`${baseUrl}/pets/${pets_id}/history`, {
    credentials: "include",
    signal,
  });
  return handleResponse(response, "Failed to load pet history");
}
export async function selectSpecies({ signal } = {}) {
  const response = await fetch(`${baseUrl}/species`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch species list");
}

export async function selectGender({ signal } = {}) {
  const response = await fetch(`${baseUrl}/gender`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch gender list");
}

export async function selectPetStatus({ signal } = {}) {
  const response = await fetch(`${baseUrl}/pet-status`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch pet status list");
}

// ─────────────────────────────
// Appointments
// ─────────────────────────────

export async function fetchAppointments({
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
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(","));
    } else if (value) {
      params.set(key, value);
    }
  });

  const response = await fetch(`${baseUrl}/appointments?${params}`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch appointments");
}

function buildAppointmentFilterParams({ page, limit, search, filters = {} }) {
  const params = new URLSearchParams({
    page,
    limit,
    ...(search && { search }),
  });
  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(","));
    } else if (value) {
      params.set(key, value);
    }
  });
  return params;
}

export async function fetchConsultationAppointments({
  page = 1,
  limit = 10,
  search = "",
  filters = {},
  signal,
} = {}) {
  const params = buildAppointmentFilterParams({ page, limit, search, filters });
  const response = await fetch(
    `${baseUrl}/appointments/consultation?${params}`,
    { signal, credentials: "include" },
  );
  return handleResponse(response, "Failed to fetch consultation appointments");
}

export async function fetchGroomingAppointments({
  page = 1,
  limit = 10,
  search = "",
  filters = {},
  signal,
} = {}) {
  const params = buildAppointmentFilterParams({ page, limit, search, filters });
  const response = await fetch(`${baseUrl}/appointments/grooming?${params}`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch grooming appointments");
}

export async function fetchOperationAppointments({
  page = 1,
  limit = 10,
  search = "",
  filters = {},
  signal,
} = {}) {
  const params = buildAppointmentFilterParams({ page, limit, search, filters });
  const response = await fetch(`${baseUrl}/appointments/operation?${params}`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch operation appointments");
}

export async function fetchTodayAppointments({
  page = 1,
  limit = 10,
  search = "",
  filters = {},
  signal,
} = {}) {
  const params = buildAppointmentFilterParams({ page, limit, search, filters });
  const response = await fetch(`${baseUrl}/dashboard/today-appointments?${params}`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch today's appointments");
}

export async function fetchAppointmentById(appointment_id, { signal } = {}) {
  const response = await fetch(`${baseUrl}/appointments/${appointment_id}`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch appointment");
}

export async function addAppointment(payload) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/appointments/add-appointment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse(response, "Failed to add appointment");
}

export async function bookAppointmentWithPayment(payload) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/appointments/book-with-payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse(response, "Failed to book appointment");
}

export async function completeAppointmentPayment(appointment_id, payload) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(
    `${baseUrl}/appointments/${appointment_id}/complete-payment`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify(payload),
    },
  );
  return handleResponse(response, "Failed to complete appointment payment");
}

export async function editAppointment(appointment_id, payload) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(
    `${baseUrl}/appointments/${appointment_id}/edit-appointment`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify(payload),
    },
  );
  return handleResponse(response, "Failed to update appointment");
}

export async function cancelAppointment(appointment_id) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(
    `${baseUrl}/appointments/${appointment_id}/cancel-appointment`,
    {
      method: "PUT",
      headers: { "x-csrf-token": csrfToken },
      credentials: "include",
    },
  );
  return handleResponse(response, "Failed to cancel appointment");
}

export async function markNoShow(appointment_id) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(
    `${baseUrl}/appointments/${appointment_id}/mark-no-show`,
    {
      method: "PUT",
      headers: { "x-csrf-token": csrfToken },
      credentials: "include",
    },
  );
  return handleResponse(response, "Failed to mark appointment as a no-show");
}

// The assigned groomer/veterinarian marking their own in-queue appointment
// done (or an Admin, for any appointment) — see Appointment_Route.js for
// why this isn't gated by a module permission like the others here.
export async function completeAppointment(appointment_id) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(
    `${baseUrl}/appointments/${appointment_id}/complete-appointment`,
    {
      method: "PUT",
      headers: { "x-csrf-token": csrfToken },
      credentials: "include",
    },
  );
  return handleResponse(response, "Failed to complete appointment");
}

export async function selectAppointmentServices({ signal } = {}) {
  const response = await fetch(`${baseUrl}/appointment-services`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch appointment services");
}

export async function selectAppointmentStaff({ signal } = {}) {
  const response = await fetch(`${baseUrl}/appointment-staff`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch staff list");
}

export async function selectGroomingPriceTiers({ signal } = {}) {
  const response = await fetch(`${baseUrl}/appointment-grooming-tiers`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch grooming price tiers");
}

// ─────────────────────────────
// Maintenance (services & grooming tiers catalog)
// ─────────────────────────────

export async function fetchMaintenanceServices({ signal } = {}) {
  const response = await fetch(`${baseUrl}/maintenance/services`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch services");
}

export async function addMaintenanceService(payload) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/maintenance/services`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse(response, "Failed to add service");
}

export async function updateMaintenanceService(id, payload) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/maintenance/services/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse(response, "Failed to update service");
}

export async function setMaintenanceServiceActive(id, is_active) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/maintenance/services/${id}/active`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    credentials: "include",
    body: JSON.stringify({ is_active }),
  });
  return handleResponse(response, "Failed to update service status");
}

export async function fetchMaintenanceGroomingTiers({ signal } = {}) {
  const response = await fetch(`${baseUrl}/maintenance/grooming-tiers`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch grooming tiers");
}

export async function addMaintenanceGroomingTier(payload) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/maintenance/grooming-tiers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse(response, "Failed to add grooming tier");
}

export async function updateMaintenanceGroomingTier(id, payload) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/maintenance/grooming-tiers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return handleResponse(response, "Failed to update grooming tier");
}

export async function deleteMaintenanceGroomingTier(id) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/maintenance/grooming-tiers/${id}`, {
    method: "DELETE",
    headers: { "x-csrf-token": csrfToken },
    credentials: "include",
  });
  return handleResponse(response, "Failed to delete grooming tier");
}

// ─────────────────────────────
// Analytics
// ─────────────────────────────

function buildDateRangeParams({ start_date, end_date, ...rest }) {
  const params = new URLSearchParams();
  if (start_date) params.set("start_date", start_date);
  if (end_date) params.set("end_date", end_date);
  Object.entries(rest).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });
  return params;
}

export async function fetchRevenueTrend({
  start_date,
  end_date,
  signal,
} = {}) {
  const params = buildDateRangeParams({ start_date, end_date });
  const response = await fetch(
    `${baseUrl}/analytics/revenue-trend?${params}`,
    { signal, credentials: "include" },
  );
  return handleResponse(response, "Failed to fetch revenue trend");
}

export async function fetchAppointmentsBreakdown({
  start_date,
  end_date,
  signal,
} = {}) {
  const params = buildDateRangeParams({ start_date, end_date });
  const response = await fetch(
    `${baseUrl}/analytics/appointments-breakdown?${params}`,
    { signal, credentials: "include" },
  );
  return handleResponse(response, "Failed to fetch appointments breakdown");
}

export async function fetchTopProducts({
  start_date,
  end_date,
  limit,
  signal,
} = {}) {
  const params = buildDateRangeParams({ start_date, end_date, limit });
  const response = await fetch(`${baseUrl}/analytics/top-products?${params}`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch top products");
}

export async function fetchClientGrowth({
  start_date,
  end_date,
  signal,
} = {}) {
  const params = buildDateRangeParams({ start_date, end_date });
  const response = await fetch(
    `${baseUrl}/analytics/client-growth?${params}`,
    { signal, credentials: "include" },
  );
  return handleResponse(response, "Failed to fetch client growth");
}

export async function fetchProductMovers({ month, signal } = {}) {
  const params = new URLSearchParams();
  if (month) params.set("month", month);
  const response = await fetch(
    `${baseUrl}/analytics/product-movers?${params}`,
    { signal, credentials: "include" },
  );
  return handleResponse(response, "Failed to fetch product movers");
}

export async function fetchCriticalStock({ signal } = {}) {
  const response = await fetch(`${baseUrl}/analytics/critical-stock`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch critical stock");
}

export async function fetchPeakTimes({ start_date, end_date, signal } = {}) {
  const params = buildDateRangeParams({ start_date, end_date });
  const response = await fetch(`${baseUrl}/analytics/peak-times?${params}`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch peak times");
}
