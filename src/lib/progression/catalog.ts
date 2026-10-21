/**
 * Canonical post-slab construction sequence for Progression Report.
 * Kept in sync with supabase/migrations/032_progression_report.sql seed.
 */

export type ProgressionPhaseDef = {
  number: number;
  name: string;
  stage: string;
};

export type ProgressionStepDef = {
  stepNumber: number;
  phaseNumber: number;
  title: string;
};

export type ProgressionTrack = "pre_slab" | "post_slab";

export const PROGRESSION_TRACKS: readonly ProgressionTrack[] = ["pre_slab", "post_slab"];

export const PROGRESSION_TRACK_LABELS: Record<ProgressionTrack, string> = {
  pre_slab: "Pre-Slab",
  post_slab: "Post-Slab",
};

export const PROGRESSION_TEMPLATE_KEY = "post_slab_v1" as const;
export const PRE_SLAB_TEMPLATE_KEY = "pre_slab_v1" as const;

export const PROGRESSION_TEMPLATE_KEYS: Record<ProgressionTrack, string> = {
  pre_slab: PRE_SLAB_TEMPLATE_KEY,
  post_slab: PROGRESSION_TEMPLATE_KEY,
};

export const PROGRESSION_PHASES: readonly ProgressionPhaseDef[] = [
  { number: 1, name: "Slab completion and preparation", stage: "Structural stage" },
  { number: 2, name: "Blockwork and masonry", stage: "Wall construction stage" },
  { number: 3, name: "Concealed electrical and plumbing", stage: "First-fix MEP works" },
  { number: 4, name: "Sills, frames and plaster", stage: "Wall finishing preparation" },
  { number: 5, name: "Waterproofing and wet-area preparation", stage: "Wet areas" },
  { number: 6, name: "Flooring and stonework", stage: "Floor finishes" },
  { number: 7, name: "Windows, façade and painting", stage: "Façade & paint" },
  { number: 8, name: "Fixtures and second-fix services", stage: "Fixtures & MEP" },
  { number: 9, name: "Final finishing and handover", stage: "Handover" },
] as const;

