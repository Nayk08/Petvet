import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      gcTime: 1000 * 60 * 10, // 10 min
      retry: 1,
    },
  },
});

// ─────────────────────────────
// Auth
// ─────────────────────────────

export async function fetchCurrentUser({ signal }) {
  const response = await fetch("http://localhost:3000/api/auth/me", {
    signal,
    credentials: "include",
  });

  if (!response.ok) {
    const error = new Error("Failed to fetch current user");
    error.code = response.status;
    throw error;
  }

  return response.json();
}

export async function logoutUser() {
  const csrfRes = await fetch("http://localhost:3000/api/csrf-token", {
    method: "GET",
    credentials: "include",
  });

  if (!csrfRes.ok) {
    throw new Error("Could not fetch CSRF token.");
  }

  const { csrfToken } = await csrfRes.json();

  const response = await fetch("http://localhost:3000/api/auth/logout", {
    method: "POST",
    headers: {
      "x-csrf-token": csrfToken,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || "Failed to logout.");
  }

  return response.json();
}

// ─────────────────────────────
// COMMON
// ─────────────────────────────

export async function fetchNavbar({ signal }) {
  const response = await fetch("http://localhost:3000/api/nav", {
    signal,
    credentials: "include",
  });

  if (!response.ok) {
    const error = new Error("Failed to fetch navbar");
    error.code = response.status;
    throw error;
  }

  return response.json();
}

export async function getCategoryUserLevel({ signal }) {
  const response = await fetch("http://localhost:3000/api/categoryUserLevel", {
    signal,
    credentials: "include",
  });

  if (!response.ok) {
    const error = new Error("Failed to fetch user level");
    error.code = response.status;
    throw error;
  }

  return response.json();
}

// ─────────────────────────────
// Users
// ─────────────────────────────

export async function fetchUsers({ signal }) {
  const response = await fetch(`http://localhost:3000/api/users`, { signal });

  if (!response.ok) {
    const error = new Error("Failed to fetch users");
    error.code = response.status;
    throw error;
  }

  return response.json();
}

export async function fetchUserById(id, { signal } = {}) {
  console.log("fetchUserById id:", id);
  const response = await fetch(`http://localhost:3000/api/users/${id}`, {
    signal,
  });

  if (!response.ok) {
    const error = new Error("Failed to fetch user");
    error.code = response.status;
    throw error;
  }

  return response.json();
}

export async function addNewUser(user) {
  const response = await fetch("http://localhost:3000/api/addUser", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(user),
  });

  if (!response.ok) {
    const error = new Error("Failed to add user");
    error.code = response.status;
    throw error;
  }

  return response.json();
}

export async function updateUser(id, user) {
  const response = await fetch(`http://localhost:3000/api/updateUser/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(user),
  });

  if (!response.ok) {
    const error = new Error("Failed to update user");
    error.code = response.status;
    throw error;
  }

  return response.json();
}

export async function deleteUser(id) {
  const response = await fetch(`http://localhost:3000/api/deleteUser/${id}`, {
    method: "PUT",
    credentials: "include",
  });

  if (!response.ok) {
    const error = new Error("Failed to delete user");
    error.code = response.status;
    throw error;
  }

  return response.json();
}

// ─────────────────────────────
// User Levels
// ─────────────────────────────

export async function fetchUserLevel({ signal }) {
  const response = await fetch(`http://localhost:3000/api/usersLevel`, {
    signal,
  });

  if (!response.ok) {
    const error = new Error("Failed to fetch users");
    error.code = response.status;
    throw error;
  }

  return response.json();
}

export async function fetchUserLevelById(id, { signal } = {}) {
  console.log("fetchUserLevelById id:", id);
  const response = await fetch(`http://localhost:3000/api/usersLevel/${id}`, {
    signal,
  });

  if (!response.ok) {
    const error = new Error("Failed to fetch user level");
    error.code = response.status;
    throw error;
  }

  return response.json();
}

export async function addNewUserLevel(userlevel, description) {
  const response = await fetch("http://localhost:3000/api/addUserLevel", {
    method: "POST",
    body: JSON.stringify({ userLevel: userlevel, description: description }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = new Error("An error occured while creating new user level");
    error.code = response.status;
    error.info = await response.json();
    throw error;
  }

  return response;
}

export async function updateUserLevel({ id, userLevel, description }) {
  const response = await fetch(
    `http://localhost:3000/api/updateUserLevel/${id}`,
    {
      method: "PUT",
      body: JSON.stringify({ userLevel, description }),
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const error = new Error("An error occurred while updating user level");
    error.code = response.status;
    error.info = await response.json();
    throw error;
  }

  return response.json();
}

export async function deleteUserLevel(id) {
  const response = await fetch(
    `http://localhost:3000/api/deleteUserLevel/${id}`,
    {
      method: "PUT",
      body: JSON.stringify({ id }),
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const error = new Error("An error occurred while updating user level");
    error.code = response.status;
    error.info = await response.json();
    throw error;
  }

  return response.json();
}

// ─────────────────────────────
// Permissions
// ─────────────────────────────

export async function getPermissionMatrix({ userLevelId, signal }) {
  const response = await fetch(
    `http://localhost:3000/api/permissions/${userLevelId}`,
    {
      signal,
      credentials: "include",
    },
  );

  if (!response.ok) {
    const error = new Error("Failed to fetch permission matrix");
    error.code = response.status;
    throw error;
  }

  const { data } = await response.json();
  return data;
}

export async function updatePermissionField({
  userLevelId,
  userModuleId,
  field,
  value,
}) {
  const response = await fetch("http://localhost:3000/api/permissions", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ userLevelId, userModuleId, field, value }),
  });

  if (!response.ok) {
    const error = new Error("Failed to update permission");
    error.code = response.status;
    throw error;
  }

  const { data } = await response.json();
  return data;
}
