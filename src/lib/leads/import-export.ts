import Papa from "papaparse";
import * as XLSX from "xlsx";
import { LeadPriority, LeadStatus } from "@prisma/client";
import { LEAD_PRIORITIES, LEAD_STATUSES } from "@/lib/leads/constants";

type RawRow = Record<string, unknown>;

const HEADER_ALIASES: Record<string, string> = {
  company: "company",
  "company name": "company",
  contact: "contactName",
  "contact name": "contactName",
  name: "contactName",
  email: "email",
  phone: "phone",
  mobile: "phone",
  whatsapp: "whatsapp",
  linkedin: "linkedin",
  website: "website",
  industry: "industry",
  location: "location",
  city: "location",
  designation: "designation",
  title: "designation",
  source: "leadSource",
  "lead source": "leadSource",
  priority: "priority",
  status: "status",
  "project type": "projectType",
  projecttype: "projectType",
  budget: "budget",
  "expected revenue": "expectedRevenue",
  expectedrevenue: "expectedRevenue",
  notes: "notes",
  tags: "tags",
  "next follow up": "nextFollowUpAt",
  "next follow-up": "nextFollowUpAt",
  nextfollowupat: "nextFollowUpAt",
};

function normalizeHeader(header: string): string {
  const key = header.trim().toLowerCase();
  return HEADER_ALIASES[key] ?? header.trim();
}

function normalizeStatus(value: unknown): LeadStatus | undefined {
  if (value == null || value === "") return undefined;
  const raw = String(value).trim().toUpperCase().replace(/\s+/g, "_");
  return LEAD_STATUSES.includes(raw as LeadStatus)
    ? (raw as LeadStatus)
    : undefined;
}

function normalizePriority(value: unknown): LeadPriority | undefined {
  if (value == null || value === "") return undefined;
  const raw = String(value).trim().toUpperCase();
  return LEAD_PRIORITIES.includes(raw as LeadPriority)
    ? (raw as LeadPriority)
    : undefined;
}

function normalizeTags(value: unknown): string[] {
  if (value == null || value === "") return [];
  return String(value)
    .split(/[|,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeRow(row: RawRow) {
  const mapped: RawRow = {};
  for (const [key, value] of Object.entries(row)) {
    mapped[normalizeHeader(key)] = value;
  }

  return {
    company: String(mapped.company ?? "").trim(),
    contactName: String(mapped.contactName ?? "").trim(),
    email: mapped.email ? String(mapped.email).trim() : undefined,
    phone: mapped.phone ? String(mapped.phone).trim() : undefined,
    whatsapp: mapped.whatsapp ? String(mapped.whatsapp).trim() : undefined,
    linkedin: mapped.linkedin ? String(mapped.linkedin).trim() : undefined,
    website: mapped.website ? String(mapped.website).trim() : undefined,
    industry: mapped.industry ? String(mapped.industry).trim() : undefined,
    location: mapped.location ? String(mapped.location).trim() : undefined,
    designation: mapped.designation
      ? String(mapped.designation).trim()
      : undefined,
    leadSource: mapped.leadSource ? String(mapped.leadSource).trim() : undefined,
    priority: normalizePriority(mapped.priority) ?? LeadPriority.MEDIUM,
    status: normalizeStatus(mapped.status) ?? LeadStatus.NEW,
    projectType: mapped.projectType
      ? String(mapped.projectType).trim()
      : undefined,
    budget: mapped.budget === "" || mapped.budget == null ? undefined : mapped.budget,
    expectedRevenue:
      mapped.expectedRevenue === "" || mapped.expectedRevenue == null
        ? undefined
        : mapped.expectedRevenue,
    notes: mapped.notes ? String(mapped.notes).trim() : undefined,
    tags: normalizeTags(mapped.tags),
    nextFollowUpAt: mapped.nextFollowUpAt
      ? new Date(String(mapped.nextFollowUpAt)).toISOString()
      : undefined,
  };
}

export function parseCsvFile(text: string) {
  const parsed = Papa.parse<RawRow>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length) {
    throw new Error(parsed.errors[0]?.message ?? "CSV parse failed");
  }

  return parsed.data.map(normalizeRow).filter((row) => row.company && row.contactName);
}

export function parseExcelFile(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });
  return rows.map(normalizeRow).filter((row) => row.company && row.contactName);
}

export function rowsToCsv(rows: Record<string, unknown>[]) {
  return Papa.unparse(rows);
}

export function rowsToExcel(rows: Record<string, unknown>[]) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" });
}
