import { MembershipRole } from "@prisma/client";
import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;

export const SETTINGS_SECTIONS = [
  "organization",
  "team",
  "preferences",
  "profile",
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export function isSettingsSection(
  value: string | undefined
): value is SettingsSection {
  return SETTINGS_SECTIONS.includes(value as SettingsSection);
}

export const MEMBERSHIP_ROLES: MembershipRole[] = [
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.SALES,
  MembershipRole.VIEWER,
];

export const INVITE_ROLES: MembershipRole[] = [
  MembershipRole.ADMIN,
  MembershipRole.SALES,
  MembershipRole.VIEWER,
];

export const organizationFormSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  website: z.preprocess(
    emptyToUndefined,
    z.string().trim().url("Enter a valid URL").optional()
  ),
  phone: z.preprocess(emptyToUndefined, z.string().trim().max(40).optional()),
  address: z.preprocess(emptyToUndefined, z.string().trim().max(300).optional()),
});

export const preferencesFormSchema = z.object({
  timezone: z.string().trim().min(1).max(80),
  currency: z.string().trim().min(3).max(3),
  weekStartsOn: z.coerce
    .number()
    .refine((value): value is 0 | 1 => value === 0 || value === 1, {
      message: "Week must start on Sunday or Monday",
    }),
  defaultLeadPriority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
});

export const profileFormSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(120),
});

export const inviteFormSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  role: z.enum(["ADMIN", "SALES", "VIEWER"]),
});

export const membershipRoleSchema = z.object({
  role: z.nativeEnum(MembershipRole),
});

export type OrganizationFormValues = z.infer<typeof organizationFormSchema>;
export type PreferencesFormValues = z.infer<typeof preferencesFormSchema>;
export type ProfileFormValues = z.infer<typeof profileFormSchema>;
export type InviteFormValues = z.infer<typeof inviteFormSchema>;

export type OrgPreferences = PreferencesFormValues;

export const DEFAULT_PREFERENCES: OrgPreferences = {
  timezone: "UTC",
  currency: "USD",
  weekStartsOn: 1,
  defaultLeadPriority: "MEDIUM",
};

export function parsePreferences(value: unknown): OrgPreferences {
  const parsed = preferencesFormSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  if (value && typeof value === "object") {
    return {
      ...DEFAULT_PREFERENCES,
      ...(value as Partial<OrgPreferences>),
    };
  }
  return { ...DEFAULT_PREFERENCES };
}

export function roleLabel(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}
