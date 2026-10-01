"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { endImpersonation } from "@/lib/actions/impersonate";
import { IMPERSONATOR_COOKIE } from "@/lib/auth/impersonation";
import { Button } from "@/components/ui/button";

function readImpersonator(): string | null {
  const entry = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${IMPERSONATOR_COOKIE}=`));
  if (!entry) return null;
  const value = decodeURIComponent(entry.slice(IMPERSONATOR_COOKIE.length + 1));
  return value || null;
}

export function ImpersonationBanner() {
  const [impersonator, setImpersonator] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setImpersonator(readImpersonator());
  }, []);

  if (!impersonator) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span>
          Viewing the client portal as this client (started by <strong>{impersonator}</strong>)
        </span>
        <Button
          variant="outline"
          size="sm"
          className="ml-2 h-7"
          disabled={isPending}
          onClick={() => startTransition(() => endImpersonation())}
        >
          {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Return to admin
        </Button>
      </div>
    </div>
  );
}
