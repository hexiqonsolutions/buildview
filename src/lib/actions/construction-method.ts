"use server";

import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { canViewProject, getActiveActor } from "@/lib/auth/project-access";
import { canVerifyProgression, canViewProgression } from "@/lib/auth/roles";
import { getProjectMethods, isConstructionProjectForProgression } from "@/lib/data/progression";
import { logAuditEvent } from "@/lib/activity/audit";
import { getErrorMessage, PublicError } from "@/lib/errors/public";
import { logServerError } from "@/lib/errors/server";
import { type ConstructionMethod } from "@/lib/progression/methods";
import { validate } from "@/lib/validations/parse";
import { uuid } from "@/lib/validations/primitives";
import type { UserRole } from "@/lib/types";

export type MethodFloorView = {
  id: string;
  name: string;
  /** Floor's own setting; null = same as the building. */
  own: ConstructionMethod | null;
  effective: ConstructionMethod;
  /** Any step on this floor started or ended. */
  started: boolean;
};

export type MethodBuildingView = {
  id: string;
  name: string;
  /** Building's own setting; null = same as the project. */
  own: ConstructionMethod | null;
  floors: MethodFloorView[];
};

export type ConstructionMethodView =
  | { available: false; reason: string }
  | {
      available: true;
      projectId: string;
      canEdit: boolean;
      project: ConstructionMethod;
      buildings: MethodBuildingView[];
    };

const methodEnum = z.enum(["conventional", "mivan", "hybrid"]);

const setMethodSchema = z
  .object({
    projectId: uuid("Project ID"),
    target: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("project") }).strict(),
      z.object({ kind: z.literal("building"), id: uuid("Building ID") }).strict(),
      z.object({ kind: z.literal("floor"), id: uuid("Floor ID") }).strict(),
    ]),
    /** null = inherit (building / floor only). */
    method: methodEnum.nullable(),
  })
  .strict();

async function viewer(projectId: string) {
  const actor = await getActiveActor();
  if (!actor) throw new PublicError("You must be signed in.");
  if (!canViewProgression(actor.role as UserRole) || !(await canViewProject(actor, projectId))) {
    throw new PublicError("You do not have access to this project.");
  }
  if (!(await isConstructionProjectForProgression(projectId))) {
    throw new PublicError("Construction methods apply to Construction Intelligence projects.");
  }
  return actor;
}

export async function getConstructionMethods(projectId: string): Promise<ConstructionMethodView> {
  try {
    if (!validate(uuid("Project ID"), projectId).success) return { available: false, reason: "Invalid project." };
    const actor = await viewer(projectId);
    const admin = createServiceRoleClient();
    const [methods, { data: buildings }, { data: progressions }] = await Promise.all([
      getProjectMethods(projectId),
      admin
        .from("buildings")
        .select("id, name, sort_order")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("sort_order")
        .order("name"),
      admin.from("project_progressions").select("id, floor_id").eq("project_id", projectId).is("deleted_at", null),
    ]);
    const buildingIds = (buildings ?? []).map((b) => b.id);
    const { data: floors } = buildingIds.length
      ? await admin
          .from("floors")
          .select("id, building_id, name, sort_order")
          .in("building_id", buildingIds)
          .is("deleted_at", null)
          .order("sort_order")
          .order("name")
      : { data: [] as { id: string; building_id: string; name: string; sort_order: number }[] };

    // Floors with any started / ended step (a switch then carries history over).
    const progressionFloor = new Map((progressions ?? []).map((p) => [p.id as string, p.floor_id as string]));
    const startedFloors = new Set<string>();
    if (progressionFloor.size > 0) {
      const ids = [...progressionFloor.keys()];
      const { data: active } = await fetchAllRows((a, b) =>
        admin
          .from("project_progression_steps")
          .select("id, progression_id")
          .in("progression_id", ids)
          .neq("status", "pending")
          .order("id")
          .range(a, b)
      );
      for (const row of active) {
        const floorId = progressionFloor.get(row.progression_id as string);
        if (floorId) startedFloors.add(floorId);
      }
    }

    return {
      available: true,
      projectId,
      canEdit: canVerifyProgression(actor.role as UserRole),
      project: methods.project,
      buildings: (buildings ?? []).map((b) => ({
        id: b.id,
        name: b.name,
        own: methods.buildings.get(b.id) ?? null,
        floors: (floors ?? [])
          .filter((f) => f.building_id === b.id)
          .map((f) => ({
            id: f.id,
            name: f.name,
            own: methods.floorsOwn.get(f.id) ?? null,
            effective: methods.floors.get(f.id) ?? methods.project,
            started: startedFloors.has(f.id),
          })),
      })),
    };
  } catch (err) {
    return { available: false, reason: getErrorMessage(err, "Could not load construction methods.") };
  }
}

