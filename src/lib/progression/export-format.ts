import type { ProgressionExportPayload } from "@/lib/progression/export-types";

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Prefer calendar date; strip ISO time clutter for Excel readability. */
function formatCellDate(value: string | null | undefined): string {
  if (!value) return "";
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? value;
}

function statusLabel(status: string): string {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In progress";
  return "Pending";
}

function cell(value: string | number | null | undefined): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${xmlEscape(value == null ? "" : String(value))}</Data></Cell>`;
}

function row(values: Array<string | number | null | undefined>): string {
  return `<Row>${values.map(cell).join("")}</Row>`;
}

function worksheet(name: string, rows: string[]): string {
  return `<Worksheet ss:Name="${xmlEscape(name)}"><Table>${rows.join("")}</Table></Worksheet>`;
}

/** SpreadsheetML (.xls) — opens natively in Microsoft Excel. */
export function buildProgressionExcelXml(payload: ProgressionExportPayload): string {
  const summaryRows = [
    row(["Project", payload.projectName]),
    row(["Location", payload.projectLocation]),
    row(["Client", payload.clientName]),
    row(["Period from", payload.from]),
    row(["Period to", payload.to]),
    row(["Generated at", formatCellDate(payload.generatedAt)]),
    row(["Overall %", payload.overallPercent]),
    row(["Activated floors", `${payload.activatedFloorCount} / ${payload.floorCount}`]),
    row(["Completions in period", payload.periodCompletions]),
    row([]),
    row(["Building", "Floors", "%", "Completed", "Total", "Period completions"]),
    ...payload.buildings.map((b) =>
      row([
        b.buildingName,
        b.floors.length,
        b.percent,
        b.completedCount,
        b.totalCount,
        b.periodCompletions,
      ])
    ),
  ];

  const floorRows = [
    row([
      "Building",
      "Floor",
      "Activated",
      "Floor %",
      "Track",
      "Track %",
      "Completed",
      "In progress",
      "Total",
      "Period completions",
      "Planned start",
      "Planned end",
    ]),
  ];
  for (const building of payload.buildings) {
    for (const floor of building.floors) {
      for (const track of floor.tracks) {
        floorRows.push(
          row([
            building.buildingName,
            floor.floorName,
            floor.activated ? "Yes" : "No",
            floor.percent,
            track.trackLabel,
            track.percent,
            track.completedCount,
            track.inProgressCount,
            track.totalCount,
            track.periodCompletions,
            formatCellDate(track.plannedStartDate),
            formatCellDate(track.plannedEndDate),
          ])
        );
      }
    }
  }

  const stepRows = [
    row([
      "Building",
      "Floor",
      "Track",
      "Phase #",
      "Phase",
      "Step #",
      "Step",
      "Status",
      "Started",
      "Started by",
      "Ended",
      "Ended by",
      "Work date",
      "Activity in period",
      "Note",
    ]),
  ];
  for (const building of payload.buildings) {
    for (const floor of building.floors) {
      for (const track of floor.tracks) {
        for (const step of track.steps) {
          stepRows.push(
            row([
              building.buildingName,
              floor.floorName,
              track.trackLabel,
              step.phaseNumber,
              step.phaseName,
              step.stepNumber,
              step.title,
              statusLabel(step.status),
              formatCellDate(step.startedAt),
              step.startedByName ?? "",
              formatCellDate(step.endedAt),
              step.endedByName ?? "",
              formatCellDate(step.workDate),
              step.activityInPeriod ? "Yes" : "No",
              step.note ?? "",
            ])
          );
        }
      }
    }
  }

  const activityRows = [
    row(["Work date", "Action", "Building", "Floor", "Track", "Step #", "Step"]),
    ...payload.periodActivity.map((a) =>
      row([
        formatCellDate(a.workDate),
        a.action,
        a.buildingName,
        a.floorName,
        a.trackLabel,
        a.stepNumber,
        a.stepTitle,
      ])
    ),
  ];

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${worksheet("Summary", summaryRows)}
${worksheet("Building Floor Track", floorRows)}
${worksheet("Steps", stepRows)}
${worksheet("Period Activity", activityRows)}
</Workbook>`;
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
