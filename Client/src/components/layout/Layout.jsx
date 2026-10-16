import Sidebar from "./Sidebar";
import { Outlet, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { useEffect, useRef, useState } from "react";

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

  // Phones: start each new page at the top, like an app, but keep the list's
  // position when a modal route opens or closes on top of it
  // (/inventory ⇄ /inventory/edit-…). Desktop keeps its current behaviour.
  const prevPath = useRef(location.pathname);
  useEffect(() => {
    const prev = prevPath.current;
    const next = location.pathname;
    prevPath.current = next;
    if (prev.startsWith(next) || next.startsWith(prev)) return;
    if (window.innerWidth < 768) window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans dark:bg-slate-950 dark:text-slate-100">
      {/* Fixed left sidebar from md; below md a top bar + bottom tab bar,
          with the full menu in a "More" bottom sheet */}
      <Sidebar />

      {/* Main content. Below md the page scrolls normally under the fixed top
          bar and tab bar (a 100dvh inner scroller broke in browsers/simulators
          that misreport the viewport height); padding clears both bars. */}
      <main className="w-full max-md:pl-[env(safe-area-inset-left)] max-md:pr-[env(safe-area-inset-right)] md:pl-[var(--sidebar-w,16rem)] md:transition-[padding] md:duration-200 max-md:pt-[calc(3.5rem+env(safe-area-inset-top))]">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-4 md:py-8 max-md:pb-[calc(5rem+env(safe-area-inset-bottom))]">
          <Outlet />
        </div>
      </main>

      <Toaster
        theme={theme}
        position="top-right"
        // Phones (Sonner switches below 600px): just under the top bar.
        mobileOffset={{ top: "calc(4rem + env(safe-area-inset-top, 0px))" }}
        toastOptions={{
          duration: 3000,
        }}
      />
    </div>
  );
}