export const PROGRESSION_STEPS: readonly ProgressionStepDef[] = [
  // Phase 1
  { stepNumber: 1, phaseNumber: 1, title: "Slab concreting completed" },
  { stepNumber: 2, phaseNumber: 1, title: "Concrete curing" },
  { stepNumber: 3, phaseNumber: 1, title: "De-shuttering and removal of slab formwork as permitted by the engineer" },
  { stepNumber: 4, phaseNumber: 1, title: "Removal of debris and cleaning of the floor" },
  { stepNumber: 5, phaseNumber: 1, title: "Structural inspection and checking slab levels" },
  { stepNumber: 6, phaseNumber: 1, title: "Marking of walls, room layouts, shafts and openings" },
  // Phase 2
  { stepNumber: 7, phaseNumber: 2, title: "Blockwork / AAC blockwork / brickwork" },
  { stepNumber: 8, phaseNumber: 2, title: "Internal partition walls and external infill walls" },
  { stepNumber: 9, phaseNumber: 2, title: "Door and window openings, lintels and sill-level provisions" },
  { stepNumber: 10, phaseNumber: 2, title: "Doorframe installation and alignment, where frames are embedded during masonry" },
  { stepNumber: 11, phaseNumber: 2, title: "Wall chasing and openings for electrical and plumbing services, coordinated with masonry" },
  // Phase 3
  { stepNumber: 12, phaseNumber: 3, title: "Electrical conduit installation in walls and slabs, as applicable" },
  { stepNumber: 13, phaseNumber: 3, title: "Switchboard boxes and electrical junction boxes" },
  { stepNumber: 14, phaseNumber: 3, title: "Concealed plumbing water-supply lines" },
  { stepNumber: 15, phaseNumber: 3, title: "Soil, waste and drainage pipes, including bathroom and kitchen connections" },
  { stepNumber: 16, phaseNumber: 3, title: "AC refrigerant piping, drain lines and other concealed services, if applicable" },
  { stepNumber: 17, phaseNumber: 3, title: "Electrical continuity checks and plumbing pressure/leak tests before covering" },
  // Phase 4
  { stepNumber: 18, phaseNumber: 4, title: "Window sill installation — granite patti / stone sill" },
  { stepNumber: 19, phaseNumber: 4, title: "Doorframe fixing and final alignment, if not already completed" },
  { stepNumber: 20, phaseNumber: 4, title: "Electrical and plumbing chase filling" },
  { stepNumber: 21, phaseNumber: 4, title: "Chicken mesh / fibre mesh at masonry-to-RCC junctions, where specified" },
  { stepNumber: 22, phaseNumber: 4, title: "Internal wall plaster" },
  { stepNumber: 23, phaseNumber: 4, title: "External wall plaster and façade base preparation" },
  { stepNumber: 24, phaseNumber: 4, title: "Plaster curing and surface-level checks" },
  // Phase 5
  { stepNumber: 25, phaseNumber: 5, title: "Bathroom and toilet floor-level preparation and slope formation" },
  { stepNumber: 26, phaseNumber: 5, title: "Waterproofing in toilets, bathrooms, balconies and other specified areas" },
  { stepNumber: 27, phaseNumber: 5, title: "Waterproofing upturns and pipe-junction treatment" },
  { stepNumber: 28, phaseNumber: 5, title: "Water ponding test and rectification, where applicable" },
  { stepNumber: 29, phaseNumber: 5, title: "Kitchen platform and plumbing point coordination" },
  // Phase 6
  { stepNumber: 30, phaseNumber: 6, title: "Floor base preparation and level marking" },
  { stepNumber: 31, phaseNumber: 6, title: "Bathroom and toilet floor tiles with correct slope" },
  { stepNumber: 32, phaseNumber: 6, title: "Bathroom wall tiles" },
  { stepNumber: 33, phaseNumber: 6, title: "Kitchen dado tiles, where specified" },
  { stepNumber: 34, phaseNumber: 6, title: "Room flooring — tiles, marble or other specified material" },
  { stepNumber: 35, phaseNumber: 6, title: "Door thresholds / granite patti" },
  { stepNumber: 36, phaseNumber: 6, title: "Skirting and tile grouting" },
  { stepNumber: 37, phaseNumber: 6, title: "Staircase stonework and common-area flooring, as applicable" },
  // Phase 7
  { stepNumber: 38, phaseNumber: 7, title: "Window frame and shutter installation" },
  { stepNumber: 39, phaseNumber: 7, title: "External façade works, including plaster finishes, texture or cladding" },
  { stepNumber: 40, phaseNumber: 7, title: "Internal wall putty and surface preparation" },
  { stepNumber: 41, phaseNumber: 7, title: "Primer application" },
  { stepNumber: 42, phaseNumber: 7, title: "First coat of paint" },
  // Phase 8
  { stepNumber: 43, phaseNumber: 8, title: "Door shutters, hardware and locks" },
  { stepNumber: 44, phaseNumber: 8, title: "Electrical wires, switches, sockets and distribution board connections" },
  { stepNumber: 45, phaseNumber: 8, title: "Sanitaryware, WC, washbasin and bathroom fittings" },
  { stepNumber: 46, phaseNumber: 8, title: "Plumbing taps, mixers and accessories" },
  { stepNumber: 47, phaseNumber: 8, title: "Kitchen platform, sink and related fittings" },
  { stepNumber: 48, phaseNumber: 8, title: "False ceiling and light fixtures, where specified" },
  { stepNumber: 49, phaseNumber: 8, title: "AC indoor units and other MEP equipment, where applicable" },
  // Phase 9
  { stepNumber: 50, phaseNumber: 9, title: "Final paint coat and touch-ups" },
  { stepNumber: 51, phaseNumber: 9, title: "Sealant application and finishing corrections" },
  { stepNumber: 52, phaseNumber: 9, title: "Electrical testing and functional checks" },
  { stepNumber: 53, phaseNumber: 9, title: "Plumbing leak checks and drainage-flow testing" },
  { stepNumber: 54, phaseNumber: 9, title: "Door, window and hardware operation checks" },
  { stepNumber: 55, phaseNumber: 9, title: "Snagging inspection and defect rectification" },
  { stepNumber: 56, phaseNumber: 9, title: "Deep cleaning and final handover" },
] as const;

