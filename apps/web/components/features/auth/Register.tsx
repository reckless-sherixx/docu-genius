"use client";

import React, { useEffect, useActionState } from "react";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { registerAction } from "@/actions/auth-actions";
import { toast } from "sonner";
import CloudIcon from "@/public/Cloud.png"
import { IconBrandGoogle, IconBrandFacebook, IconBrandX } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";

type FormState = {
  status: number;
  message: string;
  errors: Record<string, string>;
}

export default function Register() {
  const initialState: FormState = {
    message: "",
    status: 0,
    errors: {},
  }
  const [formState, formAction, isPending] = useActionState(registerAction, initialState);

  useEffect(() => {
    if (formState.status === 404 || formState.status === 400) {
      toast.error(formState.message);
    } else if (formState.status === 200) {
      toast.success(formState.message);
    }
  }, [formState]);

  return (
    <div className="w-full max-w-md mt-14 mr-20">
      {/* Header */}
      <div className="mb-10">
        <Image src={CloudIcon} alt="Cloud Icon" className="w-11 h-6 mb-2" />
        <h1 className="text-4xl font-bold text-neutral-900 mb-3">Join DocuGenius</h1>
        <p className="text-sm text-neutral-500 leading-relaxed">
          Access your <span className="text-[rgb(132,42,59)]">Documents, Pdf and Projects</span> anytime,<br />
          anywhere - and keep everything flowing in one place.
        </p>
      </div>

      <form action={formAction}>
        {/* Name Field */}
        <div className="mb-4">
          <Label htmlFor="name" className="text-sm font-semibold text-neutral-900 mb-2 block">
            Full name
          </Label>
          <Input
            placeholder=""
            name="name"
            disabled={isPending}
            className="h-12 bg-white border border-neutral-200 rounded-lg focus:border-[rgb(132,42,59)] focus:ring-1 focus:ring-[rgb(132,42,59)]"
          />
          {formState.errors?.name && (
            <span className="text-red-500 text-xs mt-1 block">{formState.errors.name}</span>
          )}
        </div>

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
          <Label htmlFor="confirmPassword" className="text-sm font-semibold text-neutral-900 mb-2 block">
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
          {isPending ? "Creating account..." : "Get Started"}
        </button>

        {/* Divider */}
        <div className="relative my-7">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-white text-neutral-400 font-light">or continue with</span>
          </div>
        </div>

        {/* Social Login Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            type="button"
            className="w-14 h-14 flex items-center justify-center bg-white border border-neutral-200 rounded-full hover:bg-neutral-50 hover:border-neutral-300 transition-all"
          >
            <IconBrandGoogle className="w-6 h-6 text-neutral-700" />
          </button>
          <button
            type="button"
            className="w-14 h-14 flex items-center justify-center bg-white border border-neutral-200 rounded-full hover:bg-neutral-50 hover:border-neutral-300 transition-all"
          >
            <IconBrandFacebook className="w-6 h-6 text-blue-600" />
          </button>
          <button
            type="button"
            className="w-14 h-14 flex items-center justify-center bg-white border border-neutral-200 rounded-full hover:bg-neutral-50 hover:border-neutral-300 transition-all"
          >
            <IconBrandX className="w-6 h-6 text-neutral-900" />
          </button>
        </div>

        {/* Login Link */}
        <p className="text-center text-sm text-neutral-600 mt-8 mb-3">
          Already have an account?{" "}
          <Link href="/login" className="text-[rgb(132,42,59)] font-semibold hover:underline">
            Login Now
          </Link>
        </p>
      </form>
    </div>
  );
}