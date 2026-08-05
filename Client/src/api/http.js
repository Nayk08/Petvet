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

async function handleResponse(
  response,
  fallbackMessage = "Something went wrong",
) {
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
  const response = await fetch(`${AuthUrl}/me`, {
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

// ─────────────────────────────
// COMMON
// ─────────────────────────────

export async function fetchNavbar({ signal }) {
  const response = await fetch(`${baseUrl}/nav`, {
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
  const response = await fetch(`${baseUrl}/addUser`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    credentials: "include",
    body: JSON.stringify(user),
  });
  return handleResponse(response, "Failed to add user");
}

export async function updateUser(id, user) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/updateUser/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    credentials: "include",
    body: JSON.stringify(user),
  });
  return handleResponse(response, "Failed to update user");
}

export async function deleteUser(id) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/deleteUser/${id}`, {
    method: "PUT",
    headers: { "x-csrf-token": csrfToken },
    credentials: "include",
  });
  return handleResponse(response, "Failed to delete user");
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
    ...Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v), // drop empty filter values
    ),
  });

  const response = await fetch(
    `${baseUrl}/usersLevel?page=${effectivePage}&limit=${effectiveLimit}`,
    {
      signal,
      credentials: "include",
    },
  );
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
  const response = await fetch(`${baseUrl}/addUserLevel`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    credentials: "include",
    body: JSON.stringify({ userLevel: userlevel, description }),
  });
  return handleResponse(response, "Failed to create new user level");
}

export async function updateUserLevel({ id, userLevel, description }) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/updateUserLevel/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    credentials: "include",
    body: JSON.stringify({ userLevel, description }),
  });
  return handleResponse(response, "Failed to update user level");
}

export async function deleteUserLevel(id) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/deleteUserLevel/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    credentials: "include",
    body: JSON.stringify({ id }),
  });
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

export async function addProduct(formData) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/inventory/add-product`, {
    method: "POST",
    headers: { "x-csrf-token": csrfToken }, // no Content-Type — browser sets multipart boundary for FormData
    body: formData,
    credentials: "include",
  });
  return handleResponse(response, "failed to add Products");
}

export async function updateProduct(id, formData) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/inventory/edit-product/${id}`, {
    method: "PUT",
    headers: { "x-csrf-token": csrfToken },
    body: formData,
    credentials: "include",
  });
  return handleResponse(response, "failed to update Products");
}

export async function deleteProduct(id) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/inventory/delete-product/${id}`, {
    method: "PUT",
    headers: { "x-csrf-token": csrfToken },
    credentials: "include",
  });
  return handleResponse(response, "failed to delete Products");
}

// ─────────────────────────────
// Payments / Checkout
// ─────────────────────────────

export async function checkoutOrder(cartItems) {
  const csrfToken = await getCsrfToken();

  const payload = {
    cartItems: cartItems.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      item_price: item.product_price,
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
export async function completePayment(paymentId) {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`${baseUrl}/checkout/${paymentId}/complete`, {
    method: "PATCH",
    headers: { "x-csrf-token": csrfToken },
    credentials: "include",
  });
  return handleResponse(response, "Failed to complete payment");
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

export async function fetchPaymentById(payment_id, { signal } = {}) {
  const response = await fetch(`${baseUrl}/payments/${payment_id}`, {
    signal,
    credentials: "include",
  });
  return handleResponse(response, "Failed to fetch payment");
}

// http.js — add this alongside fetchPaymentById
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
