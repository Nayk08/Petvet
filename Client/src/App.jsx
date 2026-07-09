import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { requireAuth, requirePermission } from "./utils/routeGuards.js";
import Layout from "./components/layout/Layout";
import ErrorPage from "./pages/ErrorPage";
import Dashboard from "./pages/ServerSide/Dashboard";
import Inventory from "./pages/ServerSide/Inventory";
import Cart from "./pages/ServerSide/Cart";
import Payments from "./pages/ServerSide/Payment";
import Appointments from "./pages/ServerSide/Appointment";
import Settings from "./pages/ServerSide/Settings";
import Grooming_Appointment from "./pages/ServerSide/Grooming_Appointment.jsx";
import Consultation_Appointment from "./pages/ServerSide/Consultation_Appointment.jsx";
import LandingPage from "./pages/LandingPage";
import Client_Record from "./pages/ServerSide/Clients_Record.jsx";
import {
  action as loginAction,
  loader as loginLoader,
} from "./pages/Authentication/components/AuthForm";

import Login from "./pages/Authentication/Login";

import { queryClient } from "./api/http";

const router = createBrowserRouter([
  { index: true, element: <LandingPage />, errorElement: <ErrorPage /> },

  {
    path: "/login",
    element: <Login />,
    errorElement: <ErrorPage />,
    action: loginAction,
    loader: loginLoader,
  },

  {
    path: "/",
    element: <Layout />,
    hydrateFallbackElement: (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Loading application...
      </div>
    ),
    errorElement: <ErrorPage />,
    loader: requireAuth,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },

      // Now governed by the Permission Matrix via requirePermission,
      // matching the real module_code values in tbl_user_module.
      {
        path: "dashboard",
        element: <Dashboard />,
        loader: requirePermission("DASHBOARD"),
      },
      {
        path: "inventory",
        element: <Inventory />,
        loader: requirePermission("INVENTORY"),
      },
      {
        path: "cart",
        element: <Cart />,
        loader: requirePermission("CART"),
      },
      {
        path: "payments",
        element: <Payments />,
        loader: requirePermission("PAYMENTS"),
      },
      {
        path: "appointments",
        element: <Appointments />,
        loader: requirePermission("APPOINTMENT"),
      },
      {
        path: "grooming-appointment",
        element: <Grooming_Appointment />,
        loader: requirePermission("G_APPOINTMENT"),
      },
      {
        path: "consultation-appointment",
        element: <Consultation_Appointment />,
        loader: requirePermission("C_APPOINTMENT"),
      },
      {
        path: "client-pet-record",
        element: <Client_Record />,
        loader: requirePermission("C_P_RECORDS"),
      },

      {
        path: "user-management",
        loader: requirePermission("USER_MGMT"),
        children: [
          {
            path: "users",
            loader: requirePermission("USER_MGMT_USERS"),
            lazy: () =>
              import("./pages/ServerSide/Users_Management/Users/Users.jsx"),

            children: [
              {
                path: "add-user",
                lazy: async () => {
                  const mod =
                    await import("./pages/ServerSide/Users_Management/Users/components/AddUsersModal.jsx");
                  return { ...mod, action: mod.addUserAction };
                },
              },
              {
                path: "edit-user/:user_id",
                lazy: async () => {
                  const mod =
                    await import("./pages/ServerSide/Users_Management/Users/components/AddUsersModal.jsx");
                  return {
                    ...mod,
                    loader: mod.editUserLoader,
                    action: mod.editUserAction,
                  };
                },
              },
              {
                path: "delete-user/:user_id",
                lazy: async () => {
                  const mod =
                    await import("./pages/ServerSide/Users_Management/Users/components/DeleteUserModal.jsx");
                  return {
                    ...mod,
                    loader: mod.deleteUserLoader,
                    action: mod.deleteUserAction,
                  };
                },
              },
            ],
          },
          {
            path: "roles",
            loader: requirePermission("USER_MGMT_ROLES"),
            lazy: () =>
              import("./pages/ServerSide/Users_Management/Roles/Roles.jsx"),

            children: [
              {
                path: "add-role",
                // Fixed: was previously double-imported (a static top-level
                // import AND a lazy import of the same file). Now it's lazy
                // only, so it's actually code-split like its siblings.
                lazy: async () => {
                  const mod =
                    await import("./pages/ServerSide/Users_Management/Roles/components/AddRolesModal.jsx");
                  return { ...mod, action: mod.action };
                },
              },
              {
                path: "edit-role/:user_level_id",
                lazy: () =>
                  import("./pages/ServerSide/Users_Management/Roles/components/EditRolesModal.jsx"),
              },
              {
                path: "delete-role/:user_level_id",
                lazy: () =>
                  import("./pages/ServerSide/Users_Management/Roles/components/DeleteRolesModal.jsx"),
              },
            ],
          },
          {
            path: "permissions",
            loader: requirePermission("USER_MGMT_PERMS"),
            lazy: () =>
              import("./pages/ServerSide/Users_Management/Permissions/Permission.jsx"),
          },
        ],
      },
    ],
  },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
