"use client"

import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import Link from "next/link";
import CloudIcon from "@/public/Cloud.png"
import { IconBrandGoogle, IconBrandFacebook, IconBrandX } from "@tabler/icons-react";
import Image from "next/image";
import { useActionState } from "react";
import { loginAction } from "@/actions/auth-actions";

export default function Login() {
  const initialState = {
    message: "",
    status: 0,
    errors: {}, 
  }
  const [formState, formAction , isPending] = useActionState(loginAction , initialState)

  return (
    <div className="w-full max-w-md mt-8 mr-20">
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

        {/* Email */}
        <div>
          <Label htmlFor="email" className="text-sm font-semibold text-neutral-900 mb-2 block">
            Email address
          </Label>
          <Input 
            id="email"
            name="email" 
            type="email"
            placeholder="" 
            className="h-12 bg-white border border-neutral-200 rounded-lg mb-5 focus:border-[rgb(132,42,59)] focus:ring-1 focus:ring-[rgb(132,42,59)]"
          />
        </div>

        {/* Password */}
        <div>
          <Label htmlFor="password" className="text-sm font-semibold text-neutral-900 mb-2 block">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            name="password"
            placeholder=""
            className="h-12 bg-white border border-neutral-200 rounded-lg mb-5 focus:border-[rgb(132,42,59)] focus:ring-1 focus:ring-[rgb(132,42,59)]"
          />
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="remember"
              className="w-4 h-4 rounded border-neutral-300 bg-white text-[rgb(132,42,59)] focus:ring-[rgb(132,42,59)] focus:ring-2 cursor-pointer accent-[rgb(132,42,59)]"
            />
            <Label htmlFor="remember" className="text-sm text-neutral-600 font-normal cursor-pointer">
              Remember me
            </Label>
          </div>
          <Link href="/forgot-password" className="text-sm text-[rgb(132,42,59)] font-medium hover:underline">
            Forgot password?
          </Link>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full h-12 bg-[rgb(132,42,59)] hover:bg-[rgb(112,32,49)] text-white font-semibold rounded-lg transition-colors mt-6"
        >
          Get Started
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
        <p className="text-center text-sm text-neutral-600 mt-8">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[rgb(132,42,59)] font-semibold hover:underline">
            Register Now
          </Link>
        </p>
      </form>
    </div>
  )
}
