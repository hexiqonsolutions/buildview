"use client";

import { useEffect, useState, useActionState } from "react";
import { Loader2, Moon, Sun, Building2, Bell, LifeBuoy, Mail, Phone } from "lucide-react";
import { updateProfile, type ProfileActionState } from "@/lib/actions/profile";
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
  supportEmail: string;
  supportPhone: string;
}

export function ProfileForm({ user, client, supportEmail, supportPhone }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfile, initialState);
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [issueAlerts, setIssueAlerts] = useState(true);

  useEffect(() => {
    setDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleDarkMode(checked: boolean) {
    setDarkMode(checked);
    document.documentElement.classList.toggle("dark", checked);
    localStorage.setItem("theme", checked ? "dark" : "light");
  }

  const mailtoHref = `mailto:${supportEmail}?subject=${encodeURIComponent(
    "BuildView portal support"
  )}&body=${encodeURIComponent(
    `Hi BuildView team,\n\nI need help with the portal.\n\nAccount: ${user.email}\nName: ${user.full_name}\n\nIssue:\n`
  )}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Tabs defaultValue="contact" className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-slate-100 p-1 dark:bg-slate-800">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="theme">Theme</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
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
                {client.phone && (
                  <div>
                    <dt className="text-xs text-slate-500">Phone</dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                      {client.phone}
                    </dd>
                  </div>
                )}
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
                  placeholder="+91 98765 43210"
                  disabled={isPending}
                  className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
              {state.success && (
                <p className="text-sm text-green-600 dark:text-green-400">{state.success}</p>
              )}

              <Button type="submit" variant="outline" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
          <div className="portal-card divide-y divide-slate-100 dark:divide-slate-800">
            <div className="flex items-center justify-between p-5">
              <div className="flex items-start gap-3">
                <Bell className="mt-0.5 h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    Email notifications
                  </p>
                  <p className="text-xs text-slate-500">Reports and document uploads</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={emailNotifications}
                onClick={() => setEmailNotifications((v) => !v)}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  emailNotifications ? "bg-slate-900 dark:bg-white" : "bg-slate-200 dark:bg-slate-700"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform dark:bg-slate-900",
                    emailNotifications ? "left-5" : "left-0.5"
                  )}
                />
              </button>
            </div>
            <div className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Issue alerts</p>
                <p className="text-xs text-slate-500">Critical and high-priority issues</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={issueAlerts}
                onClick={() => setIssueAlerts((v) => !v)}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  issueAlerts ? "bg-slate-900 dark:bg-white" : "bg-slate-200 dark:bg-slate-700"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform dark:bg-slate-900",
                    issueAlerts ? "left-5" : "left-0.5"
                  )}
                />
              </button>
            </div>
          </div>
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
              <button
                type="button"
                role="switch"
                aria-checked={darkMode}
                onClick={() => toggleDarkMode(!darkMode)}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  darkMode ? "bg-slate-900 dark:bg-white" : "bg-slate-200 dark:bg-slate-700"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform dark:bg-slate-900",
                    darkMode ? "left-5" : "left-0.5"
                  )}
                />
              </button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="support" className="mt-6">
          <div className="portal-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <LifeBuoy className="h-4 w-4 text-slate-400" />
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Need help?
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              For portal access, projects, walkthroughs, or account questions, reach the BuildView
              team. We typically respond within one business day.
            </p>

            <dl className="mt-5 space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-slate-400" />
                <div>
                  <dt className="text-xs text-slate-500">Support email</dt>
                  <dd className="mt-1">
                    <a
                      href={mailtoHref}
                      className="text-sm font-medium text-slate-900 underline-offset-2 hover:underline dark:text-white"
                    >
                      {supportEmail}
                    </a>
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-slate-400" />
                <div>
                  <dt className="text-xs text-slate-500">Phone</dt>
                  <dd className="mt-1">
                    <a
                      href={`tel:${supportPhone.replace(/\s+/g, "")}`}
                      className="text-sm font-medium text-slate-900 underline-offset-2 hover:underline dark:text-white"
                    >
                      {supportPhone}
                    </a>
                  </dd>
                </div>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="outline" asChild>
                <a href={mailtoHref}>Email support</a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/contact" target="_blank" rel="noopener noreferrer">
                  Contact us
                </a>
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
