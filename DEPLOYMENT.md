# BuildView — Deployment Runbook

Step-by-step checklist to go from local development to a production deployment on Vercel + Supabase.

**Last updated:** July 14, 2026

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Node.js 18.17+ | `node -v` |
| npm | `npm -v` |
| Supabase project | [supabase.com](https://supabase.com) |
| Vercel account | [vercel.com](https://vercel.com) |
| Git repository | `git init` (done in this project) |
| GitHub remote (optional) | For Vercel Git integration |

---

## Phase 1 — Local environment

### 1.1 Install dependencies

```bash
npm install
```

### 1.2 Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Required | Where to find |
|----------|----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase → Settings → API (server only) |
| `NEXT_PUBLIC_APP_URL` | Yes | `http://localhost:3000` locally |
| `DATABASE_URL` | For `db:apply` | Supabase → Settings → Database → URI (pooler) |

Optional integrations: `RESEND_API_KEY`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_CALENDLY_URL`, `CRON_SECRET`.

### 1.3 Verify build

```bash
npm run build
```

Expected: compiles with no TypeScript errors (ESLint warnings are OK).

---

## Phase 2 — Database migrations

### Fresh Supabase project (001–007)

Run in **Supabase SQL Editor** in order:

| # | File | Purpose |
|---|------|---------|
| 001 | `001_initial_schema.sql` | Core tables |
| 002 | `002_rls_policies.sql` | Row Level Security |
| 003 | `003_storage_buckets.sql` | Storage buckets + policies |
| 004 | `004_project_comments.sql` | Project comments |
| 005 | `005_fix_users_update_rls.sql` | User profile RLS fix |
| 006 | `006_promote_vaibhav_admin.sql` | Optional seed admin (skip if not needed) |
| 007 | `007_extend_user_roles.sql` | Extended RBAC (8 roles) |

### Enterprise migrations (004 + 008–015)

**Option A — One-paste SQL bundle** (no `DATABASE_URL` needed):

1. Open `supabase/pending-apply.sql` in Supabase SQL Editor
2. Run the entire file
3. Regenerate after migration changes: `npm run db:bundle`

**Option B — Automated** (requires `DATABASE_URL` in `.env.local`):

```bash
npm run env:check    # verify env vars first
npm run db:check     # see which migrations are missing
npm run db:apply     # applies 004 + 008–015
```

| # | File | Purpose |
|---|------|---------|
| 004 | `004_project_comments.sql` | Project comments |
| 008 | `008_buildings_floors.sql` | Buildings & floors spatial model |
| 009 | `009_platform_settings.sql` | Platform settings + notification fallback |
| 010 | `010_buildings_staff_rls.sql` | Staff RLS for buildings/floors |
| 011 | `011_content_spatial_scope.sql` | Spatial scope columns on content |
| 012 | `012_document_versions.sql` | Document versioning |
| 013 | `013_spatial_fk_columns.sql` | FK columns on content tables |
| 014 | `014_tour_spatial_fk.sql` | FK columns on project_tours |
| 015 | `015_saved_comparisons.sql` | Saved comparison presets |

### Seed data (optional)

```bash
# Run supabase/seed.sql in SQL Editor after migrations
```

### Create admin user

1. `npm run dev` → register at `/register`
2. Promote in SQL Editor:

```sql
UPDATE public.users
SET role = 'super_admin', client_id = NULL
WHERE email = 'your-email@example.com';
```

---

## Phase 3 — Supabase Auth configuration

### Local

| Setting | Value |
|---------|-------|
| Site URL | `http://localhost:3000` |
| Redirect URLs | `http://localhost:3000/**` |

### Production

| Setting | Value |
|---------|-------|
| Site URL | `https://your-app.vercel.app` |
| Redirect URLs | `https://your-app.vercel.app/**` |

Enable **Email** provider under Authentication → Providers.

---

## Phase 4 — Git + GitHub

```bash
git status
git add .
git commit -m "BuildView enterprise platform"
git branch -M main
git remote add origin https://github.com/YOUR_ORG/buildview.git
git push -u origin main
```

> **Note:** Never commit `.env.local` — it is in `.gitignore`.

---

## Phase 5 — Vercel deployment

### 5.1 Import project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the GitHub repository
3. Framework: **Next.js** (auto-detected)
4. `vercel.json` supplies build command, region (`iad1`), security headers, and cron

### 5.2 Environment variables

Add for **Production** (and Preview if desired):

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `CRON_SECRET` | Random long secret (for `/api/internal/sync-users`) |

Optional: `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_CALENDLY_URL`.

### 5.3 Deploy

Click **Deploy**. First build should pass if local `npm run build` passed.

### 5.4 Post-deploy Supabase

Update Auth URL configuration (Phase 3 production values) to match your Vercel domain.

---

## Phase 6 — Production verification checklist

### Marketing & auth
- [ ] Homepage loads at `/`
- [ ] Login at `/login` works
- [ ] Register at `/register` works
- [ ] Password reset email arrives

### Admin ops (`/admin`)
- [ ] Staff user can access admin panel
- [ ] Workspace selectors (Client → Project → Building → Floor) work
- [ ] Upload Center wizard completes a Matterport upload
- [ ] Matterport Manager shows tours
- [ ] Compare module loads with scan selection
- [ ] Saved comparisons persist (requires migration 015)

### Client portal (`/dashboard`)
- [ ] Client user sees assigned projects only
- [ ] Workspace bar filters documents, issues, reports, timeline
- [ ] Executive dashboard scopes to workspace
- [ ] Matterport comparison works
- [ ] PDF reports preview and download

### Integrations
- [ ] Contact form sends email (if Resend configured)
- [ ] Google Analytics loads after cookie consent (if GA configured)
- [ ] Calendly embed shows on `/contact` (if URL configured)

### Security
- [ ] Client cannot access `/admin`
- [ ] Unauthenticated users redirect to `/login`
- [ ] Storage downloads respect RLS
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is not exposed in browser

---

## Useful commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run env:check` | Validate required environment variables |
| `npm run db:check` | Check which migrations are applied |
| `npm run db:apply` | Apply migrations 004 + 008–015 via `DATABASE_URL` |
| `npm run db:bundle` | Regenerate `supabase/pending-apply.sql` |
| `npm run deploy:check` | env:check + build + db:check |
| `npm run db:push` | Supabase CLI push (requires `supabase login`) |

---

## Troubleshooting

### `npm run db:apply` fails — Missing DATABASE_URL

Add to `.env.local`:

```
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

Use the **Transaction** pooler URI from Supabase Dashboard → Database → Connection string.

### Auth redirect loops

Ensure `NEXT_PUBLIC_APP_URL` matches your actual domain and Supabase redirect URLs include `/**`.

### Build fails on Vercel

Run `npm run build` locally first. Missing env vars are the most common cause.

### Client sees no projects

```sql
-- Link user to client
UPDATE public.users SET client_id = '<client-uuid>' WHERE email = 'user@example.com';

-- Assign project access
INSERT INTO project_assignments (project_id, user_id)
VALUES ('<project-uuid>', '<user-uuid>')
ON CONFLICT DO NOTHING;
```

### Workspace deep links not filtering

Ensure migrations 008–014 are applied. Run `npm run db:check`.

### Saved comparisons not persisting

Ensure migration `015_saved_comparisons.sql` is applied.

---

## Architecture summary

| Portal | URL | Audience |
|--------|-----|----------|
| Marketing | `/`, `/about`, `/services`, … | Public |
| Client Intel | `/dashboard/*` | Clients, consultants |
| Admin Ops | `/admin/*` | BuildView staff |

Both portals share workspace URL params for deep linking:

```
/admin/tours?client=<uuid>&project=<uuid>&buildingId=<uuid>&floorId=<uuid>
/dashboard/documents?project=<uuid>&buildingId=<uuid>&floorId=<uuid>
```

---

## License

Proprietary — BuildView © 2026
