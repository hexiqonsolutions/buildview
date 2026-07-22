"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { syncUsersFromAuthAction } from "@/lib/actions/sync-users";
import { Button } from "@/components/ui/button";

export function SyncUsersFromAuthButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSync() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await syncUsersFromAuthAction();
      if (result.error) {
        setError(result.error);
        setMessage(
          `Auth users: ${result.authCount} · BuildView profiles: ${result.profileCount}`
        );
        router.refresh();
        return;
      }
      const parts: string[] = [];
      if (result.inserted > 0) parts.push(`added ${result.inserted}`);
      if (result.restored > 0) parts.push(`restored ${result.restored}`);
      setMessage(
        parts.length > 0
          ? `Synced: ${parts.join(", ")} (Auth ${result.authCount} · profiles ${result.profileCount}).`
          : `Auth ${result.authCount} · BuildView profiles ${result.profileCount}. Nothing new to import.`
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9"
        disabled={pending}
        onClick={handleSync}
      >
        {pending ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-1.5 h-4 w-4" />
        )}
        Sync from Supabase Auth
      </Button>
      {message && <p className="max-w-sm text-right text-xs text-emerald-600">{message}</p>}
      {error && <p className="max-w-sm text-right text-xs text-red-500">{error}</p>}
    </div>
  );
}
