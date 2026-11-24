/** Heat colour by %, matching the matrix chips (grey → amber → sky → green). Shared by the heatmap and the PDF report. */
export function heatFill(percent: number | null): { fill: string; label: string } {
  if (percent == null) return { fill: "rgba(148,163,184,0.35)", label: "No applicable trades" };
  if (percent >= 100) return { fill: "rgba(16,185,129,0.55)", label: "Complete" };
  if (percent >= 50) return { fill: "rgba(14,165,233,0.5)", label: "50–99%" };
  if (percent > 0) return { fill: "rgba(245,158,11,0.5)", label: "1–49%" };
  return { fill: "rgba(148,163,184,0.45)", label: "Not started" };
}

/** Legend order for the heat buckets. */
export const HEAT_LEGEND: (number | null)[] = [0, 25, 75, 100, null];

export function polygonCentroid(points: [number, number][]): [number, number] {
  const x = points.reduce((s, p) => s + p[0], 0) / points.length;
  const y = points.reduce((s, p) => s + p[1], 0) / points.length;
  return [x, y];
}
