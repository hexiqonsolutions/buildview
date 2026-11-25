"""One-off generator: BuildView repository audit → Word .docx"""
from datetime import date
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

doc = Document()
for section in doc.sections:
    section.top_margin = Inches(0.9)
    section.bottom_margin = Inches(0.9)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)


def set_run_font(run, size=11, bold=False, color=None):
    run.font.name = "Calibri"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
    run.font.size = Pt(size)
    run.bold = bold
    if color:
        run.font.color.rgb = RGBColor(*color)


def add_heading_custom(text, level=1):
    p = doc.add_heading(text, level=level)
    size = 16 if level == 1 else (13 if level == 2 else 12)
    for run in p.runs:
        set_run_font(run, size=size, bold=True, color=(15, 23, 42))
    return p


def add_para(text, bold=False, size=11, space_after=8):
    p = doc.add_paragraph()
    run = p.add_run(text)
    set_run_font(run, size=size, bold=bold)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.space_before = Pt(0)
    return p


def add_bullet(text):
    p = doc.add_paragraph(style="List Bullet")
    run = p.add_run(text)
    set_run_font(run, size=11)
    p.paragraph_format.space_after = Pt(3)
    return p


def add_table(headers, rows):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = "Table Grid"
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = h
        for p in cell.paragraphs:
            for run in p.runs:
                set_run_font(run, size=10, bold=True)
    for r_i, row in enumerate(rows):
        for c_i, val in enumerate(row):
            cell = table.rows[r_i + 1].cells[c_i]
            cell.text = str(val)
            for p in cell.paragraphs:
                for run in p.runs:
                    set_run_font(run, size=10)
    doc.add_paragraph()


title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
set_run_font(title.add_run("BuildView Repository Audit"), size=22, bold=True, color=(15, 23, 42))

sub = doc.add_paragraph()
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
set_run_font(sub.add_run("Read-Only Technical Assessment"), size=14, color=(71, 85, 105))

meta = doc.add_paragraph()
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
set_run_font(
    meta.add_run(
        f"Prepared: {date.today().isoformat()}  |  Scope: Local repository (build view website)\n"
        "Constraint: No code, install, or migration changes were made."
    ),
    size=10,
    color=(100, 116, 139),
)

add_para(
    "Product context: BuildView is a construction management and site monitoring platform "
    "combining essential CM workflows with 360 degree virtual site tours, construction progress "
    "monitoring, and visual reporting."
)

add_heading_custom("1. Stack & Project Structure", 1)
add_table(
    ["Item", "Finding"],
    [
        ["Framework", "Next.js 15 App Router (next@^15.5.27)"],
        ["Language", "TypeScript (^5.7.2)"],
        ["UI", "React 19 + Tailwind CSS 4 + Radix primitives"],
        ["Backend", "Supabase (Auth, Postgres, Storage, RLS) via @supabase/ssr + supabase-js"],
        ["Validation", "Zod"],
        ["Charts / motion", "Recharts, Framer Motion"],
        ["Package manager", "npm (package-lock.json)"],
        ["Hosting", "Vercel (vercel.json, region iad1)"],
    ],
)
add_para("Top-level layout:", bold=True)
for b in [
    "src/app/ — routes (marketing, auth, admin, dashboard, share, API)",
    "src/components/ — UI, admin, portal, intel shell, Matterport, issues, etc.",
    "src/lib/ — actions, data access, auth, validations, notifications, WhatsApp, progression",
    "src/design-system/ — tokens + primitives",
    "supabase/migrations/ — 001–043",
    "scripts/ — env/migration/dev helpers",
    "public/, docs/, experience-demos/",
]:
    add_bullet(b)

