# Engineering progress

Last updated: 2026-10-19

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

## Blocked

- No Vitest/Jest/Playwright in repo — `README` states tsc/lint/build are the gate.
- Production DB not mutated by this agent; migration 035 must be applied by operators.
