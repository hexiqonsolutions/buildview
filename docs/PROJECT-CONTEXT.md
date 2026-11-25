# BuildView — Full Project Context

Generated for handoff / AI continuity. Absolute project root:

`C:\Users\FPIN\Desktop\build view website`

Repo: `https://github.com/hexiqonsolutions/buildview` · Deploy: Vercel (`buildview-tawny.vercel.app` / production domain via env).

---

## 1. What BuildView is

BuildView is a **construction monitoring + immersive 360° walkthrough platform**.

| Surface | Who | What |
|---------|-----|------|
| **Marketing site** | Public | Lead gen, solution pages, contact, legal, Instagram link-in-bio |
| **Client portal** (`/dashboard`) | Client roles | Projects, tours, docs, reports, timeline, issues, invoices, progression |
| **Ops console** (`/admin`) | BuildView staff | Clients, projects, uploads, users, analytics, settings, tour viewers |
| **Public tour share** (`/share/tours/[token]`) | Anyone with link | Time-limited Matterport tour share (no login) |

**Brand:** written **BuildView**. Prefer plural **walkthroughs**. Visual system: dark primary `#050505`, accent `#a4cf30` / `#76b82d`.

**Product verticals (order used on site):** Construction → Real Estate → Interior.

---

## 2. Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 App Router, React 19, TypeScript strict |
| Styling | Tailwind CSS v4 (`src/app/globals.css` utilities), Radix / shadcn-style UI |
| Backend | Supabase: Postgres + RLS, Auth (email + Google), Storage |
| Validation | Zod (`src/lib/validations`) |
| Charts / PDF | Recharts, react-pdf |
| Email | Resend (optional) |
| WhatsApp alerts | Twilio templates (optional) |
| WhatsApp sales CTA | `wa.me` link (+91 86552 24990) |
| Analytics | GA4, Meta Pixel + CAPI (optional, consent-gated), Vercel Analytics |
| Hosting | Vercel (`vercel.json`, region `iad1`) |

**Package name:** `buildview@1.0.0` · Scripts: `dev`, `build`, `lint`, `env:check`, `db:check` / `db:apply` / `db:bundle` / `db:push`, `deploy:check`.

---

## 3. High-level architecture

```
Browser
  ├─ Marketing /(marketing) + /(social)/links
  ├─ Auth /(auth) + /auth/callback
  ├─ Portal /dashboard/*     ← client JWT + RLS
  ├─ Admin /admin/*          ← staff roles only
  ├─ Share /share/tours/[token]
  └─ API /api/analytics/meta , /api/internal/sync-users
         ↓
   Supabase Auth + Postgres (RLS) + Storage buckets
         ↓
   Resend / Twilio / Meta CAPI (optional)
```

**Middleware** (`src/middleware.ts`): session refresh, rate limits, inactive-user block, staff gate for `/admin`, public allowlist for marketing + `/share`.

**Route config:** `src/lib/auth/routes.ts`.

---

## 4. App routes (52 pages)

### Marketing — `src/app/(marketing)/`
| Route | Purpose |
|-------|---------|
| `/` | Homepage (walkthrough-first redesign) |
| `/about`, `/services`, `/projects` | Company / platform / use cases |
| `/construction-intelligence` | Construction solution page |
| `/real-estate-showcase` | Real estate solution page |
| `/interior-showcase` | Interior solution page |
| `/contact` | Lead form + optional Calendly |
| `/privacy`, `/terms`, `/cookies` | Legal |

### Social — `src/app/(social)/`
| Route | Purpose |
|-------|---------|
| `/links` | Link-in-bio (`/instagram` redirects here) |

### Auth — `src/app/(auth)/`
| Route | Purpose |
|-------|---------|
| `/login`, `/register`, `/forgot-password` | Unauthenticated |
| `/reset-password` | Requires session |
| `/auth/callback` | Supabase OAuth/email callback |

### Client portal — `src/app/dashboard/`
| Route | Purpose |
|-------|---------|
| `/dashboard` | Home (construction intelligence vs portfolio by `dashboard_type`) |
| `/dashboard/projects`, `/projects/[id]`, `/projects/[id]/upload` | Projects + uploads |
| `/dashboard/documents`, `/reports`, `/timeline`, `/issues` | Modules |
| `/dashboard/matterport-comparison` | Compare tours |
| `/dashboard/invoices` | Client admin billing view |
| `/dashboard/notifications`, `/profile`, `/support` | Account |