add_heading_custom("2. Pages, Layouts & Features", 1)
add_heading_custom("Marketing (src/app/(marketing)/)", 2)
add_para("Home, about, services, projects, contact, privacy, terms, cookies — public site.")
add_heading_custom("Auth (src/app/(auth)/)", 2)
add_para("Login, register, forgot/reset password — Supabase email + Google OAuth (src/lib/actions/auth.ts).")
add_heading_custom("Admin ops (src/app/admin/)", 2)
add_para(
    "Dashboard, clients, projects (+ detail), upload, tours, timeline, reports, documents, "
    "photos, issues, invoices, users, tour-viewers, analytics, storage, activity, settings, "
    "compare, client-control, notifications."
)
add_heading_custom("Client portal (src/app/dashboard/)", 2)
add_para(
    "Dashboard, projects (+ detail + upload), timeline, Matterport comparison, reports, "
    "documents, issues, invoices, notifications, profile, support."
)
add_heading_custom("Share / social", 2)
add_bullet("src/app/share/tours/[token]/ — gated public Matterport share")
add_bullet("src/app/(social)/links/ — link-in-bio style page")
add_heading_custom("Confirmed product features", 2)
add_para(
    "Clients/orgs, projects, buildings/floors, Matterport tours + compare + share links, "
    "progression report + Excel export, timeline, reports/docs/photos, issues, invoices (INR), "
    "notifications (in-app + email + WhatsApp path), comments, storage usage, presence, "
    "activity logs, impersonation (super_admin), rate limiting, platform settings."
)

add_heading_custom("3. Auth, Roles, Orgs, Projects", 1)
add_para(
    "Auth: Supabase session middleware in src/lib/supabase/middleware.ts + src/middleware.ts; "
    "route matrix in src/lib/auth/routes.ts (/admin staff, /dashboard clients, /share public)."
)
add_para("Roles (src/lib/auth/roles.ts, src/lib/types.ts):", bold=True)
add_bullet("Staff: super_admin, admin, operations_manager")
add_bullet(
    "Client: client_admin, site_supervisor, site_engineer, client, client_user, "
    "read_only_client, consultant"
)
add_para(
    "Permissions: App matrix in src/lib/auth/permissions.ts (UI + server guards). "
    "Matterport upload limited to super_admin / admin."
)
add_para(
    "Organizations: clients table = orgs; users link via client_id; projects belong to clients; "
    "access via project_assignments + client membership."
)
add_para(
    "Projects: CRUD in admin; spatial model (buildings/floors); portfolio fields; soft deletes; "
    "suspension blocks via migration 030."
)

add_heading_custom("4. Database & Data Access", 1)
add_para(
    "Migrations: supabase/migrations/001_initial_schema.sql through "
    "043_floors_unique_active_only.sql."
)
add_para(
    "Core tables (001): clients, users, projects, project_assignments, project_tours, reports, "
    "document_folders, documents, issues, issue_images, timeline_events, timeline_photos, "
    "invoices, notifications, activity_logs."
)
add_para(
    "Later additions (examples): buildings/floors, platform_settings, saved_comparisons, "
    "progression, project_media, storage_usage, rate_limits, user_sessions, tour_shares, "
    "notification prefs/deliveries, comment likes/replies."
)
add_para("Access patterns:", bold=True)
add_bullet("Server Components + src/lib/data/* queries")
add_bullet("Server Actions in src/lib/actions/* (primary mutation layer)")
add_bullet("Service role via src/lib/supabase/admin.ts for privileged notify/provision paths")
add_bullet("RLS in 002_rls_policies.sql + follow-ons")
add_para("Typed schema surface: large Database interface in src/lib/types.ts.")

add_heading_custom("5. File Storage & Uploads", 1)
add_para(
    "Buckets (STORAGE_BUCKETS in src/lib/types.ts, policies in 003_storage_buckets.sql + later): "
    "reports, documents, issue-images, timeline-photos, avatars, project-covers, project-media."
)
add_para(
    "Upload path: browser to Supabase Storage (src/lib/supabase/storage.ts), orchestrated by "
    "src/lib/actions/upload-orchestrator.ts, project-media.ts, documents/reports actions. "
    "Path convention {projectId}/..."
)
add_para("Admin: Storage Manager page tracks quota/usage (031_storage_usage.sql).")

add_heading_custom("6. 360 / Tours / Progress Monitoring", 1)
add_table(
    ["Capability", "Status", "Location"],
    [
        ["Matterport embed viewer", "Confirmed", "MatterportViewer.tsx, matterport.ts"],
        ["Tour CRUD / manager", "Confirmed", "matterport-manager.tsx, /admin/tours"],
        ["Side-by-side compare", "Confirmed", "matterport-compare, comparison routes"],
        ["Public share + lead gate", "Confirmed", "tour-shares 041/042, tour-shares.ts"],
        ["Progression (checklist + charts + export)", "Confirmed", "lib/progression/*, migrations 032-037"],
        ["Timeline / site photos", "Confirmed", "timeline + photos routes/actions"],
        ["Native 360 capture / SDK / photogrammetry", "Missing", "Matterport URL/iframe only"],
        ["LLM AI insights", "Partial", "Heuristic summary (no LLM provider)"],
    ],
)

