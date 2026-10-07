"use server";

import { createClient } from "@/lib/supabase/server";
import { requireBuildViewStaff } from "@/lib/supabase/server";
import type { ActivityLogWithUser } from "@/lib/types";
import { validate } from "@/lib/validations/parse";
import { activityLogFiltersSchema } from "@/lib/validations/data";
import { internalError } from "@/lib/errors/server";

export type ActivityLogFilters = {
  projectId?: string | null;
  userId?: string | null;
  entityType?: string | null;
  query?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  limit?: number;
};

export async function getActivityLogs(
  filters: ActivityLogFilters = {}
): Promise<ActivityLogWithUser[]> {
  const parsed = validate(activityLogFiltersSchema, filters);
  if (!parsed.success) return [];
  const f = parsed.data;

  await requireBuildViewStaff();

  const supabase = await createClient();
  const limit = f.limit ?? 100;

  let query = supabase
    .from("activity_logs")
    .select(
      "*, user:users!activity_logs_user_id_fkey(id, full_name, email, avatar_url), project:projects(id, name)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (f.projectId) query = query.eq("project_id", f.projectId);
  if (f.userId) query = query.eq("user_id", f.userId);
  if (f.entityType) query = query.eq("entity_type", f.entityType);
  if (f.fromDate) query = query.gte("created_at", `${f.fromDate}T00:00:00Z`);
  if (f.toDate) query = query.lte("created_at", `${f.toDate}T23:59:59Z`);
  if (f.query) query = query.ilike("action", `%${f.query}%`);

  const { data, error } = await query;
  if (error) throw internalError("getActivityLogs", error);
  return (data ?? []) as ActivityLogWithUser[];
}
