"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getMyTeamNotificationPrefs,
  saveMyTeamNotificationPref,
  sendMyTestWhatsApp,
  type TeamPrefsView,
} from "@/lib/actions/team-notifications";
import {
  TEAM_EVENTS,
  TEAM_EVENT_LABELS,
  type TeamEvent,
  type WhatsAppMode,
} from "@/lib/notifications/team-events";
import { cn } from "@/lib/utils";

const MODES: { value: WhatsAppMode; label: string }[] = [
  { value: "instant", label: "Instant" },
  { value: "digest", label: "Digest" },
  { value: "off", label: "Off" },
];

/**
 * Per-event WhatsApp choice for project team activity. Everything always
 * reaches the bell instantly; this only decides WhatsApp.
 */
export function TeamWhatsAppPrefs() {
  const [view, setView] = useState<TeamPrefsView | null>(null);
  const [savingEvent, setSavingEvent] = useState<TeamEvent | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [testing, startTest] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getMyTeamNotificationPrefs().then((v) => {
      if (!cancelled) setView(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!view) {
    return <div className="portal-card h-40 animate-pulse" aria-label="Loading WhatsApp choices" />;
  }
  if (!view.ok) {
    return <p className="text-sm text-red-600">{view.error}</p>;
  }

  async function choose(event: TeamEvent, mode: WhatsAppMode) {
    if (!view || !view.ok || view.prefs[event] === mode) return;
    const previous = view.prefs[event];
    setView({ ...view, prefs: { ...view.prefs, [event]: mode } });
    setSavingEvent(event);
    setMessage(null);
    const result = await saveMyTeamNotificationPref({ event, mode });
    setSavingEvent(null);
    if (!result.ok) {
      setView((v) => (v && v.ok ? { ...v, prefs: { ...v.prefs, [event]: previous } } : v));
      setMessage({ kind: "error", text: result.error });
    }
  }

  return (
    <section aria-labelledby="team-wa-heading" className="portal-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="team-wa-heading" className="text-sm font-medium text-slate-900 dark:text-white">
            Project team activity on WhatsApp
          </h3>
          <p className="mt-0.5 max-w-xl text-xs text-slate-500">
            Everything below always appears in your notifications bell straight away. Choose what also comes on
            WhatsApp: <strong>Instant</strong>, in the <strong>Digest</strong> (one summary at 1 pm and 7 pm), or{" "}
            <strong>Off</strong>. Instant messages wait until 8 am during quiet hours (9 pm–8 am).
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={testing || !view.whatsappReady}
          onClick={() =>
            startTest(async () => {
              setMessage(null);
              const r = await sendMyTestWhatsApp();
              setMessage(r.ok ? { kind: "ok", text: "Test sent. Check WhatsApp." } : { kind: "error", text: r.error });
            })
          }
        >
          {testing ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
          Send test message
        </Button>
      </div>

      {!view.whatsappReady ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Turn on WhatsApp alerts and save your mobile number above to receive these.
        </p>
      ) : null}
      {!view.available ? (
        <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          These choices become active once BuildView finishes the notification update.
        </p>
      ) : null}

      <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
        {TEAM_EVENTS.map((event) => (
          <li key={event} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="text-sm text-slate-800 dark:text-slate-200">{TEAM_EVENT_LABELS[event].label}</p>
              <p className="text-xs text-slate-500">{TEAM_EVENT_LABELS[event].hint}</p>
            </div>
            <div
              role="radiogroup"
              aria-label={`${TEAM_EVENT_LABELS[event].label} on WhatsApp`}
              className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-slate-800"
            >
              {MODES.map((m) => {
                const active = view.prefs[event] === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={savingEvent === event || !view.available}
                    onClick={() => choose(event, m.value)}
                    className={cn(
                      "min-h-9 min-w-16 rounded-md px-2.5 font-medium transition-colors disabled:opacity-60",
                      active
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
                    )}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      {message ? (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={cn("mt-2 text-sm", message.kind === "error" ? "text-red-600" : "text-emerald-700 dark:text-emerald-400")}
        >
          {message.text}
        </p>
      ) : null}
      {!view.providerReady ? (
        <p className="mt-2 text-xs text-slate-500">WhatsApp sending isn&apos;t configured on this server yet.</p>
      ) : null}
    </section>
  );
}
