import z from "zod";

export const createOrganizationSchema = z.object({
    name: z.string().min(2).max(191),
    description: z.string().max(500).optional(),
    organization_pin: z.number().min(1000).max(9999),
});

export type createOrganizationInput = z.infer<typeof createOrganizationSchema>;
