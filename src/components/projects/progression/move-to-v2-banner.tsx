"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { moveProjectToV2 } from "@/lib/actions/checklist";

/** Offer staff / Client Admin the new checklist (Inside, Outside, Site) on a v1 project. */
export function MoveToV2Banner({ projectId, onMoved }: { projectId: string; onMoved: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className="rounded-2xl border border-[#4d7c0f]/30 bg-[#4d7c0f]/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <p className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-white">
            <Sparkles className="h-4 w-4 text-[#4d7c0f]" aria-hidden /> New, simpler checklist
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Inside (each floor), Outside (each building) and Site works, with a full waterproofing phase, photos on Start and
            Done, and one button per step. Work already recorded carries over.
          </p>
        </div>
        {!confirm ? (
          <Button type="button" className="h-11 bg-[#4d7c0f] text-white hover:bg-[#3f6a0c]" onClick={() => setConfirm(true)}>
            Switch this project
          </Button>
        ) : null}
      </div>
      {confirm ? (
        <div className="mt-3 rounded-xl bg-white p-3 text-sm dark:bg-slate-900">
          <p className="text-slate-700 dark:text-slate-300">
            Each floor moves to the new steps: steps that match keep their dates and verification; old checklists are
            archived, not deleted. Outside and Site lists start empty. The project % will change.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              className="h-11 bg-[#4d7c0f] text-white hover:bg-[#3f6a0c]"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const r = await moveProjectToV2(projectId);
                  if (!r.ok) setError(r.error);
                  else onMoved();
                })
              }
            >
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null} Switch now
            </Button>
            <Button type="button" variant="outline" className="h-11" onClick={() => setConfirm(false)} disabled={pending}>
              Not now
            </Button>
          </div>
          {error ? <p role="alert" className="mt-2 text-red-600">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