add_heading_custom("7. APIs, Server Actions, Integrations, Jobs", 1)
add_para("API routes (only 2):", bold=True)
add_bullet("src/app/api/internal/sync-users/route.ts — Bearer CRON_SECRET")
add_bullet("src/app/api/analytics/meta/route.ts — Meta CAPI")
add_para(
    "Server Actions: ~26 modules under src/lib/actions/ (auth, admin, uploads, issues, "
    "progression, notifications, etc.)."
)
add_para(
    "Integrations: Supabase, Resend (email), Twilio WhatsApp (critical rules), Calendly (public), "
    "GA4, Meta Pixel/CAPI, Vercel Analytics/Speed Insights, Matterport (embed)."
)
add_para(
    "Background jobs: No durable queue (no Inngest/Bull). Notifications are request-path / "
    "fail-soft. vercel.json has no cron entries (sync-users expects external/Vercel Cron if configured)."
)

add_heading_custom("8. UI System, Components, Nav, Responsive", 1)
add_bullet("Design tokens: src/design-system/tokens.css (lime accent, density scale)")
add_bullet("Primitives: src/design-system/primitives/* + shadcn-style src/components/ui/*")
add_bullet("Admin shell: ops-sidebar.tsx / admin-shell.tsx")
add_bullet("Client shell: IntelShell via portal-layout.tsx")
add_bullet("Mobile: MobileNavDrawer, responsive Matterport viewer")
add_bullet("Workspace scoping: query-string client/project context for admin + portal")

add_heading_custom("9. Environment Variable Names Only", 1)
add_para("From .env.example (no values exposed):")
add_para(
    "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, "
    "SUPABASE_ACCESS_TOKEN, SUPABASE_STORAGE_QUOTA_GB, DATABASE_URL, NEXT_PUBLIC_APP_URL, "
    "NEXT_PUBLIC_SITE_URL, CRON_SECRET, NEXT_PUBLIC_CALENDLY_URL, NEXT_PUBLIC_GA_MEASUREMENT_ID, "
    "NEXT_PUBLIC_META_PIXEL_ID, META_CAPI_ACCESS_TOKEN, META_CAPI_TEST_EVENT_CODE, RESEND_API_KEY, "
    "CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL, NOTIFICATION_FROM_EMAIL, TWILIO_ACCOUNT_SID, "
    "TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, TWILIO_WA_TEMPLATE_CRITICAL_ISSUE, "
    "TWILIO_WA_TEMPLATE_INVOICE_SENT, TWILIO_WA_TEMPLATE_INVOICE_PAID, "
    "TWILIO_WA_TEMPLATE_PROJECT_REMOVED, plus optional RATE_LIMIT_* / RATE_LIMIT_POLICIES."
)

add_heading_custom("Findings by Category", 1)

add_heading_custom("Confirmed existing functionality", 2)
for b in [
    "Full Next.js + Supabase multi-role SaaS shell (admin + client portal + marketing)",
    "Client orgs, projects, assignments, buildings/floors",
    "Matterport tours, compare, public share with viewer capture",
    "Progression tracking + export",
    "Documents/reports/photos/timeline/issues/invoices",
    "Comments, notifications pipeline, rate limits, presence, activity, storage admin",
    "Auth: email/password, Google OAuth, password reset, impersonation",
]:
    add_bullet(b)

add_heading_custom("Partially implemented functionality", 2)
for b in [
    "WhatsApp: Code path exists (whatsapp/send.ts, prefs migration 040) but Twilio trial ContentSid delivery can fail at provider level",
    "Email: Resend wired; domain verification / trial Resend limits can block non-owner recipients",
    "AI project summary: Rule-based, not model-backed (build-project-report-summary.ts)",
    "User sync cron: Endpoint exists; not declared in vercel.json",
    "Operations Manager: Matrix exists; Matterport create restricted vs admin",
    "Portfolio / construction monitoring modes: Migrations/fields present (017, 033); dual dashboard flavors in intel components",
]:
    add_bullet(b)

