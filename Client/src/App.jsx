import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";

import Layout from "./components/layout/Layout";
import ErrorPage from "./pages/ErrorPage";
import Dashboard from "./pages/ServerSide/Dashboard";
import Inventory from "./pages/ServerSide/Inventory";
import Cart from "./pages/ServerSide/Cart";
import Payments from "./pages/ServerSide/Payment";
import Appointments from "./pages/ServerSide/Appointment";
import Settings from "./pages/ServerSide/Settings";
import Users from "./pages/ServerSide/Users_Management/Users";
import Roles from "./pages/ServerSide/Users_Management/Roles";
import Permissions from "./pages/ServerSide/Users_Management/Permission";
import LandingPage from "./pages/LandingPage";
import {
  action as loginAction,
  loader as loginLoader,
} from "./pages/Authentication/components/AuthForm";

import Login from "./pages/Authentication/Login";

import { queryClient } from "./api/http";

const router = createBrowserRouter([
  { path: "/welcome", element: <LandingPage />, errorElement: <ErrorPage /> },

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
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "inventory", element: <Inventory /> },
      { path: "cart", element: <Cart /> },
      { path: "payments", element: <Payments /> },
      { path: "appointments", element: <Appointments /> },
      { path: "settings", element: <Settings /> },
      { path: "user-management/users", element: <Users /> },
      { path: "user-management/roles", element: <Roles /> },
      { path: "user-management/permissions", element: <Permissions /> },
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
