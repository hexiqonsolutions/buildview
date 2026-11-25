# Meta ads readiness

No campaign has been created, no payment method has been added, and no ad is approved to run. This file is the gate. When every item in the final checklist is true, a small test is justified. Until then, spending will buy clicks you cannot trust.

The organic profile and the 30-day calendar come first. Ads amplify a profile that already tells the truth. They should not be the thing that explains BuildView for the first time.

## What has to be true first

| Gate | Why | How you know |
|---|---|---|
| Canonical Instagram chosen | Ads on the wrong handle, or on both, split the enquiry | You have said which account, in writing |
| Profile live with Bio A, category, and `/links` | A paid visitor who taps the name must land on a finished profile | You can see it logged out |
| Facebook Page live and connected | Instagram ads need the Page | Business settings shows the Page and @build_view360 |
| Contact form tested | The conversion is an email, not a pixel event alone | A test submission arrived at the sales inbox |
| Pixel ID in Vercel, events in Test events | The site already has the code. It does nothing without the ID | `PageView` and `ViewContent` after accepting cookies |
| `Lead` and `BookDemo` seen on a test form | Otherwise you would optimise toward traffic | Test events shows both, from one submission |
| Conversions API token set and deduplicated | Browser events miss people who decline cookies or block the pixel. Server events recover some of that. They must share the event ID or you will double-count | Test events shows one `Lead` with browser and server, not two people |
| Spending limit agreed | A new ad account can spend faster than a founder expects | A number finance has approved, set on the account |
| Legal name ready if Meta asks | A restricted ad account mid-test wastes the creative | You know who would submit GST or incorporation papers |

`buildview.io` is not part of this setup. Sending ads there would pay for a lander that is not the product.

## Account structure, when you are allowed to build it

Create it in Ads Manager. Leave campaigns in draft.

**Campaign.** Objective: Leads. Name: `2026-12 BuildView demo — website leads`. Special ad category: none, unless counsel tells you a housing campaign needs the housing category. BuildView is selling software to businesses, not advertising a housing offer. Do not put “BHK” or a home for sale in the ad. Buying type: auction. Campaign spending limit: the monthly number you approved.

**Ad set.** Conversion location: Website. Pixel: BuildView website. Event: `Lead`. `BookDemo` is a custom event and is the number you read in reports. Optimise delivery to `Lead` until `BookDemo` has enough volume to be a stable target. Meta’s own documentation should be checked on the day you publish, because the minimum conversions for a custom event change.

Daily budget for a first test: decide with finance. A sensible reading test is large enough to leave one ad set for seven days, and small enough that a wrong audience is not expensive. Do not start with three audiences. You will not know which change caused the result.

**Audience, one ad set only.**

- Location: Thane, Navi Mumbai, and Mumbai. People living in or recently in this area. Do not target all of India on the first test. The follow-up is local and the office is in Thane.
- Age: 27 to 55. This is a judgment about who holds a project role, not a measured insight.
- Include people interested in construction, real-estate development, architecture, or civil engineering, if those interests are offered. Exclude nothing aggressively on day one except categories that are obviously wrong if you see them in the list, such as interior-design shopping.
- Do not use a lookalike. There is no customer list to seed one. Do not upload a bought list.
- Placements: Advantage+ placements is acceptable only if you check the preview in Feed, Stories, and Reels. If the crop fails, switch to those three manual placements.

**Ad.** One ad, two copies at most, so the test stays readable.

- Send to `https://buildview-tawny.vercel.app/contact?utm_source=instagram&utm_medium=paid&utm_campaign=buildview_demo&utm_content=lead`
- Primary text, option A:

  See the construction project without chasing another update.

  BuildView is monitoring software for developers, architects, contractors and PMCs. 360° site tours, progress reports, documents and issue tracking, with access by role.

  Book a live demo.

- Primary text, option B:

  A 360° site tour is useful when it stays with the project.

  BuildView keeps the tour, the progress record, the files and the issues in one workspace. Built for project teams in Mumbai, Navi Mumbai and Thane.

  Book a demo.

- Headline: `Book a construction demo`
- Description: `Tours, reports, documents, issues`
- Call to action button: **Sign up** or **Learn more**, whichever Meta offers that best matches a demo. Do not use “Get quote”.

Creative: the Day 19 carousel, exported, or a 20-second cut of the Day 22 Reel. Same brand rules. No interior footage. No client name.

## Tracking checklist before the first rupee

1. Private window, accept cookies, open `/contact`. Test events shows `PageView` and `ViewContent`.
2. Submit the form as a demo request with a company email you control. The sales inbox receives it. Test events shows `Contact`, `Lead`, and `BookDemo`.
3. Decline cookies in a second browser and submit nothing. Confirm the pixel does not fire. That is correct. Do not “fix” it.
4. With the Conversions API token deployed, repeat one submission and confirm deduplication.
5. Open the ad preview destination and check the UTM arrives on `/contact`.
6. Confirm the scheduler email, if you use it, is watched. A Calendly booking may not fire `BookDemo` by itself. The form is the event you are buying.

UTM convention for paid, separate from organic so the sheet can tell them apart:

`utm_source=instagram` or `facebook`, `utm_medium=paid`, `utm_campaign=buildview_demo`, `utm_content` set to the ad name.

## What not to run

- A traffic campaign to the home page. It will look cheaper and it will not produce a brief.
- A lead form that stays inside Instagram, until someone owns that export every day. The website form is the record.
- An engagement campaign to grow followers. That is the opposite of this pack’s aim.
- Retargeting. The audience is too small and the pixel is not yet proven. Revisit after the pixel has been collecting consented traffic for a few weeks.
- Any ad that mentions a saving, a client, AI, or “India’s leading”.

## How to read the test

Run one ad set for seven full days before you judge it, unless the spend is clearly buying the wrong people (interior enquiries, students, job seekers). Then stop, do not “optimise” by adding interests.

A useful result: form submissions that name a company, a role, and a project, at a cost finance accepts.

A weak result: cheap clicks, profile follows, and messages asking for a home interior. In that case the creative or the interest targeting is wrong. Fix the message before you raise the budget.

Review `BookDemo` next to the inbox. If the pixel says ten leads and the inbox has two emails, believe the inbox and fix the event before you spend more.

## Approval to publish

The person who can spend, and the person who answers the inbox, both have to say yes on the same day. An ad that runs into an unattended inbox breaks the one-business-day promise on the website.

This document does not authorise that yes.
