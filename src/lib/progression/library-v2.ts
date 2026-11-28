import { stepKey, type ConstructionMethod } from "@/lib/progression/methods";

/**
 * Progression v2 step library: Inside (per floor: Structure + Finishing),
 * Outside (per building) and Site works (per project), with phase weights.
 *
 * - A list's % = Σ phase% × phase weight (weights of one floor's Inside —
 *   structure + finishing tracks together — add to 100; Outside and Site to 100).
 * - `aliases` are v1 step titles a v2 step replaces, so recorded work carries
 *   over when a project moves to v2 (done when all its aliases were done).
 * - `photo` marks steps where a photo is expected (waterproofing, tests).
 *
 * The migration's template rows are generated from this file
 * (scripts/generate-v2-templates.cjs).
 */

export type V2Track = "pre_slab" | "post_slab" | "external" | "site";

export type V2Step = { title: string; aliases?: string[]; photo?: boolean };
export type V2Phase = { name: string; stage: string; weight: number; steps: V2Step[] };
export type V2Template = { key: string; method: ConstructionMethod | "any"; track: V2Track; name: string; phases: V2Phase[] };

const s = (title: string, aliases?: string[], photo?: boolean): V2Step => ({ title, aliases, photo });

// ------------------------------------------------------------ Inside: structure

const CONVENTIONAL_STRUCTURE: V2Phase[] = [
  {
    name: "Structure — slab cycle",
    stage: "Structure",
    weight: 30,
    steps: [
      s("Previous slab de-shuttering, as the engineer permits", [
        "Previous slab curing and de-shuttering, as permitted by the engineer",
        "De-shuttering and removal of slab formwork as permitted by the engineer",
      ]),
      s("Setting out: grid lines, columns and walls", ["Surveying and marking column locations and grid lines"]),
      s("Column / shear wall reinforcement and stirrups", [
        "Column reinforcement cutting, bending and fixing",
        "Column stirrups / ties installation",
        "Column reinforcement inspection and cover-block placement",
      ]),
      s("Column formwork, line and plumb checks", [
        "Column formwork / shuttering installation",
        "Column verticality, dimensions and alignment checks",
      ]),
      s("Column concreting (if cast separately)", ["Column concreting, where columns are cast separately from the slab"]),
      s("Beam and slab staging, props and deck shuttering", [
        "Prop / staging / scaffolding installation",
        "Beam bottom shuttering installation",
        "Beam side shuttering installation",
        "Slab centering and deck shuttering installation",
        "Checking formwork levels, line, level and alignment",
      ]),
      s("Beam and slab reinforcement, chairs and cover blocks", [
        "Beam bottom reinforcement fixing",
        "Beam top reinforcement and extra bars fixing",
        "Slab bottom reinforcement fixing",
        "Slab top reinforcement and negative bars fixing",
        "Chair bars / spacers installation",
      ]),
      s("Sunken slab, drop, opening and shaft provisions", [
        "Providing slab openings, shafts and service cut-outs as per drawings",
        "Parapet / upstand / sunken-area provisions, where applicable",
      ]),
      s("Electrical conduits, boxes and plumbing sleeves in slab", [
        "Electrical conduits embedded in slab, as per drawings",
        "Sleeves for plumbing and drainage pipes",
      ]),
      s("Pre-pour inspection (structural, MEP, safety)", ["Pre-pour checklist approval", "Structural engineer's reinforcement inspection"], true),
      s("Slab concreting, compaction and level finishing", ["Slab concreting", "Concrete compaction, finishing and level checks"], true),
      s("Curing started; cube samples taken", ["Curing initiation as specified"]),
      s("7-day / 28-day cube results recorded", [], true),
    ],
  },
];

