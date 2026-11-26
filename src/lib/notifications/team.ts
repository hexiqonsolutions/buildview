/**
 * Team notifications (WhatsApp + in-portal) for project activity.
 * Server-internal (not "use server"): only call after the triggering action
 * has been authorized. Never throws: a notification problem must not fail
 * site work.
 */
import "server-only";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getPlatformSettings } from "@/lib/actions/platform-settings";
import { siteConfig } from "@/lib/site-config";
import { isValidE164 } from "@/lib/notifications/phone";
import { sendWhatsAppMessage, type TeamTemplateKey } from "@/lib/whatsapp/send";
import type { NotificationRuleKey } from "@/lib/admin/platform-settings";
import type { UserRole } from "@/lib/types";
import {
  INSTANT_PER_HOUR,
  digestSummary,
  isQuietHours,
  sendAfterFor,
  whatsappModeFor,
  type DigestItem,
  type TeamEvent,
} from "@/lib/notifications/team-events";

const CLIENT_EDITOR_ROLES: UserRole[] = ["client_admin", "site_supervisor", "site_engineer"];
const CLIENT_VIEWER_ROLES: UserRole[] = ["client", "client_user", "read_only_client"];

/** Platform switch (Admin → Settings) that turns each event on or off. */
const RULE_FOR_EVENT: Record<TeamEvent, NotificationRuleKey> = {
  step_started: "onSiteActivity",
  step_ended: "onSiteActivity",
  step_reviewed: "onSiteActivity",
  zone_update: "onSiteActivity",
  evidence_linked: "onSiteActivity",
  comment: "onComment",
  comment_reply: "onComment",
  scan_uploaded: "onUpload",
};

const TEMPLATE_FOR_EVENT: Record<TeamEvent, TeamTemplateKey> = {
  step_started: "teamUpdate",
  step_ended: "teamUpdate",
  step_reviewed: "stepReview",
  zone_update: "teamUpdate",
  evidence_linked: "teamUpdate",
  comment: "teamUpdate",
  comment_reply: "commentReply",
  scan_uploaded: "scanUploaded",
};

function absoluteLink(link?: string | null): string | null {
  if (!link) return null;
  return link.startsWith("http") ? link : `${siteConfig.url}${link}`;
}

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  return Boolean(error && (error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message ?? "")));
}

/**
 * Who hears about a project's activity: assigned users (staff and client),
 * the client org's Client Admin / Site Supervisor / Site Engineer, and — for
 * client-facing events — the client's viewer roles.
 */
export async function resolveProjectTeam(projectId: string, event: TeamEvent): Promise<string[]> {
  const admin = createServiceRoleClient();
  const [{ data: project }, { data: assignments }] = await Promise.all([
    admin.from("projects").select("client_id").eq("id", projectId).maybeSingle(),
    admin.from("project_assignments").select("user_id").eq("project_id", projectId).is("deleted_at", null),
  ]);
  const roles = event === "scan_uploaded" ? [...CLIENT_EDITOR_ROLES, ...CLIENT_VIEWER_ROLES] : CLIENT_EDITOR_ROLES;
  const ids = new Set<string>((assignments ?? []).map((a) => a.user_id as string).filter(Boolean));
  if (project?.client_id) {
    const { data: org } = await admin
      .from("users")
      .select("id")
      .eq("client_id", project.client_id)
      .in("role", roles)
      .eq("is_active", true)
      .is("deleted_at", null);
    for (const u of org ?? []) ids.add(u.id as string);
  }
  if (ids.size === 0) return [];
  // Only active accounts.
  const { data: active } = await admin
    .from("users")
    .select("id")
    .in("id", [...ids])
    .eq("is_active", true)
    .is("deleted_at", null);
  return (active ?? []).map((u) => u.id as string);
}

export type TeamNotice = {
  projectId: string;
  event: TeamEvent;
  /** Who did it (never notified about their own action). */
  actorId: string | null;
  title: string;
  message: string;
  /** Portal path, e.g. /dashboard/projects/<id>?tab=progression */
  link?: string | null;
  /** Bell notification too (false when another notifier already wrote it). */
  inApp?: boolean;
  /** Send to these people instead of the whole team (e.g. a reply's author). */
  recipients?: string[];
  /** Same key for the same person while pending is stored once. */
  dedupeKey?: string;
};

