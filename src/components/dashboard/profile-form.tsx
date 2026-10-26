"use client";

import { useEffect, useState, useActionState } from "react";
import { Loader2, Moon, Sun, Building2, Bell, MessageCircle } from "lucide-react";
import {
  updateProfile,
  updateNotificationPreferences,
  type ProfileActionState,
} from "@/lib/actions/profile";
import { ProfileAvatarEditor } from "@/components/dashboard/profile-avatar-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { User, Client } from "@/lib/types";

const initialState: ProfileActionState = {};

interface ProfileFormProps {
  user: User;
  client?: Client | null;
}

function PreferenceSwitch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-6 w-11 cursor-pointer rounded-full transition-colors duration-200",
        checked ? "bg-slate-900 dark:bg-white" : "bg-slate-200 dark:bg-slate-700"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 dark:bg-slate-900",
          checked ? "left-5" : "left-0.5"
        )}
      />
    </button>
  );
}

export function ProfileForm({ user, client }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfile, initialState);
  const [notifyState, notifyAction, notifyPending] = useActionState(
    updateNotificationPreferences,
    initialState
  );
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(
    user.email_notifications !== false
  );
  const [whatsappNotifications, setWhatsappNotifications] = useState(
    Boolean(user.whatsapp_notifications)
  );
  const [whatsappPhone, setWhatsappPhone] = useState(
    user.phone_e164 || user.phone || ""
  );

  useEffect(() => {
    setDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    setEmailNotifications(user.email_notifications !== false);
    setWhatsappNotifications(Boolean(user.whatsapp_notifications));
    setWhatsappPhone(user.phone_e164 || user.phone || "");
  }, [
    user.email_notifications,
    user.whatsapp_notifications,
    user.phone_e164,
    user.phone,
  ]);

  function toggleDarkMode(checked: boolean) {
    setDarkMode(checked);
    document.documentElement.classList.toggle("dark", checked);
    localStorage.setItem("theme", checked ? "dark" : "light");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ProfileAvatarEditor user={user} />

      <Tabs defaultValue="contact" className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-slate-100 p-1 dark:bg-slate-800">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="theme">Theme</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-6">
          <div className="portal-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Company Details
              </h2>
            </div>
            {client ? (
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-500">Company Name</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                    {client.company_name || client.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Contact Email</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                    {client.email}
                  </dd>
                </div>
                {client.phone ? (
                  <div>
                    <dt className="text-xs text-slate-500">Phone</dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                      {client.phone}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs text-slate-500">Subscription</dt>
                  <dd className="mt-1 text-sm font-medium capitalize text-slate-900 dark:text-white">
                    {client.subscription_status}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-slate-500">
                Company details are managed by your BuildView administrator.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="contact" className="mt-6">
          <div className="portal-card p-6">
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  value={user.email}
                  disabled
                  readOnly
                  className="border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-slate-700 dark:text-slate-300">
                  Full Name
                </Label>
                <Input
                  id="full_name"
                  name="full_name"
                  defaultValue={user.full_name}
                  required
                  disabled={isPending}
                  className="border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-700 dark:text-slate-300">
                  Phone
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={user.phone ?? ""}
                  placeholder="+91 86552 24990"
                  disabled={isPending}
                  className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              {state.error ? (
                <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
              ) : null}
              {state.success ? (
                <p className="text-sm text-green-600 dark:text-green-400">{state.success}</p>
              ) : null}

              <Button type="submit" variant="outline" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="password" className="mt-6">
          <div className="portal-card p-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Password changes are handled securely through email verification. Use the sign-in page
              &quot;Forgot password&quot; link to reset your password.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <a href="/login">Go to Sign In</a>
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <form action={notifyAction} className="space-y-4">
            <input
              type="hidden"
              name="email_notifications"
              value={emailNotifications ? "true" : "false"}
            />
            <input
              type="hidden"
              name="whatsapp_notifications"
              value={whatsappNotifications ? "true" : "false"}
            />

            <div className="portal-card divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex items-center justify-between gap-4 p-5">
                <div className="flex items-start gap-3">
                  <Bell className="mt-0.5 h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      Email notifications
                    </p>
                    <p className="text-xs text-slate-500">
                      Uploads, timeline, reports, issues, and invoices
                    </p>
                  </div>
                </div>
                <PreferenceSwitch
                  label="Email notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <div className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <MessageCircle className="mt-0.5 h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        WhatsApp alerts
                      </p>
                      <p className="text-xs text-slate-500">
                        Critical issues, invoices, and project removal only
                      </p>
                    </div>
                  </div>
                  <PreferenceSwitch
                    label="WhatsApp alerts"
                    checked={whatsappNotifications}
                    onCheckedChange={setWhatsappNotifications}
                  />
                </div>

                <div>
                  <Label
                    htmlFor="whatsapp_phone"
                    className="text-slate-700 dark:text-slate-300"
                  >
                    WhatsApp mobile
                  </Label>
                  <Input
                    id="whatsapp_phone"
                    name="phone"
                    value={whatsappPhone}
                    onChange={(event) => setWhatsappPhone(event.target.value)}
                    placeholder="+91 86552 24990"
                    className="mt-1.5"
                    disabled={!whatsappNotifications}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Use country code. Indian 10-digit numbers are stored as +91…
                  </p>
                </div>
              </div>
            </div>

            {notifyState.error ? (
              <p className="text-sm text-red-600 dark:text-red-400">{notifyState.error}</p>
            ) : null}
            {notifyState.success ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                {notifyState.success}
              </p>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={notifyPending}>
                {notifyPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save notification preferences"
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="theme" className="mt-6">
          <div className="portal-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                {darkMode ? (
                  <Moon className="mt-0.5 h-4 w-4 text-slate-400" />
                ) : (
                  <Sun className="mt-0.5 h-4 w-4 text-slate-400" />
                )}
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Dark mode</p>
                  <p className="text-xs text-slate-500">Switch between light and dark interface</p>
                </div>
              </div>
              <PreferenceSwitch
                label="Dark mode"
                checked={darkMode}
                onCheckedChange={toggleDarkMode}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
