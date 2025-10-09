"use client";

import React, { useEffect } from "react";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { registerAction } from "@/actions/auth-actions";
import { useFormState } from "react-dom";
import { toast } from "sonner";

export default function Register() {
  const initialState = {
    message: "",
    status: 0,
    errors: {},
  }
  const [formState, formAction] = useFormState(registerAction, initialState);

  useEffect(() => {
    if (formState.status === 404) {
      toast.error(formState.message);
    } else if (formState.status === 200) {
      toast.success(formState.message);
    }
  }, [formState]);

  return (
    <form action={formAction}>
      <div className="mt-4">
        <Label htmlFor="name">Name</Label>
        <Input placeholder="Type your name" name="name" />
        <span className="text-red-400">{formState.errors?.name}</span>
      </div>
      <div className="mt-4">
        <Label htmlFor="email">Email</Label>
        <Input placeholder="Type your email" name="email" />
        <span className="text-red-400">{formState.errors?.email}</span>
      </div>
      <div className="mt-4">
        <Label htmlFor="password">Password</Label>
        <Input
          type="password"
          placeholder="Type your password"
          name="password"
        />
        <span className="text-red-400">{formState.errors?.password}</span>
      </div>
      <div className="mt-4">
        <Label htmlFor="confirm_password">Confirm Password</Label>
        <Input
          type="password"
          placeholder="Type your password"
          name="confirm_password"
        />
        <span className="text-red-400">{formState.errors?.confirm_password}</span>
      </div>
      <div className="mt-4">
        <SubmitButton />
      </div>
    </form>
  );
}