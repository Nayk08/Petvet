import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { loader, requireAuth, requirePermission } from "./utils/routeGuards.js";
import Layout from "./components/layout/Layout";
import ErrorPage from "./pages/ErrorPage";
import Dashboard from "./pages/ServerSide/Dashboard";
import Inventory from "./pages/ServerSide/Inventory/Inventory.jsx";
import Cart from "./pages/ServerSide/Inventory/Cart/Cart.jsx";

import Grooming_Appointment from "./pages/ServerSide/Grooming_Appointment.jsx";
import Consultation_Appointment from "./pages/ServerSide/Consultation_Appointment.jsx";
import Operation_Appointment from "./pages/ServerSide/Operation_Appointment.jsx";
import LandingPage from "./pages/LandingPage";
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
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
        children: [
          {
            path: "view-cart",
            lazy: () =>
              import("../src/pages/ServerSide/Inventory/Cart/Components/CartModal.jsx"),
          },
        ],
      },
      {
        path: "payments",
        lazy: () => import("./pages/ServerSide/Payment/Payment.jsx"),
        loader: requirePermission("PAYMENTS"),
        children: [
          {
            path: "process-payment/:payment_id",
            lazy: () =>
              import("./pages/ServerSide/Payment/Components/PaymentProcessModal.jsx"),
            loader: requirePermission("PAYMENTS", "can_view"),
          },
          {
            path: "view-payment/:payment_id",
            lazy: () =>
              import("./pages/ServerSide/Payment/Components/viewModal.jsx"),
            loader: requirePermission("PAYMENTS", "can_view"),
          },

          {
            path: "delete-payment/:payment_id",
            lazy: async () => {
              const mod =
                await import("./pages/ServerSide/Payment/Components/DeletePayment.jsx");
              const permissionLoader = requirePermission(
                "PAYMENTS",
                "can_delete",
              );

              return {
                ...mod,
                loader: async (args) => {
                  await permissionLoader(args);
                  return mod.loader(args);
                },
                action: async (args) => {
                  await permissionLoader(args);
                  return mod.action(args);
                },
              };
            },
          },
          {},
        ],
      },
      {
        path: "appointments",
        loader: requirePermission("APPOINTMENT"),
        lazy: () => import("./pages/ServerSide/Appointment.jsx"),
        children: [
          {
            path: "add-appointment",
            loader: requirePermission("APPOINTMENT", "can_create"),
            lazy: () =>
              import(
                "./pages/ServerSide/components/AddAppointmentModal.jsx"
              ),
          },
          {
            path: ":appointment_id/edit-appointment",
            loader: requirePermission("APPOINTMENT", "can_edit"),
            lazy: () =>
              import(
                "./pages/ServerSide/components/AddAppointmentModal.jsx"
              ),
          },
          {
            path: ":appointment_id/cancel-appointment",
            loader: requirePermission("APPOINTMENT", "can_delete"),
            lazy: () =>
              import(
                "./pages/ServerSide/components/CancelAppointmentModal.jsx"
              ),
          },
        ],
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
        path: "operation-appointment",
        element: <Operation_Appointment />,
        loader: requirePermission("O_APPOINTMENT"),
      },
      {
        path: "client-record",
        loader: requirePermission("C_P_RECORDS"),
        lazy: () =>
          import("./pages/ServerSide/Client_Records/Clients_Record.jsx"),
        children: [
          {
            path: "add-client",
            loader: requirePermission("C_P_RECORDS"),
            lazy: () =>
              import("./pages/ServerSide/Client_Records/components/addClientModal.jsx"),
          },
          {
            path: "edit-client/:client_id",
            loader: requirePermission("C_P_RECORDS"),
            lazy: () =>
              import("./pages/ServerSide/Client_Records/components/addClientModal.jsx"),
          },
          {
            path: "delete-client/:client_id",
            loader: requirePermission("C_P_RECORDS"),
            lazy: () =>
              import("./pages/ServerSide/Client_Records/components/deleteClientModal.jsx"),
          },
        ],
      },
      {
        path: "client-pet-record/:client_id",
        loader: requirePermission("C_P_RECORDS"),
        lazy: () =>
          import("./pages/ServerSide/Client_Records/Pet_Records/Pets_Record.jsx"),
        children: [
          {
            path: "add-pet",
            loader: requirePermission("C_P_RECORDS"),
            lazy: () =>
              import("./pages/ServerSide/Client_Records/Pet_Records/components/AddPetModal.jsx"),
          },
          {
            path: "pets/:pets_id/edit-pet",
            loader: requirePermission("C_P_RECORDS"),
            lazy: () =>
              import("./pages/ServerSide/Client_Records/Pet_Records/components/AddPetModal.jsx"),
          },
          {
            path: "pets/:pets_id/delete-pet",
            loader: requirePermission("C_P_RECORDS"),
            lazy: () =>
              import("./pages/ServerSide/Client_Records/Pet_Records/components/deletePetModal.jsx"),
          },
        ],
      },

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
                lazy: async () =>
                  import("@/pages/Authentication/Users_Management/Users/components/DeleteUserModal.jsx"),
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
