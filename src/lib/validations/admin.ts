import { z } from "zod";
import {
  STORAGE_BUCKETS,
  type ClientDashboardType,
  type InvoiceStatus,
  type PortfolioCategory,
  type ProjectStatus,
  type SubscriptionStatus,
  type UserRole,
} from "@/lib/types";
import type { InvoiceNotificationKind } from "@/lib/portal/invoice-notifications";
import {
  LIMITS,
  email,
  httpsUrl,
  int,
  money,
  oneOf,
  optional,
  optionalIsoDate,
  optionalPhone,
  optionalText,
  optionalUuid,
  personName,
  storagePath,
  text,
  uuid,
} from "./primitives";

const userRoles = [
  "super_admin",
  "admin",
  "operations_manager",
  "site_engineer",
  "client",
  "client_admin",
  "site_supervisor",
  "client_user",
  "read_only_client",
  "consultant",
] as const satisfies readonly UserRole[];
const projectStatuses = [
  "planning",
  "in_progress",
  "completed",
  "on_hold",
  "archived",
  "suspended",
] as const satisfies readonly ProjectStatus[];
const staffEditableProjectStatuses = [
  "planning",
  "in_progress",
  "on_hold",
  "completed",
  "suspended",
] as const satisfies readonly ProjectStatus[];
const subscriptionStatuses = ["active", "inactive", "trial", "cancelled"] as const satisfies readonly SubscriptionStatus[];
const invoiceStatuses = ["draft", "sent", "paid", "overdue", "cancelled"] as const satisfies readonly InvoiceStatus[];
const invoiceNotificationKinds = ["sent", "pending", "paid", "overdue"] as const satisfies readonly InvoiceNotificationKind[];
const portfolioCategories = ["architecture", "interior", "real_estate"] as const satisfies readonly PortfolioCategory[];

const dashboardTypes = ["construction", "portfolio"] as const satisfies readonly ClientDashboardType[];

const ADDRESS_MAX = 500;
const AREA_SQFT_MAX = 100_000_000;

const isActive = z.boolean({
  required_error: "Active flag is required",
  invalid_type_error: "Active flag must be true or false",
});

export const updateProjectStatusSchema = z
  .object({
    projectId: uuid("Project ID"),
    status: oneOf("Project status", staffEditableProjectStatuses),
  })
  .strict();

export const createClientSchema = z
  .object({
    name: personName("Contact name"),
    company_name: optionalText("Company name", { max: LIMITS.title }),
    email: email(),
    phone: optionalPhone(),
    address: optionalText("Address", { max: ADDRESS_MAX }),
  })
  .strict();

export const updateUserSchema = z
  .object({
    id: uuid("User ID"),
    role: oneOf("Role", userRoles),
    client_id: uuid("Client").nullable(),
    is_active: isActive,
    /** Per-user override; null = inherit from client org */
    dashboard_type: oneOf("Dashboard type", dashboardTypes).nullable().optional(),
    /** Sets the linked client organization's default portal dashboard */
    client_dashboard_type: oneOf("Client dashboard type", dashboardTypes).optional(),
  })
  .strict();

export const updateClientSchema = createClientSchema
  .extend({
    id: uuid("Client ID"),
    subscription_status: oneOf("Subscription status", subscriptionStatuses),
    is_active: isActive,
    dashboard_type: oneOf("Dashboard type", dashboardTypes).optional(),
  })
  .strict();

const projectFields = {
  name: text("Project name", { min: 2, max: LIMITS.title }),
  client_id: uuid("Client"),
  client_name: text("Client name", { max: LIMITS.title }),
  location: text("Location", { max: LIMITS.title }),
  status: oneOf("Status", projectStatuses),
  description: optionalText("Description", { max: LIMITS.description, multiline: true }),
  start_date: optionalIsoDate("Start date"),
  completion_date: optionalIsoDate("Completion date"),
  area_sqft: optional(int("Area (sq ft)", { min: 1, max: AREA_SQFT_MAX })),
  portfolio_category: optional(oneOf("Category", portfolioCategories)),
};

export const createProjectSchema = z.object(projectFields).strict();

export const updateProjectSchema = z
  .object({
    id: uuid("Project ID"),
    ...projectFields,
  })
  .strict();

function isProjectCoverUrl(value: string, projectId: string): boolean {
  try {
    const url = new URL(value);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && url.host !== new URL(supabaseUrl).host) return false;
    return (
      !url.search &&
      !url.hash &&
      url.pathname.startsWith(`/storage/v1/object/public/${STORAGE_BUCKETS.PROJECT_COVERS}/${projectId}/`)
    );
  } catch {
    return false;
  }
}

export const updateProjectCoverImageSchema = z
  .object({
    projectId: uuid("Project ID"),
    coverImageUrl: httpsUrl("Cover image URL").nullable(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.coverImageUrl !== null && !isProjectCoverUrl(data.coverImageUrl, data.projectId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["coverImageUrl"],
        message: "Cover image must be uploaded to this project's cover folder",
      });
    }
  });

export const updateTourThumbnailSchema = z
  .object({
    tourId: uuid("Tour ID"),
    thumbnailUrl: httpsUrl("Thumbnail URL").nullable(),
  })
  .strict();

export const createInvoiceSchema = z
  .object({
    client_id: uuid("Client"),
    project_id: optionalUuid("Project"),
    invoice_number: text("Invoice number", { max: LIMITS.shortText }),
    amount: money("Amount"),
    currency: optionalText("Currency", {
      max: 3,
      pattern: /^[A-Z]{3}$/,
      patternMessage: "Currency must be a 3-letter code",
    }),
    status: oneOf("Invoice status", invoiceStatuses),
    due_date: optionalIsoDate("Due date"),
    description: optionalText("Description", { max: LIMITS.description, multiline: true }),
    storage_path: optional(storagePath("Invoice file")),
    file_url: optional(storagePath("Invoice file URL")),
  })
  .strict()
  .superRefine((data, ctx) => {
    for (const key of ["storage_path", "file_url"] as const) {
      const value = data[key];
      if (value && !value.startsWith(`${data.client_id}/invoices/`)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: "Invoice file is outside the client's invoice folder",
        });
      }
    }
  });

/** Invoice PDFs live at `<clientId>/invoices/<invoiceId>/<file>`. */
function isInvoiceFilePath(path: string, invoiceId: string): boolean {
  const segments = path.split("/");
  return (
    segments.length === 4 &&
    uuid().safeParse(segments[0]).success &&
    segments[1] === "invoices" &&
    segments[2] === invoiceId
  );
}

export const attachInvoicePdfSchema = z
  .object({
    invoiceId: uuid("Invoice ID"),
    data: z
      .object({
        storage_path: storagePath("Invoice file"),
        file_url: optional(storagePath("Invoice file URL")),
      })
      .strict(),
  })
  .strict()
  .superRefine(({ invoiceId, data }, ctx) => {
    for (const key of ["storage_path", "file_url"] as const) {
      const value = data[key];
      if (value && !isInvoiceFilePath(value, invoiceId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["data", key],
          message: "Invoice file is outside this invoice's folder",
        });
      }
    }
  });

export const updateInvoiceStatusSchema = z
  .object({
    id: uuid("Invoice ID"),
    status: oneOf("Invoice status", invoiceStatuses),
  })
  .strict();

export const sendInvoiceNotificationSchema = z
  .object({
    invoiceId: uuid("Invoice ID"),
    kind: oneOf("Notification type", invoiceNotificationKinds),
  })
  .strict();
