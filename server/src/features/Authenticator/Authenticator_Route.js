import express from "express";
import AuthenticatorController from "./Authenticator_Controller.js";
import { doubleCsrfProtection } from "../../config/csrf.js";
import { loginLimiter } from "../../middleware/rate-Limiter.js";
import isAuth from "../../middleware/is-auth.js";
import { uploadProfilePicture } from "../../middleware/upload.js";

const router = express.Router();
const authController = new AuthenticatorController();

// No public self-registration route — staff accounts are created by an
// admin (Users Management), clients sign in via Google (see
// ClientPortal_Route.js), which only links an existing record a staff
// member already created.
router.get("/me", isAuth, authController.me);
router.post("/login", loginLimiter, doubleCsrfProtection, authController.login);
router.post("/logout", doubleCsrfProtection, authController.logout);

// Self-service — any logged-in user updates their own picture, no
// module permission needed since it's not gated by the Permission Matrix.
router.patch(
  "/me/picture",
  isAuth,
  doubleCsrfProtection,
  uploadProfilePicture.single("profile_picture"),
  authController.updateMyPicture,
);

export default router;
