# Implementation checklist

Audit and writing completed 8 November 2026. No Instagram profile, Facebook Page, pixel, form, or advertisement was changed.

The files in `marketing/instagram/` are the deliverable. The application code was not modified.

## What has been completed

- The live site was opened: home, about, services, projects, contact, `/links`, and sign-in. The product title and the demo form match this pack.
- Both public Instagram profiles were opened. @build_view360 is empty apart from the logo and the name “Buildview”. @buildview.360 is the account the website links to. It has followers, a misspelled display name, and a visible interior advertisement.
- `buildview.io` was checked. It does not serve this application.
- The repository was used to separate live modules from conditional ones and from things that must not be claimed. Detail is in `01-product-positioning.md`. Signed-in production projects were not clicked. That limit is stated in the positioning file.
- Profile copy, three bios, the recommended bio, SEO, Meta setup steps, the funnel, the 30-day calendar, visual rules, inbox scripts, and ad gates are written in the numbered files.
- The bio and display-name character counts were checked against Instagram’s 150- and 30-character limits.

## What requires your manual action

These need your logins. The steps are written so someone can follow them. They are not done.

1. Choose the canonical account. See the decision in the audit.
2. Switch @build_view360 to a business account, if it is not one already, and set the category to Software Company.
3. Paste the display name, Bio A, email, sales phone, Thane location, and the `/links` URL.
4. Leave the current profile photo unless you approve a flatter export.
5. Create or claim the Facebook Page, then connect the Instagram account inside the Meta portfolio.
6. Turn on two-factor authentication for every admin.
7. Confirm whether +91 86552 24990 should become WhatsApp Business. Only then add the button and the greeting.
8. Send a test Instagram DM, a test WhatsApp if connected, and a test contact-form submission. Confirm the email arrives.
9. Create the pixel in Events Manager, put only the ID into `NEXT_PUBLIC_META_PIXEL_ID`, redeploy, and watch Test events. Then add `META_CAPI_ACCESS_TOKEN` and confirm one deduplicated `Lead`.
10. Create the ad account in INR and Asia/Kolkata, without a campaign and without a card, until the ads file is approved.
11. Build the highlight covers and the first nine grid assets from the visual rules. Do not publish them until the profile text is live.
12. Start the calendar only after that. Post as the calendar is written, including the alt text.
13. Add the saved replies and the lead sheet. Name the person who checks the inbox each morning.

## What needs your approval

- Which Instagram account is the company account. This blocks the website change, the ads, and the first post.
- Bio A, or a switch to Bio B or Bio C.
- The display name `BuildView | Construction Tech`.
- Any username change to `buildview360`.
- Updating `src/lib/site-config.ts` and the live footer so they stop linking to the wrong handle. That is an application change and was intentionally not made.
- The WhatsApp number, and moving it off personal WhatsApp if that is what the move requires.
- Screen recordings of a real or demo project, before any Reel is exported.
- The 30-day calendar as the thing you will actually post.
- A monthly ad limit and permission to leave draft mode. The ads file does not grant it.
- A CRM, later. The sheet is the default.

## What needs additional information

- Whether you control the login for @buildview.360.
- The registered legal name, and whether a GST or incorporation document is available for Meta verification.
- The hours a person really answers the phone and WhatsApp.
- Confirmation that the sales inbox receives contact-form mail in production.
- Confirmation that the scheduler on `/contact` notifies a named person. A booking there may not fire the `BookDemo` event.
- Whether a domain you control will be pointed at this Vercel project. Until then, public links stay on `buildview-tawny.vercel.app`.
- Whether production is running the latest progression checklist. Until you confirm it, public copy stays at “progress reports and timelines”.
- Which project, if any, may be shown on camera.

## What is ready for launch

Ready means the words and the sequence exist. It does not mean the profile is finished.

| Ready now | Not ready |
|---|---|
| Positioning that matches the software | The Instagram profile itself |
| Bio, name, links, and button plan | Posts and Reels |
| SEO phrases, hashtag sets, alt-text habit | Highlights, until you design and upload the frames |
| Meta click-path | Portfolio, Page, pixel, and WhatsApp, until you complete them |
| Funnel into `/links` and `/contact` | Paid spend |
| 30 days of posts, stories, captions, and CTAs | A claim of client results |
| Inbox scripts and the lead sheet structure | A CRM connection |
| Ad structure, held in draft by policy | Any published campaign |

The first day you can call the profile launched is the day a logged-out visitor sees the approved name, Bio A, the `/links` button, and at least the first grid post, and a test message receives the human reply the same day.
