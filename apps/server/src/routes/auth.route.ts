import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router: Router = Router();

// Public routes
router.post("/register", AuthController.register);
router.get("/verify-email", AuthController.verifyEmail); 
router.get("/verify-error", AuthController.verificationError);
router.post("/login", AuthController.login);
router.post("/check/credentials", AuthController.loginCheck);
router.get("/secure-route", authMiddleware , AuthController.secureRoute);

// Protected routes
router.post("/logout", authMiddleware, AuthController.logout);

export default router;