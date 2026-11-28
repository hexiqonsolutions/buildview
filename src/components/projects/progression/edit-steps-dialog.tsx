"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Camera, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getEditableList, saveEditedList, type EditableList, type EditablePhase } from "@/lib/actions/checklist-edit";
import { cn } from "@/lib/utils";

type DraftStep = { key: string; id: string | null; title: string; photoExpected: boolean; used: boolean };
type DraftPhase = { number: number; name: string; weight: string; steps: DraftStep[] };

let seq = 0;
const k = () => `d${++seq}`;

function toDraft(phases: EditablePhase[]): DraftPhase[] {
  return phases.map((p) => ({
    number: p.number,
    name: p.name,
    weight: String(p.weight),
    steps: p.steps.map((s) => ({ key: k(), id: s.id, title: s.title, photoExpected: s.photoExpected, used: s.used })),
  }));
}

/**
 * Edit steps for this project (staff / Client Admin): rename, reorder, add,
 * remove (hidden when it has recorded work), photo expected, phase weights.
 */
export function EditStepsDialog({
  projectId,
  lists,
  open,
  onOpenChange,
  onSaved,
}: {
  projectId: string;
  lists: { templateId: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (message: string) => void;
}) {
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [list, setList] = useState<EditableList | null>(null);
  const [phases, setPhases] = useState<DraftPhase[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();

  useEffect(() => {
    if (open) setTemplateId((cur) => cur ?? lists[0]?.templateId ?? null);
  }, [open, lists]);

  useEffect(() => {
    if (!open || !templateId) return;
    let cancelled = false;
    setList(null);
    setError(null);
    getEditableList({ projectId, templateId }).then((r) => {
      if (cancelled) return;
      if (!r.ok) setError(r.error);
      else {
        setList(r.data);
        setPhases(toDraft(r.data.phases));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, projectId, templateId]);

  const weightSum = phases.reduce((s, p) => s + (Number(p.weight) || 0), 0);
  const weightOk = list ? Math.abs(weightSum - list.totalWeight) <= 0.01 : false;
  const emptyTitle = phases.some((p) => p.steps.some((s) => s.title.trim().length < 2));

  const updatePhase = (i: number, patch: Partial<DraftPhase>) => setPhases((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const updateStep = (pi: number, si: number, patch: Partial<DraftStep>) =>
    setPhases((ps) => ps.map((p, j) => (j === pi ? { ...p, steps: p.steps.map((s, m) => (m === si ? { ...s, ...patch } : s)) } : p)));
  const moveStep = (pi: number, si: number, d: -1 | 1) =>
    setPhases((ps) =>
      ps.map((p, j) => {
        if (j !== pi) return p;
        const steps = [...p.steps];
        const t = si + d;
        if (t < 0 || t >= steps.length) return p;
        [steps[si], steps[t]] = [steps[t], steps[si]];
        return { ...p, steps };
      })
    );

  function save() {
    if (!list) return;
    setError(null);
    start(async () => {
      const r = await saveEditedList({
        projectId,
        templateId: list.templateId,
        phases: phases.map((p) => ({
          number: p.number,
          name: p.name.trim(),
          weight: Number(p.weight) || 0,
          steps: p.steps.map((s) => ({ id: s.id, title: s.title.trim(), photoExpected: s.photoExpected })),
        })),
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      onOpenChange(false);
      onSaved(`Steps saved for this project${r.data.carried ? ` · ${r.data.carried} recorded steps kept` : ""}.`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit steps</DialogTitle>
          <DialogDescription>
            Changes apply to every floor or building using this list on this project only. Removing a step that has recorded
            work hides it (its history stays).
          </DialogDescription>
        </DialogHeader>

        {lists.length > 1 ? (
          <div role="radiogroup" aria-label="List" className="inline-flex rounded-lg bg-slate-100 p-1 text-sm dark:bg-slate-800">
            {lists.map((l) => (
              <button
                key={l.templateId}
                type="button"
                role="radio"
                aria-checked={templateId === l.templateId}
                onClick={() => setTemplateId(l.templateId)}
                className={cn(
                  "min-h-10 rounded-md px-3 font-medium",
                  templateId === l.templateId ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white" : "text-slate-600 dark:text-slate-300"
                )}
              >
                {l.name}
              </button>
            ))}
          </div>
        ) : null}

        {!list ? (
          error ? (
            <p role="alert" className="text-sm text-red-600">{error}</p>
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Loading…
            </div>
          )
        ) : (
          <div className="space-y-4">
            <p className={cn("text-sm font-medium tabular-nums", weightOk ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400")} aria-live="polite">
              Phase weights add up to {Math.round(weightSum * 100) / 100}% {weightOk ? "✓" : `· must be ${list.totalWeight}%`}
            </p>
            {phases.map((phase, pi) => (
              <section key={phase.number} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div className="grid grid-cols-[1fr_6rem] gap-2">
                  <Input aria-label="Phase name" value={phase.name} maxLength={80} onChange={(e) => updatePhase(pi, { name: e.target.value })} />
                  <div className="relative">
                    <Input
                      aria-label={`${phase.name} weight`}
                      type="number"
                      min={0}
                      max={100}
                      inputMode="decimal"
                      value={phase.weight}
                      className="pr-7 tabular-nums"
                      onChange={(e) => updatePhase(pi, { weight: e.target.value })}
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                  </div>
                </div>
                <ul className="mt-3 space-y-2">
                  {phase.steps.map((step, si) => (
                    <li key={step.key} className="flex items-center gap-1.5">
                      <Input aria-label="Step name" value={step.title} maxLength={160} onChange={(e) => updateStep(pi, si, { title: e.target.value })} className="min-w-0 flex-1" />
                      <button
                        type="button"
                        aria-pressed={step.photoExpected}
                        aria-label={`Photo expected for ${step.title}`}
                        title="Photo expected"
                        onClick={() => updateStep(pi, si, { photoExpected: !step.photoExpected })}
                        className={cn("inline-flex h-10 w-10 items-center justify-center rounded-md", step.photoExpected ? "bg-[#4d7c0f]/15 text-[#3f5d12]" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800")}
                      >
                        <Camera className="h-4 w-4" aria-hidden />
                      </button>
                      <button type="button" aria-label="Move up" disabled={si === 0} onClick={() => moveStep(pi, si, -1)} className="inline-flex h-10 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">
                        <ArrowUp className="h-4 w-4" aria-hidden />
                      </button>
                      <button type="button" aria-label="Move down" disabled={si === phase.steps.length - 1} onClick={() => moveStep(pi, si, 1)} className="inline-flex h-10 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">
                        <ArrowDown className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label={step.used ? `Hide ${step.title} (has recorded work)` : `Remove ${step.title}`}
                        title={step.used ? "Has recorded work: it will be hidden, history kept" : "Remove"}
                        onClick={() => setPhases((ps) => ps.map((p, j) => (j === pi ? { ...p, steps: p.steps.filter((_, m) => m !== si) } : p)))}
                        className="inline-flex h-10 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => updatePhase(pi, { steps: [...phase.steps, { key: k(), id: null, title: "", photoExpected: false, used: false }] })}
                >
                  <Plus aria-hidden /> Add step
                </Button>
              </section>
            ))}
          </div>
        )}

        {error && list ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving || !list || !weightOk || emptyTitle}>
            {saving ? <Loader2 className="animate-spin" aria-hidden /> : null} Save for this project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
