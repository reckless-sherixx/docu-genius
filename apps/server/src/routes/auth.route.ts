import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authLimiter } from "../config/rateLimit.config.js";

const router: Router = Router();

// Public routes
router.post("/register", authLimiter, AuthController.register);
router.get("/verify-email", authLimiter, AuthController.verifyEmail);
router.get("/verify-error", authLimiter, AuthController.verificationError);
router.post("/login", authLimiter, AuthController.login);
router.post("/forget-password", authLimiter, AuthController.forgetPassword);
router.post("/reset-password", authLimiter, AuthController.resetPassword);

router.post("/check/credentials", authLimiter, AuthController.loginCheck);
router.get("/secure-route", authMiddleware, AuthController.secureRoute);

// Protected routes
router.post("/logout", authMiddleware, AuthController.logout);

export default router;