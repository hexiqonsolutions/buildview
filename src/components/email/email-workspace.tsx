"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import {
  Inbox,
  Send,
  FileEdit,
  Clock3,
  LayoutTemplate,
  Megaphone,
  PenSquare,
  RefreshCw,
  Unplug,
  Loader2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ComposeEmailDialog } from "@/components/email/compose-email-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/email/rich-text-editor";
import {
  disconnectGmailAction,
  saveCampaignAction,
  saveTemplateAction,
  sendScheduledEmailAction,
  syncInboxAction,
} from "@/lib/email/actions";
import { runEmailAiAction } from "@/lib/email/ai-actions";
import type { EmailFolder, EmailListItem } from "@/lib/email/queries";
import { cn } from "@/lib/utils";

type AccountInfo = {
  id: string;
  email: string;
  lastSyncedAt: string | null;
};

type LeadOption = {
  id: string;
  company: string;
  contactName: string;
  email: string | null;
  projectType: string | null;
};

type TemplateItem = {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
};

type CampaignItem = {
  id: string;
  name: string;
  subject: string;
  status: string;
  scheduledAt: string | null;
};

type EmailWorkspaceProps = {
  account: AccountInfo | null;
  folder: EmailFolder;
  messages: EmailListItem[];
  selected: {
    id: string;
    subject: string;
    fromAddress: string;
    toAddresses: string[];
    ccAddresses: string[];
    bodyHtml: string | null;
    bodyText: string | null;
    status: string;
    createdAt: string;
    openCount: number;
    firstOpenedAt: string | null;
    lastOpenedAt: string | null;
    recentOpens: string[];
  } | null;
  templates: TemplateItem[];
  campaigns: CampaignItem[];
  leads: LeadOption[];
  canWrite: boolean;
  connectError?: string | null;
};

const FOLDERS: {
  id: EmailFolder;
  label: string;
  icon: typeof Inbox;
}[] = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "sent", label: "Sent", icon: Send },
  { id: "drafts", label: "Drafts", icon: FileEdit },
  { id: "scheduled", label: "Scheduled", icon: Clock3 },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
];

