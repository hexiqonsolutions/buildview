# BuildView

**Monitor construction progress from anywhere.**

BuildView is an enterprise construction monitoring platform for developers, architects, contractors, and clients. It combines Matterport virtual tours, PDF reports, document management, issue tracking, project timelines, progress comparison, and invoicing in secure admin and client portals.

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, ShadCN UI |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Charts | Recharts |
| PDF preview | React PDF |
| Hosting | Vercel |

## Features

### Marketing site
- Homepage, About, Services, Projects, Pricing, Contact
- Legal pages (Privacy, Terms, Cookies)
- Consent-gated analytics, Calendly integration, contact form

### Authentication & RBAC
- Login, register, forgot/reset password (Supabase Auth)
- 8 roles: `super_admin`, `admin`, `operations_manager`, `site_engineer`, `client`, `client_admin`, `client_user`, `read_only_client`, `consultant`
- Middleware-protected routes

### Admin Operations Control Center (`/admin`)
- Mission Control dashboard with workspace selectors (Client → Project → Building → Floor)
- Upload Center wizard (Matterport, reports, documents, issues, timeline, photos)
- Matterport Manager, Compare Construction Progress module
- Client & project workspace tabs
- Activity logs, impersonation audit, command palette (⌘K)
- Buildings/floors CRUD, spatial FK model

### Client Intelligence Portal (`/dashboard`)
- Executive dashboard scoped to workspace
- Projects gallery, documents, issues, reports, timeline
- Matterport comparison with saved comparisons
- Workspace deep links across all portal pages
- Command palette (⌘K), notifications, invoices

## Quick start

```bash
npm install
cp .env.example .env.local
# Fill in Supabase credentials in .env.local
npm run build
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database migrations

### Core (001–007) — run in Supabase SQL Editor

1. `001_initial_schema.sql`
2. `002_rls_policies.sql`
3. `003_storage_buckets.sql`
4. `004_project_comments.sql`
5. `005_fix_users_update_rls.sql`
6. `007_extend_user_roles.sql`

### Enterprise (004 + 008–015) — automated or manual

```bash
# Option A — paste one file in Supabase SQL Editor:
#   supabase/pending-apply.sql  (regenerate: npm run db:bundle)

# Option B — automated (requires DATABASE_URL in .env.local):
npm run env:check   # verify env vars
npm run db:check    # verify migration status
npm run db:apply    # apply 004 + 008–015
```

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full runbook.

| Migration | Purpose |
|-----------|---------|
| 008 | Buildings & floors |
| 009 | Platform settings |
| 010 | Buildings staff RLS |
| 011 | Content spatial scope |
| 012 | Document versions |
| 013 | Spatial FK columns |
| 014 | Tour spatial FK |
| 015 | Saved comparisons |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run env:check` | Validate required env vars |
| `npm run db:check` | Check migration status |
| `npm run db:apply` | Apply migrations 004 + 008–015 |
| `npm run db:bundle` | Regenerate `supabase/pending-apply.sql` |
| `npm run deploy:check` | env:check + build + db:check |

## Deploy to production

Full checklist: **[DEPLOYMENT.md](./DEPLOYMENT.md)**

```bash
git init          # already done
git add .
git commit -m "BuildView enterprise platform"
git remote add origin https://github.com/YOUR_ORG/buildview.git
git push -u origin main
```

Then import on [Vercel](https://vercel.com/new) and set environment variables from `.env.example`.

## Project structure

```
buildview/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Login, register, password reset
│   │   ├── (marketing)/         # Public marketing pages
│   │   ├── admin/               # Operations Control Center
│   │   ├── dashboard/           # Client Intelligence Portal
│   │   └── api/                 # API routes (cron, sync)
│   ├── components/
│   │   ├── admin/               # Admin shell, workspace, upload wizard
│   │   ├── intel/               # Client portal shell & dashboard
│   │   ├── portal/              # Workspace providers, context strips
│   │   ├── compare/             # Progress comparison module
│   │   └── ui/                  # ShadCN UI primitives
│   └── lib/
│       ├── actions/             # Server actions
│       ├── admin/               # Workspace scope, spatial resolve
│       ├── portal/              # Portal scope, nav helpers
│       └── comparison/          # Compare analytics & spatial
├── supabase/migrations/         # 001–015 SQL migrations
├── scripts/                     # db:check, db:apply, dev helpers
├── DEPLOYMENT.md                # Full deployment runbook
├── .env.example
└── vercel.json
```

## Environment variables

See `.env.example` for all variables. Required for local dev:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only service role key |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `DATABASE_URL` | Postgres URI (for `db:apply` only) |

## Security

- Row Level Security (RLS) on all application tables
- Extended RBAC with `is_buildview_staff()` helper
- Storage policies mirror database access rules
- Next.js middleware enforces authentication
- Service role key is server-only

## License

Proprietary — BuildView © 2026
