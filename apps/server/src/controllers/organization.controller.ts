import { Request, Response } from "express";
import { createOrganizationSchema } from "../schemas/organization.schema.js";
import { OrganizationService } from "../services/organization.service.js";


export class OrganizationController {
    static async getUserOrganizations(req: Request, res: Response) {
        try {
            const userId = req.userId || req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated',
                });
            }

            const organizations = await OrganizationService.getUserOrganizations(userId);

            res.status(200).json({
                success: true,
                data: organizations,
            });
        } catch (error) {
            console.error('Error fetching organizations:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    static async getOrganizationMembers(req: Request, res: Response) {
        try {
            const { organizationId } = req.params;
            const userId = req.userId || req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated',
                });
            }

            if (!organizationId) {
                return res.status(400).json({
                    success: false,
                    message: 'Organization ID is required',
                });
            }

            const members = await OrganizationService.getOrganizationMembers(organizationId, userId);

            res.status(200).json({
                success: true,
                data: members,
            });
        } catch (error: any) {
            console.error('Error fetching organization members:', error);
            return res.status(error.message?.includes('not a member') ? 403 : 500).json({
                success: false,
                message: error.message || 'Internal server error',
            });
        }
    }

    static async createOrganization(req: Request, res: Response) {
        try { 
            const validatedData = createOrganizationSchema.parse(req.body);

            const userId = req.userId || req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated',
                });
            }

            // Create organization with the authenticated user as the head
            const organization = await OrganizationService.createOrganization({
                ...validatedData,
                organization_head_id: userId,
            });

            res.status(201).json({
                success: true,
                message: 'Organization created successfully',
                data: organization,
            });
        } catch (error) {
            console.error('Error creating organization:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
            });
        }
    }

    static async joinOrganization(req: Request, res: Response) {
        try {
            const { pin } = req.body;

            if (!pin) {
                return res.status(400).json({
                    success: false,
                    message: 'Organization PIN is required',
                });
            }

            const userId = req.userId || req.user?.id;
            
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated',
                });
            }

            const organization = await OrganizationService.joinOrganizationWithPin(
                userId, 
                parseInt(pin)
            );

            res.status(200).json({
                success: true,
                message: 'Successfully joined organization',
                data: organization,
            });
        } catch (error: any) {
            console.error('Error joining organization:', error);
            return res.status(400).json({
                success: false,
                message: error.message || 'Failed to join organization',
            });
        }
    }
}