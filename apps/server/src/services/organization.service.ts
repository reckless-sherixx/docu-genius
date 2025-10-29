import prisma from "../lib/prisma.js";
import { generateToken } from "../lib/helper.js";

export class OrganizationService {
    // Create Organization
    static async createOrganization(userId: string, name: string, description?: string) {
        
        const organization_pin = Math.floor(100000 + Math.random() * 900000);

        const organization = await prisma.organization.create({
            data: {
                name,
                description,
                organization_pin,
                organization_head_id: userId,
            },
        });

        // Add creator as owner in members
        await prisma.organizationMember.create({
            data: {
                organization_id: organization.id,
                user_id: userId,
                role: "OWNER",
            },
        });

        return organization;
    }

    // Get User's Organizations
    static async getUserOrganizations(userId: string) {
        const memberships = await prisma.organizationMember.findMany({
            where: { user_id: userId },
            include: {
                organization: true,
            },
        });

        return memberships.map((membership) => ({
            ...membership.organization,
            role: membership.role,
            joined_at: membership.joined_at,
        }));
    }

    // Get Organization Details
    static async getOrganizationDetails(orgId: string, userId: string) {
        // Check if user is member
        const membership = await prisma.organizationMember.findUnique({
            where: {
                organization_id_user_id: {
                    organization_id: orgId,
                    user_id: userId,
                },
            },
        });

        if (!membership) {
            throw new Error("You are not a member of this organization");
        }

        const organization = await prisma.organization.findUnique({
            where: { id: orgId },
            include: {
                organization_head: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });

        return {
            ...organization,
            userRole: membership.role,
        };
    }

    // Check if user has permission (Owner or Admin)
    static async checkPermission(orgId: string, userId: string, allowedRoles: string[] = ["OWNER", "ADMIN"]) {
        const membership = await prisma.organizationMember.findUnique({
            where: {
                organization_id_user_id: {
                    organization_id: orgId,
                    user_id: userId,
                },
            },
        });

        if (!membership || !allowedRoles.includes(membership.role)) {
            throw new Error("You don't have permission to perform this action");
        }

        return membership;
    }

    // Invite Member
    static async inviteMember(orgId: string, userId: string, email: string, role: string = "MEMBER") {
        // Check if user is owner or admin
        await this.checkPermission(orgId, userId);

        // Check if user already exists in organization
        const invitedUser = await prisma.user.findUnique({
            where: { email },
        });

        if (invitedUser) {
            const existingMember = await prisma.organizationMember.findUnique({
                where: {
                    organization_id_user_id: {
                        organization_id: orgId,
                        user_id: invitedUser.id,
                    },
                },
            });

            if (existingMember) {
                throw new Error("User is already a member of this organization");
            }
        }

        // Check for existing pending invite
        const existingInvite = await prisma.organizationInvite.findFirst({
            where: {
                organization_id: orgId,
                email,
                status: "PENDING",
            },
        });

        if (existingInvite) {
            throw new Error("An invite has already been sent to this email");
        }

        // Generate invite token
        const invitation_token = generateToken(32);

        // Create invite (expires in 7 days)
        const invite = await prisma.organizationInvite.create({
            data: {
                organization_id: orgId,
                email,
                invited_by: userId,
                role: role as any,
                invitation_token,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
            include: {
                organization: true,
                inviter: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return invite;
    }

    // Get Invite Details
    static async getInviteDetails(token: string) {
        const invite = await prisma.organizationInvite.findUnique({
            where: { invitation_token: token },
            include: {
                organization: true,
                inviter: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!invite) {
            throw new Error("Invite not found");
        }

        if (invite.status !== "PENDING") {
            throw new Error(`This invite has been ${invite.status.toLowerCase()}`);
        }

        if (invite.expires_at < new Date()) {
            await prisma.organizationInvite.update({
                where: { id: invite.id },
                data: { status: "EXPIRED" },
            });
            throw new Error("This invite has expired");
        }

        return invite;
    }

    // Accept Invite
    static async acceptInvite(token: string, userId: string, userEmail: string) {
        const invite = await prisma.organizationInvite.findUnique({
            where: { invitation_token: token },
        });

        if (!invite) {
            throw new Error("Invite not found");
        }

        if (invite.status !== "PENDING") {
            throw new Error("This invite has already been processed");
        }

        if (invite.expires_at < new Date()) {
            await prisma.organizationInvite.update({
                where: { id: invite.id },
                data: { status: "EXPIRED" },
            });
            throw new Error("This invite has expired");
        }

        if (invite.email !== userEmail) {
            throw new Error("This invite was sent to a different email address");
        }

        // Add user to organization
        await prisma.organizationMember.create({
            data: {
                organization_id: invite.organization_id,
                user_id: userId,
                role: invite.role,
            },
        });

        // Update invite status
        await prisma.organizationInvite.update({
            where: { id: invite.id },
            data: { status: "ACCEPTED" },
        });

        return true;
    }

    // Reject Invite
    static async rejectInvite(token: string) {
        const invite = await prisma.organizationInvite.findUnique({
            where: { invitation_token: token },
        });

        if (!invite) {
            throw new Error("Invite not found");
        }

        await prisma.organizationInvite.update({
            where: { id: invite.id },
            data: { status: "DECLINED" },
        });

        return true;
    }

    // Remove Member
    static async removeMember(orgId: string, userId: string, memberId: string) {
        await this.checkPermission(orgId, userId);

        // Check member to remove
        const memberToRemove = await prisma.organizationMember.findUnique({
            where: {
                organization_id_user_id: {
                    organization_id: orgId,
                    user_id: memberId,
                },
            },
        });

        if (!memberToRemove) {
            throw new Error("Member not found");
        }

        if (memberToRemove.role === "OWNER") {
            throw new Error("Cannot remove the organization owner");
        }

        await prisma.organizationMember.delete({
            where: {
                id: memberToRemove.id,
            },
        });

        return true;
    }

    // Join with PIN
    static async joinWithPin(userId: string, pin: number) {
        const organization = await prisma.organization.findFirst({
            where: { organization_pin: pin },
        });

        if (!organization) {
            throw new Error("Organization not found with this PIN");
        }

        // Check if already a member
        const existingMember = await prisma.organizationMember.findUnique({
            where: {
                organization_id_user_id: {
                    organization_id: organization.id,
                    user_id: userId,
                },
            },
        });

        if (existingMember) {
            throw new Error("You are already a member of this organization");
        }

        // Add user to organization
        await prisma.organizationMember.create({
            data: {
                organization_id: organization.id,
                user_id: userId,
                role: "MEMBER",
            },
        });

        return organization;
    }
}
