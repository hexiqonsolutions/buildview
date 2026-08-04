import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-zinc-500">Loading signup…</div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
