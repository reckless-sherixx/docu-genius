"use server"

import { REGISTER_URL } from "@/lib/api-endpoints"
import axios from "axios"


export async function registerAction(prevState: any, formData: FormData) {
    try {
        await axios.post(REGISTER_URL, {
            name: formData.get("name"),
            email: formData.get("email"),
            password: formData.get("password"),
            confirmPassword: formData.get("confirmPassword"),
        })
    } catch (error: any) {
        return {
            ...prevState, error: error.response?.data?.message || 'An error occurred. Please try again.'
        }
    }
}