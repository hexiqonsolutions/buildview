"use server";

import { revalidatePath } from "next/cache";
import { createClient, requireBuildViewStaff } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKETS, type PropertyDetails, type PropertyUnit } from "@/lib/types";
import { parseOrThrow, validate } from "@/lib/validations/parse";
import { uuid } from "@/lib/validations/primitives";
import {
  savePropertyDetailsSchema,
  type SavePropertyDetailsInput,
} from "@/lib/validations/property";
import { PublicError } from "@/lib/errors/public";
import { internalError } from "@/lib/errors/server";
import { UPLOAD_RULES, verifyStoredUpload } from "@/lib/uploads/verify";
import { loadBuyerProperty, loadPropertyRows, signProjectMediaPaths } from "@/lib/property/load";
import type { BuyerProperty } from "@/lib/property/buyer-view";

const projectIdSchema = uuid("Project");

export type PropertyEditorData = {
  details: PropertyDetails | null;
  units: (PropertyUnit & { floorPlanUrl: string | null })[];
  brochureUrl: string | null;
};

function revalidateProperty(projectId: string) {
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/dashboard/projects/${projectId}`);
}

/** Admin editor read (staff only). */
export async function getPropertyEditorData(projectId: string): Promise<PropertyEditorData> {
  parseOrThrow(projectIdSchema, projectId);
  await requireBuildViewStaff();
  const admin = createServiceRoleClient();
  const rows = await loadPropertyRows(admin, projectId);
  const signed = await signProjectMediaPaths(admin, [
    ...rows.units.map((u) => u.floor_plan_path),
    rows.details?.brochure_path,
  ]);
  return {
    details: rows.details,
    units: rows.units.map((u) => ({
      ...u,
      floorPlanUrl: u.floor_plan_path ? signed.get(u.floor_plan_path) ?? null : null,
    })),
    brochureUrl: rows.details?.brochure_path ? signed.get(rows.details.brochure_path) ?? null : null,
  };
}

/** Portal read: RLS limits this to projects the viewer can access. */
export async function getProjectBuyerProperty(projectId: string): Promise<BuyerProperty | null> {
  if (!validate(projectIdSchema, projectId).success) return null;
  const supabase = await createClient();
  return loadBuyerProperty(supabase, projectId).catch(() => null);
}

/**
 * Admin "Preview as buyer": renders the unsaved editor state through the same
 * buyer-view rules, using the stored media for gallery / floor plan URLs.
 */
export async function previewBuyerProperty(input: SavePropertyDetailsInput): Promise<BuyerProperty | null> {
  const parsed = parseOrThrow(savePropertyDetailsSchema, input);
  await requireBuildViewStaff();
  const admin = createServiceRoleClient();
  const now = new Date().toISOString();
  return loadBuyerProperty(admin, parsed.project_id, {
    details: {
      ...parsed.details,
      id: "preview",
      project_id: parsed.project_id,
      created_at: now,
      updated_at: now,
      created_by: null,
      updated_by: null,
    } as PropertyDetails,
    units: parsed.units.map((unit, index) => ({
      ...unit,
      id: unit.id ?? `preview-${index}`,
      project_id: parsed.project_id,
      sort_order: index,
      created_at: now,
      updated_at: now,
    })) as PropertyUnit[],
  });
}

function assertProjectPath(projectId: string, path: string | null | undefined) {
  if (path && !path.startsWith(`${projectId}/`)) {
    throw new PublicError("File upload is outside the project folder.");
  }
}

export async function savePropertyDetails(input: SavePropertyDetailsInput): Promise<void> {
  const parsed = parseOrThrow(savePropertyDetailsSchema, input);
  const actor = await requireBuildViewStaff();
  const admin = createServiceRoleClient();
  const projectId = parsed.project_id;

  const { data: project } = await admin
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!project) throw new PublicError("Project not found.");

  const existing = await loadPropertyRows(admin, projectId);
  const existingUnitById = new Map(existing.units.map((u) => [u.id, u]));

  // Verify only files that changed since the last save.
  assertProjectPath(projectId, parsed.details.brochure_path);
  if (parsed.details.brochure_path && parsed.details.brochure_path !== existing.details?.brochure_path) {
    await verifyStoredUpload(UPLOAD_RULES.propertyBrochure, parsed.details.brochure_path, "savePropertyDetails");
  }
  for (const unit of parsed.units) {
    assertProjectPath(projectId, unit.floor_plan_path);
    if (unit.id && !existingUnitById.has(unit.id)) {
      throw new PublicError("Unit type not found. Reload and try again.");
    }
    const previous = unit.id ? existingUnitById.get(unit.id)?.floor_plan_path : null;
    if (unit.floor_plan_path && unit.floor_plan_path !== previous) {
      await verifyStoredUpload(UPLOAD_RULES.propertyFloorPlan, unit.floor_plan_path, "savePropertyDetails", {
        skipMagicBytes: true,
      });
    }
  }

  const { error: detailsError } = await admin.from("property_details").upsert(
    {
      ...parsed.details,
      project_id: projectId,
      updated_by: actor.id,
      ...(existing.details ? {} : { created_by: actor.id }),
    },
    { onConflict: "project_id" }
  );
  if (detailsError) throw internalError("savePropertyDetails.details", detailsError);

  // Units: delete removed rows, update kept rows, insert new rows.
  const keptIds = new Set(parsed.units.map((u) => u.id).filter(Boolean) as string[]);
  const removed = existing.units.filter((u) => !keptIds.has(u.id));
  if (removed.length > 0) {
    const { error } = await admin
      .from("property_units")
      .delete()
      .in(
        "id",
        removed.map((u) => u.id)
      );
    if (error) throw internalError("savePropertyDetails.deleteUnits", error);
  }

  for (const [index, unit] of parsed.units.entries()) {
    const { id, ...fields } = unit;
    const payload = { ...fields, project_id: projectId, sort_order: index };
    const { error } = id
      ? await admin.from("property_units").update(payload).eq("id", id).eq("project_id", projectId)
      : await admin.from("property_units").insert(payload);
    if (error) throw internalError("savePropertyDetails.units", error);
  }

  // Clean up files no longer referenced.
  const stillUsed = new Set(
    [parsed.details.brochure_path, ...parsed.units.map((u) => u.floor_plan_path)].filter(Boolean) as string[]
  );
  const orphaned = [
    existing.details?.brochure_path,
    ...existing.units.map((u) => u.floor_plan_path),
  ].filter((path): path is string => Boolean(path) && !stillUsed.has(path as string));
  if (orphaned.length > 0) {
    await admin.storage
      .from(STORAGE_BUCKETS.PROJECT_MEDIA)
      .remove(orphaned)
      .catch(() => undefined);
  }

  revalidateProperty(projectId);
}
