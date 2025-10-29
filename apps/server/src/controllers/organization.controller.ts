import { Request, Response } from "express";
import { OrganizationService } from "../services/organization.service.js";

interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        name: string;
    };
}

export class OrganizationController {
    // Create Organization
    static async createOrganization(req: AuthRequest, res: Response) {
        try {
            const { name, description } = req.body;
            const userId = req.user?.id;

            if (!name) {
                return res.status(400).json({
                    status: 400,
                    message: "Organization name is required",
                });
            }

            const organization = await OrganizationService.createOrganization(
                userId!,
                name,
                description
            );

            return res.status(201).json({
                status: 201,
                message: "Organization created successfully",
                data: organization,
            });
        } catch (error: any) {
            return res.status(500).json({
                status: 500,
                message: error.message,
            });
        }
    }

    // Get User's Organizations
    static async getUserOrganizations(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;

            const organizations = await OrganizationService.getUserOrganizations(userId!);

            return res.json({
                status: 200,
                data: organizations,
            });
        } catch (error: any) {
            return res.status(500).json({
                status: 500,
                message: error.message,
            });
        }
    }

    // Get Organization Details
    static async getOrganizationDetails(req: AuthRequest, res: Response) {
        try {
            const { orgId } = req.params;
            const userId = req.user?.id;

            if (!orgId || !userId) {
                return res.status(400).json({
                    status: 400,
                    message: "Missing required parameters",
                });
            }

            const organization = await OrganizationService.getOrganizationDetails(orgId, userId);

            return res.json({
                status: 200,
                data: organization,
            });
        } catch (error: any) {
            const statusCode = error.message.includes("not a member") ? 403 : 500;
            return res.status(statusCode).json({
                status: statusCode,
                message: error.message,
            });
        }
    }

    // Invite Member
    static async inviteMember(req: AuthRequest, res: Response) {
        try {
            const { orgId } = req.params;
            const { email, role = "MEMBER" } = req.body;
            const userId = req.user?.id;

            if (!orgId || !userId || !email) {
                return res.status(400).json({
                    status: 400,
                    message: "Missing required parameters",
                });
            }

            const invite = await OrganizationService.inviteMember(orgId, userId, email, role);

            return res.status(201).json({
                status: 201,
                message: "Invite sent successfully",
                data: {
                    ...invite,
                    invite_link: `${process.env.FRONTEND_URL}/invite/${invite.invitation_token}`,
                },
            });
        } catch (error: any) {
            const statusCode = error.message.includes("permission") ? 403 :
                error.message.includes("already") ? 400 : 500;
            return res.status(statusCode).json({
                status: statusCode,
                message: error.message,
            });
        }
    }

    // Get Invite Details (for accept/reject page)
    static async getInviteDetails(req: Request, res: Response) {
        try {
            const { token } = req.params;

            if (!token) {
                return res.status(400).json({
                    status: 400,
                    message: "Invite token is required",
                });
            }

            const invite = await OrganizationService.getInviteDetails(token);

            return res.json({
                status: 200,
                data: invite,
            });
        } catch (error: any) {
            const statusCode = error.message.includes("not found") ? 404 : 400;
            return res.status(statusCode).json({
                status: statusCode,
                message: error.message,
            });
        }
    }

    // Accept Invite
    static async acceptInvite(req: AuthRequest, res: Response) {
        try {
            const { token } = req.params;
            const userId = req.user?.id;
            const userEmail = req.user?.email;

            if (!token || !userId || !userEmail) {
                return res.status(400).json({
                    status: 400,
                    message: "Missing required parameters",
                });
            }

            await OrganizationService.acceptInvite(token, userId, userEmail);

            return res.json({
                status: 200,
                message: "You have successfully joined the organization",
            });
        } catch (error: any) {
            const statusCode = error.message.includes("not found") ? 404 :
                error.message.includes("different email") ? 403 : 400;
            return res.status(statusCode).json({
                status: statusCode,
                message: error.message,
            });
        }
    }

    // Reject Invite
    static async rejectInvite(req: Request, res: Response) {
        try {
            const { token } = req.params;

            if (!token) {
                return res.status(400).json({
                    status: 400,
                    message: "Invite token is required",
                });
            }

            await OrganizationService.rejectInvite(token);

            return res.json({
                status: 200,
                message: "Invite declined",
            });
        } catch (error: any) {
            const statusCode = error.message.includes("not found") ? 404 : 500;
            return res.status(statusCode).json({
                status: statusCode,
                message: error.message,
            });
        }
    }

    // Remove Member
    static async removeMember(req: AuthRequest, res: Response) {
        try {
            const { orgId, memberId } = req.params;
            const userId = req.user?.id;

            if (!orgId || !userId || !memberId) {
                return res.status(400).json({
                    status: 400,
                    message: "Missing required parameters",
                });
            }

            await OrganizationService.removeMember(orgId, userId, memberId);

            return res.json({
                status: 200,
                message: "Member removed successfully",
            });
        } catch (error: any) {
            const statusCode = error.message.includes("permission") ? 403 :
                error.message.includes("not found") ? 404 :
                    error.message.includes("Cannot remove") ? 400 : 500;
            return res.status(statusCode).json({
                status: statusCode,
                message: error.message,
            });
        }
    }

    // Join with PIN
    static async joinWithPin(req: AuthRequest, res: Response) {
        try {
            const { organization_pin } = req.body;
            const userId = req.user?.id;

            if (!organization_pin) {
                return res.status(400).json({
                    status: 400,
                    message: "Organization PIN is required",
                });
            }

            const organization = await OrganizationService.joinWithPin(userId!, parseInt(organization_pin));

            return res.json({
                status: 200,
                message: "Successfully joined the organization",
                data: organization,
            });
        } catch (error: any) {
            const statusCode = error.message.includes("not found") ? 404 :
                error.message.includes("already") ? 400 : 500;
            return res.status(statusCode).json({
                status: statusCode,
                message: error.message,
            });
        }
    }
}
