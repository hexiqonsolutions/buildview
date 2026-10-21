# Security audit

## Roles under review

Staff: `super_admin`, `admin`, `operations_manager`  
Client: `client_admin`, `site_supervisor`, `site_engineer`, `client`, `client_user`, `read_only_client`, `consultant`

## Confirmed findings

| ID | Severity | Status | Summary |
|----|----------|--------|---------|
| BV-SEC-PROG-001 | High | Fixed (app + RLS 035 applied) | Progression readable by any project assignee via RSC props / service-role read / REST SELECT |
| BV-SEC-PROG-002 | Medium | Fixed | Bulk floor seed on read for non-editors |
| BV-SEC-MW-001 | High | Fixed | Missing Supabase env left protected routes open |
| BV-SEC-PROG-003 | Low | Open | Mutations use service role after app check only |
| BV-SEC-PROG-004 | Suspected | Mitigated | Editor project access now uses `canViewProject` |

## Controls verified (spot-check)

- `SUPABASE_SERVICE_ROLE_KEY` only in server modules (`admin.ts`).
- Tick path requires `canEditProgression` before writes.
- New user role ignored from signup metadata (migration 029 / README).

## Not executed this session

- Live privilege-escalation tests with dedicated accounts against a staging DB.
- Full Storage policy matrix exercise.
- Production secret scanning beyond static import review.

## Required ops step

Apply `supabase/migrations/035_progression_select_rls.sql` on each environment so direct Supabase REST matches app policy.
