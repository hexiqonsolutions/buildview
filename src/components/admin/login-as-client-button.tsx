"use client";

import { useState, useTransition } from "react";
import { LogIn, Loader2 } from "lucide-react";
import { loginAsClientUser } from "@/lib/actions/impersonate";
import { Button } from "@/components/ui/button";

export function LoginAsClientButton({ userId }: { userId: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!userId) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-9"
        disabled
        title="Add an active portal user to this client first"
      >
        <LogIn className="mr-2 h-4 w-4" />
        No portal user
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        size="sm"
        className="ops-btn-primary h-9"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await loginAsClientUser(userId);
            if (result?.error) setError(result.error);
          });
        }}
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <LogIn className="mr-2 h-4 w-4" />
        )}
        Login As Client
      </Button>
      {error && (
        <p role="alert" className="max-w-xs text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
