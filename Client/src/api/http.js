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

export async function fetchNavbar({ signal, role }) {
  const response = await fetch(
    `http://localhost:3000/api/nav?role=${encodeURIComponent(role)}`,
    { signal },
  );

  if (!response.ok) {
    const error = new Error("Failed to fetch navbar");
    error.code = response.status;
    throw error;
  }

  return response.json();
}

export async function fetchUsers({ signal }) {
  const response = await fetch(`http://localhost:3000/api/users`, { signal });

  if (!response.ok) {
    const error = new Error("Failed to fetch users");
    error.code = response.status;
    throw error;
  }

  return response.json();
}

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
