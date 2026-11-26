# WhatsApp + in-portal notifications for the whole project team

**Status:** built (migration 055). Production WhatsApp needs the templates in §6 approved.

## 1. What exists today

| Piece | State |
|---|---|
| In-portal notifications (bell) | ✅ `notifications` table, per-event platform switches |
| Email | ✅ Resend, per-user opt-in |
| WhatsApp | ⚠️ Twilio, **only 4 "critical" events** (critical issue, invoice sent/paid, project removed) |
| Per-user WhatsApp opt-in + phone (E.164) + delivery log | ✅ migration 040 |
| Checklist step started / ended | ❌ no notification (timeline entry only) |
| Zone / trade updates, verification, evidence | ❌ none |
| Comments and replies | ❌ none |
| Scan (360 tour) uploaded | ⚠️ client users only, in-app + email, no WhatsApp |
| "Team" recipients | ❌ each event picks recipients ad hoc (clients, or super admins) |

## 2. The hard constraint: WhatsApp is not free-form chat

1. **Business-initiated messages need Meta-approved templates.**
   - Outside a 24-hour window after the user last messaged us, WhatsApp only delivers **pre-approved "Utility" templates** with variables.
   - Every event type below needs a template, which Meta approves in roughly 1–2 days.
   - The Twilio sandbox works only for testing. Production needs a **registered WhatsApp Business sender** (your number + Meta Business verification).
2. **Each message is charged.**
   - India utility messages cost about ₹0.12–0.15 each from Meta.
   - Twilio adds about $0.005 (≈₹0.42) per message.
3. **Too many messages gets the number blocked.**
   - Meta rates the sender's quality. If people mute or block it, Meta lowers the rating and then caps or suspends the number.

**Why that matters here:** "every step started and ended, to the whole team" adds up fast. On a 35-floor project, 112 steps × 2 events × 35 floors ≈ 7,800 events. Across a team of 8, that's about **62,000 WhatsApp messages** over the project. That costs roughly ₹35,000 through Twilio, and it's spam-level volume that would get the number restricted.

**So the plan:** send **everything in-portal instantly**, and use **WhatsApp for what needs action now**. Routine site activity goes out as a **WhatsApp digest**: one message per person per project, a few times a day (e.g. "Nahur villa trial · today: 14 steps ended, 3 started, 2 scans, 5 comments → open").

## 3. Events and default delivery

| Event | In-portal | WhatsApp default | Who |
|---|---|---|---|
| Step **started** | Instant | Digest | Project team |
| Step **ended** | Instant | Digest | Project team |
| Step **verified / rejected** | Instant | **Instant** to the person who ended it; digest for the others | Team |
| Zone trade stage changed | Instant | Digest | Team |
| Evidence scan linked | Instant | Digest | Team |
| **Comment** on the project | Instant | Digest | Team |
| **Reply to my comment / @mention** | Instant | **Instant** | That person |
| **Scan (360 tour) uploaded** | Instant | **Instant** | Team + client users |
| Floor behind plan ≥ 20% (new) | Instant | Daily digest | Client Admin + staff |
| Issue critical / invoices / project removed | Instant | Instant (as today) | As today |

Each person can switch each row to **Instant, Digest or Off** for WhatsApp, in their profile. Staff can change the project's defaults.

**Never notified:**
- the person who did the action;
- users without access to the project;
- buyers and showcase viewers.

## 4. Who is "the team"

For a Construction Intelligence project, the team is:
- users **assigned** to the project (`project_assignments`);
- the client org's **Client Admin, Site Supervisor and Site Engineer**;
- the client's **viewer roles** (client users, read-only), but only for client-facing events: scan uploaded, floor complete, digest;
- **BuildView staff assigned** to the project (not every super admin).

One function, `resolveProjectTeam(projectId, event)`, replaces today's ad-hoc recipient lists.

## 5. How it works