/** Notify the project team: bell now; WhatsApp instant or folded into the digest. */
export async function notifyProjectTeam(notice: TeamNotice): Promise<void> {
  try {
    const settings = await getPlatformSettings();
    if (settings.notifications[RULE_FOR_EVENT[notice.event]] === false) return;

    const recipients = (notice.recipients ?? (await resolveProjectTeam(notice.projectId, notice.event))).filter(
      (id) => id && id !== notice.actorId
    );
    if (recipients.length === 0) return;
    const admin = createServiceRoleClient();

    if (notice.inApp !== false) {
      await admin.from("notifications").insert(
        recipients.map((userId) => ({
          user_id: userId,
          title: notice.title,
          message: notice.message,
          type: "project_update",
          link: notice.link ?? null,
          is_read: false,
          created_by: notice.actorId,
        })) as never
      );
      revalidatePath("/dashboard/notifications");
      revalidatePath("/admin/notifications");
    }

    // WhatsApp: opted-in people with a valid number, by their choice for this event.
    const [{ data: users }, prefsRes] = await Promise.all([
      admin.from("users").select("id, whatsapp_notifications, phone_e164, whatsapp_opt_in_at").in("id", recipients),
      admin.from("user_notification_prefs" as never).select("*").in("user_id", recipients).eq("event", notice.event),
    ]);
    if (prefsRes.error && isMissingTable(prefsRes.error)) return; // migration 055 not run yet
    const prefByUser = new Map(
      ((prefsRes.data ?? []) as unknown as Array<{ user_id: string; whatsapp_mode: string }>).map((p) => [
        p.user_id,
        p.whatsapp_mode,
      ])
    );
    const now = new Date();
    const rows = ((users ?? []) as Array<{
      id: string;
      whatsapp_notifications: boolean | null;
      phone_e164: string | null;
      whatsapp_opt_in_at: string | null;
    }>)
      .filter((u) => u.whatsapp_notifications && u.whatsapp_opt_in_at && isValidE164(u.phone_e164))
      .map((u) => ({ user: u, mode: whatsappModeFor(notice.event, { [notice.event]: prefByUser.get(u.id) }) }))
      .filter((x) => x.mode !== "off")
      .map(({ user, mode }) => ({
        user_id: user.id,
        project_id: notice.projectId,
        event: notice.event,
        mode,
        title: notice.title,
        message: notice.message,
        link: absoluteLink(notice.link),
        dedupe_key: notice.dedupeKey ? `${notice.event}:${notice.dedupeKey}` : null,
        send_after: (mode === "instant" ? sendAfterFor(now) : now).toISOString(),
      }));
    if (rows.length === 0) return;

    const inserted = await insertOutbox(rows);
    const instantIds = inserted.filter((r) => r.mode === "instant").map((r) => r.id);
    if (instantIds.length > 0 && !isQuietHours(now)) {
      after(() => flushOutbox({ ids: instantIds }).then(() => undefined));
    }
  } catch (err) {
    console.error("[notifyProjectTeam]", notice.event, err);
  }
}

async function insertOutbox(
  rows: Record<string, unknown>[]
): Promise<Array<{ id: string; mode: string }>> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin.from("notification_outbox" as never).insert(rows as never).select("id, mode");
  if (!error) return (data ?? []) as unknown as Array<{ id: string; mode: string }>;
  if (isMissingTable(error)) return [];
  // A duplicate (dedupe) fails the batch: insert one by one, skipping duplicates.
  const out: Array<{ id: string; mode: string }> = [];
  for (const row of rows) {
    const { data: one } = await admin.from("notification_outbox" as never).insert(row as never).select("id, mode").maybeSingle();
    if (one) out.push(one as unknown as { id: string; mode: string });
  }
  return out;
}

type OutboxRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  event: TeamEvent;
  mode: "instant" | "digest";
  title: string;
  message: string;
  link: string | null;
  attempts: number;
};

