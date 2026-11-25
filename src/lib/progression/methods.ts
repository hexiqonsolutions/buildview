import {
  PRE_SLAB_PHASES,
  PRE_SLAB_STEPS,
  PROGRESSION_PHASES,
  PROGRESSION_STEPS,
  type ProgressionPhaseDef,
  type ProgressionStepDef,
  type ProgressionTrack,
} from "@/lib/progression/catalog";

/**
 * Construction methods (conventional formwork, Mivan aluminium formwork, hybrid)
 * and their checklists. A floor's method = floor override ?? building ?? project.
 * Shared steps reuse the exact conventional titles so their step key matches and
 * history carries over when a floor switches method.
 */

export type ConstructionMethod = "conventional" | "mivan" | "hybrid";

export const CONSTRUCTION_METHODS: readonly ConstructionMethod[] = ["conventional", "mivan", "hybrid"];

export const CONSTRUCTION_METHOD_LABELS: Record<ConstructionMethod, string> = {
  conventional: "Conventional",
  mivan: "Mivan",
  hybrid: "Hybrid",
};

export const CONSTRUCTION_METHOD_HINTS: Record<ConstructionMethod, string> = {
  conventional: "Column, beam and slab shuttering; blockwork walls; plaster.",
  mivan: "Aluminium formwork: walls and slab cast together; no blockwork or plaster.",
  hybrid: "Mivan outer and shear walls; blockwork internal partitions with plaster.",
};

export function isConstructionMethod(value: unknown): value is ConstructionMethod {
  return value === "conventional" || value === "mivan" || value === "hybrid";
}

/** Floor override, else building, else project, else conventional. */
export function effectiveMethod(
  floor: string | null | undefined,
  building: string | null | undefined,
  project: string | null | undefined
): ConstructionMethod {
  for (const v of [floor, building, project]) if (isConstructionMethod(v)) return v;
  return "conventional";
}

export const TRACK_LABELS_BY_METHOD: Record<ConstructionMethod, Record<ProgressionTrack, string>> = {
  conventional: { pre_slab: "Pre-Slab", post_slab: "Post-Slab" },
  mivan: { pre_slab: "Structure cycle", post_slab: "Finishing" },
  hybrid: { pre_slab: "Structure cycle", post_slab: "Finishing" },
};

export function trackLabel(track: ProgressionTrack, method: ConstructionMethod = "conventional"): string {
  return TRACK_LABELS_BY_METHOD[method][track];
}

/** Method of a checklist template, from its key (pre_slab_v1, post_slab_mivan_v1, …). */
export function methodOfTemplateKey(key: string | null | undefined): ConstructionMethod {
  if (key?.includes("_mivan_")) return "mivan";
  if (key?.includes("_hybrid_")) return "hybrid";
  return "conventional";
}

export function templateKeyFor(method: ConstructionMethod, track: ProgressionTrack): string {
  if (method === "conventional") return track === "pre_slab" ? "pre_slab_v1" : "post_slab_v1";
  return `${track}_${method}_v1`;
}

