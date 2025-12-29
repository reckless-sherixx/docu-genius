import { Router } from 'express';
import { OrganizationController } from '../controllers/organization.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router: Router = Router();

router.get("/", authMiddleware, OrganizationController.getUserOrganizations);
router.get("/:organizationId/members", authMiddleware, OrganizationController.getOrganizationMembers);
router.post("/", authMiddleware, OrganizationController.createOrganization);
router.post("/join", authMiddleware, OrganizationController.joinOrganization);
router.patch("/:organizationId/members/:memberId/role", authMiddleware, OrganizationController.updateMemberRole);
router.delete("/:organizationId/members/:memberId", authMiddleware, OrganizationController.removeMember);


export default router;
