"use client";

import React, { useEffect, useActionState } from "react";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { registerAction } from "@/actions/auth-actions";
import { toast } from "sonner";

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
    <form action={formAction}>
      <div className="mt-4">
        <Label htmlFor="name">Name</Label>
        <Input placeholder="Type your name" name="name" disabled={isPending} />
        {formState.errors?.name && (
          <span className="text-red-400 text-sm">{formState.errors.name}</span>
        )}
      </div>
      <div className="mt-4">
        <Label htmlFor="email">Email</Label>
        <Input placeholder="Type your email" name="email" disabled={isPending} />
        {formState.errors?.email && (
          <span className="text-red-400 text-sm">{formState.errors.email}</span>
        )}
      </div>
      <div className="mt-4">
        <Label htmlFor="password">Password</Label>
        <Input
          type="password"
          placeholder="Type your password"
          name="password"
          disabled={isPending}
        />
        {formState.errors?.password && (
          <span className="text-red-400 text-sm">{formState.errors.password}</span>
        )}
      </div>
      <div className="mt-4">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          type="password"
          placeholder="Confirm your password"
          name="confirmPassword"
          disabled={isPending}
        />
        {formState.errors?.confirmPassword && (
          <span className="text-red-400 text-sm">{formState.errors.confirmPassword}</span>
        )}
      </div>
      <div className="mt-4">
        <SubmitButton isPending={isPending} />
      </div>
    </form>
  );
}