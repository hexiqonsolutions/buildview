# BuildView: Progression % audit (Phase A, read-only)

Date: 24 Nov 2026 · Scope: `BUILDVIEW-COMPLETION-SPEC.md` Phase A, plus a plan for comparing 360° scans with progression.
No code or database changes were made for this audit.

---

## 1. Summary

- Progression today is a **checklist**, not a weighted model. Each floor has two fixed 56-step checklists (Pre-Slab and Post-Slab). A step is **pending**, **in progress** or **completed**.
- **The % is simply "completed steps ÷ total steps"** over the floors that have started, with every step weighted equally. In-progress steps earn nothing.
- **Floors that haven't started are left out of the project %.** A 20-floor tower with one floor half done shows **≈50%**, not ≈2.5%. This is the biggest correctness gap.
- **There are three different "progress %" sources in the app.** Clients who can't see Progression get a number that is either typed into a timeline update or **made up from the project status** (In Progress always shows 62%).
- **The schedule exists but isn't compared with actuals.** Planned start and end dates are stored per floor and track, but they only drive a deadline badge ("Overdue by 3d"). There is no planned %, variance or Ahead/Behind status.
- **Nothing links progress to the 360° scans** today, even though tours already carry `building_id` and `floor_id`. That makes the 360 comparison very achievable (§7).

---

## 2. Schema (migrations 032–037)

No later migration touches progression (044–046 are property, portal and tours).

| Table | Key columns | Notes |
|---|---|---|
| `progression_templates` | `id`, `key` (unique), `name`, `version`, `is_active` | Seeded: `post_slab_v1` (032) and `pre_slab_v1` (036). |
| `progression_template_steps` | `template_id` → templates, `step_number`, `phase_number`, `phase_name`, `phase_stage`, `title` | 56 steps each. Post-Slab has 9 phases, Pre-Slab has 6. There are **no weights**. |
| `project_progressions` | `project_id`, `floor_id` (NOT NULL), `building_id`, `template_id`, `track` (`pre_slab`/`post_slab`), `planned_start_date`, `planned_end_date`, audit and soft-delete columns | One row per floor per track. The unique index is on `(floor_id, track)` where not deleted. |
| `project_progression_steps` | `progression_id`, `template_step_id`, `step_number`, `status` (`pending`/`in_progress`/`completed`), `started_at`/`started_by`, `ended_at`/`ended_by`, `completed_at`/`completed_by`, `work_date`, `note` | Current state; it is **overwritten** on each change. |
| `project_progression_logs` | `progression_id`, `step_id`, `action` (`completed`, `reopened`, `started`, `ended`, `reset`, `date_corrected`), `work_date`, `actor_id`, `note`, `created_at` | **Append-only history.** |

**Database function:** `can_edit_progression(project)`. It returns true for staff, for a `client_admin` of the owning client, or for a `site_engineer` / `site_supervisor` assigned to the project.

**Row-level security (database access rules)**

| Table | Read | Write |
|---|---|---|
| templates, template steps | any active signed-in user | none (seeded by migration only) |
| `project_progressions` | staff, or `can_edit_progression` (035 tightened this from "any project access") | insert/update: `can_edit_progression` |
| `project_progression_steps` | same as read above, via its progression | insert/update: `can_edit_progression` |
| `project_progression_logs` | same as read above | insert: `can_edit_progression` (no update or delete policy, so logs are append-only) |

---

## 3. The current formula (exact)

Code: `src/lib/progression/stats.ts` (`overallPercent`, `buildPhases`) and `src/lib/data/progression.ts` (`loadFloorSummaries`, `aggregateProjectPercent`, `summarizeTracks`, `getProgressionPercentByProjectIds`).

```
step credit        = 1 if status = 'completed', else 0      (in_progress = 0)
track %  (floor)   = round( completed_steps / 56 × 100 )
phase %            = round( completed_in_phase / steps_in_phase × 100 )
floor %  (combined)= round( (completed_pre + completed_post) / (56 + 56) × 100 )
floor activated    = any step on the floor (either track) is in_progress or completed
project %          = round( Σ completed over ACTIVATED floors / Σ total over ACTIVATED floors × 100 )
                     = 0 when no floor is activated
```