### Admin — `src/app/admin/`
| Route | Purpose |
|-------|---------|
| `/admin` | Ops home |
| `/admin/clients`, `/clients/[id]` | Client CRM / workspace |
| `/admin/projects`, `/projects/[id]` | Project ops |
| `/admin/upload`, `/tours`, `/timeline`, `/reports`, `/documents`, `/photos` | Content |
| `/admin/issues`, `/invoices`, `/compare` | Issues / billing / compare |
| `/admin/users`, `/tour-viewers`, `/client-control` | Users / share viewers / suspension |
| `/admin/analytics`, `/storage`, `/activity`, `/notifications`, `/settings` | System |

### Share / API
| Route | Purpose |
|-------|---------|
| `/share/tours/[token]` | Public tour share viewer |
| `/api/internal/sync-users` | Cron-style user backfill (`CRON_SECRET`) |
| `/api/analytics/meta` | Meta Conversions API |

Redirects (`next.config.ts`): `/pricing` → `/contact`, `/instagram` → `/links`.

---

## 5. Database (43 migrations)

Path: `supabase/migrations/001` … `043`.

### Themes
| Range | Theme |
|-------|--------|
| 001–003 | Core schema, RLS, storage buckets |
| 004–007 | Comments, users RLS, promote admin seed, extended roles |
| 008–014 | Buildings/floors, spatial FKs, document versions, tour spatial |
| 015–019 | Saved comparisons, timeline progress, client `dashboard_type`, portfolio fields, covers |
| 020–026 | `site_supervisor`, INR, client upload access, comment replies, invoices, issue hardening |
| 027–031 | Project media, rate limits, signup role ignore, suspended clients, storage usage |
| 032–037 | Progression report (templates, per-floor, RLS, schedule) |
| 038–043 | Comment likes, user sessions, notification prefs/deliveries, tour shares + viewer phone, floors unique |

### Core tables
`clients`, `users`, `projects`, `project_assignments`, `project_tours`, `reports`, `document_folders`, `documents`, `issues`, `issue_images`, `timeline_events`, `timeline_photos`, `invoices`, `notifications`, `activity_logs`

### Later tables
`buildings`, `floors`, `platform_settings`, `project_comments`, `project_comment_likes`, `saved_comparisons`, `project_media`, progression tables, `user_sessions`, `notification_deliveries`, `tour_shares`, `tour_share_views`, `rate_limits`

### Storage buckets
`reports`, `documents`, `issue-images`, `timeline-photos`, `avatars`, `project-covers`, `project-media`

Typed in `src/lib/types.ts` (`Database`).

Ops: `npm run db:check` / `db:apply` (needs `DATABASE_URL`). Skip `006_promote_vaibhav_admin.sql` on fresh installs unless intentional.

---

## 6. Auth, roles, permissions

### Roles (`UserRole`)
**Staff:** `super_admin`, `admin`, `operations_manager`  
**Portal:** `client_admin`, `site_supervisor`, `site_engineer`, `client`, `client_user`, `read_only_client`, `consultant`

### Notable capabilities
| Capability | Who |
|------------|-----|
| `/admin` | Staff only |
| Impersonate / manage users / full settings | `super_admin` |
| Matterport upload | `super_admin`, `admin` |
| Client uploads (reports/docs/timeline/photos) | `client_admin`, `site_supervisor`, `site_engineer` |
| Issue create | Broad portal + staff |
| Issue status change | Upload-tier client roles + staff |
| Portal invoices | `client_admin` (+ staff) |
| Progression | Upload-tier client roles + staff |

**Sources of truth:** `src/lib/auth/roles.ts`, `permissions.ts`, `nav-permissions.ts`, `project-access.ts`, `upload-access.ts`, `client-suspension.ts`, `impersonation.ts`.

Sign-up always provisions `public.users` as `client` (trigger 029 + `provision-user.ts`). Staff promote roles in Admin → Users. Client company suspend → portal blocked (app + RLS 030).

---

## 7. `src/lib` domains (map)

