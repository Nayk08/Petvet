import express from "express";
import AuthenticatorController from "./Authenticator_Controller.js";
import { doubleCsrfProtection } from "../../config/csrf.js";
import authLimiter from "../../middleware/rate-Limiter.js";
import isAuth from "../../middleware/is-auth.js";

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

export default router;
