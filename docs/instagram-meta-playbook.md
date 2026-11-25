# BuildView Instagram + Meta Playbook

Source of truth for social positioning. Website copy remains the brand source: **Construction Intelligence Platform** and **See Every Construction Project. Make Every Decision Faster.**

Central social message: **Know what's happening on site, without always being on site.**

Do not position BuildView as a photography, drone, interior, Matterport, or virtual-tour studio. Matterport / Insta360 may be mentioned as capture tools, not as the brand.

---

## A. Final Instagram profile

| Field | Value |
| --- | --- |
| Username | `@build_view360` |
| Name | `BuildView \| Construction Tech` |
| Category | Software Company |
| Bio | See below |
| CTA button | Book Demo / Contact Us → `/links` |
| Link | Production site `/links?utm_source=instagram&utm_medium=social&utm_campaign=buildview_bio` |

**Name field note:** Instagram names are 30 characters. `BuildView | Construction Monitoring` is 36 characters. Use `BuildView | Construction Tech` (28). If Instagram later allows a longer name, switch to `BuildView | Construction Monitoring`.

**Category fallbacks:** Information Technology Company → Business Service. Avoid Photographer, Photography Videography, or Real Estate.

**CTA:** Prefer **Book Now** or **Contact Us** pointing at `/links` (demo first). Do not send bio traffic only to the homepage.

### Final bio (148 characters)

```
Construction Monitoring & Visibility
360° Site Tours • Progress • Reports • Issues
Built for Developers, Architects & PMCs
↓ See how BuildView works
```

---

## B. Bio alternatives

**1. Construction-tech focused**
```
Construction Intelligence Platform
360° monitoring • Reports • Issues • Docs
For developers, architects, contractors & PMCs
↓ Book a BuildView demo
```

**2. Developer / PMC focused**
```
Remote construction monitoring for developers & PMCs
One visual project record: tours, reports, issues
Know what's happening on site
↓ Book a demo
```

**3. 360° monitoring focused**
```
360° construction site monitoring
Walk the site remotely • Track progress • Close issues
Built for project teams, not photography
↓ See how BuildView works
```

---

## C. Profile SEO strategy

Use construction keywords in the Name field, first bio line, captions, alt text, on-screen text, and Reel titles. Do not dump keywords.

Primary groups: construction monitoring, construction progress tracking, construction technology, remote construction monitoring, 360 site walkthrough, construction documentation, construction reporting, construction intelligence.

Every post first sentence should make sense to a developer, architect, contractor, or PMC who does not know BuildView yet.

---

## D. Highlight structure

Use covers in `/public/social/highlights/`. Dark field `#050505`, accent `#A4CF30`.

| Order | Name | Cover | Content |
| --- | --- | --- | --- |
| 01 | Platform | `01-platform.svg` | Product walkthroughs |
| 02 | 360° Tours | `02-tours.svg` | Site captures and walkthroughs |
| 03 | Monitoring | `03-monitoring.svg` | Progress and remote review |
| 04 | Reports | `04-reports.svg` | Report examples |
| 05 | Projects | `05-projects.svg` | Real captures only; no invented clients |
| 06 | How it works | `06-how-it-works.svg` | Capture → monitor → review |
| 07 | About | `07-about.svg` | Team, process, story |
| 08 | Contact | `08-contact.svg` | Demo CTA, `/links` |

---

## E. Pinned posts

Pin in this order. Together they should explain BuildView in about 30 seconds.

1. **What is BuildView?** — Carousel. Construction monitoring platform, not photography.
2. **How BuildView Works** — Reel or carousel. Capture → platform → stakeholder access.
3. **Why construction teams need better visibility** — Carousel. WhatsApp photos, late reports, missed issues, then one visual record.

---

## F. First 12 launch posts

Full slide copy, captions, and Reel scripts: [`docs/instagram-content-library.md`](instagram-content-library.md).

Pin in this order after publishing: **01 What is BuildView?** · **02 Traditional updates / visibility problem** · **03 How 360° monitoring works**.

Sequence: What is BuildView → problem → how 360 monitoring works → platform → tours → reports → timeline → documents/issues → who it's for → developer → architect/PMC → book a demo.

---

## G. 30 Reel concepts

Scene-by-scene scripts, captions, keywords, and durations: [`docs/instagram-content-library.md`](instagram-content-library.md) (section G).

Framework: Hook → Problem → Visual proof → Solution → CTA. Duration 12–30s unless noted. CTA: See how BuildView works / Book a demo.

Prioritise educational and problem-based Reels over product spots. Hardware may appear; it must not become the identity.

---

## H. 15 carousel concepts

Full slide lists: [`docs/instagram-content-library.md`](instagram-content-library.md) (section H).

Keep 7–9 slides. Slide 1 is the hook. Last slide is the CTA. Body slides are one idea each.

---

## I. Caption framework

```
HOOK

Explain the construction problem.
Explain why it matters.
Introduce BuildView naturally.
Explain the feature without hype.
CTA.
```

Example:

```
Your project doesn't need more photos.
It needs better visibility.

BuildView turns construction sites into a visual project record using 360° site capture, progress reports, timelines, documents and issue tracking.

So developers, architects, PMCs and project owners can understand what's happening without being physically present at every stage.

See how BuildView works → link in bio.
```

Never use unverified claims such as “save 50%”, “trusted by 1,000 companies”, or invented customer results.

### Platform variations