export const PRE_SLAB_PHASES: readonly ProgressionPhaseDef[] = [
  { number: 1, name: "Column, wall and vertical reinforcement", stage: "Pre-slab structural works" },
  { number: 2, name: "Beam and slab formwork", stage: "Formwork stage" },
  { number: 3, name: "Beam and slab reinforcement", stage: "Reinforcement stage" },
  { number: 4, name: "Electrical and plumbing provisions", stage: "Pre-pour MEP provisions" },
  { number: 5, name: "Edge protection and slab preparation", stage: "Slab preparation stage" },
  { number: 6, name: "Pre-pour inspection and slab casting", stage: "Slab casting stage" },
] as const;

export const PRE_SLAB_STEPS: readonly ProgressionStepDef[] = [
  // Phase 1
  { stepNumber: 1, phaseNumber: 1, title: "Previous slab curing and de-shuttering, as permitted by the engineer" },
  { stepNumber: 2, phaseNumber: 1, title: "Surveying and marking column locations and grid lines" },
  { stepNumber: 3, phaseNumber: 1, title: "Column reinforcement cutting, bending and fixing" },
  { stepNumber: 4, phaseNumber: 1, title: "Column stirrups / ties installation" },
  { stepNumber: 5, phaseNumber: 1, title: "Column reinforcement inspection and cover-block placement" },
  { stepNumber: 6, phaseNumber: 1, title: "Column formwork / shuttering installation" },
  { stepNumber: 7, phaseNumber: 1, title: "Column verticality, dimensions and alignment checks" },
  { stepNumber: 8, phaseNumber: 1, title: "Column concreting, where columns are cast separately from the slab" },
  // Phase 2
  { stepNumber: 9, phaseNumber: 2, title: "Material shifting and floor preparation" },
  { stepNumber: 10, phaseNumber: 2, title: "Prop / staging / scaffolding installation" },
  { stepNumber: 11, phaseNumber: 2, title: "Beam bottom shuttering installation" },
  { stepNumber: 12, phaseNumber: 2, title: "Beam side shuttering installation" },
  { stepNumber: 13, phaseNumber: 2, title: "Slab centering and deck shuttering installation" },
  { stepNumber: 14, phaseNumber: 2, title: "Checking formwork levels, line, level and alignment" },
  { stepNumber: 15, phaseNumber: 2, title: "Checking supports, bracing and formwork stability" },
  { stepNumber: 16, phaseNumber: 2, title: "Applying approved shuttering release agent" },
  { stepNumber: 17, phaseNumber: 2, title: "Providing slab openings, shafts and service cut-outs as per drawings" },
  // Phase 3
  { stepNumber: 18, phaseNumber: 3, title: "Beam reinforcement cutting and bending" },
  { stepNumber: 19, phaseNumber: 3, title: "Beam bottom reinforcement fixing" },
  { stepNumber: 20, phaseNumber: 3, title: "Beam top reinforcement and extra bars fixing" },
  { stepNumber: 21, phaseNumber: 3, title: "Beam stirrups / links installation" },
  { stepNumber: 22, phaseNumber: 3, title: "Slab bottom reinforcement fixing" },
  { stepNumber: 23, phaseNumber: 3, title: "Slab top reinforcement and negative bars fixing" },
  { stepNumber: 24, phaseNumber: 3, title: "Distribution reinforcement and additional bars installation" },
  { stepNumber: 25, phaseNumber: 3, title: "Chair bars / spacers installation" },
  { stepNumber: 26, phaseNumber: 3, title: "Cover blocks placement and reinforcement cover checks" },
  { stepNumber: 27, phaseNumber: 3, title: "Lapping, anchorage and development-length checks" },
  { stepNumber: 28, phaseNumber: 3, title: "Reinforcement inspection against structural drawings" },
  // Phase 4
  { stepNumber: 29, phaseNumber: 4, title: "Electrical conduits embedded in slab, as per drawings" },
  { stepNumber: 30, phaseNumber: 4, title: "Electrical junction boxes and outlet provisions" },
  { stepNumber: 31, phaseNumber: 4, title: "Sleeves for plumbing and drainage pipes" },
  { stepNumber: 32, phaseNumber: 4, title: "Openings for vertical service risers and MEP shafts" },
  { stepNumber: 33, phaseNumber: 4, title: "AC, fire-fighting and other service provisions, where applicable" },
  { stepNumber: 34, phaseNumber: 4, title: "Checking conduits and sleeves for clashes with reinforcement" },
  { stepNumber: 35, phaseNumber: 4, title: "Verifying all service openings against coordinated MEP drawings" },
  { stepNumber: 36, phaseNumber: 4, title: "MEP inspection and approval before concreting" },
  // Phase 5
  { stepNumber: 37, phaseNumber: 5, title: "Balcony and slab-edge shuttering installation" },
  { stepNumber: 38, phaseNumber: 5, title: "Edge protection and safe access arrangements" },
  { stepNumber: 39, phaseNumber: 5, title: "Parapet / upstand / sunken-area provisions, where applicable" },
  { stepNumber: 40, phaseNumber: 5, title: "Checking slab thickness and beam dimensions" },
  { stepNumber: 41, phaseNumber: 5, title: "Checking slab levels, slopes and drop panels, where specified" },
  { stepNumber: 42, phaseNumber: 5, title: "Removing loose binding wire, debris and standing water" },
  { stepNumber: 43, phaseNumber: 5, title: "Checking reinforcement cleanliness and stability" },
  { stepNumber: 44, phaseNumber: 5, title: "Final formwork and staging inspection" },
  // Phase 6
  { stepNumber: 45, phaseNumber: 6, title: "Structural engineer's reinforcement inspection" },
  { stepNumber: 46, phaseNumber: 6, title: "MEP coordination and inspection sign-off" },
  { stepNumber: 47, phaseNumber: 6, title: "Formwork, staging and access safety clearance" },
  { stepNumber: 48, phaseNumber: 6, title: "Concrete grade and approved mix confirmation" },
  { stepNumber: 49, phaseNumber: 6, title: "Concrete quantity and supply schedule confirmation" },
  { stepNumber: 50, phaseNumber: 6, title: "Pump, vibrator and backup equipment readiness" },
  { stepNumber: 51, phaseNumber: 6, title: "Manpower and concrete placement sequence confirmation" },
  { stepNumber: 52, phaseNumber: 6, title: "Pre-pour checklist approval" },
  { stepNumber: 53, phaseNumber: 6, title: "Slab concreting" },
  { stepNumber: 54, phaseNumber: 6, title: "Concrete compaction, finishing and level checks" },
  { stepNumber: 55, phaseNumber: 6, title: "Curing initiation as specified" },
  { stepNumber: 56, phaseNumber: 6, title: "Recording concrete pour details and inspection photographs" },
] as const;

export const PROGRESSION_TEMPLATES: Record<
  ProgressionTrack,
  {
    key: string;
    phases: readonly ProgressionPhaseDef[];
    steps: readonly ProgressionStepDef[];
  }
> = {
  pre_slab: { key: PRE_SLAB_TEMPLATE_KEY, phases: PRE_SLAB_PHASES, steps: PRE_SLAB_STEPS },
  post_slab: { key: PROGRESSION_TEMPLATE_KEY, phases: PROGRESSION_PHASES, steps: PROGRESSION_STEPS },
};

export const PROGRESSION_STEP_COUNT = PROGRESSION_STEPS.length;
