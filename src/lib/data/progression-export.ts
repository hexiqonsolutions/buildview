import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { canViewProgression } from "@/lib/auth/roles";
import { canViewProject, getActiveActor } from "@/lib/auth/project-access";
import {
  PROGRESSION_TRACK_LABELS,
  PROGRESSION_TRACKS,
} from "@/lib/progression/catalog";
import { overallPercent } from "@/lib/progression/stats";
import type {
  ProgressionExportActivity,
  ProgressionExportBuilding,
  ProgressionExportFloor,
  ProgressionExportPayload,
  ProgressionExportStep,
  ProgressionExportTrack,
} from "@/lib/progression/export-types";
import {
  isConstructionProjectForProgression,
} from "@/lib/data/progression";
import { validate } from "@/lib/validations/parse";
import { projectIdSchema } from "@/lib/validations/data";

function isoDateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function inPeriod(date: string | null, from: string, to: string): boolean {
  if (!date) return false;
  return date >= from && date <= to;
}

function stepActivityInPeriod(
  step: {
    work_date: string | null;
    started_at: string | null;
    ended_at: string | null;
    completed_at: string | null;
  },
  from: string,
  to: string
): boolean {
  return (
    inPeriod(isoDateOnly(step.work_date), from, to) ||
    inPeriod(isoDateOnly(step.started_at), from, to) ||
    inPeriod(isoDateOnly(step.ended_at), from, to) ||
    inPeriod(isoDateOnly(step.completed_at), from, to)
  );
}

/**
 * Full building → floor → track → step export payload for a date range.
 * Does not seed missing progressions (export-only read).
 */
