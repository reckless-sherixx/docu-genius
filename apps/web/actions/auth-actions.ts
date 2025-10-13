"use server"

import { REGISTER_URL } from "@/lib/api-endpoints"
import axios, { AxiosError } from "axios"

type FormState = {
    status: number;
    message: string;
    errors: Record<string, string>;
}

export async function registerAction(prevState: FormState, formData: FormData): Promise<FormState> {
    try {
        const payload = {
            name: formData.get("name"),
            email: formData.get("email"),
            password: formData.get("password"),
            confirmPassword: formData.get("confirmPassword"),
        };

        const { data } = await axios.post(REGISTER_URL, payload);

        return {
            status: 200,
            message: data?.message || "Registration successful! Please check your email to verify your account.",
            errors: {},
        };
    } catch (error) {
        if (error instanceof AxiosError) {
            const status = error.response?.status || 500;
            const responseData = error.response?.data;

            if (status === 400 || status === 422) {
                const backendErrors = responseData?.errors || [];
                const errors: Record<string, string> = {};

                if (Array.isArray(backendErrors)) {
                    backendErrors.forEach((err: any) => {
                        errors[err.field] = err.message;
                    });
                }

                return {
                    status,
                    message: responseData?.message || "Validation failed",
                    errors,
                };
            }

            return {
                status,
                message: responseData?.message || "Something went wrong",
                errors: {},
            };
        }

        return {
            status: 500,
            message: "Network error. Please try again.",
            errors: {},
        };
    }
}