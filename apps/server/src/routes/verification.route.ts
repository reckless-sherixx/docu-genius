import { Router } from 'express'
import rateLimit from 'express-rate-limit';
import { verificationController } from '../controllers/verification.controller.js';

const router: Router = Router();

const verificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { success: false, message: 'Too many verification attempts, please try again later.' },
});

router.get("/verification/:documentNumber", verificationLimiter, (req, res) =>
    verificationController.verifyDocument(req, res)
);

export default router;