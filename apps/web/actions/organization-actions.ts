"use server";

import { API_ENDPOINTS } from "@/lib/api-endpoints";

interface Organization {
    id: string;
    name: string;
    description: string | null;
    organization_pin: number;
    organization_head_id: string;
    role?: string;
    joined_at?: Date;
}

export async function getUserOrganizations(token: string) {
    try {
        const response = await fetch(API_ENDPOINTS.ORGANIZATIONS, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        });

        if (!response.ok) {
            return { organizations: [], error: "Failed to fetch organizations" };
        }

        const data = await response.json();
        return { organizations: data.data as Organization[], error: null };
    } catch (error) {
        return { organizations: [], error: "An error occurred" };
    }
}

export async function createOrganization(token: string, name: string, description?: string) {
    try {
        console.log("API_ENDPOINTS.ORGANIZATIONS:", API_ENDPOINTS.ORGANIZATIONS);
        console.log("Token:", token ? "Present" : "Missing");

        const response = await fetch(API_ENDPOINTS.ORGANIZATIONS, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ name, description }),
        });

        const data = await response.json();
        console.log("Response status:", response.status);
        console.log("Response data:", data);

        if (!response.ok) {
            return { success: false, message: data.message || "Failed to create organization" };
        }

        return { success: true, data: data.data, message: data.message };
    } catch (error: any) {
        console.error("Error in createOrganization:", error);
        return { success: false, message: error.message || "An error occurred" };
    }
}

export async function joinOrganizationWithPin(token: string, pin: string) {
    try {
        const response = await fetch(`${API_ENDPOINTS.ORGANIZATIONS}/join`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ organization_pin: pin }),
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, message: data.message || "Failed to join organization" };
        }

        return { success: true, data: data.data, message: data.message };
    } catch (error) {
        return { success: false, message: "An error occurred" };
    }
}

export async function getOrganizationDetails(token: string, orgId: string) {
    try {
        const response = await fetch(`${API_ENDPOINTS.ORGANIZATIONS}/${orgId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        });

        if (!response.ok) {
            return { organization: null, error: "Failed to fetch organization details" };
        }

        const data = await response.json();
        return { organization: data.data, error: null };
    } catch (error) {
        return { organization: null, error: "An error occurred" };
    }
}

export async function inviteMember(token: string, orgId: string, email: string, role: string = "MEMBER") {
    try {
        const response = await fetch(`${API_ENDPOINTS.ORGANIZATIONS}/${orgId}/invite`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ email, role }),
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, message: data.message || "Failed to send invite" };
        }

        return { success: true, data: data.data, message: data.message };
    } catch (error) {
        return { success: false, message: "An error occurred" };
    }
}
