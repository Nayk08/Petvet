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
  const csrfRes = await fetch(`${baseUrl}/csrf-token`, {
    method: "GET",
    credentials: "include",
  });

  if (!csrfRes.ok) {
    throw new Error("Could not fetch CSRF token.");
  }

  const { csrfToken } = await csrfRes.json();

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

  // Map frontend display keys -> backend column names, if they differ
  const keyMap = {
    role: "user_level",
    user_level: "user_level_id",
    status: "is_active",
  };
  const mappedFilters = Object.fromEntries(
    Object.entries(filters).map(([k, v]) => [keyMap[k] || k, v]),
  );

  const params = new URLSearchParams({
    page: effectivePage,
    limit: effectiveLimit,
    ...(search && { search }),
    ...Object.fromEntries(Object.entries(mappedFilters).filter(([, v]) => v)),
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
  const response = await fetch(`${baseUrl}/addUser`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(user),
  });
  return handleResponse(response, "Failed to add user");
}

export async function updateUser(id, user) {
  const response = await fetch(`${baseUrl}/updateUser/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(user),
  });
  return handleResponse(response, "Failed to update user");
}

export async function deleteUser(id) {
  const response = await fetch(`${baseUrl}/deleteUser/${id}`, {
    method: "PUT",
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
  const response = await fetch(`${baseUrl}/addUserLevel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ userLevel: userlevel, description }),
  });
  return handleResponse(response, "Failed to create new user level");
}

export async function updateUserLevel({ id, userLevel, description }) {
  const response = await fetch(`${baseUrl}/updateUserLevel/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ userLevel, description }),
  });
  return handleResponse(response, "Failed to update user level");
}

export async function deleteUserLevel(id) {
  const response = await fetch(`${baseUrl}/deleteUserLevel/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
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
  const response = await fetch(`${baseUrl}/permissions`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ userLevelId, userModuleId, field, value }),
  });
  const result = await handleResponse(response, "Failed to update permission");
  return result.data;
}
