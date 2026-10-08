# BuildView — Deployment Runbook

Checklist for taking BuildView from local development to production on Vercel + Supabase.

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Node.js 20+ | `node -v` |
| npm | `npm -v` |
| Supabase project | [supabase.com](https://supabase.com) |
| Vercel account | [vercel.com](https://vercel.com), connected to the Git repository |

---

## Phase 1 — Local environment

```bash
npm install
cp .env.example .env.local
npm run env:check
```

`env:check` reports missing required variables (exit code 1) and warns about recommended ones. It prints variable names only, never values.

| Variable | Required | Where to find |
|----------|----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase → Settings → API (server only) |
| `NEXT_PUBLIC_APP_URL` | Yes | `http://localhost:3000` locally |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Canonical production URL; used for SEO and links in notification emails |
| `CRON_SECRET` | Recommended | Random long string; required to call `/api/internal/sync-users` |
| `DATABASE_URL` | For `db:apply` | Supabase → Database → Connection string (Transaction pooler URI) |

Optional integrations are listed in `.env.example` (Resend, Google Analytics, Meta Pixel / Conversions API, Calendly, rate-limit overrides).

Verify the build:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

---

## Phase 2 — Database migrations

Migrations live in `supabase/migrations` and must be applied in numeric order.

| # | Purpose |
|---|---------|
| 001–003 | Core schema, RLS policies, storage buckets |
| 004–007 | Project comments, user RLS fix, optional seed admin (`006`, skip unless wanted), extended roles |
| 008–015 | Buildings/floors, platform settings, spatial scope, document versions, saved comparisons |
| 016–019 | Timeline progress fields, client dashboard type, portfolio fields, project covers bucket |
| 020–023 | `site_supervisor` role, INR currency default and data migration, client upload access |
| 024–027 | Comment replies, client-admin-only invoices, issue tracking hardening, project media bucket |
| 028 | `rate_limits` table used by the database-backed rate limiter |
| 029 | `handle_new_user` ignores sign-up metadata; every new profile is `client` (security fix) |

**Fresh project:** run every file in the Supabase SQL Editor in order (skipping `006` if you don't want that seed admin), then optionally `supabase/seed.sql`.

**Existing project:**

```bash
npm run db:check                    # shows which detectable migrations are missing
npm run db:apply -- 028 029         # apply specific migrations via DATABASE_URL
npm run db:apply -- --from 019      # apply 019 and everything after it
npm run db:bundle -- --from 019     # write supabase/pending-apply.sql to paste into the SQL Editor
```

`db:apply` and `db:bundle` require an explicit selection; they never run every migration by default. `db:check` cannot detect 020–023, 025, 026 or 029 (function, policy, enum and data changes) — verify those in the SQL Editor. For 029:

```sql
SELECT prosrc LIKE '%raw_user_meta_data->>''role''%' AS still_trusts_metadata
FROM pg_proc WHERE proname = 'handle_new_user';
```

`false` means 029 is applied.

The `supabase/FIX_*.sql` files repair databases that drifted from the migrations; don't run them on a fresh project.

### First Super Admin

1. Register at `/register` (the account is created as `client`).
2. Promote it in the SQL Editor:

```sql
UPDATE public.users
SET role = 'super_admin', client_id = NULL
WHERE email = 'your-email@example.com';
```

After that, staff roles and client assignments are managed in **Admin → Users**.

---

## Phase 3 — Supabase Auth configuration

| Setting | Local | Production |
|---------|-------|------------|
| Site URL | `http://localhost:3000` | `https://<your-domain>` |
| Redirect URLs | `http://localhost:3000/auth/callback` | `https://<your-domain>/auth/callback` |

Enable the **Email** provider. For **Google**, create an OAuth client in Google Cloud with redirect URI `https://<project-ref>.supabase.co/auth/v1/callback` and paste its ID and secret into Authentication → Providers → Google.

---

## Phase 4 — Vercel

1. Import the repository at [vercel.com/new](https://vercel.com/new); the framework is detected as Next.js.
2. `vercel.json` sets the region (`iad1`) and security headers.
3. Add the Phase 1 environment variables for **Production** (and **Preview** if previews should reach a database). Set `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_SITE_URL` to the production domain.
4. Deploy, then update the Supabase Auth URLs (Phase 3) to the final domain.

`/api/internal/sync-users` backfills missing `public.users` rows from `auth.users`. No cron is configured; to schedule it, add a Vercel Cron entry to `vercel.json`. Vercel sends `Authorization: Bearer $CRON_SECRET` automatically. Admins can also run the sync from **Admin → Users**.

---

## Phase 5 — Production verification

### Marketing and auth
- [ ] `/` and the marketing pages load; `/sitemap.xml` and `/robots.txt` respond
- [ ] Register, login, Google sign-in and password reset work
- [ ] New accounts get the `client` role

### Operations console (`/admin`)
- [ ] Staff can sign in; non-staff are redirected away
- [ ] Workspace selectors (Client → Project → Building → Floor) work
- [ ] Upload Center completes a Matterport tour, report and document upload
- [ ] Compare loads scans; saved comparisons persist

### Client portal (`/dashboard`)
- [ ] Client users see only their assigned projects
- [ ] Documents, issues, reports and timeline respect the workspace filter
- [ ] PDF reports preview and download

### Integrations (if configured)
- [ ] Contact form sends email (Resend)
- [ ] Analytics load only after cookie consent
- [ ] Calendly embed shows on `/contact`

### Security
- [ ] `/admin` and `/dashboard` pages send `noindex`
- [ ] Storage downloads respect RLS
- [ ] `SUPABASE_SERVICE_ROLE_KEY` and `META_CAPI_ACCESS_TOKEN` never appear in browser bundles

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run env:check` | Validate environment variables |
| `npm run db:check` | Detect missing migrations |
| `npm run db:apply -- <numbers \| --from N>` | Apply migrations via `DATABASE_URL` |
| `npm run db:bundle -- <numbers \| --from N>` | Write `supabase/pending-apply.sql` |
| `npm run db:push` | Supabase CLI push (requires `supabase login`) |
| `npm run deploy:check` | `env:check` + `build` + `db:check` |

---

## Troubleshooting

**`db:apply` says `DATABASE_URL` is missing:** add the Transaction pooler URI to `.env.local`:

```
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**Auth redirect loops:** check that `NEXT_PUBLIC_APP_URL` matches the real domain and that its `/auth/callback` is an allowed redirect URL in Supabase.

**A client sees no projects:** link the user to a client company and assign projects in **Admin → Users**, or in SQL:

```sql
UPDATE public.users SET client_id = '<client-uuid>' WHERE email = 'user@example.com';
INSERT INTO project_assignments (project_id, user_id)
VALUES ('<project-uuid>', '<user-uuid>')
ON CONFLICT DO NOTHING;
```

**Workspace deep links don't filter / saved comparisons don't persist:** migrations 008–015 are missing; run `npm run db:check`.

---

## License

Proprietary — BuildView © 2026
