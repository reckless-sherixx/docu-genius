import { z } from "zod";

// Register schema
export const registerSchema = z.object({
    name: z.string({message:"Name is required"}).min(2, "Name must be at least 2 characters long"),
    email: z.string({message:"Email is required"}).email("Invalid email format"),
    password: z.string({message:"Password is required"}).min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string({message:"Confirm Password is required"})
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

// Login schema
export const loginSchema = z.object({
    email: z.string({message:"Email is required"}).email("Invalid email format"),
    password: z.string({message:"Password is required"}).min(1, "Password is required"),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;