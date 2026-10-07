import { createClient } from "@/lib/supabase/server";
import { parseOrThrow } from "@/lib/validations/parse";
import { auditEventSchema } from "@/lib/validations/data";

/**
 * Server-internal audit writer (not a server action, so clients cannot forge
 * entries). Always attributes the event to the signed-in user.
 */
export async function logAuditEvent(data: {
  action: string;
  entityType: string;
  entityId?: string | null;
  projectId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const input = parseOrThrow(auditEventSchema, data);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in");

  const { error } = await supabase.from("activity_logs").insert({
    user_id: user.id,
    project_id: input.projectId ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
    ip_address: null,
    user_agent: null,
  });

  if (error) throw new Error(error.message);
}
