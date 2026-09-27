import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cookieParser from "cookie-parser";
import pool from "./src/config/db.js";
import { generateCsrfToken } from "./src/config/csrf.js";
import isAuth from "./src/middleware/is-auth.js";
import { doubleCsrfProtection } from "./src/config/csrf.js";
import authLimiter, {
  apiLimiter,
  csrfLimiter,
} from "./src/middleware/rate-Limiter.js";

import commonRoutes from "./src/features/Common/Common_Route.js";
import userRoutes from "./src/features/Authenticator/Users_Management/Users/Users_Route.js";
import userLevelRoutes from "./src/features/Authenticator/Users_Management/User_Level/User_Level_Route.js";
import AuthenticatorRoute from "./src/features/Authenticator/Authenticator_Route.js";
import PermissionRoute from "./src/features/Authenticator/Users_Management/Permission/Permission_Route.js";
import InventoryRoute from "./src/features/Inventory/Inventory_Route.js";
import PaymentRoute from "./src/features/Payment/Payment_Route.js";
import ClientRecordsRoute from "./src/features/Client_Records/Client_Records_Route.js";
import AppointmentRoute from "./src/features/Appointment/Appointment_Route.js";
import DashboardRoute from "./src/features/Dashboard/Dashboard_Route.js";
import AnalyticsRoute from "./src/features/Analytics/Analytics_Route.js";
import ClientPortalRoute from "./src/features/ClientPortal/ClientPortal_Route.js";

const app = express();
const PgSession = connectPgSimple(session);

// --- Trust proxy (must be set before anything relies on secure cookies) ---
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// --- Core middleware ---
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Before the session store on purpose: a flooded request should be rejected
// here, not after it has already cost a Postgres session lookup.
app.use("/api", apiLimiter);

// --- Session ---
app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24,
    },
  }),
);

app.use(cookieParser());

// --- CSRF token endpoint (frontend calls this once to get a token) ---
app.get("/api/csrf-token", csrfLimiter, (req, res) => {
  req.session.csrfInit = true; // forces the session to be saved/persisted
  const token = generateCsrfToken(req, res);
  res.status(200).json({ csrfToken: token });
});

// --- Health check ---
app.get("/", (req, res) => {
  res.json({ message: "Server is running!" });
});

// --- Routes ---
app.use("/api/auth", authLimiter, AuthenticatorRoute); // stays public, has its own doubleCsrfProtection per-route already

// Client portal — a separate JWT bearer-token auth system for actual
// clinic clients (tbl_clients), entirely independent of the isAuth/session
// system below (which is for staff/admin only). Its own route file splits
// the public Google-login route from the isClientAuth-gated ones
// internally, so nothing extra is needed here. MUST be mounted before the
// `app.use("/api", isAuth, ...)` lines below — those match ANY path
// starting with "/api" (Express treats the mount path as a prefix, not an
// exact match), so isAuth was intercepting every /api/client-portal/*
// request and rejecting it with a staff-session 401 before this route
// ever got a chance to run.
app.use("/api/client-portal", ClientPortalRoute);

app.use("/api", isAuth, doubleCsrfProtection, commonRoutes);
app.use("/api", isAuth, doubleCsrfProtection, userRoutes);
app.use("/api", isAuth, doubleCsrfProtection, userLevelRoutes);
app.use("/api", isAuth, doubleCsrfProtection, PermissionRoute);
app.use("/api", isAuth, doubleCsrfProtection, InventoryRoute);

app.use("/api", isAuth, doubleCsrfProtection, PaymentRoute);
app.use("/api", isAuth, doubleCsrfProtection, ClientRecordsRoute);
app.use("/api", isAuth, doubleCsrfProtection, AppointmentRoute);
app.use("/api", isAuth, doubleCsrfProtection, DashboardRoute);
app.use("/api", isAuth, doubleCsrfProtection, AnalyticsRoute);

// --- 404 handler (unmatched routes) ---
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// --- Centralized error handler (must be last) ---
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.statusCode || err.status || 500;
  const message = status < 500 ? err.message : "Something went wrong";
  res.status(status).json({ message });
});

export default app;
