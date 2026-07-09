// src/api/auth.js

export async function getCurrentUser() {
  const authUrl = import.meta.env.VITE_API_AUTH_URL;
  const res = await fetch(`${authUrl}/me`, {
    credentials: "include",
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.user; // 👈 unwrap here
}
