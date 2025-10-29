import { Router, type Router as ExpressRouter } from "express";
import { OrganizationController } from "../controllers/organization.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router: ExpressRouter = Router();

// All routes require authentication
router.use(authMiddleware);

// Create organization
router.post("/", OrganizationController.createOrganization);

// Get user's organizations
router.get("/", OrganizationController.getUserOrganizations);

// Get organization details
router.get("/:orgId", OrganizationController.getOrganizationDetails);

// Invite member
router.post("/:orgId/invite", OrganizationController.inviteMember);

// Remove member
router.delete("/:orgId/members/:memberId", OrganizationController.removeMember);

// Join with PIN
router.post("/join", OrganizationController.joinWithPin);

// Get invite details 
router.get("/invite/:token", OrganizationController.getInviteDetails);

// Accept invite
router.post("/invite/:token/accept", OrganizationController.acceptInvite);

// Reject invite
router.post("/invite/:token/reject", OrganizationController.rejectInvite);

export default router;
