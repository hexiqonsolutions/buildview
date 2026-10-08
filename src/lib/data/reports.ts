import "server-only";

import { createClient } from "@/lib/supabase/server";
import { validate } from "@/lib/validations/parse";
import { projectIdSchema } from "@/lib/validations/data";

export async function getProjectReports(projectId: string) {
  if (!validate(projectIdSchema, projectId).success) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("report_date", { ascending: false });
  return data || [];
}

export async function getAllReports() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("*, project:projects(name)")
    .is("deleted_at", null)
    .order("report_date", { ascending: false });
  return data || [];
}