export async function getProgressionExportPayload(
  projectId: string,
  from: string,
  to: string
): Promise<ProgressionExportPayload | null> {
  if (!validate(projectIdSchema, projectId).success) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return null;
  if (from > to) return null;

  const actor = await getActiveActor();
  if (!actor || !canViewProgression(actor.role)) return null;
  if (
    !(await canViewProject(
      { userId: actor.userId, role: actor.role, clientId: actor.clientId },
      projectId
    ))
  ) {
    return null;
  }
  if (!(await isConstructionProjectForProgression(projectId))) return null;

  const admin = createServiceRoleClient();

  const { data: project } = await admin
    .from("projects")
    .select("id, name, location, client_name")
    .eq("id", projectId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!project) return null;

  const { data: buildings } = await admin
    .from("buildings")
    .select("id, name, sort_order")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("sort_order")
    .order("name");

  if (!buildings?.length) {
    return {
      projectId,
      projectName: project.name,
      projectLocation: project.location ?? null,
      clientName: project.client_name ?? null,
      from,
      to,
      generatedAt: new Date().toISOString(),
      overallPercent: 0,
      activatedFloorCount: 0,
      floorCount: 0,
      periodCompletions: 0,
      buildings: [],
      periodActivity: [],
    };
  }

  const buildingIds = buildings.map((b) => b.id);
  const { data: floors } = await admin
    .from("floors")
    .select("id, building_id, name, sort_order")
    .in("building_id", buildingIds)
    .is("deleted_at", null)
    .order("sort_order")
    .order("name");

  const { data: progressions } = await admin
    .from("project_progressions")
    .select("id, floor_id, building_id, track, planned_start_date, planned_end_date")
    .eq("project_id", projectId)
    .is("deleted_at", null);

  const progressionIds = (progressions ?? []).map((p) => p.id);
  const progressionByFloorTrack = new Map(
    (progressions ?? []).map((p) => [`${p.floor_id}:${p.track}`, p])
  );

  type StepRow = {
    id: string;
    progression_id: string;
    step_number: number;
    status: string;
    started_at: string | null;
    ended_at: string | null;
    completed_at: string | null;
    work_date: string | null;
    note: string | null;
    template_step: {
      phase_number: number;
      phase_name: string;
      title: string;
    } | null;
  };

  const stepsByProgression = new Map<string, StepRow[]>();
  if (progressionIds.length > 0) {
    const { data: steps } = await admin
      .from("project_progression_steps")
      .select(
        "id, progression_id, step_number, status, started_at, ended_at, completed_at, work_date, note, template_step:progression_template_steps(phase_number, phase_name, title)"
      )
      .in("progression_id", progressionIds)
      .order("step_number", { ascending: true });

    for (const step of (steps ?? []) as unknown as StepRow[]) {
      const list = stepsByProgression.get(step.progression_id) ?? [];
      list.push(step);
      stepsByProgression.set(step.progression_id, list);
    }
  }

  type LogRow = {
    progression_id: string;
    action: string;
    work_date: string;
    step_id: string | null;
  };

  const logsByProgression = new Map<string, LogRow[]>();
  if (progressionIds.length > 0) {
    const { data: logs } = await admin
      .from("project_progression_logs")
      .select("progression_id, action, work_date, step_id")
      .in("progression_id", progressionIds)
      .gte("work_date", from)
      .lte("work_date", to)
      .order("work_date", { ascending: false })
      .limit(2000);

    for (const log of (logs ?? []) as LogRow[]) {
      const list = logsByProgression.get(log.progression_id) ?? [];
      list.push(log);
      logsByProgression.set(log.progression_id, list);
    }
  }

  const floorsByBuilding = new Map<string, typeof floors>();
  for (const floor of floors ?? []) {
    const list = floorsByBuilding.get(floor.building_id) ?? [];
    list.push(floor);
    floorsByBuilding.set(floor.building_id, list);
  }

  const exportBuildings: ProgressionExportBuilding[] = [];
  const periodActivity: ProgressionExportActivity[] = [];
  let projectCompleted = 0;
  let projectTotal = 0;
  let projectPeriodCompletions = 0;
  let activatedFloorCount = 0;
  let floorCount = 0;

  for (const building of buildings) {
    const buildingFloors = floorsByBuilding.get(building.id) ?? [];
    const exportFloors: ProgressionExportFloor[] = [];
    let buildingCompleted = 0;
    let buildingTotal = 0;
    let buildingPeriod = 0;

    for (const floor of buildingFloors) {
      floorCount += 1;
      const tracks: ProgressionExportTrack[] = [];
      let floorCompleted = 0;
      let floorTotal = 0;
      let floorPeriod = 0;
      let floorActivated = false;

      for (const track of PROGRESSION_TRACKS) {
        const progression = progressionByFloorTrack.get(`${floor.id}:${track}`);
        const stepRows = progression
          ? stepsByProgression.get(progression.id) ?? []
          : [];

        const mappedSteps: ProgressionExportStep[] = stepRows.map((row) => {
          const status =
            row.status === "completed"
              ? ("completed" as const)
              : row.status === "in_progress"
                ? ("in_progress" as const)
                : ("pending" as const);
          return {
            stepNumber: row.step_number,
            phaseNumber: row.template_step?.phase_number ?? 0,
            phaseName: row.template_step?.phase_name ?? "",
            title: row.template_step?.title ?? `Step ${row.step_number}`,
            status,
            startedAt: row.started_at,
            endedAt: row.ended_at ?? row.completed_at,
            workDate: row.work_date,
            note: row.note,
            activityInPeriod: stepActivityInPeriod(row, from, to),
          };
        });

        const completedCount = mappedSteps.filter((s) => s.status === "completed").length;
        const inProgressCount = mappedSteps.filter((s) => s.status === "in_progress").length;
        const totalCount = mappedSteps.length;
        const periodCompletions = mappedSteps.filter(
          (s) => s.status === "completed" && s.activityInPeriod
        ).length;

        if (completedCount + inProgressCount > 0) floorActivated = true;

        floorCompleted += completedCount;
        floorTotal += totalCount;
        floorPeriod += periodCompletions;

        const trackLabel = PROGRESSION_TRACK_LABELS[track];
        tracks.push({
          track,
          trackLabel,
          percent: overallPercent(completedCount, totalCount),
          completedCount,
          inProgressCount,
          totalCount,
          plannedStartDate: (progression?.planned_start_date as string | null) ?? null,
          plannedEndDate: (progression?.planned_end_date as string | null) ?? null,
          periodCompletions,
          steps: mappedSteps,
        });

        if (progression) {
          const titleByStepId = new Map(
            stepRows.map((s) => [
              s.id,
              {
                number: s.step_number,
                title: s.template_step?.title ?? `Step ${s.step_number}`,
              },
            ])
          );
          for (const log of logsByProgression.get(progression.id) ?? []) {
            const stepMeta = log.step_id ? titleByStepId.get(log.step_id) : null;
            periodActivity.push({
              workDate: log.work_date,
              action: log.action,
              track,
              trackLabel,
              buildingName: building.name,
              floorName: floor.name,
              stepNumber: stepMeta?.number ?? null,
              stepTitle: stepMeta?.title ?? null,
            });
          }
        }
      }

      if (floorActivated) {
        activatedFloorCount += 1;
        projectCompleted += floorCompleted;
        projectTotal += floorTotal;
      }
      projectPeriodCompletions += floorPeriod;
      buildingCompleted += floorActivated ? floorCompleted : 0;
      buildingTotal += floorActivated ? floorTotal : 0;
      buildingPeriod += floorPeriod;

      exportFloors.push({
        floorId: floor.id,
        floorName: floor.name,
        activated: floorActivated,
        percent: overallPercent(floorCompleted, floorTotal),
        completedCount: floorCompleted,
        totalCount: floorTotal,
        periodCompletions: floorPeriod,
        tracks,
      });
    }

    exportBuildings.push({
      buildingId: building.id,
      buildingName: building.name,
      percent: overallPercent(buildingCompleted, buildingTotal),
      completedCount: buildingCompleted,
      totalCount: buildingTotal,
      periodCompletions: buildingPeriod,
      floors: exportFloors,
    });
  }

  periodActivity.sort((a, b) => {
    if (a.workDate === b.workDate) return a.buildingName.localeCompare(b.buildingName);
    return b.workDate.localeCompare(a.workDate);
  });

  return {
    projectId,
    projectName: project.name,
    projectLocation: project.location ?? null,
    clientName: project.client_name ?? null,
    from,
    to,
    generatedAt: new Date().toISOString(),
    overallPercent: overallPercent(projectCompleted, projectTotal),
    activatedFloorCount,
    floorCount,
    periodCompletions: projectPeriodCompletions,
    buildings: exportBuildings,
    periodActivity,
  };
}
