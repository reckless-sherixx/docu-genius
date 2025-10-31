"use server"

import { ORGANIZATIONS_URL } from "@/lib/api-endpoints";

export async function getUserOrganizations(token: string) {
    try {
        const response = await fetch(ORGANIZATIONS_URL, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        });

        const data = await response.json();

        if (response.ok) {
            return {
                success: true,
                organizations: data.data || [],
            };
        } else {
            return {
                success: false,
                organizations: [],
                message: data.message,
            };
        }
    } catch (error) {
        console.error("Error fetching organizations:", error);
        return {
            success: false,
            organizations: [],
            message: "Failed to fetch organizations",
        };
    }
}

