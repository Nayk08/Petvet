import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";

export default function Layout() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.getItem("theme") || "light";
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(
        document.documentElement.classList.contains("dark")
          ? "dark"
          : "light",
      );
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans dark:bg-slate-950 dark:text-slate-100">
      {/* Fixed top navigation bar */}
      <Navbar />

      {/* Main content viewport container */}
      <main className="pt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <Outlet />
      </main>

      <Toaster
        theme={theme}
        position="top-right"
        toastOptions={{
          duration: 3000,
        }}
      />
    </div>
  );
}