- **Instagram:** Short, visual, first line must work as a search snippet.
- **Facebook:** Add one extra paragraph on the workflow (capture → review → report).
- **LinkedIn:** Operational language. Audience = developers, PMCs, architects. No emoji stacks.

---

## J. Hashtag system

Use 5–9 tags. Mix groups. Do not paste the same block every time.

- **A:** `#ConstructionTechnology #ConstructionMonitoring #ConstructionManagement #ConstructionTech #ConstructionIndustry`
- **B:** `#360VirtualTour #VirtualSiteTour #DigitalConstruction #SiteMonitoring` — use `#360Photography` only when the post is actually about capture method
- **C:** `#RealEstateDevelopment #ProjectManagement #Architecture #CivilEngineering #Infrastructure`
- **D:** `#IndianConstruction #ConstructionIndia #RealEstateIndia #PropTechIndia #ConTechIndia`

---

## K. LinkedIn positioning

- **Headline:** BuildView | Construction Monitoring & Intelligence Platform
- **About:** BuildView helps developers, architects, contractors, PMCs and project owners gain better visibility into construction projects through 360° site capture, progress reports, project timelines, documentation and issue tracking.
- **CTA:** Book a demo
- **Content:** Longer problem/insight posts. Same pillars, less hook-bait.
- Do not publish a LinkedIn URL until the company page is verified. Do not use generic `linkedin.com/company/buildview`.

---

## L. Facebook positioning

Treat Facebook as a longer-form and sharing surface for the same construction-tech story. Cross-post Reels with a rewritten caption. Page category: Software company / Information technology. CTA: Book now → `/links` with `utm_source=facebook&utm_medium=social&utm_campaign=buildview_facebook`.

---

## M–Q. Website social system (implemented)

- SEO title: `BuildView | Construction Monitoring & Intelligence Platform`
- Meta / OG / Twitter share the site description plus a 1200×630 image at `/og/buildview-1200x630.png` (also `src/app/opengraph-image.png`)
- Instagram in footer, About, Contact (`rel=me` on the Instagram profile URL)
- Social landing: `/links` (minimal chrome, conversion-first). `/instagram` redirects to `/links`
- Organization, SoftwareApplication, and Service JSON-LD on marketing pages
- Meta Pixel via `NEXT_PUBLIC_META_PIXEL_ID` + optional server CAPI (`META_CAPI_ACCESS_TOKEN` is server-only)
- UTM helpers in `src/lib/utm.ts`

### Bio URL

Prefer the production domain once `NEXT_PUBLIC_SITE_URL` is set:

`https://<production-domain>/links?utm_source=instagram&utm_medium=social&utm_campaign=buildview_bio`

Until the custom domain is confirmed, use the live Vercel host with the same path and UTM.

### UTM

| Surface | source | medium | campaign |
| --- | --- | --- | --- |
| Profile / bio | instagram | social | buildview_bio |
| Profile (non-bio) | instagram | social | buildview_profile |
| Reels | instagram | social | buildview_reels |
| Stories | instagram | social | buildview_stories |
| Carousel | instagram | social | buildview_carousel |
| Facebook | facebook | social | buildview_facebook |
| LinkedIn | linkedin | social | buildview_linkedin |

Append `utm_content` for the clicked item (`book_demo`, `virtual_tours`, etc.).

Alias: `/instagram` → `/links` (query string preserved).

---

## Visual system

| Token | Value |
| --- | --- |
| Background | `#050505` |
| Surface | `#1A1A1A` |
| Accent | `#A4CF30` |
| Accent dark | `#76B82D` |
| Type | Poppins (display) + Open Sans (body) |
| Profile image | `public/social/profile-1080.svg` or logo on `#050505` with generous padding — not a site photo |
| OG / link preview | `public/og/buildview-1200x630.png` (1200×630) |
| Highlight covers | `public/social/highlights/01`–`08` |
| Reel covers | One hook line, accent rule, no busy collage |
| Carousel covers | Architectural grid, 360 ring, dark UI chrome |

Do not look like a contractor page or a Matterport photographer grid.

---

## Placeholder audit (do not republish as fact)

Removed or unpublished until verified:

- Named testimonials (Sarah Chen, Michael Torres, Priya Sharma and associated companies)
- Placeholder phone `+91 98765 43210`
- Placeholder San Francisco address
- Generic LinkedIn / X / YouTube URLs
- Autodesk, Procore, Trimble, Ricoh, Bentley shown as partners
- “Official” Insta360 partnership wording
- Invented project case studies and tour/report counts

Still confirm before treating as public fact:

- `hello@buildview.io`
- Production canonical domain (`NEXT_PUBLIC_SITE_URL`)
- Any live customer names, logos, or results

---

## Manual Meta / Instagram checklist

1. Set Name, bio, category Software Company, and professional CTA
2. Paste `/links` URL with UTM
3. Upload highlight covers
4. Pin the three launch posts after publishing
5. Create Meta Pixel; add ID to Vercel as `NEXT_PUBLIC_META_PIXEL_ID`
6. Optional CAPI: `META_CAPI_ACCESS_TOKEN` (server only), test with `META_CAPI_TEST_EVENT_CODE`
7. Verify events: PageView, ViewContent, Lead, Contact, BookDemo, CompleteRegistration, CtaClick
8. Connect Instagram Professional account to the Facebook Page
9. Do not add a second Pixel snippet in GTM if the site Pixel is live
