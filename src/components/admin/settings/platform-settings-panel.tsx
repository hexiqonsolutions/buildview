"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import {
  DEFAULT_PLATFORM_SETTINGS,
  type PlatformSettings,
} from "@/lib/admin/platform-settings";
import { updatePlatformSettings } from "@/lib/actions/platform-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-brand-accent" : "bg-slate-200 dark:bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export function PlatformSettingsPanel({
  initialSettings = DEFAULT_PLATFORM_SETTINGS,
}: {
  initialSettings?: PlatformSettings;
}) {
  const [settings, setSettings] = useState<PlatformSettings>(initialSettings);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateSettings(partial: Partial<PlatformSettings>) {
    setSettings((prev) => ({ ...prev, ...partial }));
    setSaved(false);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updatePlatformSettings(settings);
    setSaving(false);
    if (result.success) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } else {
      setError(result.error ?? "Failed to save settings");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="ops-card p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Company branding
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Displayed across the ops center and client portal headers.
          </p>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company name</Label>
              <Input
                id="companyName"
                value={settings.companyName}
                onChange={(e) => updateSettings({ companyName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={settings.supportEmail}
                onChange={(e) => updateSettings({ supportEmail: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="ops-card p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            System preferences
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Defaults applied when creating invoices and scheduling events.
          </p>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultCurrency">Default currency</Label>
              <Input
                id="defaultCurrency"
                value={settings.defaultCurrency}
                onChange={(e) => updateSettings({ defaultCurrency: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={settings.timezone}
                onChange={(e) => updateSettings({ timezone: e.target.value })}
                placeholder="Asia/Kolkata"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="ops-card p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Notification rules
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Controls in-app alerts and optional email for clients and admins.
        </p>
        <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
          <ToggleRow
            label="Notify clients on uploads"
            description="Matterport scans, reports, and documents uploaded to their projects."
            checked={settings.notifications.onUpload}
            onChange={(onUpload) =>
              updateSettings({
                notifications: { ...settings.notifications, onUpload },
              })
            }
          />
          <ToggleRow
            label="Alert admins on critical issues"
            description="High and critical issues notify BuildView staff."
            checked={settings.notifications.onCriticalIssue}
            onChange={(onCriticalIssue) =>
              updateSettings({
                notifications: { ...settings.notifications, onCriticalIssue },
              })
            }
          />
          <ToggleRow
            label="Notify clients when invoice sent"
            description="Client users receive an alert when invoice status changes to sent."
            checked={settings.notifications.onInvoiceSent}
            onChange={(onInvoiceSent) =>
              updateSettings({
                notifications: { ...settings.notifications, onInvoiceSent },
              })
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="ops-btn-primary">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save settings
            </>
          )}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Saved to platform database
          </span>
        )}
        {error && <span className="text-sm text-rose-600">{error}</span>}
      </div>
    </div>
  );
}
