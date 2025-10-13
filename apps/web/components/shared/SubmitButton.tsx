"use client";
import { useFormStatus } from "react-dom";
import { Button } from "@workspace/ui/components/button";

interface SubmitButtonProps {
  isPending?: boolean;
  text?: string;
  loadingText?: string;
}

export function SubmitButton({ 
  isPending: externalPending, 
  text = "Submit",
  loadingText = "Processing.."
}: SubmitButtonProps) {
  const { pending: internalPending } = useFormStatus();
  
  const pending = externalPending !== undefined ? externalPending : internalPending;
  
  return (
    <Button className="w-full" disabled={pending}>
      {pending ? loadingText : text}
    </Button>
  );
}