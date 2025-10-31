import prisma from "../lib/prisma.js";
import { createOrganizationInput } from "../schemas/organization.schema.js";

export class OrganizationService {
    static async getUserOrganizations(userId: string) {
        try {
            const memberships = await prisma.organizationMember.findMany({
                where: {
                    user_id: userId,
                },
                include: {
                    organization: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            organization_pin: true,
                            organization_head_id: true,
                            created_at: true,
                        }
                    }
                }
            });

            return memberships.map(membership => ({
                ...membership.organization,
                role: membership.role,
                joined_at: membership.joined_at,
            }));
        } catch (error) {
            console.error('❌ Failed to fetch organizations:', error);
            throw error;
        }
    }

    static async createOrganization(data: createOrganizationInput & { organization_head_id: string }) {
        try {
            // Generate a random 6-digit organization PIN
            const organization_pin = Math.floor(100000 + Math.random() * 900000);

            // Create organization
            const organization = await prisma.organization.create({
                data: {
                    name: data.name,
                    description: data.description,
                    organization_head_id: data.organization_head_id,
                    organization_pin,
                }
            });

            // Add the creator as an OWNER member
            await prisma.organizationMember.create({
                data: {
                    organization_id: organization.id,
                    user_id: data.organization_head_id,
                    role: 'OWNER',
                }
            });

            return {
                id: organization.id,
                name: organization.name,
                description: organization.description,
                organization_pin: organization.organization_pin,
                created_at: organization.created_at,
            };
        } catch (error) {
            console.error('❌ Failed to create organization:', error);
            throw error;
        }
    }

    static async joinOrganizationWithPin(userId: string, pin: number) {
        try {
            // Find organization by PIN
            const organization = await prisma.organization.findFirst({
                where: {
                    organization_pin: pin,
                }
            });

            if (!organization) {
                throw new Error('Invalid organization PIN');
            }

            // Check if user is already a member
            const existingMember = await prisma.organizationMember.findUnique({
                where: {
                    organization_id_user_id: {
                        organization_id: organization.id,
                        user_id: userId,
                    }
                }
            });

            if (existingMember) {
                throw new Error('You are already a member of this organization');
            }

            // Add user as a MEMBER
            const member = await prisma.organizationMember.create({
                data: {
                    organization_id: organization.id,
                    user_id: userId,
                    role: 'MEMBER',
                }
            });

            return {
                id: organization.id,
                name: organization.name,
                description: organization.description,
                role: member.role,
                joined_at: member.joined_at,
            };
        } catch (error) {
            console.error('❌ Failed to join organization:', error);
            throw error;
        }
    }
}