function aluminiumStructure(walls: "all" | "outer"): V2Phase[] {
  const w = walls === "all" ? "walls" : "outer and shear walls";
  return [
    {
      name: "Structure — aluminium formwork cycle",
      stage: "Structure",
      weight: 30,
      steps: [
        s("Previous slab de-shuttering, as the engineer permits", [
          "De-shuttering of previous floor wall and slab panels, props retained as permitted by the engineer",
        ]),
        s("Setting out: grid lines, columns and walls", ["Surveying and marking grid lines, walls and openings"]),
        s(`Reinforcement for ${w} and columns`, [`Reinforcement fixing for ${w} and columns`, "Trimmer bars and reinforcement around openings"]),
        s(`Electrical conduits and boxes fixed in ${w}`, [`Electrical conduits, switch and junction boxes fixed in ${w}`]),
        s(`Plumbing sleeves and concealed pipes in ${w}`, [`Plumbing sleeves and concealed pipes in ${w}, as applicable`]),
        s("Door and window opening boxes and block-outs", ["Door and window opening boxes and block-outs"]),
        s("Aluminium wall and deck panels erected", [
          `Aluminium wall panels for ${w}, both faces, with pins, wedges and ties`,
          "Beam soffit and slab deck panels with props",
        ]),
        s("Formwork line, level, plumb and diagonal checks", ["Formwork line, level, plumb and diagonal checks"]),
        s("Beam and slab reinforcement, chairs and cover blocks", [
          "Slab bottom reinforcement fixing",
          "Slab top reinforcement and negative bars fixing",
          "Chair bars / spacers installation",
        ]),
        s("Electrical conduits, boxes and plumbing sleeves in slab", [
          "Electrical conduits embedded in slab, as per drawings",
          "Sleeves for plumbing and drainage pipes",
        ]),
        s("Pre-pour inspection (structural, MEP, safety)", ["Formwork, reinforcement and MEP inspection before the pour"], true),
        s("Walls and slab poured together, compaction and level finishing", [
          "Walls and slab poured together",
          "Concrete compaction, finishing and level checks",
        ], true),
        s("Curing started; cube samples taken", ["Curing initiation as specified", "Cube samples taken"]),
        s("7-day / 28-day cube results recorded", [], true),
      ],
    },
  ];
}

// ------------------------------------------------------------ Inside: finishing

const SERVICES = (weight: number, chasing: boolean): V2Phase => ({
  name: "Services first fix",
  stage: "Services",
  weight,
  steps: [
    ...(chasing ? [s("Wall chasing (block walls)", ["Wall chasing and openings for electrical and plumbing services, coordinated with masonry", "Wall chasing for services in block walls only"])] : []),
    s("Electrical conduits and boxes in walls", ["Electrical conduit installation in walls and slabs, as applicable", "Switchboard boxes and electrical junction boxes"]),
    s("Concealed water supply lines (CPVC / PPR)", ["Concealed plumbing water-supply lines", "Plumbing risers and shaft piping"]),
    s("Soil, waste and drainage lines (toilets, kitchen)", ["Soil, waste and drainage pipes, including bathroom and kitchen connections"]),
    s("AC copper piping and drain lines (if applicable)", ["AC refrigerant piping, drain lines and other concealed services, if applicable"]),
    s("Fire sprinkler / detector lines (if applicable)"),
    s("Low-voltage: CCTV, intercom and data conduits"),
    s("Gas line (if applicable)"),
    s("Pressure test (plumbing) and continuity test (electrical)", ["Electrical continuity checks and plumbing pressure/leak tests before covering"], true),
    ...(chasing ? [s("Chase filling and mesh at RCC–masonry joints", ["Electrical and plumbing chase filling", "Chicken mesh / fibre mesh at masonry-to-RCC junctions, where specified"])] : []),
  ],
});

const WATERPROOFING = (weight: number): V2Phase => ({
  name: "Waterproofing (wet areas)",
  stage: "Waterproofing",
  weight,
  steps: [
    s("Sunken slab cleaning and pipe-sleeve sealing", ["Bathroom and toilet floor-level preparation and slope formation"], true),
    s("Sunken slab waterproofing (coating + fibre mesh at corners)", ["Waterproofing in toilets, bathrooms, balconies and other specified areas"], true),
    s("48-hour ponding test, sunken areas", ["Water ponding test and rectification, where applicable"], true),
    s("Sunken filling (brick bat / light-weight concrete) and screed to slope", [], true),
    s("Toilet floor + 300 mm wall upturn waterproofing", ["Waterproofing upturns and pipe-junction treatment"], true),
    s("Shower area wall waterproofing (up to 1.8 m)", [], true),
    s("Balcony and utility waterproofing", [], true),
    s("Kitchen sink-area waterproofing", ["Kitchen platform and plumbing point coordination"], true),
    s("Final ponding test and sign-off before tiling", [], true),
  ],
});