add_heading_custom("Missing functionality (vs proposed product direction)", 2)
for b in [
    "Native 360 capture / asset hosting (non-Matterport)",
    "BIM / drawings markup / RFIs as first-class workflows",
    "Scheduling / Gantt / resource planning",
    "Budget/cost control beyond invoices",
    "Real-time collaboration beyond comments/presence",
    "Mobile native apps",
    "Self-serve billing (Stripe) / SaaS subscription checkout",
    "Durable background workers / reliable outbox for notifications",
    "Automated progress CV / change detection between scans",
    "Multi-tenant white-label / reseller portals",
    "Offline field mode",
]:
    add_bullet(b)

add_heading_custom("Potential technical risks", 2)
for b in [
    "Twilio WhatsApp trial ContentSid invalid — Console itself can return 21655; product alerts depend on Twilio account health",
    "Service-role notify paths — bypass RLS by design; must stay server-only (notifications/server.ts)",
    "Migration drift — many numbered SQL files; production must stay aligned (npm run db:check)",
    "Dual UI systems — design-system + components/ui + intel vs ops shells leads to consistency debt",
    "No job queue — notification/email/WhatsApp failures are best-effort on request path",
    "Soft-delete + complex RLS — high surface for authz bugs on new features",
    "Promotion migration 006_promote_vaibhav_admin.sql — environment-specific data migration in repo history",
    "International sandbox delivery — Twilio warns sandbox is unreliable for some countries (e.g. India)",
]:
    add_bullet(b)

add_heading_custom("Broken / incomplete / duplicated / risky (code-level)", 2)
for b in [
    "WhatsApp delivery can fail at Twilio (ContentSid), not at opt-in/DB",
    "Heuristic AI naming may over-promise vs capability",
    "Overlapping compare entry points (/admin/compare vs /dashboard/matterport-comparison)",
    "Large src/lib/types.ts as single schema dump — merge conflicts / drift risk vs migrations",
]:
    add_bullet(b)

add_heading_custom("Prioritized Roadmap (preserve working core)", 1)
add_table(
    ["Priority", "Theme", "Rationale"],
    [
        ["P0", "Stabilize notifications (Twilio Content templates / upgrade, Resend domain)", "Ops critical path already coded"],
        ["P0", "Migration + env health gates in deploy (env:check, db:check)", "Prevent silent prod drift"],
        ["P1", "Harden Matterport share to conversion loop (tour viewers analytics)", "Differentiator already built"],
        ["P1", "Progression UX polish + schedule fields already in DB", "Progress monitoring thesis"],
        ["P2", "Durable notification outbox", "Reliability without breaking sync UX"],
        ["P2", "Unify design tokens across admin/portal", "Faster feature velocity"],
        ["P3", "Native/alternate 360 or Matterport SDK deep features", "Expand beyond iframe"],
        ["P3", "Scheduling / cost / RFI modules", "Classic CM workflows"],
    ],
)

add_heading_custom("Next Three Implementation Tasks (dependency order)", 1)
add_para("1. Unblock WhatsApp (provider + config)", bold=True)
add_para(
    "Get a Twilio ContentSid that succeeds in Console Send; set TWILIO_WA_TEMPLATE_* / From; "
    "verify notification_deliveries shows sent. Depends on Twilio account, not code."
)
add_para("2. Production notify hygiene", bold=True)
add_para(
    "Verify Resend from-domain + critical-rule toggles in platform settings; add deploy checklist "
    "that db:check passes for 040+ WhatsApp columns. Depends on (1) for end-to-end WA; email can "
    "proceed in parallel."
)
add_para("3. Tour-share to ops loop", bold=True)
add_para(
    "Flesh analytics/actions on /admin/tour-viewers + share UX so every shared scan feeds CRM "
    "follow-up. Depends on stable auth/share already shipped; independent of WhatsApp once "
    "(1-2) are green."
)

add_heading_custom("Closing", 1)
add_para(
    "Audit complete. No repository changes were made as part of this assessment. "
    "Implementation work should proceed only after explicit approval of the next task."
)

out = Path(__file__).resolve().parents[1] / "docs" / "BuildView-Repository-Audit.docx"
out.parent.mkdir(parents=True, exist_ok=True)
doc.save(out)
print(str(out))