/**
 * Set the method for the project (default), a building or a floor, then move
 * every affected floor's checklists to the matching template (history carried
 * over for shared steps). BuildView staff and Client Admin only.
 */
export async function setConstructionMethod(
  input: unknown
): Promise<{ ok: true; view: ConstructionMethodView; switched: number; carried: number; dropped: number } | { ok: false; error: string }> {
  const parsed = validate(setMethodSchema, input);
  if (!parsed.success) return { ok: false, error: parsed.error };
  const { projectId, target, method } = parsed.data;
  try {
    const actor = await viewer(projectId);
    if (!canVerifyProgression(actor.role as UserRole)) {
      throw new PublicError("Only BuildView staff or the Client Admin can change the construction method.");
    }
    const admin = createServiceRoleClient();

    if (target.kind === "project") {
      if (!method) return { ok: false, error: "Pick a method for the project." };
      const { error } = await admin.from("projects").update({ construction_method: method } as never).eq("id", projectId);
      if (error) throw migrationError(error);
    } else if (target.kind === "building") {
      const { data: b } = await admin.from("buildings").select("id").eq("id", target.id).eq("project_id", projectId).maybeSingle();
      if (!b) return { ok: false, error: "Building not found on this project." };
      const { error } = await admin.from("buildings").update({ construction_method: method } as never).eq("id", target.id);
      if (error) throw migrationError(error);
    } else {
      const { data: f } = await admin
        .from("floors")
        .select("id, building:buildings!inner(project_id)")
        .eq("id", target.id)
        .eq("building.project_id", projectId)
        .maybeSingle();
      if (!f) return { ok: false, error: "Floor not found on this project." };
      const { error } = await admin.from("floors").update({ construction_method: method } as never).eq("id", target.id);
      if (error) throw migrationError(error);
    }

    // Move checklists whose template no longer matches the floor's method:
    // one transaction in the database (migration 054).
    const { data: counts, error: rpcError } = await admin.rpc("reconcile_construction_methods" as never, {
      p_project: projectId,
      p_actor: actor.userId,
    } as never);
    if (rpcError) {
      if (/reconcile_construction_methods/.test(rpcError.message ?? "") || rpcError.code === "PGRST202") {
        throw new PublicError("Saved. Checklists move to the new method after database migration 054 is run.");
      }
      throw rpcError;
    }
    const row = (Array.isArray(counts) ? counts[0] : counts) as
      | { switched: number; carried: number; dropped: number }
      | undefined;
    const switched = Number(row?.switched ?? 0);
    const carried = Number(row?.carried ?? 0);
    const dropped = Number(row?.dropped ?? 0);

    await logAuditEvent({
      action: "construction_method.changed",
      entityType: target.kind,
      entityId: target.kind === "project" ? projectId : target.id,
      projectId,
      metadata: { method: method ?? "inherit", checklists_switched: switched, steps_carried: carried, steps_dropped: dropped },
    }).catch(() => undefined);

    return { ok: true, view: await getConstructionMethods(projectId), switched, carried, dropped };
  } catch (err) {
    logServerError("progression:method", err);
    // Database reason helps staff fix setup issues (only staff / Client Admin reach here).
    const dbReason =
      err && typeof err === "object" && "message" in err && "code" in err
        ? ` (${String((err as { message: unknown }).message).slice(0, 200)})`
        : "";
    return { ok: false, error: getErrorMessage(err, "Could not change the construction method.") + dbReason };
  }
}

function migrationError(error: { code?: string; message?: string }) {
  if (error.code === "42703" || /construction_method/.test(error.message ?? "")) {
    return new PublicError("Construction methods need database migration 053. Run it in Supabase first.");
  }
  return error;
}
