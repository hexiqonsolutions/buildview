"""One-off: Tour share follow-up workflow audit → Word .docx"""
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
set_run_font(
    title.add_run("BuildView — Tour Share to Follow-Up Workflow Audit"),
    size=20,
    bold=True,
    color=(15, 23, 42),
)

sub = doc.add_paragraph()
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
set_run_font(sub.add_run("Read-Only Technical Assessment"), size=14, color=(71, 85, 105))

meta = doc.add_paragraph()
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
set_run_font(
    meta.add_run(
        f"Prepared: {date.today().isoformat()}  |  Repository: build view website\n"
        "Constraint: No code, install, migration, env, or data changes were made."
    ),
    size=10,
    color=(100, 116, 139),
)

add_para(
    "Objective: Inspect the existing Matterport tour-sharing-to-follow-up workflow and determine "
    "how to improve it into a reliable business workflow, without redesigning the architecture."
)

add_heading_custom("1. Surface Area Inspected", 1)
add_table(
    ["Area", "Paths"],
    [
        ["Admin viewers page", "src/app/admin/tour-viewers/page.tsx"],
        ["Viewers UI", "src/components/admin/tour-viewers/tour-viewers-table.tsx"],
        ["Public share page", "src/app/share/tours/[token]/page.tsx"],
        ["Public gate + viewer", "src/components/share/tour-share-viewer.tsx"],
        ["Share create/revoke UI", "src/components/share/share-tour-dialog.tsx"],
        ["Server actions", "src/lib/actions/tour-shares.ts"],
        ["Permissions / nav", "src/lib/auth/permissions.ts, ops-sidebar.tsx, routes.ts"],
        ["Schema", "supabase/migrations/041_tour_shares.sql, 042_tour_share_viewer_phone.sql"],
        ["Types", "src/lib/types.ts (TourShare, TourShareView)"],
        ["Rate limit", "src/lib/rate-limit/config.ts (publicTourShareView)"],
        ["Embed points", "matterport-manager.tsx, project-tours-section.tsx"],
    ],
)

add_heading_custom("2. End-to-End Flow (as implemented)", 1)
add_para(
    "Staff/client with tour access → ShareTourDialog → createTourShare / getActiveTourShare / "
    "revokeTourShare → URL: {site}/share/tours/{token}."
)
add_para(
    "Anonymous visitor → getTourSharePublicMeta(token) [no Matterport URL] → gate form "
    "(name, phone, email) → recordTourShareView inserts tour_share_views and returns "
    "matterport_url → MatterportViewer iframe."
)
add_para(
    "Super admin → /admin/tour-viewers → listAllTourShareViewers → filter/search/CSV."
)
add_bullet("TTL: 10 days (SHARE_TTL_MS in tour-shares.ts)")
add_bullet("Token: 24 random bytes, base64url (newToken())")
add_bullet("Reuse: One active non-expired share per tour is reused (createTourShare)")

add_heading_custom("3. Answers A–G", 1)

add_heading_custom("A. What viewer information is currently recorded?", 2)
add_para("Table tour_share_views (migrations 041 + 042):", bold=True)
add_table(
    ["Field", "Source", "Notes"],
    [
        ["viewer_name", "Gate form", "Required"],
        ["viewer_phone", "Gate form", "Required in app (042); DB column nullable"],
        ["viewer_email", "Gate form", "Required in app; DB nullable"],
        ["user_agent", "Request headers", "Truncated to 500 chars"],
        ["ip_hash", "SHA-256 of IP, 32 hex chars", "Not raw IP"],
        ["share_id", "FK to tour_shares", "Links to tour + project"],
        ["created_at", "Server", "Open time"],
    ],
)
add_para(
    "Not recorded: duration, Matterport interaction, referrer, UTM, consent flag, contacted "
    "status, linked user_id / client_id / opportunity id, geo, device class."
)
add_para(
    "Admin row enrichment (listAllTourShareViewers): project name, tour name, share "
    "expiry/revoke via joins on tour_shares / project_tours / projects."
)

add_heading_custom("B. What can an administrator do after a viewer opens a share?", 2)
add_para("On /admin/tour-viewers (super_admin only — see auth below):", bold=True)
add_bullet("Search name/phone/email/project/tour")
add_bullet("Filter by project")
add_bullet("Refresh list")
add_bullet("Export CSV")
add_bullet("Click tel: / mailto: on phone/email")
add_para("Not available:", bold=True)
add_bullet("Mark contacted / assign owner / add notes")
add_bullet("Create client, user, or opportunity from viewer")
add_bullet("Notify staff when a new view arrives")
add_bullet("Revoke share from this page (revoke only in ShareTourDialog)")
add_bullet("Open project/tour deep-link as a primary action")
add_bullet("Deduplicate people across opens")
add_para(
    "Per-tour API exists but UI is thin: getTourShareViewers(tourId) returns viewers for a "
    "tour; no dedicated viewers panel found consuming it in tour UI (only global admin table)."
)

