import { Suspense } from "react";
import { MembershipRole } from "@prisma/client";
import { requireAuth } from "@/lib/auth/session";
import { getActiveEmailAccount } from "@/lib/gmail/sync";
import {
  getEmailMessage,
  listCampaigns,
  listEmailMessages,
  listLeadsForPersonalization,
  listTemplates,
  type EmailFolder,
} from "@/lib/email/queries";
import { AppTopbar } from "@/components/layout/app-topbar";
import { EmailWorkspace } from "@/components/email/email-workspace";

type EmailPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const FOLDERS: EmailFolder[] = [
  "inbox",
  "sent",
  "drafts",
  "scheduled",
  "templates",
  "campaigns",
];

export default async function EmailPage({ searchParams }: EmailPageProps) {
  const session = await requireAuth();
  const params = await searchParams;
  const folderParam = first(params.folder) ?? "inbox";
  const folder = FOLDERS.includes(folderParam as EmailFolder)
    ? (folderParam as EmailFolder)
    : "inbox";
  const q = first(params.q);
  const selectedId = first(params.id);
  const connectError = first(params.error);

  let account = null as Awaited<ReturnType<typeof getActiveEmailAccount>>;
  let messages: Awaited<ReturnType<typeof listEmailMessages>> = [];
  let templates: Awaited<ReturnType<typeof listTemplates>> = [];
  let campaigns: Awaited<ReturnType<typeof listCampaigns>> = [];
  let leads: Awaited<ReturnType<typeof listLeadsForPersonalization>> = [];
  let selected = null as null | {
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
  };

  try {
    account = await getActiveEmailAccount(
      session.organization.id,
      session.user.id
    );

    [messages, templates, campaigns, leads] = await Promise.all([
      listEmailMessages({
        organizationId: session.organization.id,
        emailAccountId: account?.id ?? null,
        folder,
        q,
      }),
      listTemplates(session.organization.id),
      listCampaigns(session.organization.id),
      listLeadsForPersonalization(session.organization.id),
    ]);

    if (selectedId) {
      const message = await getEmailMessage(
        session.organization.id,
        selectedId
      );
      if (message) {
        selected = {
          id: message.id,
          subject: message.subject,
          fromAddress: message.fromAddress,
          toAddresses: message.toAddresses,
          ccAddresses: message.ccAddresses,
          bodyHtml: message.bodyHtml,
          bodyText: message.bodyText,
          status: message.status,
          createdAt: message.createdAt.toISOString(),
          openCount: message.openCount,
          firstOpenedAt: message.firstOpenedAt?.toISOString() ?? null,
          lastOpenedAt: message.lastOpenedAt?.toISOString() ?? null,
          recentOpens: message.openEvents.map((event) =>
            event.openedAt.toISOString()
          ),
        };
      }
    }
  } catch (error) {
    console.error("Email page failed:", error);
  }

  return (
    <div>
      <AppTopbar
        title="Email"
        description={
          account
            ? `${account.email} · ${folder}`
            : "Connect Gmail to sync and send"
        }
      />
      <Suspense
        fallback={<div className="p-7 text-sm text-zinc-500">Loading email…</div>}
      >
        <EmailWorkspace
          account={
            account
              ? {
                  id: account.id,
                  email: account.email,
                  lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
                }
              : null
          }
          folder={folder}
          messages={messages}
          selected={selected}
          templates={templates.map((t) => ({
            id: t.id,
            name: t.name,
            subject: t.subject,
            bodyHtml: t.bodyHtml,
          }))}
          campaigns={campaigns.map((c) => ({
            id: c.id,
            name: c.name,
            subject: c.subject,
            status: c.status,
            scheduledAt: c.scheduledAt?.toISOString() ?? null,
          }))}
          leads={leads}
          canWrite={session.membership.role !== MembershipRole.VIEWER}
          connectError={connectError ?? null}
        />
      </Suspense>
    </div>
  );
}