- **Weights:** none. Every step counts the same, so "Slab concreting" counts as much as "Deep cleaning".
- **Roll-up:** floors are pooled by step count, so there's no area weighting. Buildings aren't a separate level; floors from every building go into one pool.
- **Rounding:** `Math.round` at every level (track, phase, floor, project).
- **N/A:** not supported. Every floor carries all 112 steps.
- **Schedule:** not part of the %. `planned_end_date` only drives `deadlineStatus()` in `progression-panel.tsx` (No deadline / Completed / Overdue / Due today / Due in Nd).

**Worked example with real columns.** A project has 1 building and 3 floors:

| Floor | Pre-Slab `status='completed'` | Post-Slab completed | Activated? | Floor % |
|---|---|---|---|---|
| Floor 1 | 56 / 56 | 20 / 56 | yes | (56+20)/112 = 67.9 → **68%** |
| Floor 2 | 10 / 56 (plus 3 `in_progress`) | 0 / 56 | yes | 10/112 = 8.9 → **9%** |
| Floor 3 | 0 / 56 | 0 / 56 | **no** | 0% (excluded) |

Project % = (76 + 10) / (112 + 112) = 86 / 224 = 38.4 → **38%**.
If Floor 3 were counted, the result would be 86 / 336 = **26%**. The 3 in-progress steps add nothing either way.

---

## 4. Where a % is shown, and who sees it

| Place | Source of the number | Who sees it |
|---|---|---|
| Portal → project → **Progression** tab (`progression-panel.tsx`), with phase bars and daily/weekly charts (`progression-charts.tsx`) | Progression formula above | `canViewProgression` = staff, `client_admin`, `site_supervisor`, `site_engineer` |
| Portal project **header** progress bar (`project-header.tsx`, `dashboard/projects/[id]/page.tsx`) | Progression % if the viewer can see Progression, **otherwise `getProjectProgressPercent(status)`** | Everyone on construction projects |
| Portal **Projects** list and **Executive overview** (`executive-overview.tsx`, `construction-intelligence-overview.tsx`, `portal-charts.tsx`, `lib/portal/dashboard-data.ts`) | `getProgressionPercentByProjectIds`, falling back to the **latest timeline `progress_percent`**, then to the **status map** (`lib/portal/progress-metrics.ts`) | All construction portal roles |
| Admin **Project Manager** "Progress" column (`lib/data/projects.ts`) | `getProgressionPercentByProjectIds`, falling back to the status map | Staff |
| Progression PDF/Excel export (`actions/progression-export.ts`, `lib/progression/export-*.ts`) | Progression formula | Progression roles |

The **status map** (`src/lib/utils.ts`) is: planning 15 · in_progress **62** · on_hold 45 · completed 100 · archived 100 · suspended 0. These numbers aren't measured; they're placeholders.

The **timeline %** (`timeline_events.progress_percent`) is whatever someone types into a timeline update. It isn't tied to the checklist.

**Consequence:** `read_only_client`, `client`, `client_user` and `consultant` users never see the checklist %. They can see a number that disagrees with it, or a fixed 62%.

---

## 5. Who can edit, and how history is kept

- **Edit:** staff, plus `client_admin`, `site_supervisor` and `site_engineer` (`canEditProgression` in `lib/auth/roles.ts`, mirrored in the database by `can_edit_progression`).
- **Actions** (`src/lib/actions/progression.ts`): `startProgressionStep`, `endProgressionStep`, `resetProgressionStep`, `updateProgressionStepDates`, `setProgressionStep`, `setProgressionSchedule`, `selectProgressionFloor/Section`. Each change also writes a timeline/activity entry.
- **History:** the step row is overwritten with its current status and timestamps. Every transition is also appended to `project_progression_logs` with its `work_date` and actor, so **past % values can be rebuilt by replaying the logs**. There are no stored % snapshots.
- **Verification:** none. A tick counts the moment it's made. Nothing records who checked it or what evidence supports it.

---

## 6. Gaps vs. the Phase B target

