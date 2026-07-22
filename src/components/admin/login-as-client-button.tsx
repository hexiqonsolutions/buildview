"use client";

import { useTransition } from "react";
import { LogIn, Loader2 } from "lucide-react";
import { loginAsClientUser } from "@/lib/actions/impersonate";
import { Button } from "@/components/ui/button";

export function LoginAsClientButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      className="ops-btn-primary h-9"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await loginAsClientUser(userId);
        })
      }
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <LogIn className="mr-2 h-4 w-4" />
      )}
      Login As Client
    </Button>
  );
}
