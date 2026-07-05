import React, { useMemo, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchNavbar, logoutUser, queryClient } from "../../api/http";

// 1. Import your Lucide Icons
import {
  LayoutDashboard,
  Calendar,
  ShoppingCart,
  CreditCard,
  Package,
  Settings,
  Users,
  User,
  Shield,
  Lock,
  ChevronDown,
  Circle,
  LogOut,
} from "lucide-react";

// 2. Map codes directly to Icon Component objects
const MODULE_ICONS = {
  DASHBOARD: LayoutDashboard,
  APPOINTMENT: Calendar,
  CART: ShoppingCart,
  PAYMENTS: CreditCard,
  INVENTORY: Package,
  SETTINGS: Settings,
  USER_MGMT: Users,
  USER_MGMT_USERS: User,
  USER_MGMT_ROLES: Shield,
  USER_MGMT_PERMS: Lock,
};

export default function Navbar({ onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const { data, isPending, isError } = useQuery({
    queryKey: ["navData"],
    queryFn: ({ signal }) => fetchNavbar({ signal }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,
  });

  const user = data?.user;
  const modules = data?.modules || [];
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

  const handleLogout = async () => {
    setIsOpen(false);
    setIsLoggingOut(true);

    try {
      await logoutUser();
      queryClient.clear();
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
    `flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-all ${
      isActive
        ? "bg-indigo-600/20 text-indigo-400 font-medium"
        : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
    }`;

  return (
    <nav className="bg-slate-950 border-b border-slate-900 fixed w-full top-0 left-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 text-white font-semibold text-sm"
        >
          <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-[11px] font-black">
            R
          </div>
          RBAC System
        </Link>

        {/* Loading / Error States */}
        {(isPending || isError) && (
          <div className="text-slate-500 text-xs flex items-center gap-2">
            {isError ? "Sync failed" : "Syncing menu tree..."}
          </div>
        )}

        {/* Main Content */}
        {!isPending && !isError && (
          <>
            {/* Desktop Navigation Dropdowns */}
            <div className="hidden md:flex items-center gap-2 h-full">
              {topLevel.map((module) => {
                const subItems = childrenMap.get(module.module_code) || [];
                const IconComponent =
                  MODULE_ICONS[module.module_code] || Circle;

                if (subItems.length > 0) {
                  return (
                    <div
                      key={module.module_code}
                      className="relative group flex items-center h-full"
                    >
                      <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 group-hover:text-slate-100 bg-transparent cursor-pointer border-none transition-colors">
                        <IconComponent size={16} />
                        {module.module_name}
                        <ChevronDown
                          size={14}
                          className="ml-0.5 transition-transform group-hover:rotate-180"
                        />
                      </button>

                      {/* Dynamic Modules Dropdown Panel */}
                      <div className="absolute top-[100%] left-0 pt-1 w-48 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-1 shadow-2xl">
                          {subItems.map((child) => {
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
                      </div>
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={module.module_code}
                    to={module.route}
                    className={linkClass}
                  >
                    <IconComponent size={16} />
                    {module.module_name}
                  </NavLink>
                );
              })}
            </div>

            {/* Desktop User Profile Dropdown */}
            <div className="hidden md:flex items-center gap-4 h-full">
              <span className="text-[11px] px-2 py-0.5 bg-slate-900 text-slate-400 rounded-full border border-slate-800">
                {userRole}
              </span>
              <div className="relative group flex items-center h-full">
                {/* Trigger Area extending full height */}
                <button className="flex items-center gap-1.5 bg-transparent p-1 rounded-full cursor-pointer border-none">
                  <div className="w-7 h-7 bg-indigo-600 rounded-full text-xs font-semibold text-white flex items-center justify-center">
                    {userInitials}
                  </div>
                  <ChevronDown
                    size={12}
                    className="text-slate-500 group-hover:text-slate-300 transition-transform group-hover:rotate-180"
                  />
                </button>

                {/* FIXED LOGOUT: Added precise full hover containment wrapper, top-[100%] layout alignment, and z-50 high layering */}
                <div className="absolute top-[100%] right-0 pt-1 w-44 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-1 shadow-2xl">
                    <div className="px-3 py-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-900 mb-1">
                      Account Operations
                    </div>
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-900 rounded-lg transition-colors hover:text-slate-100"
                    >
                      <User size={14} /> Profile Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg bg-transparent border-none cursor-pointer transition-all hover:text-rose-300"
                    >
                      <LogOut size={14} />
                      {isLoggingOut ? "Logging out..." : "Log Out"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden flex flex-col justify-center items-center w-8 h-8 space-y-1.5 bg-transparent border-none cursor-pointer"
              aria-label="Toggle menu"
            >
              <span
                className={`w-6 h-0.5 bg-slate-400 transition-transform duration-200 ${isOpen ? "rotate-45 translate-y-2" : ""}`}
              />
              <span
                className={`w-6 h-0.5 bg-slate-400 transition-opacity duration-200 ${isOpen ? "opacity-0" : ""}`}
              />
              <span
                className={`w-6 h-0.5 bg-slate-400 transition-transform duration-200 ${isOpen ? "-rotate-45 -translate-y-2" : ""}`}
              />
            </button>
          </>
        )}
      </div>

      {/* Mobile Drawer Panel */}
      {isOpen && !isPending && !isError && (
        <div className="md:hidden bg-slate-950 border-t border-slate-900 p-4 space-y-4 max-h-[85vh] overflow-y-auto">
          <div className="flex flex-col gap-1">
            {topLevel.map((module) => {
              const subItems = childrenMap.get(module.module_code) || [];
              const IconComponent = MODULE_ICONS[module.module_code] || Circle;

              return (
                <div key={module.module_code} className="space-y-1">
                  {subItems.length > 0 ? (
                    <>
                      <div className="px-3 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <IconComponent size={14} />
                        {module.module_name}
                      </div>
                      <div className="pl-3 border-l border-slate-800 ml-4 flex flex-col gap-1">
                        {subItems.map((child) => (
                          <NavLink
                            key={child.module_code}
                            to={child.route}
                            onClick={() => setIsOpen(false)}
                            className={linkClass}
                          >
                            {child.module_name}
                          </NavLink>
                        ))}
                      </div>
                    </>
                  ) : (
                    <NavLink
                      to={module.route}
                      onClick={() => setIsOpen(false)}
                      className={linkClass}
                    >
                      <IconComponent size={16} />
                      {module.module_name}
                    </NavLink>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile Profile Actions */}
          <div className="pt-3 border-t border-slate-900 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-xs text-white">
                {userInitials}
              </div>
              <div className="text-xs text-slate-400 font-medium">
                {userRole}
              </div>
            </div>
            <div className="flex gap-1">
              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 bg-slate-900 text-slate-300 text-xs rounded-lg"
              >
                Profile
              </Link>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-3 py-1 bg-rose-500/10 text-rose-400 text-xs rounded-lg border-none cursor-pointer"
              >
                {isLoggingOut ? "..." : "Exit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
