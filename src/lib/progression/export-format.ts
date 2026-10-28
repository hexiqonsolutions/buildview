import type { ProgressionExportPayload } from "@/lib/progression/export-types";

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${xmlEscape(text)}</Data></Cell>`;
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
    row(["Generated at", payload.generatedAt]),
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
            track.plannedStartDate,
            track.plannedEndDate,
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
      "Ended",
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
              step.status,
              step.startedAt,
              step.endedAt,
              step.workDate,
              step.activityInPeriod ? "Yes" : "No",
              step.note,
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
        a.workDate,
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

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Printable HTML report — browser Print → Save as PDF. */
export function buildProgressionPdfHtml(payload: ProgressionExportPayload): string {
  const buildingSections = payload.buildings
    .map((building) => {
      const floorTables = building.floors
        .map((floor) => {
          const trackRows = floor.tracks
            .map(
              (track) => `<tr>
                <td>${htmlEscape(track.trackLabel)}</td>
                <td>${track.percent}%</td>
                <td>${track.completedCount}/${track.totalCount}</td>
                <td>${track.periodCompletions}</td>
                <td>${htmlEscape(track.plannedStartDate ?? "—")}</td>
                <td>${htmlEscape(track.plannedEndDate ?? "—")}</td>
              </tr>`
            )
            .join("");

          const periodSteps = floor.tracks
            .flatMap((track) =>
              track.steps
                .filter((s) => s.activityInPeriod)
                .map(
                  (s) => `<tr>
                    <td>${htmlEscape(track.trackLabel)}</td>
                    <td>${s.stepNumber}</td>
                    <td>${htmlEscape(s.title)}</td>
                    <td>${htmlEscape(s.status)}</td>
                    <td>${htmlEscape(s.workDate ?? s.endedAt ?? s.startedAt ?? "—")}</td>
                  </tr>`
                )
            )
            .join("");

          return `<section class="floor">
            <h3>${htmlEscape(floor.floorName)} · ${floor.percent}%${floor.activated ? "" : " (not activated)"}</h3>
            <table>
              <thead><tr><th>Track</th><th>%</th><th>Done</th><th>In period</th><th>Planned start</th><th>Planned end</th></tr></thead>
              <tbody>${trackRows}</tbody>
            </table>
            ${
              periodSteps
                ? `<h4>Steps with activity in period</h4>
            <table>
              <thead><tr><th>Track</th><th>#</th><th>Step</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>${periodSteps}</tbody>
            </table>`
                : `<p class="muted">No step activity in this period on this floor.</p>`
            }
          </section>`;
        })
        .join("");

      return `<section class="building">
        <h2>${htmlEscape(building.buildingName)} · ${building.percent}%</h2>
        <p class="muted">${building.completedCount}/${building.totalCount} steps complete · ${building.periodCompletions} completions in period</p>
        ${floorTables}
      </section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Progression · ${htmlEscape(payload.projectName)}</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: "Segoe UI", system-ui, sans-serif; color: #0f172a; margin: 24px; font-size: 12px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 16px; margin: 28px 0 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
    h3 { font-size: 13px; margin: 16px 0 6px; }
    h4 { font-size: 12px; margin: 10px 0 4px; }
    .meta { color: #475569; margin-bottom: 18px; line-height: 1.5; }
    .muted { color: #64748b; }
    .kpis { display: flex; flex-wrap: wrap; gap: 12px; margin: 12px 0 20px; }
    .kpi { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; min-width: 120px; }
    .kpi strong { display: block; font-size: 18px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th, td { border: 1px solid #e2e8f0; padding: 5px 7px; text-align: left; vertical-align: top; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
    .actions { margin: 0 0 16px; }
    button { background: #0f172a; color: white; border: 0; border-radius: 6px; padding: 8px 14px; cursor: pointer; }
    @media print {
      .actions { display: none; }
      body { margin: 12px; }
      .building { break-inside: avoid; }
      .floor { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
  <h1>${htmlEscape(payload.projectName)} — Progression Report</h1>
  <div class="meta">
    ${payload.projectLocation ? `Location: ${htmlEscape(payload.projectLocation)} · ` : ""}
    ${payload.clientName ? `Client: ${htmlEscape(payload.clientName)} · ` : ""}
    Period: ${htmlEscape(payload.from)} to ${htmlEscape(payload.to)} ·
    Generated: ${htmlEscape(payload.generatedAt)}
  </div>
  <div class="kpis">
    <div class="kpi"><strong>${payload.overallPercent}%</strong>Overall</div>
    <div class="kpi"><strong>${payload.activatedFloorCount}/${payload.floorCount}</strong>Floors activated</div>
    <div class="kpi"><strong>${payload.periodCompletions}</strong>Completions in period</div>
  </div>
  ${buildingSections || `<p class="muted">No buildings/floors configured for this project.</p>`}
  <script>window.addEventListener("load", () => setTimeout(() => window.print(), 250));</script>
</body>
</html>`;
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function openHtmlPrintWindow(html: string) {
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) throw new Error("Pop-up blocked. Allow pop-ups to export PDF.");
  win.document.open();
  win.document.write(html);
  win.document.close();
}