async function logDelivery(row: { user_id: string; status: string; provider_id?: string | null; error?: string | null; title: string }) {
  await createServiceRoleClient()
    .from("notification_deliveries")
    .insert({
      user_id: row.user_id,
      channel: "whatsapp",
      rule: null,
      status: row.status as never,
      provider_id: row.provider_id ?? null,
      error: row.error ?? null,
      title: row.title,
    })
    .then(
      () => undefined,
      () => undefined
    );
}

async function recipientPhones(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const { data } = await createServiceRoleClient()
    .from("users")
    .select("id, phone_e164, whatsapp_notifications, whatsapp_opt_in_at")
    .in("id", userIds);
  const out = new Map<string, string>();
  for (const u of (data ?? []) as Array<{ id: string; phone_e164: string | null; whatsapp_notifications: boolean | null; whatsapp_opt_in_at: string | null }>) {
    if (u.whatsapp_notifications && u.whatsapp_opt_in_at && isValidE164(u.phone_e164)) out.set(u.id, u.phone_e164!);
  }
  return out;
}

/**
 * Send due instant messages. Over the hourly limit, a message moves to the
 * person's next digest; failures retry (3 tries, 10 minutes apart).
 */
export async function flushOutbox(options: { ids?: string[]; limit?: number } = {}): Promise<{ sent: number; failed: number; deferred: number }> {
  const result = { sent: 0, failed: 0, deferred: 0 };
  try {
    const admin = createServiceRoleClient();
    let query = admin
      .from("notification_outbox" as never)
      .select("*")
      .eq("status", "pending")
      .eq("mode", "instant")
      .lte("send_after", new Date().toISOString())
      .order("created_at")
      .limit(options.limit ?? 200);
    if (options.ids?.length) query = query.in("id", options.ids);
    const { data, error } = await query;
    if (error) return result;
    const rows = (data ?? []) as unknown as OutboxRow[];
    if (rows.length === 0) return result;

    const phones = await recipientPhones([...new Set(rows.map((r) => r.user_id))]);
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const sentThisHour = new Map<string, number>();

    for (const row of rows) {
      // Claim the row so a parallel run doesn't send it twice.
      const { data: claimed } = await admin
        .from("notification_outbox" as never)
        .update({ status: "sending" } as never)
        .eq("id", row.id)
        .eq("status", "pending")
        .select("id");
      if (!claimed || (claimed as unknown[]).length === 0) continue;

      const phone = phones.get(row.user_id);
      if (!phone) {
        await admin.from("notification_outbox" as never).update({ status: "skipped", error: "not opted in" } as never).eq("id", row.id);
        continue;
      }
      if (!sentThisHour.has(row.user_id)) {
        const { count } = await admin
          .from("notification_outbox" as never)
          .select("id", { count: "exact", head: true })
          .eq("user_id", row.user_id)
          .eq("mode", "instant")
          .eq("status", "sent")
          .gte("sent_at", hourAgo);
        sentThisHour.set(row.user_id, count ?? 0);
      }
      if ((sentThisHour.get(row.user_id) ?? 0) >= INSTANT_PER_HOUR) {
        await admin.from("notification_outbox" as never).update({ status: "pending", mode: "digest" } as never).eq("id", row.id);
        result.deferred += 1;
        continue;
      }

      const sent = await sendWhatsAppMessage({
        toE164: phone,
        body: [`*BuildView* — ${row.title}`, row.message, row.link ? `Open: ${row.link}` : null].filter(Boolean).join("\n\n"),
        templateKey: TEMPLATE_FOR_EVENT[row.event] ?? "teamUpdate",
        variables: { title: row.title, message: row.message, link: row.link ?? undefined },
      });
      if (sent.ok) {
        await admin
          .from("notification_outbox" as never)
          .update({ status: "sent", sent_at: new Date().toISOString(), attempts: row.attempts + 1, error: null } as never)
          .eq("id", row.id);
        sentThisHour.set(row.user_id, (sentThisHour.get(row.user_id) ?? 0) + 1);
        result.sent += 1;
      } else {
        const attempts = row.attempts + 1;
        const retry = !sent.skipped && attempts < 3;
        await admin
          .from("notification_outbox" as never)
          .update({
            status: retry ? "pending" : sent.skipped ? "skipped" : "failed",
            attempts,
            error: sent.error ?? null,
            send_after: new Date(Date.now() + 10 * 60_000).toISOString(),
          } as never)
          .eq("id", row.id);
        result.failed += 1;
      }
      await logDelivery({
        user_id: row.user_id,
        status: sent.ok ? "sent" : sent.skipped ? "skipped" : "failed",
        provider_id: sent.providerId,
        error: sent.error,
        title: row.title,
      });
    }
  } catch (err) {
    console.error("[flushOutbox]", err);
  }
  return result;
}

