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
import Inventory from "./pages/ServerSide/Inventory/Inventory.jsx";
import Cart from "./pages/ServerSide/Cart";
import Payments from "./pages/ServerSide/Payment";
import Appointments from "./pages/ServerSide/Appointment";
import Settings from "./pages/ServerSide/Settings";
import Grooming_Appointment from "./pages/ServerSide/Grooming_Appointment.jsx";
import Consultation_Appointment from "./pages/ServerSide/Consultation_Appointment.jsx";
import LandingPage from "./pages/LandingPage";
import Client_Record from "./pages/ServerSide/Clients_Record.jsx";
import { loader as LandingLoader } from "../src/pages/LandingPage.jsx";
import {
  action as loginAction,
  loader as loginLoader,
} from "./pages/Authentication/components/AuthForm";

import Login from "./pages/Authentication/Login";

import { queryClient } from "./api/http";
import UnauthorizedPage from "./pages/UnauthorizedPage.jsx";
const router = createBrowserRouter([
  {
    index: true,
    element: <LandingPage />,
    errorElement: <ErrorPage />,
    loader: LandingLoader,
  },

  {
    path: "/login",
    element: <Login />,
    errorElement: <ErrorPage />,
    action: loginAction,
    loader: loginLoader,
  },
  {
    path: "/unauthorized",
    element: <UnauthorizedPage />,
    errorElement: <ErrorPage />,
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

      // Governed by the Permission Matrix via requirePermission,
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
        children: [
          {
            path: "edit-product/:product_id",
            lazy: () =>
              import("./pages/ServerSide/Inventory/components/AddProductModal.jsx"),
          },
          {
            path: "delete-product/:product_id",
            lazy: () =>
              import("./pages/ServerSide/Inventory/components/DeleteProductModal.jsx"),
          },
          {
            path: "add-product",
            lazy: () =>
              import("./pages/ServerSide/Inventory/components/AddProductModal.jsx"),
          },
        ],
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

      // NOTE: Settings is imported but has no route below. Either wire it up
      // (e.g. path: "settings", loader: requirePermission("SETTINGS")) or
      // remove the unused import — left as-is pending your confirmation.

      {
        path: "user-management",
        loader: requirePermission("USER_MGMT"),
        children: [
          {
            path: "users",
            loader: requirePermission("USER_MGMT_USERS"),
            lazy: () =>
              import("./pages/Authentication/Users_Management/Users/Users.jsx"),

            children: [
              {
                path: "add-user",
                loader: requirePermission("USER_MGMT_USERS", "can_create"),
                lazy: async () => {
                  const mod =
                    await import("./pages/Authentication/Users_Management/Users/components/AddUsersModal.jsx");
                  return { ...mod, action: mod.addUserAction };
                },
              },
              {
                path: "edit-user/:user_id",
                loader: requirePermission("USER_MGMT_USERS", "can_edit"),
                lazy: async () => {
                  const mod =
                    await import("@/pages/Authentication/Users_Management/Users/components/AddUsersModal.jsx");
                  return { ...mod, action: mod.editUserAction }; // loader removed, no longer needed
                },
              },
              {
                path: "delete-user/:user_id",
                loader: requirePermission("USER_MGMT_USERS", "can_delete"),
                lazy: async () => {
                  const mod =
                    await import("./pages/Authentication/Users_Management/Users/components/DeleteUserModal.jsx");
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
              import("./pages/Authentication/Users_Management/Roles/Roles.jsx"),

            children: [
              {
                path: "add-role",
                loader: requirePermission("USER_MGMT_ROLES", "can_create"),
                lazy: async () => {
                  const mod =
                    await import("./pages/Authentication/Users_Management/Roles/components/AddRolesModal.jsx");
                  return { ...mod, action: mod.action };
                },
              },
              {
                path: "edit-role/:user_level_id",
                loader: requirePermission("USER_MGMT_ROLES", "can_edit"),
                lazy: () =>
                  import("@/pages/Authentication/Users_Management/Roles/components/EditRolesModal.jsx"),
              },
              {
                path: "delete-role/:user_level_id",
                loader: requirePermission("USER_MGMT_ROLES", "can_delete"),
                lazy: () =>
                  import("./pages/Authentication/Users_Management/Roles/components/DeleteRolesModal.jsx"),
              },
            ],
          },
          {
            path: "permissions",
            loader: requirePermission("USER_MGMT_PERMS"),
            lazy: () =>
              import("./pages/Authentication/Users_Management/Permissions/Permission.jsx"),
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