export function EmailWorkspace({
  account,
  folder,
  messages,
  selected,
  templates,
  campaigns,
  leads,
  canWrite,
  connectError,
}: EmailWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeSeed, setComposeSeed] = useState<{
    subject?: string;
    body?: string;
  } | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [summaryHtml, setSummaryHtml] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("<p></p>");
  const [campaignName, setCampaignName] = useState("");
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignBody, setCampaignBody] = useState("<p></p>");
  const [campaignSchedule, setCampaignSchedule] = useState("");
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  const selectedId = searchParams.get("id");

  function setFolder(next: EmailFolder) {
    const params = new URLSearchParams();
    params.set("folder", next);
    router.push(`/email?${params.toString()}`);
  }

  function openMessage(id: string) {
    setSummaryHtml(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set("folder", folder);
    params.set("id", id);
    router.push(`/email?${params.toString()}`);
  }

  function onSearch(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.set("folder", folder);
    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");
    router.push(`/email?${params.toString()}`);
  }

  const listTitle = useMemo(() => {
    return FOLDERS.find((item) => item.id === folder)?.label ?? "Email";
  }, [folder]);

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4 p-5 md:p-7">
      {connectError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {connectError}
        </div>
      ) : null}

      {!account ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#121212] px-6 py-14 text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl text-white">
            Connect Gmail to start
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-500">
            Sync inbox, compose with rich text, save drafts, schedule sends, and
            manage templates. Emails never send without your review.
          </p>
          {canWrite ? (
            <Button asChild className="mt-6 cursor-pointer">
              <a href="/api/gmail/connect">Connect Gmail</a>
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.12] via-[#121212] to-[#0A0A0A] px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-orange-300">
                Gmail connected
              </p>
              <p className="mt-1 text-lg font-medium text-white">{account.email}</p>
              <p className="text-xs text-zinc-500">
                {account.lastSyncedAt
                  ? `Last synced ${formatDistanceToNow(new Date(account.lastSyncedAt), { addSuffix: true })}`
                  : "Not synced yet"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                className="cursor-pointer"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await syncInboxAction(account.id);
                    if (!result.ok) toast.error(result.error);
                    else
                      toast.success(
                        `Synced ${result.data?.synced ?? 0} new messages`
                      );
                  })
                }
              >
                {pending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Sync
              </Button>
              <Button
                className="cursor-pointer"
                onClick={() => setComposeOpen(true)}
              >
                <PenSquare className="size-4" />
                Compose
              </Button>
              <Button
                variant="ghost"
                className="cursor-pointer"
                onClick={() =>
                  startTransition(async () => {
                    const result = await disconnectGmailAction(account.id);
                    if (!result.ok) toast.error(result.error);
                    else toast.success("Gmail disconnected");
                  })
                }
              >
                <Unplug className="size-4" />
                Disconnect
              </Button>
            </div>
          </div>

          <div className="grid min-h-[640px] gap-4 lg:grid-cols-[210px_minmax(0,1fr)_minmax(0,1.1fr)]">
            <aside className="rounded-2xl border border-zinc-800/80 bg-[#121212] p-3">
              <nav className="space-y-1">
                {FOLDERS.map((item) => {
                  const Icon = item.icon;
                  const active = folder === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFolder(item.id)}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors",
                        active
                          ? "bg-orange-500/15 text-orange-300"
                          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </aside>

            <section className="rounded-2xl border border-zinc-800/80 bg-[#121212]">
              <div className="border-b border-zinc-800 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-[family-name:var(--font-display)] text-lg text-white">
                    {listTitle}
                  </h2>
                  {folder === "templates" ? (
                    <Button
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => setTemplateOpen(true)}
                    >
                      New template
                    </Button>
                  ) : null}
                  {folder === "campaigns" ? (
                    <Button
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => setCampaignOpen(true)}
                    >
                      New campaign
                    </Button>
                  ) : null}
                </div>
                {folder !== "templates" && folder !== "campaigns" ? (
                  <form onSubmit={onSearch} className="mt-3">
                    <Input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search subject or body…"
                    />
                  </form>
                ) : null}
              </div>

              <div className="max-h-[560px] overflow-y-auto">
                {folder === "templates" ? (
                  templates.length ? (
                    templates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        className="block w-full cursor-pointer border-b border-zinc-800/80 px-4 py-3 text-left transition-colors hover:bg-zinc-900/50"
                        onClick={() => {
                          setComposeSeed({
                            subject: template.subject,
                            body: template.bodyHtml,
                          });
                          setComposeOpen(true);
                        }}
                      >
                        <p className="text-sm font-medium text-white">
                          {template.name}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {template.subject}
                        </p>
                      </button>
                    ))
                  ) : (
                    <Empty text="No templates yet. Create one to reuse outreach copy." />
                  )
                ) : folder === "campaigns" ? (
                  campaigns.length ? (
                    campaigns.map((campaign) => (
                      <div
                        key={campaign.id}
                        className="border-b border-zinc-800/80 px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-white">
                            {campaign.name}
                          </p>
                          <Badge variant="outline">{campaign.status}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          {campaign.subject}
                        </p>
                      </div>
                    ))
                  ) : (
                    <Empty text="No campaigns yet. Save a draft campaign to organize blasts." />
                  )
                ) : messages.length ? (
                  messages.map((message) => (
                    <button
                      key={message.id}
                      type="button"
                      onClick={() => openMessage(message.id)}
                      className={cn(
                        "block w-full cursor-pointer border-b border-zinc-800/80 px-4 py-3 text-left transition-colors hover:bg-zinc-900/50",
                        selectedId === message.id && "bg-orange-500/10"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium text-white">
                          {message.subject}
                        </p>
                        <span className="shrink-0 text-[11px] text-zinc-500">
                          {formatDistanceToNow(new Date(message.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {folder === "inbox"
                          ? message.fromAddress
                          : message.toAddresses.join(", ")}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-400">
                        {message.snippet || "—"}
                      </p>
                      {folder === "sent" ? (
                        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-zinc-500">
                          <Eye className="size-3" aria-hidden />
                          {message.openCount > 0
                            ? `Opened ${message.openCount}×`
                            : "Not opened yet"}
                          {message.lastOpenedAt
                            ? ` · last ${formatDistanceToNow(new Date(message.lastOpenedAt), { addSuffix: true })}`
                            : ""}
                        </p>
                      ) : null}
                    </button>
                  ))
                ) : (
                  <Empty text="No messages in this folder. Sync Gmail or compose a new email." />
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800/80 bg-[#121212] p-5">
              {selected ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-[family-name:var(--font-display)] text-xl text-white">
                      {selected.subject}
                    </h3>
                    <p className="mt-2 text-sm text-zinc-400">
                      From {selected.fromAddress}
                    </p>
                    <p className="text-sm text-zinc-500">
                      To {selected.toAddresses.join(", ")}
                    </p>
                    <Badge className="mt-3" variant="secondary">
                      {selected.status}
                    </Badge>
                    {selected.status === "SENT" ? (
                      <div className="mt-4 rounded-xl border border-orange-500/20 bg-orange-500/[0.07] px-4 py-3">
                        <p className="flex items-center gap-2 text-sm font-medium text-orange-200">
                          <Eye className="size-4" aria-hidden />
                          {selected.openCount > 0
                            ? `Opened ${selected.openCount} time${selected.openCount === 1 ? "" : "s"}`
                            : "Not opened yet"}
                        </p>
                        {selected.firstOpenedAt ? (
                          <p className="mt-1 text-xs text-zinc-400">
                            First open{" "}
                            {format(
                              new Date(selected.firstOpenedAt),
                              "MMM d, yyyy · h:mm a"
                            )}
                            {selected.lastOpenedAt
                              ? ` · Last ${format(new Date(selected.lastOpenedAt), "MMM d · h:mm a")}`
                              : ""}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-zinc-500">
                            Opens are counted when the recipient loads images in
                            the email.
                          </p>
                        )}
                        {selected.recentOpens.length > 0 ? (
                          <ul className="mt-3 space-y-1 border-t border-orange-500/15 pt-3">
                            {selected.recentOpens.slice(0, 8).map((openedAt) => (
                              <li
                                key={openedAt}
                                className="text-xs tabular-nums text-zinc-400"
                              >
                                {format(
                                  new Date(openedAt),
                                  "MMM d, yyyy · h:mm:ss a"
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div
                    className="prose prose-invert max-w-none rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm"
                    dangerouslySetInnerHTML={{
                      __html:
                        selected.bodyHtml ||
                        `<p>${selected.bodyText || ""}</p>`,
                    }}
                  />
                  {summaryHtml ? (
                    <div className="rounded-xl border border-orange-500/20 bg-orange-500/[0.07] p-4">
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-orange-300">
                        AI summary
                      </p>
                      <div
                        className="prose prose-invert mt-2 max-w-none text-sm"
                        dangerouslySetInnerHTML={{ __html: summaryHtml }}
                      />
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {selected.status === "INBOX" ? (
                      <>
                        <Button
                          className="cursor-pointer"
                          onClick={() => setReplyOpen(true)}
                        >
                          Reply
                        </Button>
                        <Button
                          variant="secondary"
                          className="cursor-pointer"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await runEmailAiAction({
                                action: "summarize",
                                contextHtml:
                                  selected.bodyHtml ||
                                  selected.bodyText ||
                                  "",
                              });
                              if (!result.ok) {
                                toast.error(result.error);
                                return;
                              }
                              setSummaryHtml(result.data.bodyHtml);
                              toast.success("Summary ready");
                            })
                          }
                        >
                          Summarize
                        </Button>
                        <Button
                          variant="outline"
                          className="cursor-pointer"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await runEmailAiAction({
                                action: "reply",
                                contextHtml:
                                  selected.bodyHtml ||
                                  selected.bodyText ||
                                  "",
                                subject: selected.subject,
                              });
                              if (!result.ok) {
                                toast.error(result.error);
                                return;
                              }
                              setComposeSeed({
                                subject:
                                  result.data.subject ||
                                  `Re: ${selected.subject}`,
                                body: result.data.bodyHtml,
                              });
                              setReplyOpen(true);
                              toast.success(
                                "Reply draft ready — review before Send"
                              );
                            })
                          }
                        >
                          AI Reply draft
                        </Button>
                      </>
                    ) : null}
                    {selected.status === "SCHEDULED" ? (
                      <Button
                        className="cursor-pointer"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await sendScheduledEmailAction(
                              selected.id
                            );
                            if (!result.ok) toast.error(result.error);
                            else toast.success("Scheduled email sent");
                          })
                        }
                      >
                        Send now
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <Empty text="Select a message to read it here." />
              )}
            </section>
          </div>
        </>
      )}

      {account ? (
        <>
          <ComposeEmailDialog
            key={`compose-${composeSeed?.subject ?? "new"}-${composeOpen}`}
            open={composeOpen}
            onOpenChange={(open) => {
              setComposeOpen(open);
              if (!open) setComposeSeed(null);
            }}
            accountId={account.id}
            leads={leads}
            initialSubject={composeSeed?.subject}
            initialBody={composeSeed?.body}
          />
          <ComposeEmailDialog
            key={`reply-${selected?.id ?? "none"}-${composeSeed?.subject ?? ""}`}
            open={replyOpen}
            onOpenChange={(open) => {
              setReplyOpen(open);
              if (!open) setComposeSeed(null);
            }}
            accountId={account.id}
            leads={leads}
            initialSubject={composeSeed?.subject}
            initialBody={composeSeed?.body}
            replyTo={
              selected
                ? {
                    messageId: selected.id,
                    to: [selected.fromAddress],
                    subject: selected.subject,
                    bodyHtml: composeSeed?.body ? null : selected.bodyHtml,
                  }
                : null
            }
          />
        </>
      ) : null}

      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={templateSubject}
                onChange={(e) => setTemplateSubject(e.target.value)}
              />
            </div>
            <RichTextEditor value={templateBody} onChange={setTemplateBody} />
          </div>
          <DialogFooter>
            <Button
              className="cursor-pointer"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await saveTemplateAction({
                    name: templateName,
                    subject: templateSubject,
                    bodyHtml: templateBody,
                  });
                  if (!result.ok) toast.error(result.error);
                  else {
                    toast.success("Template saved");
                    setTemplateOpen(false);
                  }
                })
              }
            >
              Save template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={campaignSubject}
                onChange={(e) => setCampaignSubject(e.target.value)}
              />
            </div>
            <RichTextEditor value={campaignBody} onChange={setCampaignBody} />
            <div className="space-y-2">
              <Label>Schedule (optional)</Label>
              <Input
                type="datetime-local"
                value={campaignSchedule}
                onChange={(e) => setCampaignSchedule(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="cursor-pointer"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await saveCampaignAction({
                    name: campaignName,
                    subject: campaignSubject,
                    bodyHtml: campaignBody,
                    scheduledAt: campaignSchedule || undefined,
                  });
                  if (!result.ok) toast.error(result.error);
                  else {
                    toast.success("Campaign saved");
                    setCampaignOpen(false);
                  }
                })
              }
            >
              Save campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex h-48 items-center justify-center px-6 text-center text-sm text-zinc-500">
      {text}
    </div>
  );
}
