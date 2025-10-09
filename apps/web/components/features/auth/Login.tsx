"use client"

import { SubmitButton } from "@/components/shared/SubmitButton";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import Link from "next/link";

export default function Login() {
  return (
    <form>
      <div className="mt-4">
        <Label htmlFor="email">Email</Label>
        <Input placeholder="Type your email" name="email" />
        <span className="text-red-400">email</span>
      </div>
      <div className="mt-4">
        <Label htmlFor="password">Password</Label>
        <Input
          type="password"
          placeholder="Type your password"
          name="password"
        />
        <div className="text-right font-bold">
          <Link href="/forgot-password">Forgot Password?</Link>
        </div>
        <span className="text-red-400">error</span>
      </div>
      <div className="mt-4">
        <SubmitButton />
      </div>
    </form>
  )
}
