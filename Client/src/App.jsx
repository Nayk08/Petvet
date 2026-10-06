import {
  createBrowserRouter,
  redirect,
  RouterProvider,
} from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { requireAuth, requirePermission } from "./utils/routeGuards.js";
import { requireClientAuth } from "./utils/clientPortalGuards.js";
import { resolveLandingPath } from "./utils/resolveLandingPath.js";
import Layout from "./components/layout/Layout";
import ErrorPage from "./pages/ErrorPage";
import Inventory from "./pages/ServerSide/Inventory/Inventory.jsx";
import Cart from "./pages/ServerSide/Inventory/Cart/Cart.jsx";

import Grooming_Appointment from "./pages/ServerSide/Grooming_Appointment.jsx";
import Consultation_Appointment from "./pages/ServerSide/Consultation_Appointment.jsx";
import Operation_Appointment from "./pages/ServerSide/Operation_Appointment.jsx";
import LandingPage from "./pages/LandingPage";
import { loader as LandingLoader } from "./pages/LandingPage.jsx";
import {
  action as loginAction,
  loader as loginLoader,
} from "./pages/Authentication/components/AuthForm";

import Login from "./pages/Authentication/Login";

import { queryClient, fetchNavbar } from "./api/http";
import UnauthorizedPage from "./pages/UnauthorizedPage.jsx";

// Shown while a route's loader runs on first page load.
const appLoading = (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 text-sm">
    Loading application...
  </div>
);