add_heading_custom(
    "C. Can a viewer be associated with a client, project, or opportunity?", 2
)
add_table(
    ["Association", "Status"],
    [
        ["Project", "Indirect, automatic via tour_shares.project_id (display only)"],
        ["Tour", "Indirect via tour_shares.tour_id"],
        ["Client org", "No — no client_id on views; projects.client_id not joined in admin list"],
        ["Existing user", "No — no match on email/phone to users"],
        ["Business opportunity / lead CRM", "Missing — no opportunities/leads table or pipeline"],
    ],
)
add_para("Context of which project/tour: yes. CRM entity linkage: no.")

add_heading_custom("D. Are access logs / analytics reliable enough for ops?", 2)
add_para(
    "Usable for: who entered the gate for which shared tour, when — plus CSV export.",
    bold=True,
)
add_para("Weak for ops:", bold=True)
add_bullet(
    "Duplicate opens: TourShareViewer stores gate in sessionStorage and on reload calls "
    "recordTourShareView again → new row every session restore."
)
add_bullet(
    "Insert failure does not block unlock — tour still opens if logging fails → silent gaps."
)
add_bullet("No unique constraint on (share_id, email/phone) → duplicates by design.")
add_bullet("Admin list limit 500, in-memory filter after fetch — not full history / not paginated.")
add_bullet("No engagement analytics (time in tour, return visits beyond re-gate).")
add_bullet("No product analytics events tied to share open (GA/Meta not wired here).")
add_bullet("viewCount on share dialog counts view rows (includes duplicates).")
add_para(
    "Verdict: Good enough as a lead inbox, not as a trustworthy funnel/analytics system "
    "without dedupe and failure alerting."
)

add_heading_custom("E. Privacy, authorization, data-integrity risks", 2)
add_para("Privacy", bold=True)
add_bullet(
    "Collects PII (name, phone, email) with minimal notice; no explicit consent copy beyond form."
)
add_bullet("user_agent + hashed IP retained indefinitely (no retention policy in schema).")
add_bullet("Public page is robots: noindex (good).")
add_bullet("CSV export of PII with no audit of who exported.")
add_para("Authorization", bold=True)
add_bullet("Public route allowed: routes.ts includes /share.")
add_bullet(
    "Share create/revoke: staff or project access (assertCanShareTour) — clients with project "
    "access can create public links."
)
add_bullet(
    "/admin/tour-viewers is effectively super_admin-only: tour_viewers permission is only on "
    "super_admin in PERMISSIONS; admin/operations_manager inherit ADMIN_OPS_MATRIX without "
    "tour_viewers → page redirects."
)
add_bullet(
    "RLS: authenticated staff/project members can SELECT shares/views; INSERT on views is "
    "service-role only — matches server action pattern."
)
add_bullet("Token is unguessable (24 bytes); expired/revoked shares return unavailable.")
add_para("Integrity", bold=True)
add_bullet("App requires phone+email; DB still allows null email/phone → app/DB mismatch.")
add_bullet("Logging failure still unlocks Matterport URL.")
add_bullet("No FK from views to clients/users.")

add_heading_custom("F. Implemented / partial / missing", 2)
add_table(
    ["Capability", "Status", "Evidence"],
    [
        ["Create/reuse/revoke 10-day share", "Implemented", "createTourShare, revokeTourShare, ShareTourDialog"],
        ["Public gate + Matterport unlock", "Implemented", "recordTourShareView, TourShareViewer"],
        ["Store name/phone/email + UA + IP hash", "Implemented", "041/042, recordTourShareView"],
        ["Admin list + search + CSV", "Implemented", "TourViewersTable, listAllTourShareViewers"],
        ["Rate limit public gate", "Implemented", "publicTourShareView: 20 / 600s"],
        ["Per-tour viewer list API", "Partial", "getTourShareViewers — little/no UI"],
        ["Share from admin + portal tour UI", "Implemented", "matterport-manager, project-tours-section"],
        ["Staff notify on new viewer", "Missing", "No hooks in notifications/"],
        ["Activity log for share/view", "Missing", "No writes in activity actions"],
        ["Lead status / assignment", "Missing", "No columns/UI"],
        ["Link viewer to client/user/opportunity", "Missing", "No schema"],
        ["Dedupe / unique people", "Missing", "Re-records on session restore"],
        ["Client column on admin table", "Missing", "Projects joined, not clients"],
        ["Admin (non-super_admin) access to viewers", "Missing / gap", "Permission matrix"],
        ["CRM / opportunity pipeline", "Missing", "—"],
    ],
)
add_para("Overlaps:", bold=True)
add_bullet("Single public route (no duplicate share URL schemes).")
add_bullet("Two share entry UIs (admin Tour Manager + portal project tours) — same dialog/actions (good).")
add_bullet(
    "Global admin viewers vs unused per-tour getTourShareViewers — overlapping data access, incomplete UX."
)

