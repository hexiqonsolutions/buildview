# Engineering progress

Last updated: 2026-10-21

## Pre-Slab / Post-Slab Progression redesign (2026-10-21)

- Migration `036_progression_pre_post_start_end.sql`: `track` column + unique
  `(floor_id, track)`, step `started_at/started_by/ended_at/ended_by`,
  `in_progress` status, new log actions, Pre-Slab `pre_slab_v1` seed
  (6 phases / 56 steps), per-floor Pre-Slab seeding, Post-Slab backfill
  (`ended_at = completed_at`). **Not yet applied** — `npm run db:check`
  reports the 036 probes MISSING until operators apply it.
- Two independent Tower/Floor sections (Pre-Slab over Post-Slab) on the
  Progression tab; Start/End/Reset step workflow with conditional-update
  idempotency, server timestamps (Asia/Kolkata display), editor date
  correction, and automatic Timeline entries with author name/role/time.
- Only Ended steps count toward %; project % pools both tracks over
  activated floors. Overview shows combined % + per-track bars.
- Verification: `node scripts/test-progression-stats.mjs` pass,
  `npx tsc --noEmit` pass, `npm run lint` pass (no warnings),
  `npm run build` pass. Catalog ↔ migration step titles verified identical.

## Completed

- Repository discovery (Next.js 15 App Router, React 19, Supabase, no automated test suite).
- Confirmed security issues BV-SEC-PROG-001/002, BV-SEC-MW-001 and implemented app-layer fixes.
- Added migration `035_progression_select_rls.sql` to align Progression SELECT with `can_edit_progression`.
- Skipped bulk floor seeding on Progression reads (perf).
- Reject unknown `?floor=` instead of silently falling back to Floor 1.
- Started audit docs under `docs/`.

## Modified files (this batch)

- `src/lib/supabase/middleware.ts`
- `src/lib/data/progression.ts`
- `src/lib/actions/progression.ts`
- `src/app/dashboard/projects/[id]/page.tsx`
- `src/app/admin/projects/[id]/page.tsx`
- `supabase/migrations/035_progression_select_rls.sql`
- `docs/engineering-*.md`, `docs/bug-register.md`, etc.

## Tests run

| Command | Result |
|---------|--------|
| `node scripts/test-progression-stats.mjs` | Pass |
| `npx tsc --noEmit` | Pass (exit 0) |
| `npm run lint` | Pass (exit 0) |
| `npm run build` | Pass (exit 0) |

## Remaining / next

1. Apply migration 035 on staging/production via approved `db:apply` / SQL Editor.
2. Continue workflow audit (auth, uploads, issues) for additional confirmed bugs.
3. Introduce minimal unit tests for progression `%` helpers (no test runner yet).
4. Measure dashboard N+1 / progression list latency after seed change.

## Ops

- Migration `035_progression_select_rls.sql` applied by operators (2026-10-19).

## Blocked

- No Vitest/Jest/Playwright in repo — `README` states tsc/lint/build are the gate.
