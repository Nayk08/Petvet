import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cookieParser from "cookie-parser";
import pool from "./src/config/db.js";
import { generateCsrfToken } from "./src/config/csrf.js";

import commonRoutes from "./src/features/Common/Common_Route.js";
import userRoutes from "./src/features/Users_Management/Users/Users_Route.js";
import userLevelRoutes from "./src/features/Users_Management/User_Level/User_Level_Route.js";
import AuthenticatorRoute from "./src/features/Authenticator/Authenticator_Route.js";
import PermissionRoute from "./src/features/Users_Management/Permission/Permission_Route.js";
const app = express();
const PgSession = connectPgSimple(session);

// --- Trust proxy (must be set before anything relies on secure cookies) ---
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// --- Core middleware ---
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.get("/api/csrf-token", (req, res) => {
  req.session.csrfInit = true; // forces the session to be saved/persisted
  const token = generateCsrfToken(req, res);
  res.status(200).json({ csrfToken: token });
});

// --- Health check ---
app.get("/", (req, res) => {
  res.json({ message: "Server is running!" });
});

// --- Routes ---
app.use("/api/auth", AuthenticatorRoute);
app.use("/api", commonRoutes);
app.use("/api", userRoutes);
app.use("/api", userLevelRoutes);
app.use("/api", PermissionRoute);

// --- 404 handler (unmatched routes) ---
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// // --- Centralized error handler (must be last) ---
// app.use((err, req, res, next) => {
//   console.error(err);
//   res
//     .status(err.status || 500)
//     .json({ message: err.message || "Server error" });
// });

export default app;
