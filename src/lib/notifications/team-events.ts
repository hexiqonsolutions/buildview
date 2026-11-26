/**
 * Team notification events: catalogue, default WhatsApp delivery, quiet hours
 * and digest wording. Pure (no I/O) so it is shared by server and UI and tested.
 */

export type TeamEvent =
  | "step_started"
  | "step_ended"
  | "step_reviewed"
  | "zone_update"
  | "evidence_linked"
  | "comment"
  | "comment_reply"
  | "scan_uploaded";

export type WhatsAppMode = "instant" | "digest" | "off";

export const TEAM_EVENTS: readonly TeamEvent[] = [
  "step_started",
  "step_ended",
  "step_reviewed",
  "zone_update",
  "evidence_linked",
  "comment",
  "comment_reply",
  "scan_uploaded",
];

export const TEAM_EVENT_LABELS: Record<TeamEvent, { label: string; hint: string }> = {
  step_started: { label: "Checklist step started", hint: "Someone starts a step on a floor." },
  step_ended: { label: "Checklist step ended", hint: "Someone marks a step done." },
  step_reviewed: {
    label: "Your work verified or rejected",
    hint: "A verifier reviews a step or zone update you recorded.",
  },
  zone_update: { label: "Zone trade updated", hint: "A flat or room moves to a new stage." },
  evidence_linked: { label: "Scan linked as evidence", hint: "A 360 scan is attached to a step." },
  comment: { label: "New comment", hint: "Someone comments on the project." },
  comment_reply: { label: "Reply to your comment", hint: "Someone replies to a thread you started." },
  scan_uploaded: { label: "New 360 scan", hint: "A virtual tour scan is uploaded." },
};

/** Defaults: instant only for what needs action now; routine site activity is digested. */
export const DEFAULT_WHATSAPP_MODE: Record<TeamEvent, WhatsAppMode> = {
  step_started: "digest",
  step_ended: "digest",
  step_reviewed: "instant",
  zone_update: "digest",
  evidence_linked: "digest",
  comment: "digest",
  comment_reply: "instant",
  scan_uploaded: "instant",
};

export function isTeamEvent(value: unknown): value is TeamEvent {
  return typeof value === "string" && (TEAM_EVENTS as readonly string[]).includes(value);
}

export function isWhatsAppMode(value: unknown): value is WhatsAppMode {
  return value === "instant" || value === "digest" || value === "off";
}

export function whatsappModeFor(
  event: TeamEvent,
  prefs: Partial<Record<string, string>> | undefined
): WhatsAppMode {
  const own = prefs?.[event];
  return isWhatsAppMode(own) ? own : DEFAULT_WHATSAPP_MODE[event];
}

// ------------------------------------------------------------- quiet hours

/** Quiet hours in India time: instant WhatsApp waits until morning (not critical alerts). */
export const QUIET_HOURS = { startHour: 21, endHour: 8, timeZone: "Asia/Kolkata", offsetMinutes: 330 } as const;

function istParts(now: Date): { hour: number; dayStartUtcMs: number } {
  const ist = new Date(now.getTime() + QUIET_HOURS.offsetMinutes * 60_000);
  const dayStartIst = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  return { hour: ist.getUTCHours(), dayStartUtcMs: dayStartIst - QUIET_HOURS.offsetMinutes * 60_000 };
}

export function isQuietHours(now: Date = new Date()): boolean {
  const { hour } = istParts(now);
  return hour >= QUIET_HOURS.startHour || hour < QUIET_HOURS.endHour;
}

/** When an instant message created at `now` may be sent: now, or 8 am IST next. */
export function sendAfterFor(now: Date = new Date()): Date {
  if (!isQuietHours(now)) return now;
  const { hour, dayStartUtcMs } = istParts(now);
  const morning = dayStartUtcMs + QUIET_HOURS.endHour * 3_600_000;
  return new Date(hour < QUIET_HOURS.endHour ? morning : morning + 86_400_000);
}

/** Most instant WhatsApp messages per person per hour; extras go to the digest. */
export const INSTANT_PER_HOUR = 6;

// ------------------------------------------------------------------ digest

export type DigestItem = { event: TeamEvent; projectName: string; title: string };

/** One line per project: counts by kind, e.g. "14 steps ended · 3 started · 2 scans". */
export function digestSummary(items: DigestItem[]): { projectName: string; line: string }[] {
  const byProject = new Map<string, Map<string, number>>();
  for (const item of items) {
    const kind = DIGEST_KIND[item.event];
    const counts = byProject.get(item.projectName) ?? new Map<string, number>();
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
    byProject.set(item.projectName, counts);
  }
  return [...byProject.entries()].map(([projectName, counts]) => ({
    projectName,
    line: DIGEST_ORDER.filter((k) => counts.has(k))
      .map((k) => `${counts.get(k)} ${plural(k, counts.get(k)!)}`)
      .join(" · "),
  }));
}

const DIGEST_KIND: Record<TeamEvent, string> = {
  step_ended: "step ended",
  step_started: "step started",
  step_reviewed: "review",
  zone_update: "zone update",
  evidence_linked: "evidence link",
  comment: "comment",
  comment_reply: "reply",
  scan_uploaded: "new scan",
};
const DIGEST_ORDER = ["step ended", "step started", "zone update", "new scan", "comment", "reply", "review", "evidence link"];

const PLURALS: Record<string, string> = {
  "step ended": "steps ended",
  "step started": "steps started",
  "zone update": "zone updates",
  "new scan": "new scans",
  comment: "comments",
  reply: "replies",
  review: "reviews",
  "evidence link": "evidence links",
};

function plural(kind: string, n: number): string {
  return n === 1 ? kind : (PLURALS[kind] ?? `${kind}s`);
}