/** One WhatsApp per person summarising their waiting digest items, by project. */
export async function runDigest(): Promise<{ people: number; items: number }> {
  const out = { people: 0, items: 0 };
  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("notification_outbox" as never)
      .select("*")
      .eq("status", "pending")
      .eq("mode", "digest")
      .order("created_at")
      .limit(5000);
    if (error) return out;
    const rows = (data ?? []) as unknown as OutboxRow[];
    if (rows.length === 0) return out;

    const projectIds = [...new Set(rows.map((r) => r.project_id).filter(Boolean))] as string[];
    const { data: projects } = projectIds.length
      ? await admin.from("projects").select("id, name").in("id", projectIds)
      : { data: [] as { id: string; name: string }[] };
    const projectName = new Map((projects ?? []).map((p) => [p.id, p.name]));
    const phones = await recipientPhones([...new Set(rows.map((r) => r.user_id))]);

    const byUser = new Map<string, OutboxRow[]>();
    for (const r of rows) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r]);

    for (const [userId, items] of byUser) {
      const ids = items.map((i) => i.id);
      const phone = phones.get(userId);
      if (!phone) {
        await admin.from("notification_outbox" as never).update({ status: "skipped", error: "not opted in" } as never).in("id", ids);
        continue;
      }
      const summary = digestSummary(
        items.map<DigestItem>((i) => ({ event: i.event, projectName: projectName.get(i.project_id ?? "") ?? "Your project", title: i.title }))
      );
      const singleProject = projectIds.length === 1 || new Set(items.map((i) => i.project_id)).size === 1;
      const link = absoluteLink(
        singleProject && items[0].project_id ? `/dashboard/projects/${items[0].project_id}?tab=progression` : "/dashboard/notifications"
      );
      const title = summary.length === 1 ? `${summary[0].projectName} update` : "Site updates";
      const message = summary.map((s) => (summary.length === 1 ? s.line : `${s.projectName}: ${s.line}`)).join(" | ");
      const sent = await sendWhatsAppMessage({
        toE164: phone,
        body: [`*BuildView* — ${title}`, message, link ? `Open: ${link}` : null].filter(Boolean).join("\n\n"),
        templateKey: "siteDigest",
        variables: { title, message, link: link ?? undefined },
      });
      await admin
        .from("notification_outbox" as never)
        .update({
          status: sent.ok ? "digested" : "failed",
          sent_at: sent.ok ? new Date().toISOString() : null,
          error: sent.ok ? null : (sent.error ?? null),
        } as never)
        .in("id", ids);
      await logDelivery({ user_id: userId, status: sent.ok ? "sent" : sent.skipped ? "skipped" : "failed", provider_id: sent.providerId, error: sent.error, title });
      out.people += 1;
      out.items += items.length;
    }
  } catch (err) {
    console.error("[runDigest]", err);
  }
  return out;
}

/** Display name for notification copy ("Asha Patil"), or a neutral fallback. */
export async function teamMemberName(userId: string | null | undefined): Promise<string> {
  if (!userId) return "A team member";
  const { data } = await createServiceRoleClient().from("users").select("full_name").eq("id", userId).maybeSingle();
  return (data?.full_name as string | null)?.trim() || "A team member";
}

export function progressionLink(projectId: string): string {
  return `/dashboard/projects/${projectId}?tab=progression`;
}
