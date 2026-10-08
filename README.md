# BuildView

BuildView is a construction monitoring platform. BuildView staff upload 360° Matterport tours, PDF reports, documents, site photos, issues, timeline updates and invoices; developers, contractors and consultants follow their projects remotely in a client portal. A public marketing site sits in front of both portals.

| Area | URL | Audience |
|------|-----|----------|
| Marketing site | `/`, `/about`, `/services`, `/projects`, `/contact`, legal pages, `/links` (link-in-bio) | Public |
| Client portal | `/dashboard/*` | Client roles (see [Roles](#roles)) |
| Operations console | `/admin/*` | BuildView staff |

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router, Server Components, Server Actions), React 19, TypeScript (strict) |
| Styling | Tailwind CSS v4 (`@utility` blocks in `src/app/globals.css`), Radix UI primitives in `src/components/ui` |
| Backend | Supabase — Postgres with Row Level Security, Auth (email + Google), Storage, Realtime |
| Validation | zod schemas in `src/lib/validations` |
| Charts / PDF | Recharts, react-pdf |
| Email | Resend (optional) |
| Hosting | Vercel (`vercel.json` sets region and security headers) |

## Getting started

Requirements: Node.js 20+, npm, and a Supabase project.

```bash
npm install
cp .env.example .env.local      # then fill in the Supabase values
npm run env:check               # confirms the required variables are set
npm run dev                     # http://localhost:3000
```

Apply the database migrations before signing in for the first time — see [Database](#database).

### Environment variables

`.env.example` documents every variable. The app reads:

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key (RLS enforces access) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only key for privileged writes; never expose it |
| `NEXT_PUBLIC_APP_URL` | Yes | App origin, e.g. `http://localhost:3000` |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Canonical URL for SEO, sitemap and email links (falls back to `NEXT_PUBLIC_APP_URL`, then `https://buildview.io`) |
| `CRON_SECRET` | Recommended | Bearer token for `/api/internal/sync-users`; the route rejects every call without it |
| `DATABASE_URL` | Scripts only | Postgres URI used by `npm run db:apply` |
| `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`, `NOTIFICATION_FROM_EMAIL` | Optional | Contact form and notification emails |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN`, `META_CAPI_TEST_EVENT_CODE` | Optional | Consent-gated analytics |
| `NEXT_PUBLIC_CALENDLY_URL` | Optional | Scheduler embed on `/contact` |
| `RATE_LIMIT_*` | Optional | Overrides for the defaults in `src/lib/rate-limit/config.ts` |

## Database

All schema, RLS policies, storage buckets and SQL functions live in `supabase/migrations/001`–`030`, applied in numeric order.

**New project:** run every file in order in the Supabase SQL Editor (skip `006_promote_vaibhav_admin.sql`, which seeds a specific admin account). `supabase/seed.sql` adds optional sample data.

**Existing project:** apply only the migrations it is missing.

```bash
npm run db:check                    # probes tables/columns/buckets added by migrations
npm run db:apply -- 029 030         # apply specific migrations (needs DATABASE_URL)
npm run db:apply -- --from 019      # apply 019 and everything after it
npm run db:bundle -- --from 019     # or write them to supabase/pending-apply.sql to paste manually
```

`db:check` cannot detect migrations that only change functions, policies, enums or data (020–023, 025, 026, 029, 030); confirm those in the SQL Editor. The `supabase/FIX_*.sql` files are one-off repair scripts for databases that drifted from the migrations — do not run them on a fresh project.

## Authentication

- Supabase Auth with email/password and Google OAuth. `src/middleware.ts` refreshes the session, blocks inactive users, keeps non-staff out of `/admin`, and applies request rate limits.
- Every sign-up gets a `public.users` profile with the `client` role — from the `handle_new_user` trigger (migration 029) and, as a fallback, `src/lib/supabase/provision-user.ts`. The role is never taken from sign-up metadata; staff promote accounts in **Admin → Users**.
- Suspending a client company (**Admin → Clients → Suspend**) shows its users a "suspended due to pending payment" screen instead of the portal; their project access is blocked in the app (`src/lib/auth/client-suspension.ts`) and in RLS (migration 030). Reactivating restores access immediately.
- The first Super Admin must be promoted in SQL: `UPDATE public.users SET role = 'super_admin', client_id = NULL WHERE email = '…';` (or `node scripts/promote-admin.mjs <email>`).

**Google sign-in:** create an OAuth client in Google Cloud (redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`), enable the Google provider in Supabase, and add `http://localhost:3000/auth/callback` plus your production `/auth/callback` URL under Authentication → URL Configuration.

### Roles

| Group | Roles | Access |
|-------|-------|--------|
| BuildView staff | `super_admin`, `admin`, `operations_manager` | `/admin`; only `super_admin` assigns roles and manages staff accounts |
| Client portal | `client_admin`, `site_supervisor`, `site_engineer`, `client`, `client_user`, `read_only_client`, `consultant` | `/dashboard`, scoped to their company and project assignments |

Per-action permissions are defined in `src/lib/auth/permissions.ts` and `src/lib/auth/roles.ts`, and are enforced again by RLS in the database.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (`dev:fresh` clears `.next` first) |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run lint` | ESLint (`no-explicit-any` is an error) |
| `npx tsc --noEmit` | Type-check |
| `npm run env:check` | Validate environment variables |
| `npm run db:check` / `db:apply` / `db:bundle` | Migration status / apply / bundle (see [Database](#database)) |
| `npm run db:purge-clients[:all]` | Soft-delete sample (or all) clients in a test database |
| `npm run deploy:check` | `env:check` + `build` + `db:check` |

There is no automated test suite yet; `tsc`, `lint` and `build` are the gate.

## Project structure

```
src/
├── app/                     Routes (App Router)
│   ├── (marketing)/         Public pages
│   ├── (auth)/              Login, register, password reset
│   ├── (social)/            Instagram link-in-bio page
│   ├── admin/               Operations console
│   ├── dashboard/           Client portal
│   ├── api/                 Route handlers (Meta CAPI, internal user sync)
│   └── auth/callback/       OAuth / email-link callback
├── components/
│   ├── ui/                  Radix-based primitives (button, dialog, select…)
│   ├── patterns/            Shared page patterns (tab workspace, loading/empty/error page states)
│   ├── admin/ intel/ portal/ dashboard/   Console and portal shells and screens
│   └── compare/ projects/ issues/ documents/ …   Feature components
├── design-system/           Tokens, typography, motion primitives
├── hooks/                   Client hooks (notification realtime)
└── lib/
    ├── data/                Server-only read models (one module per domain)
    ├── actions/             "use server" mutations callable from the client
    ├── auth/                Roles, permissions, project access, staff guards
    ├── supabase/            Server/browser/admin clients, middleware session, storage
    ├── validations/         zod schemas and parse helpers
    ├── errors/              PublicError / internal error handling
    ├── admin/ portal/       Workspace scope (client → project → building → floor)
    ├── comparison/ timeline/ issues/ uploads/ notifications/ rate-limit/ …
    └── utils.ts, currency.ts, seo.ts, site-config.ts
supabase/migrations/         Schema, RLS, storage, functions
scripts/                     env and migration tooling (shared helpers in scripts/lib)
```

### Conventions

- **Reads go in `src/lib/data/<domain>.ts`.** These modules start with `import "server-only"`, are imported by Server Components, and check access themselves (RLS plus explicit role checks). Shared per-request loaders such as `getProjects`, `getUserProfile` and the workspace bootstraps are wrapped in React `cache()`, so layouts and pages can call them freely.
- **Mutations go in `src/lib/actions/<domain>.ts`** (`"use server"`). Every export of such a module is a public POST endpoint, so each one validates its input with zod, authorizes the caller (`requireStaffPermission`, `canViewProject`, …) and throws `PublicError` for messages that are safe to show. Never export a read helper from a `"use server"` file unless a client component really needs to call it (`src/lib/actions/data.ts` holds the only two).
- **Service-role clients** (`createServiceRoleClient`) bypass RLS; use them only after an explicit permission check.
- Client components import only types from `src/lib/data`; the build fails if a client bundle reaches a `server-only` module.

### Adding a feature

1. Add a migration `supabase/migrations/0NN_<name>.sql` with the table, RLS policies and storage rules, and extend `src/lib/types.ts`.
2. Add zod schemas in `src/lib/validations/<domain>.ts`.
3. Put reads in `src/lib/data/<domain>.ts` and mutations in `src/lib/actions/<domain>.ts`, using the auth helpers in `src/lib/auth`.
4. Build the route under `src/app/admin` or `src/app/dashboard`, reusing `components/ui` and `components/patterns` (loading, empty and error states).
5. Run `npx tsc --noEmit`, `npm run lint` and `npm run build`.

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)**: Vercel project settings, environment variables, Supabase Auth URLs, migrations and a post-deploy checklist.

## License

Proprietary — BuildView © 2026
