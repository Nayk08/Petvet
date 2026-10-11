import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useIsFetching } from "@tanstack/react-query";

import {
  fetchCurrentUser,
  fetchNavbar,
  fetchAwaitingPaymentsCount,
  logoutUser,
  queryClient,
} from "../../api/http";
import { useCartStore } from "../../stores/useCartStore";
import petvetLogo from "../../assets/petvet_icon.svg";

import {
  LayoutDashboard,
  Calendar,
  ShoppingCart,
  CreditCard,
  Package,
  Users,
  User,
  Shield,
  Lock,
  ChevronDown,
  ChevronLeft,
  Circle,
  LogOut,
  Cat,
  Scissors,
  ClipboardClock,
  Syringe,
  Moon,
  Sun,
  BarChart3,
  Menu,
  X,
  Settings,
  Wrench,
  Megaphone,
} from "lucide-react";
import ProfilePictureModal from "./ProfilePictureModal.jsx";

const MODULE_ICONS = {
  DASHBOARD: LayoutDashboard,
  APPOINTMENT: Calendar,
  G_APPOINTMENT: Scissors,
  C_APPOINTMENT: ClipboardClock,
  O_APPOINTMENT: Syringe,
  C_P_RECORDS: Cat,
  CART: ShoppingCart,
  PAYMENTS: CreditCard,
  INVENTORY: Package,
  ANALYTICS: BarChart3,
  MAINTENANCE: Wrench,
  ANNOUNCEMENTS: Megaphone,

  USER_MGMT: Users,
  USER_MGMT_USERS: User,
  USER_MGMT_ROLES: Shield,
  USER_MGMT_PERMS: Lock,
};

// Phone bottom tab bar: these modules first (when the user's role has them),
// then the next routable modules in sidebar order fill any empty slot.
// Everything else lives under "More".
const PRIMARY_TABS = ["DASHBOARD", "APPOINTMENT", "CART", "PAYMENTS"];
const TAB_COUNT = 4;

// Pages that aren't a module of their own: title + where Back goes when
// there's no in-app history (e.g. the page was opened from a bookmark).
const NESTED_PAGES = [
  { prefix: "/client-pet-record", title: "Pet Records", back: "/client-record" },
];

export const SIDEBAR_WIDTH_CLASS = "md:w-64";

