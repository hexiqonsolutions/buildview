# Traffic analytics: shared 360 tour links + landing page visitors

**Status:** plan for review. Nothing built yet.

## 1. What exists today

| Piece | What it gives |
|---|---|
| Vercel Analytics (`SiteAnalytics` in the root layout) | Page views and visitors per URL, devices, countries, referrers, all anonymous. Free plan: monthly event cap, short history. |
| Google Analytics / Meta Pixel | Wired, active only when `NEXT_PUBLIC_GA_MEASUREMENT_ID` / `NEXT_PUBLIC_META_PIXEL_ID` are set. |
| `tour_shares` (migration 041) | One row per share link (token, tour, project, expiry, revoked). |
| `tour_share_views` (041/042) | One row per person who **fills the gate** (name, email, phone, user agent, hashed IP). Same email within 24 h counted once. |
| Admin → Tour Viewers | List of those people, filterable by project. Staff only. |

**Gaps:**
- Opens are not counted.
- People who open but never fill the gate are invisible.
- There's no time-in-tour measure.
- There's no per-link summary, chart or export.
- Clients can't see who viewed their own links.

## 2. What we'll measure (per link, per tour, per project)

| Metric | Meaning |
|---|---|
| **Opens** | Visits to the link (one per visitor per 30 minutes) |
| **Unique visitors** | Different browsers that opened it |
| **Unlocked** | Visitors who filled the gate and saw the tour |
| **Unlock rate** | Unlocked ÷ unique visitors |
| **Avg. time in tour** | Active time with the tour visible, from heartbeats |
| **Returning** | Visitors who came back on another day |
| **Last opened** | Most recent open |
| **Link previews** | WhatsApp / Facebook / Slack link-preview fetches, **shown separately, not counted as opens** |
| Devices, countries, referrers | Phone vs. desktop, country (from Vercel's edge header), and where the click came from |

## 3. How it works

1. **Open:**
   - The share page records a visit server-side when it renders.
   - It's keyed by a random anonymous visitor ID (a first-party cookie, `bv_vid`, valid 1 year), the share link, and a 30-minute visit window.
   - It stores device class, country, referrer host and a **salted hash** of the IP. The raw IP is never stored.
2. **Link previews:** requests from crawlers and preview bots (WhatsApp, facebookexternalhit, Twitterbot, Slackbot, Googlebot…) are stored as previews and kept out of opens. This matters because every link pasted into WhatsApp triggers a preview fetch.
3. **Unlock:** when the gate is submitted (the existing `recordTourShareView`), the visit is marked unlocked and linked to the viewer row. The name, phone and email still live only in `tour_share_views`, as today.
4. **Time in tour:**
   - While the tour is visible, the page sends a tiny heartbeat every 30 seconds (paused when the tab is hidden).
   - Each heartbeat adds active seconds to the visit, capped at 4 hours per visit.
   - The heartbeat goes to a rate-limited endpoint that only accepts known visit IDs.
5. **Rollups:** queries group by link and day directly. The volume is small, so no extra service is needed.

## 4. Data (migration 056)

```
tour_share_visits
  id, share_id → tour_shares, tour_id, project_id
  visitor_id (anonymous), visit_started_at, last_seen_at
  active_seconds, is_preview, unlocked_at, view_id → tour_share_views
  device (mobile/tablet/desktop), country, referrer_host, ip_hash
```
- Indexes on (share_id, visit_started_at) and (project_id, visit_started_at).
- RLS: staff read everything; client roles read rows for their own projects (only if section 6, option B, is chosen). Writes go through the service role only.
- Retention: visits older than 13 months are deleted by the existing daily cron.

## 5. Screens

1. **Admin → Tour Viewers**, which gets two tabs:
   - **Link analytics (new):**
     - date range (7 / 30 / 90 days / custom) and a project filter;
     - totals row (opens, unique, unlocked, unlock rate, avg. time);
     - a 30-day chart of opens vs. unlocked;
     - a table **per link** (tour, project, created by, expiry, opens, unique, unlocked, rate, avg. time, last opened);
     - CSV export.
   - **Viewers (existing list)**, now also showing each viewer's time in tour and number of visits.
2. **Tour Manager:** each tour card gets a small line such as "23 opens · 9 unlocked · last 2 h ago", which opens that link's detail.
3. **Link detail:** day-by-day chart, devices, countries, referrers, and the list of unlocked viewers with their time in tour.
4. **Optional, for the client:** an "Engagement" card on the Real Estate / Interior portal showing their own links' opens and unlocked viewers.

## 6. Decisions for you

- **A. Who sees viewer details?**
  - Recommended: BuildView staff see everything. The client's Client Admin sees the numbers plus viewer names and phones for their own projects; other client roles see the numbers only.
- **B. Show engagement to clients at all?**
  - Recommended: yes, for Real Estate and Interior portals. It's a selling point for property owners ("38 buyers viewed this flat").
- **C. Retention:**
  - Recommended: keep visits for 13 months. Gate submissions are kept as today.
- **D. Cookie notice:**
  - Recommended: one line on the gate, "We record visits to this link to show the owner how it's used."
  - The cookie is first-party and strictly functional, so no banner is needed.

## 6b. Landing page visitors (website)

Same approach, recorded in our own database, so numbers sit next to tour links in the admin instead of only in Vercel's dashboard.

**Pages tracked:** the public site. That's the home page, Construction Intelligence, Interior Showcase, Real Estate Showcase, Projects, Services, About and Contact. Legal pages (privacy / terms / cookies) count in totals but aren't charted.

**What we'll measure:**

| Metric | Meaning |
|---|---|
| **Visitors** | Unique people (anonymous ID), per day / week / month |
| **Page views** | Views per page; top pages |
| **Sessions** | Visits (30 min inactivity = new visit) |
| **New vs. returning** | First visit vs. came back |
| **Sources** | Referrer (Google, Instagram, WhatsApp, LinkedIn, direct…) and **UTM tags** (`utm_source / medium / campaign`) from ads and Instagram links |
| **Entry and exit pages** | Where people land and where they leave |
| **Engaged time** | Active time on the page (visible tab, 15 s heartbeat) |
| **Conversions** | Contact form sent, "Book a demo" / Calendly click, WhatsApp click, Login click. Each is a **lead event** tied to its source and campaign. |
| Devices, countries, cities | From Vercel's edge headers |

**Not counted:**
- bots and link-preview crawlers;
- BuildView staff, when they're signed in;
- `localhost` and preview deployments.

**How it works:**
- A tiny client tracker on marketing pages only sends a page view on load and on each route change, plus heartbeats while the page is visible.
- It also sends named events for the conversion buttons and forms.
- An API endpoint (rate-limited, bot-filtered) writes to `site_visits` (one row per session) and `site_events` (page views and conversions). These live in migration 056, next to `tour_share_visits`, and share the same anonymous visitor ID and hashed IP.
- **No third-party cookie, no personal data:** only a random first-party ID.
- Vercel Analytics and the optional GA4 keep running as they are, so you can cross-check.

**Screen: Admin → Analytics → Website (new tab):**
- totals (visitors, page views, conversions, conversion rate) for the chosen range, with change vs. the previous period;
- a daily visitors chart;
- top pages;
- sources and campaigns, with conversions per source, so you can see which Instagram post or ad brought leads;
- devices and countries;
- live "visitors in the last 30 minutes";
- CSV export.

**Retention:** 13 months, the same as tour links.

## 7. Build order

1. Migration 056 and the bot / device / referrer classifiers (pure functions, with tests).
2. Record opens on the share page, link unlocks to visits, and the heartbeat endpoint (rate-limited).
3. Analytics queries (totals, per link, per day, per link detail) and CSV export.
4. Admin **Link analytics** tab, the link detail view, and the Tour Manager line.
5. Client engagement card (if B = yes).
6. Landing page tracker (marketing pages + conversion events), `site_visits` / `site_events`, and the Admin → Analytics → Website tab.
7. Retention cleanup in the daily cron. Verify with a real share link (open, preview from WhatsApp, unlock, time in tour).

Existing data: past gate submissions stay in Tour Viewers. Open counts start from the day this ships, because past opens were never recorded.
