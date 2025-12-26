import { Router } from 'express';
import { OrganizationController } from '../controllers/organization.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router: Router = Router();

router.get("/", authMiddleware, OrganizationController.getUserOrganizations);
router.get("/:organizationId/members", authMiddleware, OrganizationController.getOrganizationMembers);
router.post("/", authMiddleware, OrganizationController.createOrganization);
router.post("/join", authMiddleware, OrganizationController.joinOrganization);


export default router;
