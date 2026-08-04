import { LeadPriority, LeadStatus } from "@prisma/client";
import { z } from "zod";

const emptyToUndefined = (value: unknown) => {
  if (value === "" || value === null || value === undefined) return undefined;
  return value;
};

const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional());
const optionalEmail = z.preprocess(
  emptyToUndefined,
  z.string().trim().email("Invalid email").optional()
);
const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "number") return value;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : value;
}, z.number().nonnegative().optional());

const optionalDate = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (value instanceof Date) return value.toISOString();
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(`${str}T12:00:00.000Z`).toISOString();
  }
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}, z.string().optional());

export const leadFormSchema = z.object({
  company: z.string().trim().min(1, "Company is required").max(200),
  contactName: z.string().trim().min(1, "Contact name is required").max(200),
  email: optionalEmail,
  phone: optionalString,
  whatsapp: optionalString,
  linkedin: optionalString,
  website: optionalString,
  industry: optionalString,
  location: optionalString,
  designation: optionalString,
  leadSource: optionalString,
  priority: z.nativeEnum(LeadPriority).default(LeadPriority.MEDIUM),
  status: z.nativeEnum(LeadStatus).default(LeadStatus.NEW),
  projectType: optionalString,
  budget: optionalNumber,
  expectedRevenue: optionalNumber,
  notes: optionalString,
  tags: z.array(z.string().trim().min(1)).default([]),
  nextFollowUpAt: optionalDate,
  lastContactedAt: optionalDate,
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;

export const leadFiltersSchema = z.object({
  q: z.string().optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  priority: z.nativeEnum(LeadPriority).optional(),
  leadSource: z.string().optional(),
  industry: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
});

export type LeadFilters = z.infer<typeof leadFiltersSchema>;

export const bulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  status: z.nativeEnum(LeadStatus).optional(),
  priority: z.nativeEnum(LeadPriority).optional(),
  softDelete: z.boolean().optional(),
});