const FLOORING = (weight: number): V2Phase => ({
  name: "Flooring and tiling",
  stage: "Flooring",
  weight,
  steps: [
    s("Floor levels and base mortar", ["Floor base preparation and level marking"]),
    s("Toilet floor tiles with slope to drain", ["Bathroom and toilet floor tiles with correct slope"]),
    s("Toilet wall tiles / dado", ["Bathroom wall tiles"]),
    s("Kitchen platform and dado tiles", ["Kitchen dado tiles, where specified"]),
    s("Room flooring (vitrified / marble / wood)", ["Room flooring — tiles, marble or other specified material"]),
    s("Skirting, door thresholds and granite patti", ["Door thresholds / granite patti"]),
    s("Window sills", ["Window sill installation — granite patti / stone sill"]),
    s("Grouting and cleaning", ["Skirting and tile grouting"]),
    s("Staircase and lobby flooring (common floors)", ["Staircase stonework and common-area flooring, as applicable"]),
  ],
});

const DOORS = (weight: number): V2Phase => ({
  name: "Doors, windows and metal work",
  stage: "Openings",
  weight,
  steps: [
    s("Window frames / sub-frames fixed and sealed", ["Window frames or sub-frames in cast openings"]),
    s("Window shutters and glass", ["Window frame and shutter installation"]),
    s("Door shutters, hardware and locks", ["Door shutters, hardware and locks"]),
    s("MS grills, balcony railings and safety grills"),
  ],
});

const PAINT = (weight: number): V2Phase => ({
  name: "Painting",
  stage: "Paint",
  weight,
  steps: [
    s("Wall putty (2 coats) and sanding", ["Internal wall putty and surface preparation"]),
    s("Primer", ["Primer application"]),
    s("First coat of paint", ["First coat of paint"]),
    s("Final coat of paint and touch-ups", ["Final paint coat and touch-ups"]),
  ],
});

const FIXTURES = (weight: number): V2Phase => ({
  name: "Fixtures and second fix",
  stage: "Fixtures",
  weight,
  steps: [
    s("Electrical wiring, switches, sockets and DB dressing", ["Electrical wires, switches, sockets and distribution board connections", "Wiring pulled through embedded conduits"]),
    s("Earthing and ELCB / RCCB testing", ["Electrical testing and functional checks"], true),
    s("Light fittings and false-ceiling closing", ["False ceiling and light fixtures, where specified"]),
    s("Sanitaryware, WC and washbasin", ["Sanitaryware, WC, washbasin and bathroom fittings"]),
    s("CP fittings: taps, mixers, showers", ["Plumbing taps, mixers and accessories"]),
    s("Kitchen sink and fittings", ["Kitchen platform, sink and related fittings"]),
    s("AC indoor units (if applicable)", ["AC indoor units and other MEP equipment, where applicable"]),
  ],
});

const HANDOVER = (weight: number): V2Phase => ({
  name: "Snagging and handover",
  stage: "Handover",
  weight,
  steps: [
    s("Electrical and plumbing functional test", ["Plumbing leak checks and drainage-flow testing", "Door, window and hardware operation checks"]),
    s("Snag list made", ["Snagging inspection and defect rectification"]),
    s("Snags rectified", ["Sealant application and finishing corrections"]),
    s("Deep cleaning", ["Deep cleaning and final handover"]),
    s("Floor handed over", [], true),
  ],
});

const CONVENTIONAL_FINISHING: V2Phase[] = [
  {
    name: "Walls — masonry",
    stage: "Walls",
    weight: 10,
    steps: [
      s("Wall marking: rooms, doors and shafts", ["Marking of walls, room layouts, shafts and openings"]),
      s("Blockwork / AAC / brickwork", ["Blockwork / AAC blockwork / brickwork", "Internal partition walls and external infill walls"]),
      s("Lintels, sill bands, door and window openings", ["Door and window openings, lintels and sill-level provisions"]),
      s("Door frames fixed and aligned", ["Doorframe installation and alignment, where frames are embedded during masonry", "Doorframe fixing and final alignment, if not already completed"]),
      s("Masonry curing"),
    ],
  },
  SERVICES(12, true),
  {
    name: "Plaster and ceilings",
    stage: "Plaster",
    weight: 10,
    steps: [
      s("Internal wall plaster", ["Internal wall plaster"]),
      s("Ceiling plaster / punning"),
      s("Plaster curing and level checks", ["Plaster curing and surface-level checks"]),
      s("False ceiling framing (gypsum / POP, if specified)"),
    ],
  },
  WATERPROOFING(8),
  FLOORING(12),
  DOORS(6),
  PAINT(7),
  FIXTURES(3),
  HANDOVER(2),
];

const AFTER_POUR = (weight: number): V2Phase => ({
  name: "After the pour",
  stage: "Surface preparation",
  weight,
  steps: [
    s("Fin and honeycomb removal, surface repair", ["Fin and honeycomb removal and surface repair"]),
    s("Tie-hole filling", ["Tie-hole filling"]),
    s("Slab level and wall plumb survey", ["Slab level and wall plumb survey"]),
    s("Prop removal once the slab reaches strength", ["Prop removal once the slab reaches strength"]),
  ],
});