add_heading_custom("G. Smallest useful improvement (no redesign)", 2)
add_para(
    "Recommendation: New viewer → staff signal + light follow-up state on existing tables/UI.",
    bold=True,
)
add_para("Minimal slice:")
add_bullet(
    "On successful tour_share_views insert, notify staff (e.g. notifySuperAdmins) with name, "
    "project, tour, mailto/tel."
)
add_bullet(
    "Add optional follow_up_status (new | contacted | qualified | dismissed) + notes on "
    "tour_share_views (one small migration)."
)
add_bullet(
    "On /admin/tour-viewers, add status dropdown + WhatsApp/Email actions + deep link to "
    "/admin/projects/[id]."
)
add_bullet(
    "Deduplicate session re-entry: if same share_id + email within N hours, skip insert "
    "(or skip when sessionStorage unlock repeats)."
)
add_para(
    "This turns the inbox into a workable follow-up queue without a CRM rewrite."
)

add_heading_custom("4. Prioritized Implementation Plan", 1)

add_heading_custom("P0 — Reliable lead capture", 2)
add_table(
    ["Item", "Detail"],
    [
        ["Scope", "Stop duplicate view rows on session restore; fail loudly or retry logging; surface client name on admin rows via projects.client_id"],
        ["Files", "tour-share-viewer.tsx, tour-shares.ts (recordTourShareView, listAllTourShareViewers), maybe tour-viewers-table.tsx"],
        ["DB", "Optional unique/partial index later; or app-level dedupe first (no migration)"],
        ["Security", "Keep service-role inserts; do not expose Matterport URL before gate"],
        ["Acceptance", "Reload within same session does not create N rows; admin list shows client org name"],
        ["Tests", "Unit tests for dedupe key; manual share → open → reload → single row"],
    ],
)

add_heading_custom("P1 — Follow-up workflow on existing inbox", 2)
add_table(
    ["Item", "Detail"],
    [
        ["Scope", "Status + notes; notify staff on new view; extend tour_viewers permission to admin (and optionally ops)"],
        ["Files", "New migration, types.ts, tour-shares.ts, tour-viewers-table.tsx, permissions.ts, notifications/server.ts"],
        ["DB", "follow_up_status, follow_up_notes, followed_up_at, followed_up_by on tour_share_views"],
        ["Security", "Only staff with tour_viewers update; RLS update policy for staff"],
        ["Acceptance", "New gate entry notifies staff; admin can mark Contacted; non-super_admin staff with grant can open page"],
        ["Tests", "Permission matrix cases; notify skipped when rule off; status update audit"],
    ],
)

add_heading_custom("P2 — Associate viewer with org / opportunity", 2)
add_table(
    ["Item", "Detail"],
    [
        ["Scope", "Match email/phone to users / clients; optional Create client contact / opportunity stub"],
        ["Files", "New small actions module, admin UI columns/actions, maybe clients UX"],
        ["DB", "Nullable matched_user_id, matched_client_id, or opportunities table if product wants pipeline"],
        ["Security", "Matching must be staff-only; no PII leakage to clients"],
        ["Acceptance", "Link to client or auto-suggest match; stored FK visible in table"],
        ["Tests", "Match precision; no cross-tenant leaks"],
    ],
)

add_heading_custom("P3 — Analytics quality", 2)
add_table(
    ["Item", "Detail"],
    [
        ["Scope", "Unique viewers vs raw opens; retention policy; export audit; optional GA event"],
        ["Files", "Aggregations in listAllTourShareViewers, settings for retention job"],
        ["DB", "Indexes on (share_id, lower(viewer_email)); optional archive table"],
        ["Security", "Retention deletes/anonymizes PII per policy"],
        ["Acceptance", "Dashboard shows unique people + opens; CSV labeled as PII export"],
        ["Tests", "Aggregation correctness; retention dry-run"],
    ],
)

add_heading_custom("5. Suggested Next Three Tasks (dependency order)", 1)
add_para("1. Dedupe session unlock inserts + show client name on Tour Viewers (P0, mostly app-side).", bold=True)
add_para(
    "2. Staff notification on new tour_share_views row + grant tour_viewers to admin (P1 notify + auth).",
    bold=True,
)
add_para("3. Follow-up status/notes migration + table actions (P1 CRM-lite).", bold=True)

add_heading_custom("Closing", 1)
add_para(
    "Audit complete. No repository changes were made as part of this assessment. "
    "Implementation should proceed only after explicit approval of a task number or scoped variant."
)

out = Path(__file__).resolve().parents[1] / "docs" / "BuildView-Tour-Share-Follow-Up-Audit.docx"
out.parent.mkdir(parents=True, exist_ok=True)
doc.save(out)
print(str(out))
