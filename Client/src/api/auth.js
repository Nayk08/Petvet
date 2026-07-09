// src/api/auth.js
export async function getCurrentUser() {
  const res = await fetch("http://localhost:3000/api/auth/me", {
    credentials: "include",
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.user; // 👈 unwrap here
}