| Target concept (spec B1–B5) | Status | Notes |
|---|---|---|
| Activities (trades) | **Partial** | Phases (15 across both tracks) behave like activities, but there's no separate activity entity and no trade grouping such as "Plaster" across tracks. |
| Stages with credit % (0/25/50/100) | **Partial** | 3 statuses exist, but only `completed` earns credit. There are no configurable credits. |
| Activity weights summing to 100 | **Missing** | Every step weighs the same. |
| Zones (flat/unit/room) + area + polygon | **Missing** | The hierarchy stops at the floor. |
| Roll-up basis (area / equal / custom) | **Missing** | Pooled step count only. Floors that haven't started are excluded. |
| N/A per zone | **Missing** | |
| Observations with evidence, source (manual/ai), verified_by/at | **Missing** | Logs record who/when but have no evidence, verification or source. |
| Plan per activity per floor, planned %, variance, Ahead/Behind status | **Partial** | Planned dates exist per floor and track. There's no planned %, no variance and no status buckets (only a deadline badge). |
| "Count only verified" setting | **Missing** | |
| Pure, unit-tested formula module | **Partial** | `overallPercent` and `buildPhases` are pure, but the roll-up lives inside data loaders that read the database. There are no unit tests in the repo (only `scripts/test-progression-stats.mjs`). |
| % snapshots / S-curve | **Missing** | Can be rebuilt from logs. Daily/weekly completion **counts** exist; % over time doesn't. |
| Completion hero card + "How is this calculated?" | **Missing** | |
| Floor-plan heatmap | **Missing** | No floor-plan images or zones. |
| Matrix (zones × activities) | **Partial** | There's a per-floor checklist; no cross-floor matrix. |
| Trade summary | **Partial** | Phase % per floor; not rolled up across the building. |
| PDF progress report | **Partial** | Progression export exists; it has no method appendix, heatmap or evidence links. |
| Template editor (admin) | **Missing** | Templates are seeded only by migration. |
| Per-project template override | **Missing** | |
| Permissions: separate *verify* right; view for all roles | **Missing / Partial** | View is limited to the edit roles. There's no verify role. |
| One consistent % everywhere | **Missing** | Three sources (§4). |

---

## 7. Plan: comparing 360° scans with progression

Today the pieces sit side by side without being connected:
- **Tours:** `project_tours` already has `floor_id`, `building_id` and `capture_date` (migration 014).
- **Progress:** every step change is logged with its `work_date`.
- **Comparing scans:** the Compare page already shows two scans side by side.

Ranked from quick win to larger build:

1. **"Progress at this scan" (quick win, no new data entry).** For each tour, replay that floor's logs up to the tour's `capture_date` to get the % on that day.
   - Show it on tour cards and on the Compare page, e.g. "Scan A (12 Oct): 42% · Scan B (10 Nov): 61% · +19 pts".
   - Below that, list the steps completed between the two scan dates.
   - Clients can then *see* what changed and *read* what was claimed, in one place.
2. **Evidence on each step.** Add an optional `tour_id` to step changes, plus an optional Matterport position. Matterport supports deep-link parameters for opening at a specific spot; we'd confirm this with your Matterport plan before relying on it.
   - Every ticked step then opens the exact scan, ideally at the exact spot, that proves it.
   - This is the "every number links to the 360 view" edge described in the spec.
3. **Verify from the scan.** In a split view (checklist next to the 360 viewer), a verifier opens the floor's latest scan and confirms or rejects each claimed step.
   - This fills in `verified_by` / `verified_at`.
   - With "count only verified" on, unverified ticks show as *pending* and don't move the %.
4. **Freshness flags.** Warn when progress claims are newer than the latest scan of that floor ("needs a scan"), or when a new scan hasn't been reviewed yet ("needs review").
5. **AI later (out of scope, designed for).** An AI pass on a new scan proposes stage changes with `source = 'ai'`, which go through the same verification step.

Step 1 works with today's data. Steps 2–4 slot into the Phase B "Observation" model (evidence, source, verified_by/at) instead of being a parallel system.

---

## 8. Recommended mapping for Phase B (so existing projects keep their numbers)

- **Activities:** each existing **phase** (9 Post-Slab + 6 Pre-Slab) becomes an activity, and its steps become the activity's checklist.
- **Credits:** activity % = completed steps ÷ steps in the phase, which is today's phase %.
- **Weights:** default each activity's weight to its share of steps (for example, 6 steps out of 112). With those defaults the new formula **reproduces today's floor % exactly**, and admins can then re-weight.
- **Zones:** optional. A floor with no zones counts as one zone, area-weighted by the floor's total area.
- **Decision needed:**
  - **Count floors that haven't started as 0%**, which matches the spec and is more honest.
  - **Or keep today's "activated floors only".** Switching would drop current project % values on partly started buildings, so clients should hear about it first.
- **One source of truth:** everywhere that shows a %, the status map and timeline fallbacks included, should read from the new formula module. Show "Not tracked yet" instead of 62% when there's no data.
- **Migration numbering:** the spec says 044+, but 044–046 are already used. Phase B starts at **047**.
