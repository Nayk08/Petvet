import express from "express";
import AuthenticatorController from "./Authenticator_Controller.js";
import { doubleCsrfProtection } from "../../config/csrf.js";
import authLimiter from "../../middleware/rate-Limiter.js";
import isAuth from "../../middleware/is-auth.js";
import { uploadProfilePicture } from "../../middleware/upload.js";

const router = express.Router();
const authController = new AuthenticatorController();

router.get("/me", isAuth, authController.me);
router.post("/login", authLimiter, doubleCsrfProtection, authController.login);
router.post("/logout", doubleCsrfProtection, authController.logout);
router.post(
  "/register",
  authLimiter,
  doubleCsrfProtection,
  authController.registerUser,
);

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
