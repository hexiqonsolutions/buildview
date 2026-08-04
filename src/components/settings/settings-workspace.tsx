"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { MembershipRole } from "@prisma/client";
import { Loader2, Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createInvitationAction,
  removeMemberAction,
  revokeInvitationAction,
  updateMemberRoleAction,
  updateOrganizationAction,
  updatePreferencesAction,
  updateProfileAction,
} from "@/lib/settings/actions";
import {
  INVITE_ROLES,
  SETTINGS_SECTIONS,
  roleLabel,
  type OrgPreferences,
  type SettingsSection,
} from "@/lib/settings/schema";
import type {
  SettingsInvitation,
  SettingsMember,
  SettingsOrganization,
  SettingsProfile,
} from "@/lib/settings/queries";

type SettingsWorkspaceProps = {
  section: SettingsSection;
  role: MembershipRole;
  organization: SettingsOrganization;
  members: SettingsMember[];
  invitations: SettingsInvitation[];
  profile: SettingsProfile;
  appUrl: string;
};

const SECTION_LABELS: Record<SettingsSection, string> = {
  organization: "Organization",
  team: "Team",
  preferences: "Preferences",
  profile: "Profile",
};

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function SettingsWorkspace({
  section,
  role,
  organization,
  members,
  invitations,
  profile,
  appUrl,
}: SettingsWorkspaceProps) {
  const canManageOrg =
    role === MembershipRole.OWNER || role === MembershipRole.ADMIN;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [orgName, setOrgName] = useState(organization.name);
  const [website, setWebsite] = useState(organization.website || "");
  const [phone, setPhone] = useState(organization.phone || "");
  const [address, setAddress] = useState(organization.address || "");

  const [prefs, setPrefs] = useState<OrgPreferences>(organization.preferences);
  const [fullName, setFullName] = useState(profile.fullName || "");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "SALES" | "VIEWER">(
    "SALES"
  );

  useEffect(() => {
    setOrgName(organization.name);
    setWebsite(organization.website || "");
    setPhone(organization.phone || "");
    setAddress(organization.address || "");
    setPrefs(organization.preferences);
  }, [organization]);

  useEffect(() => {
    setFullName(profile.fullName || "");
  }, [profile]);

  function setSection(next: SettingsSection) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "organization") params.delete("section");
    else params.set("section", next);
    router.push(`/settings?${params.toString()}`);
  }

  function inviteLink(token: string) {
    return `${appUrl.replace(/\/$/, "")}/signup?invite=${token}`;
  }

  async function copyInvite(token: string) {
    try {
      await navigator.clipboard.writeText(inviteLink(token));
      toast.success("Invite link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-5 p-5 md:p-7">
      <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.12] via-[#121212] to-[#0A0A0A] px-5 py-5 md:px-6">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-300/90">
          Settings
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
          Workspace & team
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Organization profile, invitations, preferences, and your account.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SETTINGS_SECTIONS.map((item) => (
          <Button
            key={item}
            size="sm"
            variant={section === item ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => setSection(item)}
          >
            {SECTION_LABELS[item]}
          </Button>
        ))}
      </div>

      {section === "organization" ? (
        <section className="rounded-2xl border border-zinc-800/80 bg-[#121212] p-5 md:p-6">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
            Organization
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            Slug <span className="text-zinc-300">{organization.slug}</span>
          </p>
          <form
            className="mt-5 grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canManageOrg) return;
              startTransition(async () => {
                const result = await updateOrganizationAction({
                  name: orgName,
                  website: website || undefined,
                  phone: phone || undefined,
                  address: address || undefined,
                });
                if (!result.ok) toast.error(result.error);
                else toast.success("Organization updated");
              });
            }}
          >
            <div className="space-y-2 sm:col-span-2">
              <Label>Name</Label>
              <Input
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={!canManageOrg}
              />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://"
                disabled={!canManageOrg}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!canManageOrg}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={!canManageOrg}
              />
            </div>
            {canManageOrg ? (
              <div className="sm:col-span-2">
                <Button type="submit" disabled={pending} className="cursor-pointer">
                  {pending ? <Loader2 className="animate-spin" /> : null}
                  Save organization
                </Button>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 sm:col-span-2">
                Only owners and admins can edit organization details.
              </p>
            )}
          </form>
        </section>
      ) : null}

      {section === "team" ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-zinc-800/80 bg-[#121212] p-5 md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
                  Team members
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  {members.length} active members
                </p>
              </div>
              {canManageOrg ? (
                <Button
                  className="cursor-pointer"
                  onClick={() => setInviteOpen(true)}
                >
                  <Plus className="size-4" />
                  Invite member
                </Button>
              ) : null}
            </div>

            <ul className="mt-5 divide-y divide-zinc-800/80">
              {members.map((member) => {
                const canEdit =
                  canManageOrg &&
                  member.user.id !== profile.id &&
                  member.role !== "OWNER";
                return (
                  <li
                    key={member.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">
                        {member.user.fullName || member.user.email}
                      </p>
                      <p className="truncate text-sm text-zinc-500">
                        {member.user.email}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {canEdit ? (
                        <Select
                          value={member.role}
                          onValueChange={(value) =>
                            startTransition(async () => {
                              const result = await updateMemberRoleAction(
                                member.id,
                                { role: value }
                              );
                              if (!result.ok) toast.error(result.error);
                              else toast.success("Role updated");
                            })
                          }
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(role === MembershipRole.OWNER
                              ? ["ADMIN", "SALES", "VIEWER"]
                              : ["SALES", "VIEWER"]
                            ).map((item) => (
                              <SelectItem key={item} value={item}>
                                {roleLabel(item)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">{roleLabel(member.role)}</Badge>
                      )}
                      {canEdit ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="cursor-pointer"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await removeMemberAction(member.id);
                              if (!result.ok) toast.error(result.error);
                              else toast.success("Member removed");
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-2xl border border-zinc-800/80 bg-[#121212] p-5 md:p-6">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
              Pending invitations
            </h3>
            {invitations.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">No pending invites</p>
            ) : (
              <ul className="mt-4 divide-y divide-zinc-800/80">
                {invitations.map((invite) => (
                  <li
                    key={invite.id}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-white">{invite.email}</p>
                      <p className="text-sm text-zinc-500">
                        {roleLabel(invite.role)} · expires{" "}
                        {format(new Date(invite.expiresAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {invite.status === "PENDING" ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => copyInvite(invite.token)}
                        >
                          <Copy className="size-4" />
                          Copy link
                        </Button>
                      ) : (
                        <Badge variant="warning">{invite.status}</Badge>
                      )}
                      {canManageOrg && invite.status === "PENDING" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="cursor-pointer"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await revokeInvitationAction(
                                invite.id
                              );
                              if (!result.ok) toast.error(result.error);
                              else toast.success("Invitation revoked");
                            })
                          }
                        >
                          Revoke
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {section === "preferences" ? (
        <section className="rounded-2xl border border-zinc-800/80 bg-[#121212] p-5 md:p-6">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
            Preferences
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            Workspace defaults for timezone, currency, and leads.
          </p>
          <form
            className="mt-5 grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canManageOrg) return;
              startTransition(async () => {
                const result = await updatePreferencesAction(prefs);
                if (!result.ok) toast.error(result.error);
                else toast.success("Preferences saved");
              });
            }}
          >
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={prefs.timezone}
                onValueChange={(value) =>
                  setPrefs((prev) => ({ ...prev, timezone: value }))
                }
                disabled={!canManageOrg}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={prefs.currency}
                onValueChange={(value) =>
                  setPrefs((prev) => ({ ...prev, currency: value }))
                }
                disabled={!canManageOrg}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["USD", "EUR", "GBP", "INR", "AED", "AUD", "CAD"].map(
                    (code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Week starts on</Label>
              <Select
                value={String(prefs.weekStartsOn)}
                onValueChange={(value) =>
                  setPrefs((prev) => ({
                    ...prev,
                    weekStartsOn: Number(value) as 0 | 1,
                  }))
                }
                disabled={!canManageOrg}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="0">Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default lead priority</Label>
              <Select
                value={prefs.defaultLeadPriority}
                onValueChange={(value) =>
                  setPrefs((prev) => ({
                    ...prev,
                    defaultLeadPriority: value as OrgPreferences["defaultLeadPriority"],
                  }))
                }
                disabled={!canManageOrg}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["LOW", "MEDIUM", "HIGH", "URGENT"].map((item) => (
                    <SelectItem key={item} value={item}>
                      {roleLabel(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canManageOrg ? (
              <div className="sm:col-span-2">
                <Button type="submit" disabled={pending} className="cursor-pointer">
                  {pending ? <Loader2 className="animate-spin" /> : null}
                  Save preferences
                </Button>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 sm:col-span-2">
                Only owners and admins can change preferences.
              </p>
            )}
          </form>
        </section>
      ) : null}

      {section === "profile" ? (
        <section className="rounded-2xl border border-zinc-800/80 bg-[#121212] p-5 md:p-6">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
            Your profile
          </h3>
          <p className="mt-1 text-sm text-zinc-500">{profile.email}</p>
          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const result = await updateProfileAction({ fullName });
                if (!result.ok) toast.error(result.error);
                else toast.success("Profile updated");
              });
            }}
          >
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{roleLabel(role)}</Badge>
              <span className="text-sm text-zinc-500">Your role</span>
            </div>
            <Button type="submit" disabled={pending} className="cursor-pointer">
              {pending ? <Loader2 className="animate-spin" /> : null}
              Save profile
            </Button>
          </form>
        </section>
      ) : null}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite teammate</DialogTitle>
            <DialogDescription>
              They join this workspace after signing up with the invited email.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const result = await createInvitationAction({
                  email: inviteEmail,
                  role: inviteRole,
                });
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                if (result.data?.token) {
                  await copyInvite(result.data.token);
                }
                toast.success("Invitation created");
                setInviteOpen(false);
                setInviteEmail("");
                setInviteRole("SALES");
              });
            }}
          >
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={inviteRole}
                onValueChange={(value) =>
                  setInviteRole(value as "ADMIN" | "SALES" | "VIEWER")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.filter((item) =>
                    role === MembershipRole.ADMIN ? item !== "ADMIN" : true
                  ).map((item) => (
                    <SelectItem key={item} value={item}>
                      {roleLabel(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setInviteOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending} className="cursor-pointer">
                {pending ? <Loader2 className="animate-spin" /> : null}
                Send invite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
