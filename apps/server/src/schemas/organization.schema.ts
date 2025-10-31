import z from "zod";

export const createOrganizationSchema = z.object({
    name: z.string().min(2).max(191),
    description: z.string().max(500).optional(),
});

export type createOrganizationInput = z.infer<typeof createOrganizationSchema>;
