import Sidebar from "./Sidebar";
import { Outlet, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";

export default function Layout() {
  const location = useLocation();
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

  // Every "modal" in this app (add/edit/delete/process dialogs) is really a
  // route rendering a Radix Dialog with `open` hardcoded true, closed by
  // navigating away rather than by Radix's own onOpenChange flow. While a
  // Dialog is open, Radix marks the rest of the app (#root) inert/aria-hidden
  // so screen readers and (via `inert`) all pointer/keyboard interaction skip
  // it, and undoes that when the Dialog unmounts cleanly. Navigating fast
  // enough can unmount the Dialog mid-transition, before that cleanup runs,
  // leaving #root permanently inert — every button on every page stops
  // responding, with no console error, until a hard refresh. Since this can
  // race regardless of how carefully the modals are coded, sweep it clean on
  // every route change instead: if no dialog is actually open, nothing on
  // the page should be marked inert/aria-hidden.
  useEffect(() => {
    if (document.querySelector('[role="dialog"]')) return;

    const appRoot = document.getElementById("root");
    for (const el of [document.body, appRoot]) {
      if (!el) continue;
      el.removeAttribute("inert");
      if (el.getAttribute("aria-hidden") === "true") {
        el.removeAttribute("aria-hidden");
      }
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans dark:bg-slate-950 dark:text-slate-100">
      {/* Fixed left sidebar (an off-canvas drawer below md, behind a
          slim top bar with the menu toggle) */}
      <Sidebar />

      {/* Main content viewport container — offset for the mobile top bar
          below md, and for the sidebar's own width at md and up */}
      <main className="pt-14 md:pt-0 md:pl-64 w-full">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <Outlet />
        </div>
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