| Folder | Purpose |
|--------|---------|
| `auth/` | Roles, permissions, routes, access, suspension, impersonation |
| `supabase/` | Browser/server/admin clients, middleware helpers, storage, provision |
| `actions/` | Server Actions (auth, admin, contact, content, progression, tour-shares, notifications, …) |
| `data/` | Server data loaders (projects, tours, issues, timeline, workspace, …) |
| `portal/` | Portal dashboard/portfolio data, scope, visibility |
| `admin/` | Admin scope, workspace, platform settings, upload config |
| `validations/` | Zod schemas |
| `email/`, `whatsapp/`, `notifications/` | Outbound channels |
| `analytics/` | Events + consent |
| `tour-shares/` | Share view dedupe + staff notify policy |
| `progression/`, `comparison/`, `timeline/` | Domain helpers |
| `rate-limit/` | Config + store + middleware hooks |
| `marketing/`, `seo.ts`, `site-config.ts`, `integrations.ts`, `sponsors.ts` | Public site |
| `types.ts`, `utils.ts`, `matterport.ts` | Shared |

---

## 8. Marketing site (current home)

### Config / copy
- Brand + contact: `src/lib/site-config.ts`  
  - Email: `buildview360@gmail.com` (sales: `buildviewsales@gmail.com`)  
  - Phones: `+91 86552 24990`, `+91 83693 61785`  
  - WhatsApp E.164: `918655224990`  
  - Instagram: `@build_view360`
- Solutions source of truth: `src/lib/marketing/solutions.ts` (nav + service pages)
- Home-only content/flags: `src/lib/marketing/home-content.ts`

### Home flags
```ts
SHOW_PROOF = false          // proof strip (logos/stats/testimonial) hidden
FREE_SAMPLE_OFFER = false   // CTA uses "Book a Demo" wording
LIVE_WALKTHROUGH_VIDEOS = {
  site: "/videos/site-in-progress.mp4",      // CI
  flat: "/videos/ready-flat.mp4",            // RE
  interior: "/videos/finished-interior.mp4", // IS
}
```

### Homepage section order (`src/app/(marketing)/page.tsx`)
1. **Hero** — H1: “Stop explaining, / Start Showing”; video background; CTAs to `#live-walkthrough` + Book a Demo  
2. **Step inside** — tabs + sample videos (`HomeLiveWalkthrough`)  
3. **Problem band** — three audience cards  
4. **Solution cards** — CI / RE / IS with photos in `public/marketing/solutions/`  
5. **Progress system** — Plan → Update → Verify → Report (no dashboard image)  
6. **How it works** — Capture → Process → Enhance → Share  
7. **Why teams choose BuildView** — six benefit items  
8. **Proof strip** — only if `SHOW_PROOF`  
9. **FAQ** — visible answers only + FAQPage JSON-LD  
10. **Final CTA** — Book a Demo + WhatsApp + tertiary link  

### Global marketing chrome
- Header / footer / cookie consent / JSON-LD: `src/app/(marketing)/layout.tsx`
- Floating WhatsApp button on all marketing pages: `floating-whatsapp.tsx`
- Hero video lazy-loads: `hero-capture-video.tsx`

### Solution card photos
| Card | Asset |
|------|--------|
| Construction Intelligence | `public/marketing/solutions/construction-intelligence.jpg` |
| Real Estate Showcase | `public/marketing/solutions/real-estate-showcase.jpg` |
| Interior Showcase | `public/marketing/solutions/interior-showcase.jpg` |

### Open marketing TODOs (home)
1. Fill FAQ: scan duration; confirm access-control wording; pricing; free-sample FAQ (needs `FREE_SAMPLE_OFFER`)  
2. Proof strip content → then `SHOW_PROOF = true`  
3. Optional: Matterport embeds if preferred over/in addition to sample videos  

---

## 9. Portal & admin product features

### Portal
- Dual dashboard types via `clients.dashboard_type`: **construction** vs **portfolio**
- Project hub tabs: overview, scans/walkthroughs, photos, timeline, progression, reports, documents, team, issues, invoices
- Matterport compare, documents, reports (PDF preview), issues, comments, notifications
- Workspace scope (project / building / floor) in portal chrome
- Performance work shipped: scoped SQL list loaders, slim floors bootstrap, lazy Matterport/PDF/charts, code-split project tabs

### Admin
- Full client/project lifecycle, upload wizard, Matterport manager
- Spatial buildings/floors, progression templates
- Tour shares + **tour viewers** table; staff notify policy for new viewers
- Analytics, storage usage, activity log, platform settings, login-as-client (super_admin)

