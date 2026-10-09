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

export const SIDEBAR_WIDTH_CLASS = "md:w-64";

export default function Sidebar({ onLogout }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
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

  // Close the mobile drawer on every navigation.
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

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

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
      isActive
        ? "bg-indigo-50 text-indigo-600 font-medium dark:bg-indigo-500/15 dark:text-indigo-300"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
    }`;

  const fetching = useIsFetching();
  const showNav = !isUserPending && hasUserId && !isPending && !isError;

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

      {/* Mobile top bar — the sidebar itself is off-canvas below md */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 z-40 flex items-center justify-between px-4 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm dark:bg-slate-950/85 dark:border-slate-800">
        <Link to="/" className="flex items-center gap-2 select-none shrink-0">
          <img
            src={petvetLogo}
            alt="PetVet logo"
            className="h-8 w-8 object-contain"
          />
          <p className="text-red-500 font-extrabold text-lg tracking-tight">
            Pet<span className="text-emerald-600 font-semibold">Vet</span>
          </p>
        </Link>
        {showNav && (
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-transparent border-none cursor-pointer text-slate-600 dark:text-slate-300"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
        )}
      </div>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 md:w-64 bg-white border-r border-slate-200 z-50 flex flex-col shadow-sm transition-transform duration-200 dark:bg-slate-950 dark:border-slate-800 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
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
            <p className="text-red-500 font-extrabold text-xl tracking-tight">
              Pet<span className="text-emerald-600 font-semibold">Vet</span>
            </p>
          </Link>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            aria-label="Close menu"
          >
            <X size={18} />
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
          <nav className="flex-1 overflow-y-auto petvet-nav-scroll px-3 py-3 space-y-1">
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
                    {module.module_code === "PAYMENTS" && awaitingCount > 0 && (
                      <span
                        className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center"
                        title={`${awaitingCount} online payment(s) to verify`}
                        aria-label={`${awaitingCount} online payments to verify`}
                      >
                        {awaitingCount > 99 ? "99+" : awaitingCount}
                      </span>
                    )}
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
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-transparent border-none cursor-pointer transition-colors dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
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
            avatar/picture row */}
        {showNav && (
          <div className="border-t border-slate-200 p-3 space-y-2 shrink-0 dark:border-slate-800">
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
              <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden bg-indigo-600 text-xs font-semibold text-white flex items-center justify-center shadow-sm">
                {user?.user_picture ? (
                  <img
                    src={user.user_picture}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  userInitials
                )}
              </div>
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
