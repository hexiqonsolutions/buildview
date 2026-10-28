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

function blank(): string {
  return row([]);
}

function worksheet(name: string, rows: string[]): string {
  return `<Worksheet ss:Name="${xmlEscape(name)}"><Table>${rows.join("")}</Table></Worksheet>`;
}

/**
 * SpreadsheetML (.xls) — opens in Excel.
 * Four clear sheets; blank rows between buildings; dates without timestamps.
 * All original fields kept.
 */
export function buildProgressionExcelXml(payload: ProgressionExportPayload): string {
  // —— 1. Overview ————————————————————————————————————————————————
  const overview: string[] = [
    row(["Progression export"]),
    blank(),
    row(["Project", payload.projectName]),
    row(["Location", payload.projectLocation ?? ""]),
    row(["Client", payload.clientName ?? ""]),
    row(["Period", `${payload.from}  →  ${payload.to}`]),
    row(["Generated", formatCellDate(payload.generatedAt)]),
    blank(),
    row(["Overall %", payload.overallPercent]),
    row(["Floors activated", payload.activatedFloorCount]),
    row(["Floors total", payload.floorCount]),
    row(["Completions in period", payload.periodCompletions]),
    blank(),
    row(["Building totals"]),
    row(["Building", "Floors", "%", "Completed steps", "Total steps", "Completions in period"]),
  ];

  for (const b of payload.buildings) {
    overview.push(
      row([
        b.buildingName,
        b.floors.length,
        b.percent,
        b.completedCount,
        b.totalCount,
        b.periodCompletions,
      ])
    );
  }

  // —— 2. Floors (one row per building + floor + track) ——————————————
  const floorsSheet: string[] = [
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
      "In period",
      "Planned start",
      "Planned end",
    ]),
  ];

  for (const building of payload.buildings) {
    floorsSheet.push(blank());
    floorsSheet.push(row([building.buildingName]));
    for (const floor of building.floors) {
      for (const track of floor.tracks) {
        floorsSheet.push(
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

  // —— 3. Steps ————————————————————————————————————————————————————
  const stepsSheet: string[] = [
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
      "Ended",
      "Work date",
      "In period",
      "Note",
    ]),
  ];

  for (const building of payload.buildings) {
    stepsSheet.push(blank());
    stepsSheet.push(row([building.buildingName]));
    for (const floor of building.floors) {
      for (const track of floor.tracks) {
        for (const step of track.steps) {
          stepsSheet.push(
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
              formatCellDate(step.endedAt),
              formatCellDate(step.workDate),
              step.activityInPeriod ? "Yes" : "No",
              step.note ?? "",
            ])
          );
        }
      }
    }
  }

  // —— 4. Period activity ——————————————————————————————————————————
  const activitySheet: string[] = [
    row(["Work date", "Action", "Building", "Floor", "Track", "Step #", "Step"]),
  ];

  if (payload.periodActivity.length === 0) {
    activitySheet.push(row(["(No activity in this period)"]));
  } else {
    let lastBuilding = "";
    for (const a of payload.periodActivity) {
      if (a.buildingName !== lastBuilding) {
        activitySheet.push(blank());
        lastBuilding = a.buildingName;
      }
      activitySheet.push(
        row([
          formatCellDate(a.workDate),
          a.action,
          a.buildingName,
          a.floorName,
          a.trackLabel,
          a.stepNumber,
          a.stepTitle,
        ])
      );
    }
  }

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${worksheet("Overview", overview)}
${worksheet("Floors", floorsSheet)}
${worksheet("Steps", stepsSheet)}
${worksheet("Period activity", activitySheet)}
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
