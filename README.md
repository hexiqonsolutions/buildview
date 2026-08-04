# BuildView CRM

Enterprise sales CRM for construction leads, email conversations, follow-ups, documents, and pipeline — built to evolve into an AI-assisted sales platform.

**AI scope:** OpenAI is used only inside the Email Editor (generate / improve / rewrite / summarize / reply). Nothing else uses AI. Emails are never sent automatically.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Framer Motion |
| Backend | Supabase (Auth, Postgres, Storage, Realtime, RLS) |
| ORM | Prisma 6 |
| Deploy | Vercel |

---

## Folder structure

```
├── prisma/
│   ├── schema.prisma      # Full multi-tenant CRM schema
│   └── rls.sql            # Row Level Security policies (run after migrate)
├── src/
│   ├── app/
│   │   ├── (auth)/        # Login, signup, forgot/reset password
│   │   ├── (app)/         # Authenticated shell (dashboard stub)
│   │   └── auth/callback  # OAuth / magic-link code exchange
│   ├── components/
│   │   ├── auth/          # Auth forms + brand panel
│   │   ├── layout/        # Sidebar, topbar
│   │   └── ui/            # Reusable primitives
│   ├── lib/
│   │   ├── auth/          # Session, role guards, user/org bootstrap
│   │   ├── supabase/      # Browser, server, middleware clients
│   │   └── prisma.ts
│   └── types/
├── .env.example
└── middleware.ts          # Session refresh + route protection
```

---

## Module status

| Module | Status |
|---|---|
| 1 Authentication | **Complete** — Google, email/password, forgot/reset, roles bootstrap |
| 2 Dashboard | **Complete** — KPIs, pipeline, trend chart, follow-ups, activities |
| 3 Lead Management | **Complete** — CRUD, filters, TanStack table, CSV/Excel import/export, bulk actions |
| 4 Email | **Complete** — Gmail OAuth, sync, compose/reply, drafts, schedule, templates, campaigns |
| 5 AI Email Assistant | **Complete** — OpenAI in email editor only (generate/improve/rewrite/summarize/reply; never auto-send) |
| 6 Follow-ups | **Complete** — Due today/upcoming/overdue, CRUD, auto in-app reminders |
| 7 Activities | **Complete** — Timeline for calls, meetings, emails, tasks, notes |
| 8 Documents | **Complete** — Upload/download PDF/proposal/quotation/contract; lead-linked; Supabase Storage |
| 9 Reports | **Complete** — Pipeline funnel, win rate, activity mix, sources, owner performance |
| 10 Settings | **Complete** — Org profile, team invites/roles, preferences, personal profile |

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment

Copy `.env.example` → `.env.local` and fill:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (pooler, port 6543)
- `DIRECT_URL` (direct, port 5432)

### 3. Supabase Auth

In the Supabase dashboard:

1. Enable **Email** provider
2. Enable **Google** provider (Client ID + Secret from Google Cloud Console)
3. Add redirect URL: `http://localhost:3000/auth/callback`
4. (Production) add `https://YOUR_DOMAIN/auth/callback`

### Gmail (Module 4)

In Google Cloud Console create an OAuth web client, enable Gmail API, and set redirect `{APP_URL}/api/gmail/callback`.

### OpenAI (Module 5 — Email Editor only)

Set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, default `gpt-4o-mini`). AI buttons appear in compose/reply only and never send mail automatically.

### 4. Database

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Then run `prisma/rls.sql` in the Supabase SQL editor.

### 4b. Documents storage (Module 8)

Uploads use a **private** Supabase Storage bucket (`documents` by default, overridable via `DOCUMENTS_BUCKET`). The app will create the bucket with the service role if it does not exist. Ensure `SUPABASE_SERVICE_ROLE_KEY` is set.

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → redirects to `/login`.

---

## Auth behavior

- **Sign up** creates a Supabase user; on first session, BuildView upserts `User`, creates an `Organization`, and assigns `OWNER` membership.
- **Invite acceptance** (schema ready): pending `Invitation` by email attaches the user to that org with the invited role.
- Roles: `OWNER` · `ADMIN` · `SALES` · `VIEWER`
- Middleware protects app routes; authenticated users hitting `/login` or `/` go to `/dashboard`.

---

## Scripts

```bash
npm run dev          # Next.js dev (Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npm run db:generate  # prisma generate
npm run db:migrate   # prisma migrate dev
npm run db:studio    # Prisma Studio
```

---

## Deploy to Vercel

See **[DEPLOY.md](./DEPLOY.md)** for full steps. Summary:

1. Push repo to GitHub
2. Import on [vercel.com/new](https://vercel.com/new)
3. Add all env vars from `.env.example`
4. Set `NEXT_PUBLIC_APP_URL` to your `https://….vercel.app` URL
5. Add that URL to Supabase Auth + Google OAuth redirects
6. Redeploy

Email open tracking requires a **public HTTPS** `NEXT_PUBLIC_APP_URL` (not localhost).

---

## Next step

All 10 modules are built. Next improvements can include realtime notifications, multi-org switching, or deeper reporting exports.