// LandingPage.jsx and AuthForm.jsx export a `loader`/`action` alongside
// their component, which Vite's Fast Refresh can't hot-swap ("loader"
// export is incompatible") — so editing anything they import invalidates
// those modules and Vite re-executes THIS module too, since it statically
// imports both. Re-running `createBrowserRouter([...])` on every one of
// those hot updates creates a brand new router instance while
// <RouterProvider> below is still mounted with the OLD one — React Router
// isn't designed to have its router swapped out at runtime, and the
// mismatch between the live DOM/history and the freshly recreated router
// left the whole app dead (no navigation, no requests, no errors) after
// almost any edit during dev. `import.meta.hot.data` survives module
// re-execution across a hot reload, so cache the router there and reuse
// the same instance instead of building a second one.
const router =
  import.meta.hot?.data.router ??
  createBrowserRouter([
  {
    index: true,
    element: <LandingPage />,
    errorElement: <ErrorPage />,
    hydrateFallbackElement: appLoading,
    loader: LandingLoader,
  },

  {
    path: "/login",
    element: <Login />,
    errorElement: <ErrorPage />,
    hydrateFallbackElement: appLoading,
    action: loginAction,
    loader: loginLoader,
  },
  {
    path: "/unauthorized",
    element: <UnauthorizedPage />,
    errorElement: <ErrorPage />,
  },

  // Client-facing portal — separate JWT-based auth (localStorage token,
  // not a cookie session), so this branch is NOT nested under the "/"
  // Layout's requireAuth loader below; requireClientAuth checks
  // localStorage directly instead of hitting /api/auth/me.
  {
    path: "/portal",
    errorElement: <ErrorPage />,
    children: [
      {
        // Login now lives at the shared /login page (email/password for
        // staff, a "Sign in with Google" option there for clients) —
        // redirect old bookmarks/links to it instead of 404ing.
        path: "login",
        loader: () => redirect("/login"),
      },
      {
        lazy: () => import("./pages/ClientPortal/PortalLayout.jsx"),
        loader: requireClientAuth,
        children: [
          {
            index: true,
            loader: () => redirect("/portal/appointments"),
          },
          {
            path: "appointments",
            lazy: () => import("./pages/ClientPortal/PortalAppointments.jsx"),
          },
          {
            path: "appointments/book",
            lazy: () => import("./pages/ClientPortal/PortalBookAppointment.jsx"),
          },
          {
            path: "pets",
            lazy: () => import("./pages/ClientPortal/PortalPets.jsx"),
          },
          {
            path: "payments",
            lazy: () => import("./pages/ClientPortal/PortalPayments.jsx"),
          },
        ],
      },
    ],
  },

  {
    path: "/",
    element: <Layout />,
    hydrateFallbackElement: appLoading,
    errorElement: <ErrorPage />,
    loader: requireAuth,
    children: [
      {
        index: true,
        loader: async () => {
          const user = await requireAuth();
          const { modules } = await queryClient.ensureQueryData({
            queryKey: ["navData", user.id, user.role],
            queryFn: ({ signal }) => fetchNavbar({ signal }),
            staleTime: 1000 * 60 * 5,
          });
          return redirect(resolveLandingPath(modules));
        },
      },

      // Governed by the Permission Matrix via requirePermission,
      // matching the real module_code values in tbl_user_module.
      {
        path: "dashboard",
        lazy: async () => {
          const mod = await import("./pages/ServerSide/Dashboard.jsx");
          const permissionLoader = requirePermission("DASHBOARD");
          return {
            ...mod,
            loader: async (args) => {
              await permissionLoader(args);
              return mod.loader(args);
            },
          };
        },
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
            path: "add-quantity/:product_id",
            lazy: () =>
              import("./pages/ServerSide/Inventory/components/AddQuantityModal.jsx"),
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
            lazy: async () => {
              const mod = await import(
                "./pages/ServerSide/Payment/Components/PaymentProcessModal.jsx"
              );
              const viewPermissionLoader = requirePermission(
                "PAYMENTS",
                "can_view",
              );
              const editPermissionLoader = requirePermission(
                "PAYMENTS",
                "can_edit",
              );

              return {
                ...mod,
                loader: async (args) => {
                  await viewPermissionLoader(args);
                  return mod.loader(args);
                },
                action: async (args) => {
                  await editPermissionLoader(args);
                  return mod.action(args);
                },
              };
            },
          },
          {
            path: "verify-payment/:payment_id",
            lazy: async () => {
              const mod = await import(
                "./pages/ServerSide/Payment/Components/VerifyPaymentModal.jsx"
              );
              const viewPermissionLoader = requirePermission(
                "PAYMENTS",
                "can_view",
              );
              const editPermissionLoader = requirePermission(
                "PAYMENTS",
                "can_edit",
              );

              return {
                ...mod,
                loader: async (args) => {
                  await viewPermissionLoader(args);
                  return mod.loader(args);
                },
                action: async (args) => {
                  await editPermissionLoader(args);
                  return mod.action(args);
                },
              };
            },
          },
          {
            path: "view-payment/:payment_id",
            lazy: () =>
              import("./pages/ServerSide/Payment/Components/viewModal.jsx"),
            loader: requirePermission("PAYMENTS", "can_view"),
          },
          {
            path: "receipt/:payment_id",
            lazy: () =>
              import("./pages/ServerSide/Payment/Components/ReceiptModal.jsx"),
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
            lazy: async () => {
              const mod = await import(
                "./pages/ServerSide/components/AddAppointmentModal.jsx"
              );
              const permissionLoader = requirePermission(
                "APPOINTMENT",
                "can_create",
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
          {
            path: "confirm-payment",
            loader: requirePermission("APPOINTMENT", "can_create"),
            lazy: () =>
              import(
                "./pages/ServerSide/components/ConfirmAppointmentPaymentModal.jsx"
              ),
          },
          {
            path: ":appointment_id/edit-appointment",
            lazy: async () => {
              const mod = await import(
                "./pages/ServerSide/components/AddAppointmentModal.jsx"
              );
              const permissionLoader = requirePermission(
                "APPOINTMENT",
                "can_edit",
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
          {
            path: ":appointment_id/cancel-appointment",
            lazy: async () => {
              const mod = await import(
                "./pages/ServerSide/components/CancelAppointmentModal.jsx"
              );
              const permissionLoader = requirePermission(
                "APPOINTMENT",
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
        path: "analytics",
        lazy: async () => {
          const mod = await import("./pages/ServerSide/Analytics.jsx");
          const permissionLoader = requirePermission("ANALYTICS");

          return {
            ...mod,
            loader: async (args) => {
              await permissionLoader(args);
              return mod.loader(args);
            },
          };
        },
      },
      {
        path: "maintenance",
        loader: requirePermission("MAINTENANCE"),
        lazy: () => import("./pages/ServerSide/Maintenance/Maintenance.jsx"),
      },
      {
        path: "announcements",
        loader: requirePermission("ANNOUNCEMENTS"),
        lazy: () => import("./pages/ServerSide/Announcements/Announcements.jsx"),
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
          {
            path: "pets/:pets_id/transfer-owner",
            loader: requirePermission("C_P_RECORDS", "can_edit"),
            lazy: () =>
              import("./pages/ServerSide/Client_Records/Pet_Records/components/TransferPetOwnerModal.jsx"),
          },
          {
            path: "pets/:pets_id/history",
            loader: requirePermission("C_P_RECORDS"),
            lazy: () =>
              import("./pages/ServerSide/Client_Records/Pet_Records/components/PetHistoryModal.jsx"),
          },
          {
            path: "pets/:pets_id/medical-records",
            loader: requirePermission("MEDICAL_RECORDS"),
            lazy: () =>
              import("./pages/ServerSide/Client_Records/Pet_Records/components/MedicalRecordsModal.jsx"),
          },
        ],
      },

      {
        path: "user-management",
        loader: requirePermission("USER_MGMT"),
        children: [
          {
            path: "users",
            lazy: async () => {
              const mod = await import(
                "./pages/Authentication/Users_Management/Users/Users.jsx"
              );
              const permissionLoader = requirePermission("USER_MGMT_USERS");

              return {
                ...mod,
                loader: async (args) => {
                  await permissionLoader(args);
                  return mod.loader(args);
                },
              };
            },

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

if (import.meta.hot) {
  import.meta.hot.data.router = router;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
