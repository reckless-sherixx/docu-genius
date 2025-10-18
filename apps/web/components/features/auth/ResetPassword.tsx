"use client"

import Image from "next/image";
import InformationGraphics2 from "@/public/InformationGraphics2.png";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useActionState, useEffect } from "react";
import { FormState, resetPasswordAction } from "@/actions/auth-actions";
import { toast } from "sonner";

export default function ResetPassword() {
    const initialState: FormState = {
        message: "",
        status: 0,
        errors: {},
    }
    const [formState, formAction, isPending] = useActionState(resetPasswordAction, initialState);

    useEffect(() => {
        if (formState.status === 404 || formState.status === 400) {
            toast.error(formState.message);
        } else if (formState.status === 200) {
            toast.success(formState.message);
        }
    }, [formState]);

    return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 lg:p-2">
            {/* Container with Background Image */}
            <div className="relative w-full max-w-7xl h-[900px] lg:h-[700px] rounded-2xl overflow-hidden shadow-2xl">
                {/* Background Image */}
                <Image
                    src={InformationGraphics2}
                    alt="Information Graphics"
                    fill
                    className="fill"
                    priority
                />

                {/* Text Overlay on Background */}
                <div className="absolute bottom-10 right-10 text-white text-right">
                    <p className="text-sm mb-1">You can easily</p>
                    <h2 className="text-4xl font-bold">Personalise</h2>
                </div>

                {/* Modal Dialog - Positioned on the background */}
                <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative">
                        {/* Close Button */}
                        <button
                            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-neutral-200 hover:bg-neutral-300 transition-colors"
                            onClick={() => window.history.back()}
                        >
                            <IconX className="w-5 h-5 text-neutral-600" />
                        </button>

                        {/* Header */}
                        <div className="mb-6 text-center">
                            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Reset Password</h1>
                            <p className="text-sm text-neutral-500">Don't worry, We are here to help.</p>
                        </div>

                        {/* Form */}
                        <form action={formAction} className="space-y-4">
                            {/* Email Field */}
                            <div className="mb-4">
                                <Label htmlFor="email" className="text-sm font-semibold text-neutral-900 mb-2 block">
                                    Email address
                                </Label>
                                <Input
                                    placeholder=""
                                    name="email"
                                    disabled={isPending}
                                    className="h-12 bg-white border border-neutral-200 rounded-lg focus:border-[rgb(132,42,59)] focus:ring-1 focus:ring-[rgb(132,42,59)]"
                                />
                                {formState.errors?.email && (
                                    <span className="text-red-500 text-xs mt-1 block">{formState.errors.email}</span>
                                )}
                            </div>

                            {/* Password Field */}
                            <div className="mb-4">
                                <Label htmlFor="password" className="text-sm font-semibold text-neutral-900 mb-2 block">
                                    Password
                                </Label>
                                <Input
                                    type="password"
                                    placeholder=""
                                    name="password"
                                    disabled={isPending}
                                    className="h-12 bg-white border border-neutral-200 rounded-lg focus:border-[rgb(132,42,59)] focus:ring-1 focus:ring-[rgb(132,42,59)]"
                                />
                                {formState.errors?.password && (
                                    <span className="text-red-500 text-xs mt-1 block">{formState.errors.password}</span>
                                )}
                            </div>

                            {/* Confirm Password Field */}
                            <div className="mb-4">
                                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-neutral-900 block">
                                    Confirm Password
                                </Label>
                                <Input
                                    type="password"
                                    placeholder=""
                                    name="confirmPassword"
                                    disabled={isPending}
                                    className="h-12 bg-white border border-neutral-200 rounded-lg focus:border-[rgb(132,42,59)] focus:ring-1 focus:ring-[rgb(132,42,59)]"
                                />
                                {formState.errors?.confirmPassword && (
                                    <span className="text-red-500 text-xs mt-1 block">{formState.errors.confirmPassword}</span>
                                )}
                            </div>
                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full h-12 bg-[rgb(132,42,59)] hover:bg-[rgb(112,32,49)] text-white font-semibold rounded-lg transition-colors mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isPending ? "Resetting Password..." : "Get Started"}
                            </button>
                            {/* Login Link */}
                            <p className="text-center text-sm text-neutral-600 mt-4">
                                Go back to login page ?{" "}
                                <Link href="/login" className="text-[rgb(132,42,59)] font-semibold hover:underline">
                                    Login Now
                                </Link>
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
