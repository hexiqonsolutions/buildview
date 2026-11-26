"use server";

import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getActiveActor } from "@/lib/auth/project-access";
import { isValidE164 } from "@/lib/notifications/phone";
import { sendWhatsAppMessage } from "@/lib/whatsapp/send";
import { isWhatsAppEnabled } from "@/lib/whatsapp/config";
import { getErrorMessage, PublicError } from "@/lib/errors/public";
import { validate } from "@/lib/validations/parse";
import {
  DEFAULT_WHATSAPP_MODE,
  TEAM_EVENTS,
  isWhatsAppMode,
  type TeamEvent,
  type WhatsAppMode,
} from "@/lib/notifications/team-events";

export type TeamPrefsView =
  | { ok: false; error: string }
  | {
      ok: true;
      prefs: Record<TeamEvent, WhatsAppMode>;
      /** Opted in with a valid number. */
      whatsappReady: boolean;
      /** Twilio configured on the server. */
      providerReady: boolean;
      /** Migration 055 applied. */
      available: boolean;
    };

const savePrefSchema = z
  .object({
    event: z.enum(TEAM_EVENTS as unknown as [TeamEvent, ...TeamEvent[]]),
    mode: z.enum(["instant", "digest", "off"]),
  })
  .strict();

async function me() {
  const actor = await getActiveActor();
  if (!actor) throw new PublicError("You must be signed in.");
  return actor;
}

export async function getMyTeamNotificationPrefs(): Promise<TeamPrefsView> {
  try {
    const actor = await me();
    const admin = createServiceRoleClient();
    const [{ data: user }, prefsRes] = await Promise.all([
      admin.from("users").select("whatsapp_notifications, phone_e164, whatsapp_opt_in_at").eq("id", actor.userId).maybeSingle(),
      admin.from("user_notification_prefs" as never).select("*").eq("user_id", actor.userId),
    ]);
    const prefs = { ...DEFAULT_WHATSAPP_MODE };
    for (const row of (prefsRes.data ?? []) as unknown as Array<{ event: string; whatsapp_mode: string }>) {
      if ((TEAM_EVENTS as readonly string[]).includes(row.event) && isWhatsAppMode(row.whatsapp_mode)) {
        prefs[row.event as TeamEvent] = row.whatsapp_mode;
      }
    }
    return {
      ok: true,
      prefs,
      whatsappReady: Boolean(user?.whatsapp_notifications && user?.whatsapp_opt_in_at && isValidE164(user?.phone_e164)),
      providerReady: isWhatsAppEnabled(),
      available: !prefsRes.error,
    };
  } catch (err) {
    return { ok: false, error: getErrorMessage(err, "Could not load your notification choices.") };
  }
}

export async function saveMyTeamNotificationPref(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = validate(savePrefSchema, input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  try {
    const actor = await me();
    const { error } = await createServiceRoleClient()
      .from("user_notification_prefs" as never)
      .upsert(
        { user_id: actor.userId, event: parsed.data.event, whatsapp_mode: parsed.data.mode, updated_at: new Date().toISOString() } as never,
        { onConflict: "user_id,event" }
      );
    if (error) {
      if (/user_notification_prefs/.test(error.message ?? "")) {
        return { ok: false, error: "These choices need database migration 055. Ask BuildView to run it." };
      }
      throw error;
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: getErrorMessage(err, "Could not save your choice.") };
  }
}

/** Send yourself a test WhatsApp (at most one every 5 minutes). */
export async function sendMyTestWhatsApp(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const actor = await me();
    const admin = createServiceRoleClient();
    const { data: user } = await admin
      .from("users")
      .select("phone_e164, whatsapp_notifications, whatsapp_opt_in_at")
      .eq("id", actor.userId)
      .maybeSingle();
    if (!user?.whatsapp_notifications || !user.whatsapp_opt_in_at || !isValidE164(user.phone_e164)) {
      return { ok: false, error: "Turn on WhatsApp alerts and save your mobile number first." };
    }
    const since = new Date(Date.now() - 5 * 60_000).toISOString();
    const { count } = await admin
      .from("notification_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", actor.userId)
      .eq("channel", "whatsapp")
      .eq("title", "BuildView test message")
      .gte("created_at", since);
    if ((count ?? 0) > 0) return { ok: false, error: "A test was sent in the last 5 minutes. Check WhatsApp." };

    const result = await sendWhatsAppMessage({
      toE164: user.phone_e164!,
      body: "*BuildView* — test message\n\nWhatsApp notifications are working for your account.",
      templateKey: "teamUpdate",
      variables: { title: "BuildView test message", message: "WhatsApp notifications are working for your account." },
    });
    await admin.from("notification_deliveries").insert({
      user_id: actor.userId,
      channel: "whatsapp",
      rule: null,
      status: result.ok ? "sent" : result.skipped ? "skipped" : "failed",
      provider_id: result.providerId ?? null,
      error: result.error ?? null,
      title: "BuildView test message",
    });
    if (!result.ok) return { ok: false, error: result.error ?? "WhatsApp could not be sent." };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: getErrorMessage(err, "Could not send the test message.") };
  }
}