### Tour shares
- Tables: `tour_shares`, `tour_share_views`
- Public page: `/share/tours/[token]`
- Viewer dedupe (24h email rule in app logic) + optional staff notify
- Scripts: `scripts/smoke-tour-shares.mjs`, `test-tour-share-dedupe.mjs`, `test-tour-viewer-phase2.mjs`

---

## 10. Integrations matrix

| Integration | Status | Notes |
|-------------|--------|-------|
| Supabase | Required | Auth, DB, Storage |
| Resend | Optional | Contact + notifications |
| Twilio WhatsApp | Optional | Critical operational alerts |
| WhatsApp sales FAB | Live | Marketing layout |
| Calendly | Optional | Contact page |
| GA4 | Optional | Consent-gated |
| Meta Pixel + CAPI | Optional | `/api/analytics/meta` |
| Vercel Analytics | Live | Package deps |
| Matterport | Core product | Tours / compare / share |
| n8n | Not in repo | MCP may exist locally; no app code |

---

## 11. Public assets

```
public/
  marketing/solutions/     CI, RE, IS card JPGs
  marketing/services/      service imagery
  marketing/why-buildview/ why imagery
  videos/                  site-in-progress, ready-flat, finished-interior mp4
  sponsors/                partner SVGs
  social/                  link-in-bio assets
  og/                      OG image
  db-logo.png, wb-logo.png brand logos
```

---

## 12. Scripts worth knowing

| Script / npm | Purpose |
|--------------|---------|
| `npm run env:check` | Validate env |
| `npm run db:check` / `db:apply` | Migration hygiene |
| `scripts/promote-admin.mjs` | Promote staff |
| `scripts/check-notification-channels.mjs` | Channel readiness |
| Tour-share / progression test scripts | Behavior smoke tests |
| `docs/` audits + Instagram playbooks | Process docs (not runtime) |

No Jest/Playwright suite in package scripts.

---

## 13. Environment (required)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server privileged key |
| `NEXT_PUBLIC_APP_URL` | App origin |

Recommended: `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`, `DATABASE_URL` (for apply scripts). Full list: `.env.example`.

---

## 14. Design system notes

- CSS variables / utilities: `src/app/globals.css` (`brand-primary`, `brand-accent`, `site-container`, `section-padding`, `hero-gradient`, …)
- Marketing components: `src/components/marketing/*`
- Portal “intel” shell: `src/components/intel/*`
- Admin ops shell: `src/components/admin/*`
- Shared UI primitives: `src/components/ui/*`

---

## 15. Recent marketing / product evolution (context from recent work)

1. Three-vertical marketing redesign (Construction, Real Estate, Interior)  
2. Tour share follow-up: viewer dedupe + staff notify + admin tour viewers  
3. Portal/admin performance: scoped queries, lazy heavy UI  
4. Homepage rebuild: walkthrough-first copy, sample videos, problem/progress/FAQ/CTA, floating WhatsApp  
5. Hero tagline → “Stop explaining, / Start Showing”; removed Industries/Experiences/Capture tech/proof job-title strip  
6. Solution cards: real CI/RE/IS photos; Step inside: CI/RE/IS videos  

Latest relevant commits on `main` include homepage rebuild, video samples, and solution card photos (see `git log`).

---

## 16. Local / deploy quickstart

```bash
npm install
cp .env.example .env.local   # fill Supabase + APP_URL
npm run env:check
# apply supabase/migrations in order (or db:apply)
npm run dev                  # http://localhost:3000
npm run deploy:check         # before production
```

Full runbook: `DEPLOYMENT.md`. Human overview: `README.md`.

---

## 17. Key file index (start here)

| Concern | Path |
|---------|------|
| Home page | `src/app/(marketing)/page.tsx` |
| Home content/flags | `src/lib/marketing/home-content.ts` |
| Solutions / nav | `src/lib/marketing/solutions.ts` |
| Site brand/contact | `src/lib/site-config.ts` |
| Types / schema mirror | `src/lib/types.ts` |
| Auth matrix | `src/lib/auth/permissions.ts` |
| Middleware | `src/middleware.ts` |
| Marketing layout | `src/app/(marketing)/layout.tsx` |
| Portal layout | `src/app/dashboard/layout.tsx` |
| Admin layout | `src/app/admin/layout.tsx` |
| Migrations | `supabase/migrations/` |

---

*This document is a living context dump. Prefer code + migrations as source of truth if anything conflicts.*