export default function Sidebar({ onLogout }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState(() => new Set());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.getItem("theme") || "light";
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  // Close the mobile sheet and user menu on every navigation.
  useEffect(() => {
    setIsMobileOpen(false);
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  // Escape closes whichever phone overlay is open.
  useEffect(() => {
    if (!isMobileOpen && !isUserMenuOpen) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setIsMobileOpen(false);
      setIsUserMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobileOpen, isUserMenuOpen]);

  const { data: currentUserData, isPending: isUserPending } = useQuery({
    queryKey: ["currentUser"],
    queryFn: ({ signal }) => fetchCurrentUser({ signal }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const currentUser = currentUserData?.user;

  const { data, isPending, isError } = useQuery({
    queryKey: ["navData", currentUser?.id, currentUser?.role],
    queryFn: ({ signal }) => fetchNavbar({ signal }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    enabled: Boolean(currentUser?.id && currentUser?.role),
  });

  const user = data?.user || currentUser;
  const hasUserId = Boolean(user?.id);
  const modules = data?.modules || [];
  // Red badge on Payments: client GCash proofs waiting to be verified.
  const canSeePayments = modules.some((m) => m.module_code === "PAYMENTS");
  const { data: awaitingData } = useQuery({
    queryKey: ["awaiting-payments-count"],
    queryFn: ({ signal }) => fetchAwaitingPaymentsCount({ signal }),
    enabled: canSeePayments,
    refetchInterval: 30_000, // new online payments show up within 30 s
    staleTime: 0,
  });
  const awaitingCount = awaitingData?.count ?? 0;
  const userRole = user?.role || "No role";
  const userInitials = (user?.name || user?.email || "User")
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const { topLevel, childrenMap } = useMemo(() => {
    if (!modules.length) return { topLevel: [], childrenMap: new Map() };
    const top = modules
      .filter((m) => m.parent_module_id === null)
      .sort((a, b) => a.sort_order - b.sort_order);
    const map = new Map();
    top.forEach((parent) => {
      const children = modules
        .filter((m) => m.parent_module_id === parent.user_module_id)
        .sort((a, b) => a.sort_order - b.sort_order);
      map.set(parent.module_code, children);
    });
    return { topLevel: top, childrenMap: map };
  }, [modules]);

  // Every module the user can open, in sidebar order (group children in
  // place of their group). Same permission-filtered list as the sidebar.
  const routableModules = useMemo(
    () =>
      topLevel
        .flatMap((m) => {
          const children = childrenMap.get(m.module_code) || [];
          return children.length ? children : [m];
        })
        .filter((m) => m.route),
    [topLevel, childrenMap],
  );

  const tabModules = useMemo(() => {
    const picked = PRIMARY_TABS.map((code) =>
      routableModules.find((m) => m.module_code === code),
    ).filter(Boolean);
    for (const m of routableModules) {
      if (picked.length >= TAB_COUNT) break;
      if (!picked.includes(m)) picked.push(m);
    }
    return picked;
  }, [routableModules]);

  // Phone top bar: the current module (longest matching route) or a known
  // nested page, which also gets a Back button.
  const nestedPage = NESTED_PAGES.find((p) =>
    location.pathname.startsWith(p.prefix),
  );
  // Module routes may be stored without the leading "/" (NavLink resolves
  // them from the root either way), so normalize before matching.
  const toPath = (route) => (route.startsWith("/") ? route : `/${route}`);
  const currentModule = routableModules
    .filter(
      (m) =>
        location.pathname === toPath(m.route) ||
        location.pathname.startsWith(`${toPath(m.route)}/`),
    )
    .sort((a, b) => toPath(b.route).length - toPath(a.route).length)[0];
  const pageTitle = nestedPage?.title ?? currentModule?.module_name ?? "PetVet";
  const isOnTab = tabModules.some((m) => m === currentModule);

  const goBack = () => {
    // "default" = first page of this tab's history: don't leave the app.
    if (location.key !== "default") navigate(-1);
    else navigate(nestedPage.back);
  };

  // Auto-expand whichever group contains the page currently being viewed,
  // so landing on a child route (e.g. via a bookmark) doesn't hide it
  // inside a collapsed section.
  useEffect(() => {
    for (const [moduleCode, children] of childrenMap.entries()) {
      if (
        children.some((child) => location.pathname.startsWith(child.route))
      ) {
        setExpandedSections((prev) => {
          if (prev.has(moduleCode)) return prev;
          return new Set(prev).add(moduleCode);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childrenMap]);

  function toggleSection(moduleCode) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(moduleCode)) next.delete(moduleCode);
      else next.add(moduleCode);
      return next;
    });
  }

  const handleLogout = async () => {
    setIsMobileOpen(false);
    setIsUserMenuOpen(false);
    setIsLoggingOut(true);

    try {
      await logoutUser();
      queryClient.clear();
      // The cart is persisted to localStorage — don't hand it to the next
      // person who logs in on this (shared clinic) PC.
      useCartStore.getState().clearCart();
      if (onLogout) onLogout();
      navigate("/login?mode=login", { replace: true });
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to logout.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // max-md:min-h-11 — 44px rows when the sidebar is the phone "More" sheet.
  const linkClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2 max-md:min-h-11 rounded-xl text-sm transition-all ${
      isActive
        ? "bg-indigo-50 text-indigo-600 font-medium dark:bg-indigo-500/15 dark:text-indigo-300"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:active:bg-slate-800"
    }`;

  const fetching = useIsFetching();
  const showNav = !isUserPending && hasUserId && !isPending && !isError;

  const avatar = (sizeClass) => (
    <div
      className={`${sizeClass} shrink-0 rounded-full overflow-hidden bg-indigo-600 text-xs font-semibold text-white flex items-center justify-center shadow-sm`}
    >
      {user?.user_picture ? (
        <img src={user.user_picture} alt="" className="w-full h-full object-cover" />
      ) : (
        userInitials
      )}
    </div>
  );

  const paymentsBadge = (className) =>
    awaitingCount > 0 && (
      <span
        className={`${className} min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center`}
        title={`${awaitingCount} online payment(s) to verify`}
        aria-label={`${awaitingCount} online payments to verify`}
      >
        {awaitingCount > 99 ? "99+" : awaitingCount}
      </span>
    );

  const userMenuItemClass =
    "w-full flex items-center gap-2.5 px-3 min-h-11 rounded-lg text-sm text-left text-slate-700 active:bg-slate-100 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-800 bg-transparent border-none cursor-pointer";

  return (
    <>
      {fetching > 0 && (
        <div className="fixed top-1 left-1/2 -translate-x-1/2 z-[70] bg-indigo-600 text-white text-[10px] font-medium px-2 py-0.5 rounded-full shadow-sm animate-pulse">
          Syncing...
        </div>
      )}

      <style>{`
        .petvet-nav-scroll {
          scrollbar-color: #cbd5e1 transparent;
          scrollbar-width: thin;
        }
        .petvet-nav-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .petvet-nav-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .petvet-nav-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 9999px;
        }
        .petvet-nav-scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      {/* Phone top bar: back (on nested pages) or logo, page title, user menu */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 pt-[env(safe-area-inset-top)] bg-white/85 backdrop-blur-md border-b border-slate-200 dark:bg-slate-950/85 dark:border-slate-800">
        <div className="h-14 px-1.5 flex items-center gap-1">
          {nestedPage ? (
            <button
              type="button"
              onClick={goBack}
              className="size-11 shrink-0 flex items-center justify-center rounded-full text-slate-700 active:bg-slate-100 dark:text-slate-200 dark:active:bg-slate-800 bg-transparent border-none cursor-pointer"
              aria-label="Back"
            >
              <ChevronLeft size={24} />
            </button>
          ) : (
            <Link
              to="/"
              className="size-11 shrink-0 flex items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-800"
              aria-label="PetVet home"
            >
              <img src={petvetLogo} alt="" className="h-8 w-8 object-contain" />
            </Link>
          )}
          <h1 className="flex-1 min-w-0 truncate text-[17px] font-bold text-slate-900 dark:text-white">
            {pageTitle}
          </h1>
          {showNav && (
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((open) => !open)}
              aria-expanded={isUserMenuOpen}
              aria-controls="mobile-user-menu"
              aria-label="Account menu"
              className="size-11 shrink-0 flex items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-800 bg-transparent border-none cursor-pointer"
            >
              {avatar("w-8 h-8")}
            </button>
          )}
        </div>

        {isUserMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-0"
              onClick={() => setIsUserMenuOpen(false)}
            />
            <div
              id="mobile-user-menu"
              className="absolute right-2 top-full mt-1.5 z-10 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:bg-slate-900 dark:border-slate-800"
            >
              <div className="flex items-center gap-2.5 px-2.5 py-2 border-b border-slate-100 mb-1 dark:border-slate-800">
                {avatar("w-9 h-9")}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate dark:text-white">
                    {user?.name || user?.email || "User"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{userRole}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  setShowProfileModal(true);
                }}
                className={userMenuItemClass}
              >
                <User size={18} />
                Profile
              </button>
              <button type="button" onClick={toggleTheme} className={userMenuItemClass}>
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={`${userMenuItemClass} text-rose-600! dark:text-rose-400! font-medium disabled:opacity-50`}
              >
                <LogOut size={18} />
                {isLoggingOut ? "Logging out..." : "Log Out"}
              </button>
            </div>
          </>
        )}
      </header>

      {/* Phone bottom tab bar: up to 4 permitted modules + More */}
      {showNav && (
        <nav
          aria-label="Main"
          className="md:hidden fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)] bg-white/95 backdrop-blur-md border-t border-slate-200 dark:bg-slate-950/95 dark:border-slate-800"
        >
          <ul
            className="grid h-16"
            style={{ gridTemplateColumns: `repeat(${tabModules.length + 1}, minmax(0, 1fr))` }}
          >
            {tabModules.map((module) => {
              const Icon = MODULE_ICONS[module.module_code] || Circle;
              return (
                <li key={module.module_code}>
                  <NavLink
                    to={module.route}
                    className={({ isActive }) =>
                      `relative h-full flex flex-col items-center justify-center gap-1 px-0.5 text-[10px] tracking-tight font-medium transition-colors active:bg-slate-100 dark:active:bg-slate-900 ${
                        isActive
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`
                    }
                  >
                    <span className="relative">
                      <Icon size={22} />
                      {module.module_code === "PAYMENTS" &&
                        paymentsBadge("absolute -top-1.5 left-3.5")}
                    </span>
                    <span className="max-w-full truncate">{module.module_name}</span>
                  </NavLink>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={() => setIsMobileOpen(true)}
                aria-expanded={isMobileOpen}
                aria-controls="app-sidebar"
                className={`w-full h-full flex flex-col items-center justify-center gap-1 text-[10px] tracking-tight font-medium bg-transparent border-none cursor-pointer active:bg-slate-100 dark:active:bg-slate-900 ${
                  isMobileOpen || (currentModule && !isOnTab)
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <Menu size={22} />
                More
              </button>
            </li>
          </ul>
        </nav>
      )}

      {/* Mobile backdrop (covers the tab bar too) */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar — on phones the "More" bottom sheet, from md a fixed left column */}
      <aside
        id="app-sidebar"
        className={`fixed z-50 flex flex-col bg-white border-slate-200 shadow-sm transition-transform duration-200 dark:bg-slate-950 dark:border-slate-800 inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t pb-[env(safe-area-inset-bottom)] ${
          isMobileOpen ? "translate-y-0" : "translate-y-full"
        } md:inset-x-auto md:bottom-auto md:top-0 md:left-0 md:h-full md:w-64 md:max-h-none md:rounded-none md:border-t-0 md:border-r md:pb-0 md:translate-y-0`}
      >
        {/* Sheet grab handle (phones) */}
        <div className="md:hidden flex justify-center pt-2" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Brand */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200 shrink-0 dark:border-slate-800">
          <Link
            to="/"
            className="flex items-center gap-2 select-none active:scale-[0.98] transition-transform shrink-0"
          >
            <div className="h-9 w-9 flex items-center justify-center shrink-0">
              <img
                src={petvetLogo}
                alt="PetVet logo"
                className="h-full w-full object-contain"
              />
            </div>
            <p className="text-red-600 dark:text-red-500 font-extrabold text-xl tracking-tight">
              Pet<span className="text-emerald-600 dark:text-emerald-500">Vet</span>
            </p>
          </Link>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden flex items-center justify-center size-11 -mr-2 rounded-full bg-transparent border-none cursor-pointer text-slate-500 active:bg-slate-100 dark:text-slate-400 dark:active:bg-slate-800"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Loading / error / logged-out states */}
        {(isUserPending || (hasUserId && isPending) || isError) && (
          <div className="px-4 py-3 text-slate-400 text-xs font-medium dark:text-slate-500">
            {isError ? "Sync failed" : "Syncing menu tree..."}
          </div>
        )}

        {!isUserPending && !hasUserId && (
          <div className="px-3 py-3">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg bg-transparent border-none cursor-pointer transition-all hover:text-rose-700 font-medium dark:hover:bg-rose-950/30"
            >
              <LogOut size={14} />
              {isLoggingOut ? "Logging out..." : "Log Out"}
            </button>
          </div>
        )}

        {/* Nav tree */}
        {showNav && (
          <nav className="flex-1 overflow-y-auto overscroll-contain petvet-nav-scroll px-3 py-3 space-y-1">
            {topLevel.map((module) => {
              const children = childrenMap.get(module.module_code) || [];
              const IconComponent = MODULE_ICONS[module.module_code] || Circle;

              // Permission-only modules (e.g. MEDICAL_RECORDS) have no route — don't render a dead link.
              if (children.length === 0) {
                if (!module.route) return null;
                return (
                  <NavLink
                    key={module.module_code}
                    to={module.route}
                    className={linkClass}
                  >
                    <IconComponent size={16} />
                    {module.module_name}
                    {module.module_code === "PAYMENTS" && paymentsBadge("ml-auto")}
                  </NavLink>
                );
              }

              const isExpanded = expandedSections.has(module.module_code);
              return (
                <div key={module.module_code}>
                  <button
                    type="button"
                    onClick={() => toggleSection(module.module_code)}
                    aria-expanded={isExpanded}
                    className="w-full flex items-center gap-2.5 px-3 py-2 max-md:min-h-11 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-100 bg-transparent border-none cursor-pointer transition-colors dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    <IconComponent size={16} />
                    <span className="flex-1 text-left">
                      {module.module_name}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isExpanded && (
                    <div className="mt-1 ml-4 pl-3 border-l border-slate-200 flex flex-col gap-1 dark:border-slate-800">
                      {children.map((child) => {
                        const ChildIcon =
                          MODULE_ICONS[child.module_code] || Circle;
                        return (
                          <NavLink
                            key={child.module_code}
                            to={child.route}
                            className={linkClass}
                          >
                            <ChildIcon size={16} />
                            {child.module_name}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        )}

        {/* Footer: settings (profile + dark mode) + logout, above the
            avatar/picture row. Phones use the top-bar account menu instead. */}
        {showNav && (
          <div className="max-md:hidden border-t border-slate-200 p-3 space-y-2 shrink-0 dark:border-slate-800">
            <div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen((open) => !open)}
                aria-expanded={isSettingsOpen}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-transparent border-none cursor-pointer transition-colors dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <Settings size={16} />
                <span className="flex-1 text-left">Settings</span>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform ${isSettingsOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isSettingsOpen && (
                <div className="mt-1 ml-4 pl-3 border-l border-slate-200 flex flex-col gap-1 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(true)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-transparent border-none cursor-pointer text-left transition-all dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    <User size={16} />
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-transparent border-none cursor-pointer text-left transition-all dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    {theme === "dark" ? (
                      <Sun size={16} />
                    ) : (
                      <Moon size={16} />
                    )}
                    {theme === "dark" ? "Light mode" : "Dark mode"}
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-rose-600 hover:bg-rose-50 bg-transparent border-none cursor-pointer text-left transition-all hover:text-rose-700 font-medium disabled:opacity-50 dark:hover:bg-rose-950/30"
                  >
                    <LogOut size={16} />
                    {isLoggingOut ? "Logging out..." : "Log Out"}
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 px-1 py-1">
              {avatar("w-8 h-8")}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 truncate dark:text-slate-100">
                  {user?.name || user?.email || "User"}
                </p>
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200 font-medium dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800">
                  {userRole}
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {showProfileModal && (
        <ProfilePictureModal
          user={user}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </>
  );
}
