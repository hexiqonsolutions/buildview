"use server";

import { createClient } from "@/lib/supabase/server";
import { requireBuildViewStaff } from "@/lib/supabase/server";
import type { ActivityLogWithUser } from "@/lib/types";

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
  await requireBuildViewStaff();

  const supabase = await createClient();
  const limit = Math.min(filters.limit ?? 100, 500);

  let query = supabase
    .from("activity_logs")
    .select(
      "*, user:users!activity_logs_user_id_fkey(id, full_name, email, avatar_url), project:projects(id, name)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.projectId) query = query.eq("project_id", filters.projectId);
  if (filters.userId) query = query.eq("user_id", filters.userId);
  if (filters.entityType) query = query.eq("entity_type", filters.entityType);
  if (filters.fromDate) query = query.gte("created_at", `${filters.fromDate}T00:00:00Z`);
  if (filters.toDate) query = query.lte("created_at", `${filters.toDate}T23:59:59Z`);
  if (filters.query?.trim()) query = query.ilike("action", `%${filters.query.trim()}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ActivityLogWithUser[];
}

export async function logAuditEvent(data: {
  action: string;
  entityType: string;
  entityId?: string | null;
  projectId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
  userId?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("activity_logs").insert({
    user_id: data.userId ?? user?.id ?? null,
    project_id: data.projectId ?? null,
    action: data.action,
    entity_type: data.entityType,
    entity_id: data.entityId ?? null,
    metadata: data.metadata ?? {},
    ip_address: null,
    user_agent: null,
  });

  if (error) throw new Error(error.message);
}