const MIVAN_FINISHING: V2Phase[] = [
  AFTER_POUR(6),
  SERVICES(14, false),
  {
    name: "Wall finish (no plaster)",
    stage: "Wall finish",
    weight: 8,
    steps: [
      s("Gypsum punning / skim coat on walls and ceilings", ["Gypsum punning / skim coat on walls and ceilings"]),
      s("False ceiling framing (gypsum / POP, if specified)"),
    ],
  },
  WATERPROOFING(9),
  FLOORING(14),
  DOORS(7),
  PAINT(7),
  FIXTURES(3),
  HANDOVER(2),
];

const HYBRID_FINISHING: V2Phase[] = [
  AFTER_POUR(5),
  {
    name: "Internal partitions",
    stage: "Walls",
    weight: 6,
    steps: [
      s("Blockwork / AAC partitions for internal walls", ["Blockwork / AAC partitions for internal walls"]),
      s("Lintels and door openings in block walls", ["Lintels and door openings in block walls"]),
      s("Masonry curing"),
    ],
  },
  SERVICES(12, true),
  {
    name: "Plaster and wall finish",
    stage: "Plaster",
    weight: 9,
    steps: [
      s("Internal plaster on block walls", ["Internal plaster on block walls"]),
      s("Gypsum punning / skim coat on RCC walls", ["Gypsum punning / skim coat on RCC walls"]),
      s("Plaster curing and level checks", ["Plaster curing and surface-level checks"]),
      s("False ceiling framing (gypsum / POP, if specified)"),
    ],
  },
  WATERPROOFING(8),
  FLOORING(12),
  DOORS(6),
  PAINT(7),
  FIXTURES(3),
  HANDOVER(2),
];

// ------------------------------------------------------------ Outside (per building)

function outside(method: "conventional" | "aluminium"): V2Phase[] {
  const base: V2Phase =
    method === "conventional"
      ? {
          name: "External plaster",
          stage: "External plaster",
          weight: 20,
          steps: [
            s("Hacking / bonding coat on RCC"),
            s("Mesh at RCC–masonry joints"),
            s("External plaster (two coats, grooves and drip moulds)", ["External wall plaster and façade base preparation"]),
            s("Plaster curing and line checks"),
          ],
        }
      : {
          name: "RCC surface preparation",
          stage: "External base",
          weight: 15,
          steps: [
            s("Fin removal and surface repair on façade"),
            s("Tie-hole and joint sealing on façade"),
            s("External texture base on RCC walls (no plaster)", ["External texture base on RCC walls (no plaster)"]),
          ],
        };
  return [
    {
      name: "Scaffolding and preparation",
      stage: "Preparation",
      weight: 5,
      steps: [s("External scaffolding / gondola erected and certified", [], true), s("Façade survey: plumb, level and line marking")],
    },
    base,
    {
      name: "External waterproofing",
      stage: "Waterproofing",
      weight: method === "conventional" ? 15 : 20,
      steps: [
        s("External wall waterproof coating", [], true),
        s("Window and door perimeter sealing (silicone / PU)", [], true),
        s("Terrace slope screed / brick bat coba and waterproofing membrane", [], true),
        s("Terrace ponding test (72 hours)", [], true),
        s("Terrace protection screed / china mosaic / tiles", [], true),
        s("Parapet coping and drip moulds"),
        s("Overhead water tank waterproofing and leak test", [], true),
        s("Lift pit and basement waterproofing (if applicable)", [], true),
      ],
    },
    {
      name: "Façade and elevation",
      stage: "Façade",
      weight: 15,
      steps: [
        s("Elevation features: fins, louvers, cladding brackets"),
        s("ACP / stone / glass cladding (if specified)", ["External façade works, including plaster finishes, texture or cladding"]),
        s("Structural glazing / curtain wall (if specified)"),
        s("Façade sealant and final inspection", [], true),
      ],
    },
    {
      name: "External painting",
      stage: "External paint",
      weight: 15,
      steps: [s("External primer"), s("Texture / external putty", ["External texture paint"]), s("External paint coats"), s("Scaffolding removal and touch-ups")],
    },
    {
      name: "External services",
      stage: "Services",
      weight: 15,
      steps: [
        s("Rainwater down-takes and soil / waste stacks"),
        s("Plumbing shafts closed and access doors fitted"),
        s("Overhead tank piping and pumps"),
        s("Lightning arrestor and earthing grid", [], true),
        s("External lighting and façade lighting"),
        s("Fire riser / wet riser and hydrant valves (if applicable)"),
      ],
    },
    {
      name: "Lift and common areas",
      stage: "Lift & common",
      weight: 15,
      steps: [
        s("Lift machine room / headroom ready"),
        s("Lift installation"),
        s("Lift load test and licence", [], true),
        s("Staircase railings and lobby finishes"),
        s("Terrace access door, signage and safety railing"),
      ],
    },
  ];
}

