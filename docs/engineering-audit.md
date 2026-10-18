# BuildView engineering audit

## Architecture (verified)

| Layer | Implementation |
|-------|----------------|
| Framework | Next.js 15.5 App Router, React 19, TypeScript strict |
| Portals | Marketing `(marketing)`, client `/dashboard`, staff `/admin` |
| Auth | Supabase Auth + `src/middleware.ts` session refresh + role gates |
| Data | Server Components + Server Actions; Zod in `src/lib/validations` |
| DB | Supabase Postgres migrations `001`–`035`, RLS, Storage |
| Privileged writes | `createServiceRoleClient` (server-only) after app authorization |
| Email | Optional Resend |
| Tests | **None** — gate is `tsc`, `lint`, `build` (`README.md`) |
| CI | No `.github` workflows found |

## Boundaries

- UI: `src/components/{admin,intel,portal,projects,ui}`
- Business rules: `src/lib/auth`, `src/lib/actions`, `src/lib/data`
- Progression: `src/lib/progression` + `src/lib/data/progression.ts` + migration `032`/`034`/`035`

## Strengths

- Role helpers centralized (`permissions.ts` / `roles.ts`).
- Notifications module intentionally not `"use server"` (avoids public endpoints).
- Rate limiting in middleware.
- Soft-delete and suspended-client patterns present.

## Weaknesses (addressed or tracked)

- Progression SELECT was wider than product view roles (fixed in app + migration 035).
- Middleware previously fail-open on missing Supabase env for protected routes (fixed).
- No automated regression suite.
- Service-role mutations rely on app checks (defense-in-depth gap documented in security audit).
