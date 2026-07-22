import { z } from "zod";

const userRoles = [
  "super_admin",
  "admin",
  "operations_manager",
  "site_engineer",
  "client",
  "client_admin",
  "client_user",
  "read_only_client",
  "consultant",
] as const;
const projectStatuses = ["planning", "in_progress", "completed", "on_hold"] as const;
const subscriptionStatuses = ["active", "inactive", "trial", "cancelled"] as const;
const invoiceStatuses = ["draft", "sent", "paid", "overdue", "cancelled"] as const;

const dashboardTypes = ["construction", "portfolio"] as const;

export const updateUserSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(userRoles),
  client_id: z.string().uuid().nullable(),
  is_active: z.boolean(),
  /** Per-user override; null = inherit from client org */
  dashboard_type: z.enum(dashboardTypes).nullable().optional(),
  /** Sets the linked client organization's default portal dashboard */
  client_dashboard_type: z.enum(dashboardTypes).optional(),
});

export const updateClientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  company_name: z.string().optional().nullable(),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  subscription_status: z.enum(subscriptionStatuses),
  is_active: z.boolean(),
  dashboard_type: z.enum(dashboardTypes).optional(),
});

export const updateProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  client_id: z.string().uuid(),
  client_name: z.string().min(1),
  location: z.string().min(1),
  status: z.enum(projectStatuses),
  description: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  completion_date: z.string().optional().nullable(),
  area_sqft: z.number().int().positive().nullable().optional(),
  portfolio_category: z
    .enum(["architecture", "interior", "real_estate"])
    .nullable()
    .optional(),
});

export const updateInvoiceStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(invoiceStatuses),
});