// ------------------------------------------------------------ Site works (per project)

const SITE_WORKS: V2Phase[] = [
  {
    name: "Utilities",
    stage: "Utilities",
    weight: 30,
    steps: [
      s("External drainage lines and manholes"),
      s("STP / septic tank"),
      s("Underground water tank", [], true),
      s("Rainwater harvesting pits"),
      s("Power substation / transformer and DG set"),
    ],
  },
  {
    name: "Hardscape",
    stage: "Hardscape",
    weight: 30,
    steps: [s("Compound wall and gate"), s("Internal roads and kerbs"), s("Paving and parking marking")],
  },
  {
    name: "Softscape and amenities",
    stage: "Amenities",
    weight: 20,
    steps: [s("Landscaping and plantation"), s("Amenities: clubhouse, play area (if any)"), s("Site lighting")],
  },
  {
    name: "Statutory and handover",
    stage: "Handover",
    weight: 20,
    steps: [s("Fire NOC", [], true), s("Lift licences", [], true), s("Occupancy Certificate", [], true), s("Society / owner handover", [], true)],
  },
];

export const V2_TEMPLATES: readonly V2Template[] = [
  { key: "pre_slab_v2", method: "conventional", track: "pre_slab", name: "Structure (conventional)", phases: CONVENTIONAL_STRUCTURE },
  { key: "post_slab_v2", method: "conventional", track: "post_slab", name: "Finishing (conventional)", phases: CONVENTIONAL_FINISHING },
  { key: "pre_slab_mivan_v2", method: "mivan", track: "pre_slab", name: "Structure (Mivan)", phases: aluminiumStructure("all") },
  { key: "post_slab_mivan_v2", method: "mivan", track: "post_slab", name: "Finishing (Mivan)", phases: MIVAN_FINISHING },
  { key: "pre_slab_hybrid_v2", method: "hybrid", track: "pre_slab", name: "Structure (Hybrid)", phases: aluminiumStructure("outer") },
  { key: "post_slab_hybrid_v2", method: "hybrid", track: "post_slab", name: "Finishing (Hybrid)", phases: HYBRID_FINISHING },
  { key: "external_v2", method: "conventional", track: "external", name: "Outside (conventional)", phases: outside("conventional") },
  { key: "external_mivan_v2", method: "mivan", track: "external", name: "Outside (Mivan)", phases: outside("aluminium") },
  { key: "external_hybrid_v2", method: "hybrid", track: "external", name: "Outside (Hybrid)", phases: outside("aluminium") },
  { key: "site_v2", method: "any", track: "site", name: "Site works", phases: SITE_WORKS },
];

/** v2 template key for a method + track (site works ignore the method). */
export function v2TemplateKey(method: ConstructionMethod, track: V2Track): string {
  if (track === "site") return "site_v2";
  return method === "conventional" ? `${track}_v2` : `${track}_${method}_v2`;
}

/** Generated rows: numbered steps with step keys and alias keys. */
export function v2Rows(t: V2Template) {
  const rows: { stepNumber: number; phaseNumber: number; phaseName: string; phaseStage: string; phaseWeight: number; title: string; stepKey: string; aliasKeys: string[]; photo: boolean }[] = [];
  const used = new Set<string>();
  t.phases.forEach((p, pi) => {
    for (const st of p.steps) {
      let key = stepKey(st.title);
      const base = key;
      let n = 2;
      while (used.has(key)) key = `${base}_${n++}`;
      used.add(key);
      rows.push({
        stepNumber: rows.length + 1,
        phaseNumber: pi + 1,
        phaseName: p.name,
        phaseStage: p.stage,
        phaseWeight: p.weight,
        title: st.title,
        stepKey: key,
        aliasKeys: (st.aliases ?? []).map(stepKey),
        photo: Boolean(st.photo),
      });
    }
  });
  return rows;
}

/** Default project split of the % (Inside / Outside / Site). */
export const DEFAULT_SPLIT = { inside: 70, outside: 20, site: 10 } as const;
