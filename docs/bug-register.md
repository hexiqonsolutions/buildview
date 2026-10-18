# Bug register

| ID | Severity | Feature | Status | Evidence / fix |
|----|----------|---------|--------|----------------|
| BV-SEC-PROG-001 | High | Progression confidentiality | Fixed | Gate reads with `canViewProgression` + `canViewProject`; do not pass `progression` props unless allowed; migration 035 RLS SELECT |
| BV-SEC-PROG-002 | Medium | Progression seeding | Fixed | No bulk ensure on default read |
| BV-SEC-MW-001 | High | Middleware auth | Fixed | Protected routes redirect to `/login` when Supabase env missing |
| BV-PROG-FLOOR-001 | Medium | Floor URL | Fixed | Unknown `floorId` returns null / error instead of Floor 1 |
| BV-PROG-PORTFOLIO-001 | Medium | Portfolio gating | Fixed (prior) | Portfolio clients skip Progression fetch/UI |
| BV-SEC-PROG-003 | Low | Defense in depth | Open | Prefer user-scoped client for ticks so RLS enforces edits |
| BV-PERF-PROG-001 | Medium | Progression load | Fixed | See performance audit |
| BV-TEST-000 | Medium | Quality gate | Open | No unit/E2E runner; only tsc/lint/build |

## Reproduction notes (BV-SEC-PROG-001)

1. Sign in as `client_user` assigned to a construction project.
2. Before fix: open project detail → Network/RSC payload included progression checklist; `selectProgressionFloor` returned data.
3. After fix: fetch skipped; data layer returns null; server action rejects viewer role.

## Regression tests required

- Unit: `overallPercent` edge cases (total 0, rounding).
- Integration: `selectProgressionFloor` denied for non-viewer roles (needs test harness + fixtures).
- Manual: apply migration 035; verify REST SELECT denied for `client_user`.