/** Stable key for a step, from its title: shared titles → shared keys. */
export function stepKey(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

type Phase = { name: string; stage: string; steps: string[] };

function build(phases: Phase[]): { phases: ProgressionPhaseDef[]; steps: ProgressionStepDef[] } {
  const outPhases: ProgressionPhaseDef[] = [];
  const outSteps: ProgressionStepDef[] = [];
  phases.forEach((p, i) => {
    outPhases.push({ number: i + 1, name: p.name, stage: p.stage });
    for (const title of p.steps) {
      outSteps.push({ stepNumber: outSteps.length + 1, phaseNumber: i + 1, title });
    }
  });
  return { phases: outPhases, steps: outSteps };
}

// ---- shared finishing phases (titles identical to conventional post-slab)
const WET_AREAS: Phase = {
  name: "Waterproofing and wet-area preparation",
  stage: "Wet areas",
  steps: [
    "Bathroom and toilet floor-level preparation and slope formation",
    "Waterproofing in toilets, bathrooms, balconies and other specified areas",
    "Waterproofing upturns and pipe-junction treatment",
    "Water ponding test and rectification, where applicable",
    "Kitchen platform and plumbing point coordination",
  ],
};
const FLOORING: Phase = {
  name: "Flooring and stonework",
  stage: "Floor finishes",
  steps: [
    "Floor base preparation and level marking",
    "Bathroom and toilet floor tiles with correct slope",
    "Bathroom wall tiles",
    "Kitchen dado tiles, where specified",
    "Room flooring — tiles, marble or other specified material",
    "Door thresholds / granite patti",
    "Skirting and tile grouting",
    "Staircase stonework and common-area flooring, as applicable",
  ],
};
const FIXTURES: Phase = {
  name: "Fixtures and second-fix services",
  stage: "Fixtures & MEP",
  steps: [
    "Door shutters, hardware and locks",
    "Electrical wires, switches, sockets and distribution board connections",
    "Sanitaryware, WC, washbasin and bathroom fittings",
    "Plumbing taps, mixers and accessories",
    "Kitchen platform, sink and related fittings",
    "False ceiling and light fixtures, where specified",
    "AC indoor units and other MEP equipment, where applicable",
  ],
};
const HANDOVER: Phase = {
  name: "Final finishing and handover",
  stage: "Handover",
  steps: [
    "Final paint coat and touch-ups",
    "Sealant application and finishing corrections",
    "Electrical testing and functional checks",
    "Plumbing leak checks and drainage-flow testing",
    "Door, window and hardware operation checks",
    "Snagging inspection and defect rectification",
    "Deep cleaning and final handover",
  ],
};

// ---- Mivan / hybrid structure cycle
function structureCycle(walls: "all" | "outer"): Phase[] {
  const wallWord = walls === "all" ? "walls" : "outer and shear walls";
  return [
    {
      name: "Setting out and de-shuttering",
      stage: "Cycle start",
      steps: [
        "De-shuttering of previous floor wall and slab panels, props retained as permitted by the engineer",
        "Panel cleaning and release-agent application",
        "Surveying and marking grid lines, walls and openings",
        "Kicker, starter and level checks",
      ],
    },
    {
      name: "Wall reinforcement",
      stage: "Reinforcement stage",
      steps: [
        `Reinforcement fixing for ${wallWord} and columns`,
        "Trimmer bars and reinforcement around openings",
        "Cover blocks on wall reinforcement",
      ],
    },
    {
      name: "MEP built into walls",
      stage: "Pre-pour MEP provisions",
      steps: [
        `Electrical conduits, switch and junction boxes fixed in ${wallWord}`,
        `Plumbing sleeves and concealed pipes in ${wallWord}, as applicable`,
        "Door and window opening boxes and block-outs",
        "In-wall MEP check before closing the formwork",
      ],
    },
    {
      name: "Aluminium formwork erection",
      stage: "Formwork stage",
      steps: [
        `Aluminium wall panels for ${wallWord}, both faces, with pins, wedges and ties`,
        "Beam soffit and slab deck panels with props",
        "Providing slab openings, shafts and service cut-outs as per drawings",
        "Formwork line, level, plumb and diagonal checks",
        "Edge panels, brackets and working platform",
      ],
    },
    {
      name: "Slab reinforcement and MEP",
      stage: "Reinforcement stage",
      steps: [
        "Slab bottom reinforcement fixing",
        "Slab top reinforcement and negative bars fixing",
        "Electrical conduits embedded in slab, as per drawings",
        "Sleeves for plumbing and drainage pipes",
        "Chair bars / spacers installation",
      ],
    },
    {
      name: "Inspection and monolithic pour",
      stage: "Casting stage",
      steps: [
        "Formwork, reinforcement and MEP inspection before the pour",
        "Concrete grade and approved mix confirmation",
        "Walls and slab poured together",
        "Concrete compaction, finishing and level checks",
        "Cube samples taken",
        "Curing initiation as specified",
      ],
    },
  ];
}

// ---- Mivan / hybrid finishing
function finishing(withBlockwork: boolean): Phase[] {
  const phases: Phase[] = [
    {
      name: "After the pour",
      stage: "Surface preparation",
      steps: [
        "Fin and honeycomb removal and surface repair",
        "Tie-hole filling",
        "Slab level and wall plumb survey",
        "Prop removal once the slab reaches strength",
      ],
    },
  ];
  if (withBlockwork) {
    phases.push({
      name: "Internal partitions",
      stage: "Wall construction stage",
      steps: [
        "Blockwork / AAC partitions for internal walls",
        "Lintels and door openings in block walls",
        "Wall chasing for services in block walls only",
        "Electrical and plumbing chase filling",
        "Chicken mesh / fibre mesh at masonry-to-RCC junctions, where specified",
        "Internal plaster on block walls",
        "Plaster curing and surface-level checks",
      ],
    });
  }
  phases.push(
    {
      name: "Openings and frames",
      stage: "Openings",
      steps: [
        "Doorframe fixing in cast openings",
        "Window frames or sub-frames in cast openings",
        "Window sill installation — granite patti / stone sill",
      ],
    },
    {
      name: "Services first fix (balance)",
      stage: "First-fix MEP works",
      steps: [
        "Plumbing risers and shaft piping",
        "Soil, waste and drainage pipes, including bathroom and kitchen connections",
        "Wiring pulled through embedded conduits",
        "Electrical continuity checks and plumbing pressure/leak tests before covering",
      ],
    },
    WET_AREAS,
    {
      name: withBlockwork ? "Wall finish" : "Wall finish (no plaster)",
      stage: "Wall finishing",
      steps: [
        withBlockwork ? "Gypsum punning / skim coat on RCC walls" : "Gypsum punning / skim coat on walls and ceilings",
        "Internal wall putty and surface preparation",
        "External texture base on RCC walls (no plaster)",
      ],
    },
    FLOORING,
    {
      name: "Windows, façade and painting",
      stage: "Façade & paint",
      steps: [
        "Window frame and shutter installation",
        "External texture paint",
        "Primer application",
        "First coat of paint",
      ],
    },
    FIXTURES,
    HANDOVER
  );
  return phases;
}

export type ChecklistTemplateDef = {
  key: string;
  method: ConstructionMethod;
  track: ProgressionTrack;
  name: string;
  phases: readonly ProgressionPhaseDef[];
  steps: readonly ProgressionStepDef[];
};

const mivanStructure = build(structureCycle("all"));
const hybridStructure = build(structureCycle("outer"));
const mivanFinishing = build(finishing(false));
const hybridFinishing = build(finishing(true));

export const CHECKLIST_TEMPLATES: readonly ChecklistTemplateDef[] = [
  { key: "pre_slab_v1", method: "conventional", track: "pre_slab", name: "Pre-Slab (conventional)", phases: PRE_SLAB_PHASES, steps: PRE_SLAB_STEPS },
  { key: "post_slab_v1", method: "conventional", track: "post_slab", name: "Post-Slab (conventional)", phases: PROGRESSION_PHASES, steps: PROGRESSION_STEPS },
  { key: "pre_slab_mivan_v1", method: "mivan", track: "pre_slab", name: "Structure cycle (Mivan)", ...mivanStructure },
  { key: "post_slab_mivan_v1", method: "mivan", track: "post_slab", name: "Finishing (Mivan)", ...mivanFinishing },
  { key: "pre_slab_hybrid_v1", method: "hybrid", track: "pre_slab", name: "Structure cycle (Hybrid)", ...hybridStructure },
  { key: "post_slab_hybrid_v1", method: "hybrid", track: "post_slab", name: "Finishing (Hybrid)", ...hybridFinishing },
];

/** Default trades (zones) per method; weights sum to 100. */
export const DEFAULT_TRADES_BY_METHOD: Record<ConstructionMethod, { key: string; name: string; weight: number }[]> = {
  conventional: [
    { key: "blockwork", name: "Blockwork", weight: 20 },
    { key: "services", name: "Services (MEP)", weight: 15 },
    { key: "plaster", name: "Plaster", weight: 20 },
    { key: "flooring", name: "Flooring", weight: 20 },
    { key: "paint", name: "Paint", weight: 25 },
  ],
  mivan: [
    { key: "services", name: "Services (MEP)", weight: 20 },
    { key: "wall_finish", name: "Wall finish (skim / punning)", weight: 15 },
    { key: "doors_windows", name: "Doors & windows", weight: 15 },
    { key: "flooring", name: "Flooring", weight: 25 },
    { key: "paint", name: "Paint & texture", weight: 25 },
  ],
  hybrid: [
    { key: "blockwork", name: "Blockwork (internal)", weight: 10 },
    { key: "services", name: "Services (MEP)", weight: 15 },
    { key: "plaster", name: "Plaster (internal)", weight: 10 },
    { key: "wall_finish", name: "Wall finish (skim / punning)", weight: 10 },
    { key: "doors_windows", name: "Doors & windows", weight: 10 },
    { key: "flooring", name: "Flooring", weight: 20 },
    { key: "paint", name: "Paint & texture", weight: 25 },
  ],
};

/** Track label across a set of methods: one name, or "Pre-Slab / Structure cycle" when mixed. */
export function trackLabelFor(track: ProgressionTrack, methods: readonly ConstructionMethod[]): string {
  const labels = [...new Set((methods.length ? methods : ["conventional" as const]).map((m) => trackLabel(track, m)))];
  return labels.join(" / ");
}
