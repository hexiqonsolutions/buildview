"use client";

import { useState, useTransition } from "react";
import {
  Sparkles,
  Wand2,
  RefreshCw,
  Minimize2,
  Maximize2,
  MessageSquareText,
  Reply,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { runEmailAiAction } from "@/lib/email/ai-actions";
import type { EmailAiActionInput } from "@/lib/email/ai-schema";
import { cn } from "@/lib/utils";

type AiEmailToolbarProps = {
  subject: string;
  bodyHtml: string;
  contextHtml?: string;
  lead?: {
    contactName?: string;
    company?: string;
    projectType?: string;
  };
  onApply: (result: { subject?: string; bodyHtml: string }) => void;
  className?: string;
  compact?: boolean;
};

export function AiEmailToolbar({
  subject,
  bodyHtml,
  contextHtml,
  lead,
  onApply,
  className,
  compact,
}: AiEmailToolbarProps) {
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<string | null>(null);
  const [brief, setBrief] = useState("");
  const [tone, setTone] = useState<"professional" | "friendly" | "assertive">(
    "professional"
  );

  function run(action: EmailAiActionInput["action"]) {
    setActive(action);
    startTransition(async () => {
      const result = await runEmailAiAction({
        action,
        subject,
        bodyHtml,
        contextHtml,
        lead,
        tone: action === "tone" ? tone : undefined,
        prompt: action === "generate" ? brief : undefined,
      });

      setActive(null);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      onApply({
        subject: result.data.subject,
        bodyHtml: result.data.bodyHtml,
      });
      toast.success(
        action === "summarize"
          ? "Summary ready — review before using"
          : "AI draft ready — review before Send"
      );
    });
  }

  const busy = pending;

  return (
    <div
      className={cn(
        "space-y-2 rounded-xl border border-orange-500/20 bg-orange-500/[0.06] p-2.5",
        className
      )}
    >
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="size-3.5 text-orange-400" aria-hidden />
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-orange-300/90">
          AI Email Assistant
        </p>
        <p className="text-[11px] text-zinc-500">Never auto-sends</p>
      </div>

      {!compact ? (
        <Input
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Optional brief for Generate (e.g. follow up on tower bid)"
          className="h-9 bg-zinc-950/70"
          disabled={busy}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5">
        <AiButton
          label="Generate Email"
          icon={<Sparkles className="size-3.5" />}
          busy={busy && active === "generate"}
          disabled={busy}
          onClick={() => run("generate")}
        />
        <AiButton
          label="Improve"
          icon={<Wand2 className="size-3.5" />}
          busy={busy && active === "improve"}
          disabled={busy || !bodyHtml}
          onClick={() => run("improve")}
        />
        <AiButton
          label="Rewrite"
          icon={<RefreshCw className="size-3.5" />}
          busy={busy && active === "rewrite"}
          disabled={busy || !bodyHtml}
          onClick={() => run("rewrite")}
        />
        <AiButton
          label="Shorten"
          icon={<Minimize2 className="size-3.5" />}
          busy={busy && active === "shorten"}
          disabled={busy || !bodyHtml}
          onClick={() => run("shorten")}
        />
        <AiButton
          label="Expand"
          icon={<Maximize2 className="size-3.5" />}
          busy={busy && active === "expand"}
          disabled={busy || !bodyHtml}
          onClick={() => run("expand")}
        />
        <div className="flex items-center gap-1">
          <Select
            value={tone}
            onValueChange={(value) =>
              setTone(value as "professional" | "friendly" | "assertive")
            }
            disabled={busy}
          >
            <SelectTrigger className="h-8 w-[140px] cursor-pointer">
              <SelectValue placeholder="Tone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="assertive">Assertive</SelectItem>
            </SelectContent>
          </Select>
          <AiButton
            label="Tone"
            icon={<MessageSquareText className="size-3.5" />}
            busy={busy && active === "tone"}
            disabled={busy || !bodyHtml}
            onClick={() => run("tone")}
          />
        </div>
        {contextHtml ? (
          <>
            <AiButton
              label="Summarize"
              icon={<MessageSquareText className="size-3.5" />}
              busy={busy && active === "summarize"}
              disabled={busy}
              onClick={() => run("summarize")}
            />
            <AiButton
              label="Reply"
              icon={<Reply className="size-3.5" />}
              busy={busy && active === "reply"}
              disabled={busy}
              onClick={() => run("reply")}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

function AiButton({
  label,
  icon,
  onClick,
  disabled,
  busy,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      className="h-8 cursor-pointer gap-1.5 border border-orange-500/20 bg-zinc-950/60 text-xs text-orange-100 hover:bg-orange-500/15"
      onClick={onClick}
      disabled={disabled}
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : icon}
      {label}
    </Button>
  );
}