1. **Every event writes the bell notification and one row per recipient in a new `notification_outbox`.** It stores the event, the channel, whether it's instant or digest, its status and a dedupe key. The action itself returns immediately, so site work never waits on WhatsApp.
2. **A scheduled sender** (Vercel Cron every 2 minutes, or Supabase `pg_cron`) sends the instant rows.
   - It retries failures with backoff and records each send in the existing delivery log.
   - **Quiet hours** (default 9 pm–8 am IST) hold instant messages until morning, except critical ones.
3. **The digest job** runs at 1 pm and 7 pm IST (configurable).
   - It groups each person's waiting digest rows by project into one message with counts, plus a link that opens the portal's notification view filtered to those events.
4. **Rate guard:** at most N instant WhatsApp messages per person per hour. Anything over that spills into the next digest.
5. **Dedupe:** if a step is started and ended within the same digest window, it's summarised once as "ended".
6. **Opt-in stays explicit:** WhatsApp only goes to people who switched it on and entered their phone number (as today). Replying STOP turns it off.

## 6. WhatsApp templates to get approved (Utility category)

All five use the same three variables, so one code path fills them:
- **{{1}}** is the title;
- **{{2}}** is the message;
- **{{3}}** is the link.

Create each one in Twilio Content Template Builder (category **Utility**, language **English**), submit it, and put its SID in the matching environment variable.

| Env var | Name | Body | Sample values |
|---|---|---|---|
| `TWILIO_WA_TEMPLATE_TEAM_UPDATE` | `bv_team_update` | BuildView: {{1}}
{{2}}
Open: {{3}} | Tower A · Floor 3: step completed / Post-Slab step 22 "Internal wall plaster" completed by Asha. / https://buildview-tawny.vercel.app/dashboard/projects/… |
| `TWILIO_WA_TEMPLATE_STEP_REVIEW` | `bv_step_review` | BuildView review: {{1}}
{{2}}
Details: {{3}} | Tower A · Floor 3: step rejected / "Internal wall plaster" was rejected by Ravi: redo corner. / link |
| `TWILIO_WA_TEMPLATE_COMMENT_REPLY` | `bv_comment_reply` | BuildView: {{1}}
"{{2}}"
Reply: {{3}} | Asha replied to your comment / Plaster is done, please check. / link |
| `TWILIO_WA_TEMPLATE_SCAN_UPLOADED` | `bv_scan_uploaded` | BuildView: {{1}}
{{2}}
View: {{3}} | New 360 scan: Floor 3 Oct walk / Tower A · Floor 3 scan is ready to view. / link |
| `TWILIO_WA_TEMPLATE_SITE_DIGEST` | `bv_site_digest` | BuildView daily update: {{1}}
{{2}}
Open: {{3}} | Nahur villa trial update / 14 steps ended · 3 steps started · 2 new scans / link |

Until these are set, sends fall back to the Twilio sandbox template, which is fine for testing.

## 7. Settings

- **Profile → Notifications:** a grid of events × channels (Portal, Email, WhatsApp), with Instant, Digest or Off for each. It also holds the phone number, a "send test message" button, and quiet hours.
- **Admin → Settings → Notifications:** the existing platform switches gain the new events, the digest times, the quiet hours and the rate limit.
- **Project → Team:** shows who gets what, and lets staff mute a person for a project.

## 8. Build order

1. Migration 055: the `notification_outbox` table, per-user event preferences, and the new rule keys.
2. `resolveProjectTeam` and `notifyProjectTeam(event, payload)`, wired into the progression actions (step start/end/verify, zones, evidence), comments and scan uploads.
3. The outbox sender, digest job and cron, plus quiet hours, the rate guard and retries.
4. WhatsApp template mapping in `send.ts`, with a fallback to in-portal and email when no template is configured.
5. The settings UI (profile grid, admin rules, project team view) and a **send test** button.
6. Tests: recipient rules, dedupe, digest grouping and quiet hours.

## 9. What you need to do outside the code

1. Register a **WhatsApp Business sender** in Twilio. Meta Business verification is required, and a phone number that is not already used on WhatsApp.
2. Create the 5 templates above in **Twilio Content Template Builder** and submit them to Meta. I'll give the exact text and sample values.
3. Add the template SIDs to Vercel environment variables.

Until then, everything works in-portal and by email, and WhatsApp runs against the sandbox for testing.
