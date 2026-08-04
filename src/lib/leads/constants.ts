import { LeadPriority, LeadStatus } from "@prisma/client";

export const LEAD_STATUSES: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.QUALIFIED,
  LeadStatus.PROPOSAL,
  LeadStatus.NEGOTIATION,
  LeadStatus.WON,
  LeadStatus.LOST,
];

export const LEAD_PRIORITIES: LeadPriority[] = [
  LeadPriority.LOW,
  LeadPriority.MEDIUM,
  LeadPriority.HIGH,
  LeadPriority.URGENT,
];

export function labelize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const STATUS_BADGE: Record<
  LeadStatus,
  "default" | "secondary" | "success" | "warning" | "danger" | "outline"
> = {
  NEW: "secondary",
  CONTACTED: "outline",
  QUALIFIED: "default",
  PROPOSAL: "warning",
  NEGOTIATION: "warning",
  WON: "success",
  LOST: "danger",
};

export const PRIORITY_BADGE: Record<
  LeadPriority,
  "default" | "secondary" | "success" | "warning" | "danger" | "outline"
> = {
  LOW: "secondary",
  MEDIUM: "outline",
  HIGH: "warning",
  URGENT: "danger",
};

export const LEAD_CSV_HEADERS = [
  "company",
  "contactName",
  "email",
  "phone",
  "whatsapp",
  "linkedin",
  "website",
  "industry",
  "location",
  "designation",
  "leadSource",
  "priority",
  "status",
  "projectType",
  "budget",
  "expectedRevenue",
  "notes",
  "tags",
  "nextFollowUpAt",
] as const;
