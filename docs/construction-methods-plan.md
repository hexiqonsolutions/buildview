# Progression by construction method: Conventional, Mivan, Hybrid

**Status:** plan for review. Nothing built yet.

## 1. The problem

Every floor gets the same two checklists today, written for **conventional formwork**:

- **Pre-slab (56 steps):** columns, beam and slab shuttering, reinforcement, MEP sleeves, then the slab pour.
- **Post-slab (56 steps):** blockwork, wall chasing, concealed MEP, plaster, waterproofing, flooring, paint, fixtures, handover.

A **Mivan** (aluminium formwork) floor doesn't work like that:

- **Walls and slab are cast together in one pour,** on a roughly 7–10 day cycle per floor.
- **Conduits, boxes and openings are built into the walls before the pour,** so there's no blockwork, chasing or chase filling.
- **No wall plaster:** walls only need a skim coat or gypsum punning before putty.
- **No external plaster:** the façade gets a texture finish directly.

On a Mivan floor, about 15 of today's post-slab steps never happen. The floor can never reach 100% honestly, and the steps that matter (formwork cycle, embedded MEP, monolithic pour) aren't tracked.

**Hybrid** sits in between. Typically the **outer and shear walls are Mivan**, and the **internal partitions are blockwork** that is plastered.

## 2. The approach

1. **One construction method per building, with a per-floor override.**
   - Building default: Conventional, Mivan or Hybrid.
   - Floors can override it, because podium and basement floors are often conventional while typical floors are Mivan.
   - New buildings take the project's default method.
2. **One step library, tagged by method.**
   - Each step says which methods it applies to.
   - Shared steps (waterproofing, flooring, fixtures, handover) are written once.
   - From it we publish one checklist pair per method: `conventional` (today's, unchanged), `mivan` and `hybrid`.
3. **Two tracks stay, with labels that fit the method.**

   | | Track 1 | Track 2 |
   |---|---|---|
   | Conventional | Pre-slab | Post-slab |
   | Mivan / Hybrid | Structure cycle | Finishing |

   Internally they stay `pre_slab` and `post_slab`, so schedules, the S-curve, scans and the report all keep working.
4. **The formula doesn't change.**
   - A floor's % is the steps ended ÷ that floor's own step total, so floors with different methods compare fairly.
   - The project % is still the average across floors.
5. **Zones & trades follow the method too.**
   - Default trade sets (blockwork / plaster / paint etc.) gain a Mivan and a Hybrid version.
   - Mivan has no Blockwork or Plaster trade, but has Skim coat and Texture.
   - Staff can still override trades per project (M6).
6. **Changing a floor's method:**
   - **Free while nothing on that floor has started.**
   - **After work has started**, the floor switches to the new checklist. Steps that exist in both methods (matched by step key) keep their dates, evidence and verification. Steps that don't exist in the new method are archived, not deleted, and the change is written to the activity log.
7. **Existing projects:** default to Conventional, so their numbers stay exactly as they are now.
8. **Where it shows:**
   - A method badge per building and floor on the Progression tab, the floors table and the PDF report.
   - A filter by method on admin project lists.

## 3. Draft step lists (please review: site practice varies)

### Mivan: Structure cycle (≈25 steps)
1. **Setting out:** previous floor de-shuttering of wall and slab panels (props kept as the engineer allows) · panel cleaning and release agent · grid, wall and opening marking · kicker and level checks
2. **Wall reinforcement:** shear-wall and column reinforcement · reinforcement around openings · cover blocks
3. **MEP built into walls:** electrical conduits and switch / junction boxes in walls · plumbing sleeves and concealed pipes in walls · door and window opening boxes and block-outs · in-wall MEP check before closing the formwork
4. **Aluminium formwork:** wall panels, both faces, with pins, wedges and ties · beam soffit and deck panels with props · slab openings, shafts and sunken areas · line, level, plumb and diagonal checks · edge panels, brackets and working platform
5. **Slab reinforcement and MEP:** slab bottom bars · slab top and extra bars · slab conduits, boxes and sleeves · chairs and cover blocks
6. **Inspection and monolithic pour:** formwork, reinforcement and MEP inspection · walls and slab poured together · vibration and level finishing · cube samples · curing

### Mivan: Finishing (≈45 steps)
1. **After the pour:** fins and honeycomb removal, surface repair · tie-hole filling · slab level and wall plumb survey · prop removal at strength
2. **Openings and frames:** door frames in cast openings · window frames or sub-frames · sills and thresholds
3. **Services (balance):** risers and shaft piping · soil, waste and drainage · wiring pulled through embedded conduits · pressure and continuity tests
4. **Wet areas:** same as conventional (slope, waterproofing, upturns, ponding test, kitchen points)
5. **Wall finish:** gypsum punning or skim coat · putty · external texture base (no plaster)
6. **Flooring and stonework:** same as conventional
7. **Façade and paint:** window shutters · external texture paint · primer · paint coats
8. **Fixtures and second fix:** same as conventional
9. **Final finishing and handover:** same as conventional

### Hybrid
- **Structure cycle:** the Mivan cycle for outer and shear walls and the slab.
- **Finishing:** Mivan finishing **plus** the internal partition steps:
  - blockwork / AAC partitions;
  - lintels and door openings in the block walls;
  - chasing in block walls only;
  - chase filling;
  - mesh at block-to-RCC joints;
  - **internal plaster on block walls only.**
- Still no external plaster.

## 4. Build order (if approved)

1. **Migration 053:** `construction_method` on projects (default), buildings and floors (override); new checklist templates (`mivan`, `hybrid`) with step keys; method-specific default trade sets.
2. **Admin:** a method picker on the building and floor (and project default), plus the safe switch with carry-over.
3. **Progression tab:** method badges, method-aware track labels, and the right checklist per floor.
4. **Report, Excel and dashboards:** method shown alongside each floor; tests for mixed-method projects.
5. **Demo:** set Nahur villa trial to mixed methods (e.g. Tower A Mivan, Tower B Hybrid, Tower c Conventional) to see it working.
