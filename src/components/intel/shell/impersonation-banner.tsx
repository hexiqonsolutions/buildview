"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function ImpersonationBanner() {
  const [impersonator, setImpersonator] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata;
      const name = meta?.impersonated_by_name ?? meta?.impersonated_by;
      if (name) setImpersonator(String(name));
    });
  }, []);

  if (!impersonator) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="mx-auto flex max-w-4xl items-center justify-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span>
          Viewing client portal as impersonated session (started by <strong>{impersonator}</strong>)
        </span>
        <Button variant="outline" size="sm" className="ml-2 h-7" asChild>
          <Link href="/admin/clients">Return to admin</Link>
        </Button>
      </div>
    </div>
  );
}
