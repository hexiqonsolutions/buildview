# Meta Business setup

This is a manual runbook. None of these settings were changed. You must be logged into the Facebook and Instagram accounts that will own BuildView. Where a label differs on your screen, use the closest item with the same job. Meta moves menu names; the order of decisions below should stay the same.

Do this only for the account you approve as canonical. The steps assume that account is **@build_view360**. If you choose @buildview.360 instead, substitute that login and do not connect both as if they were two brands.

## What “ready” means

Ready means a buyer can message one business identity, an ad account can be funded later without borrowing a personal page, and the existing website events can be recognised. It does not mean ads are running.

## 1. Meta Business Portfolio

1. Open https://business.facebook.com in Chrome while logged into the Facebook profile that should own the business.
2. If you already have a portfolio for this company, open it. Do not create a second one.
3. If you do not: choose **Create a portfolio** (older screens say Create account or Create Business Manager).
4. Portfolio name: `BuildView`.
5. Your name and work email: use buildviewsales@gmail.com only if that inbox is one the company controls. Prefer a named admin who can receive the verification email.
6. Business details, when asked:
   - Legal business name: the registered name, not a slogan. If you have not confirmed the legal name, leave the public Page name as BuildView and do not submit verification yet.
   - Address: Lok Upvan Phase 2, Thane, Maharashtra, India.
   - Website: `https://buildview-tawny.vercel.app/` until a domain points at this application. Do not enter `https://buildview.io`.
   - Phone: +91 86552 24990.

Purpose: one container for the Page, Instagram, WhatsApp, pixel, and ad account, so they are not stuck on a personal profile if someone leaves.

## 2. Security and people

1. In the portfolio, open **Settings** (gear) → **People** → **Add people**, or **Business settings → Users → People**.
2. Add only people who will administer the Page or ads. Role: **Full control** for one owner, **Partial access** for anyone who only answers messages.
3. Turn on two-factor authentication for every admin. Facebook path: profile menu → **Settings and privacy → Settings → Accounts Center → Password and security → Two-factor authentication**.
4. Do not share the Instagram password. Use separate invites.
5. Remove any test or agency user you do not recognise before you add a payment method.

Purpose: the portfolio is the asset. A shared password is how a business loses the Page.

## 3. Facebook Page

No BuildView Facebook Page is linked from the website. Create one if you do not already have it. If a personal or old interior Page exists, do not rename that Page into BuildView without checking what is already posted on it.

1. https://www.facebook.com/pages/create or, inside the portfolio, **Settings → Accounts → Pages → Add → Create a new Page**.
2. Page name: `BuildView`.
3. Category: **Software Company**.
4. Bio, within the Page’s limit. Use this:

   BuildView is construction monitoring software for developers, architects, contractors and PMCs. 360° site tours, progress reports, documents, timelines and issue tracking. Book a demo.

5. Website: the same `/links` URL as the Instagram profile, with `utm_source=facebook&utm_medium=social&utm_campaign=buildview_facebook&utm_content=page`.
6. Email: buildviewsales@gmail.com.
7. Phone: +91 86552 24990.
8. Address: the Thane office. Set the service area only if Facebook asks, and describe Mumbai, Navi Mumbai, and Thane as the area you talk to, not as extra offices.
9. Profile photo: the current Instagram mark. Cover: the flat wordmark from `db-logo.png` on `#050505`, with the line “Construction monitoring and documentation” in white. Do not design a new logo.
10. Button: **Sign up** or **Contact us**, linked to `https://buildview-tawny.vercel.app/contact`. If “Book now” is offered and can open that contact page, use it. If it only opens a Facebook appointment form you will not check, do not use it.
11. Publish the Page only when the photo, category, and bio are in place. An empty Page looks unfinished next to the new Instagram grid.

Purpose: Instagram action buttons, ads, and WhatsApp connection all expect a Page. The Page is also where a buyer checks that the company is real.

## 4. Connect Instagram

1. On the phone, in @build_view360: **Settings and activity → Account type and tools → Switch to professional account → Business**.
2. Category: Software Company.
3. When asked to connect a Page, choose the BuildView Page from step 3. Do not connect a personal Page.
4. Confirm on desktop: https://business.facebook.com → **Settings → Accounts → Instagram accounts → Connect account**. Log into @build_view360.
5. Assign yourself access to that Instagram account inside the same People screen.

If Instagram says the account is already connected to another portfolio, stop. That usually means the other handle or an old personal connection. Do not force it from a second Facebook profile.

Purpose: messages, ads, and the Page then share one identity. A professional account that is not connected cannot use the portfolio inbox or the pixel you already built into the site.

## 5. Business verification readiness

Do not start verification until the documents are in hand. A failed attempt slows the next one.

Path: portfolio **Settings → Business info**, then **Security Center → Start verification** (wording varies). Meta typically asks for:

- Legal name matching a government or tax document.
- Address matching that document.
- Phone or email Meta can reach.
- A document such as a GST certificate, incorporation certificate, or utility bill.
- A website that represents the business.

Gaps to close first:

| Gap | Why it blocks trust | What you need to decide |
|---|---|---|
| Legal name not in this pack | The Page name “BuildView” may not match the GST or incorporation record | Send the registered name |
| `buildview.io` is not the app | Verifying the wrong site does not prove you operate the product | Point a domain you control at the Vercel app, or verify against the Vercel URL only if Meta accepts it |
| Sales inbox is Gmail | Acceptable for now, weaker for a verification reviewer | Optional later: a company-domain mailbox |
| Two Instagram accounts | A reviewer, and a buyer, cannot tell which is the business | Pick the canonical account first |

You can finish the Page, Instagram connection, and inbox before verification. You should not rely on restricted ad features until verification is complete.

## 6. WhatsApp Business

The product’s Twilio WhatsApp is a separate alert channel for events such as a critical issue. It is not the sales conversation. Do not paste Twilio credentials into Meta, and do not advertise Twilio alerts as a customer feature.

Sales WhatsApp:

1. On the phone that will answer leads, use **WhatsApp Business** (the business app), not the personal WhatsApp, for +91 86552 24990 — after you confirm that number should be the sales line.
2. Profile name: `BuildView`.
3. Category: Software Company.
4. Description: the recommended Instagram bio, shortened if needed.
5. Website: the `/links` URL.
6. Address: Thane office.
7. Hours: set the hours a person actually replies. Do not show “always open” if nobody is.
8. In the Meta portfolio: **Settings → Accounts → WhatsApp accounts → Add**. Follow the prompts to connect that Business number. You will need the phone in your hand for the code.
9. Then in Instagram: **Edit profile → Action buttons → WhatsApp**, and connect the same number.

If that phone number is already on personal WhatsApp, moving it to WhatsApp Business changes the app on the phone. Do this deliberately, not from the runbook alone.

Purpose: the secondary CTA has a named business identity, greeting, and away message, and it can sit in the same inbox as Instagram.

## 7. Meta Business Suite and the inbox

1. Open https://business.facebook.com/latest/inbox or the **Inbox** item in Business Suite.
2. Select the BuildView Page and confirm the connected Instagram account is listed. If it is missing, repeat step 4.
3. Open **All messages** and check filters for Facebook, Instagram, and WhatsApp.
4. Send yourself one Instagram DM and one WhatsApp message from another phone. Confirm both appear.
5. Assign a person to the inbox. Unassigned demo requests are lost enquiries, not “leads to get to later”.

Purpose: one place to answer the welcome DM, the demo request, and WhatsApp, with the scripts in `10-lead-generation-automation.md`.

## 8. Automated messaging

Set these only after the scripts in `10-lead-generation-automation.md` are approved. Paste the words from that file so the voice stays the same.

Instagram, in the professional dashboard or Business Suite:

1. **Inbox → Automations**, or Instagram **Settings → Business → Saved replies** and **Instant reply**.
2. Turn on an **instant reply** for new Instagram messages. Use the welcome DM. It must say a person will follow up. It must not pretend a meeting is already booked.
3. Create **saved replies** for: demo request, qualification questions, “send me details”, and a polite no-fit.
4. Do not turn on a long keyword bot. A B2B buyer should reach a person within one business day, which is the promise already on the contact form.

WhatsApp Business app:

1. **Settings → Business tools → Greeting message.** Use the WhatsApp welcome.
2. **Away message.** Use it outside the hours you set. Say when you will reply.
3. **Quick replies** for the same four situations.

Purpose: the first reply can be immediate without sounding like a call centre, and the second reply is from a person who can qualify the project.

## 9. Ad account

Create it so it exists. Do not run ads from this setup.

1. **Settings → Accounts → Ad accounts → Add → Create a new ad account.**
2. Name: `BuildView — India`.
3. Time zone: Asia/Kolkata. Currency: INR. These are difficult to change later.
4. Assign only the people who may see spend.
5. Do not add a payment method until `11-meta-ads-readiness.md` is approved and a test enquiry has arrived from the website form.

Purpose: the pixel and the Page need an ad account before you can verify events. Creating it is not the same as advertising.

## 10. Payment

When you are ready to fund tests, not before:

1. **Billing and payments** or **Payment settings** inside the portfolio.
2. Add a company card or the payment method finance will reconcile. Avoid a personal card that nobody else can access.
3. Set an account spending limit for the first month before any campaign is published.
4. Business name and tax information should match the legal entity you intend to verify.

## 11. Meta Pixel — use the one already in the product

The application already loads a Meta Pixel after the visitor accepts cookies, and only if `NEXT_PUBLIC_META_PIXEL_ID` is set. It also has a server route for the Conversions API. Do not paste Meta’s JavaScript into the site again. A second snippet double-counts and fights the cookie banner.

1. https://business.facebook.com/events_manager → **Connect data → Web → Meta Pixel**.
2. Name: `BuildView website`.
3. Enter the site `https://buildview-tawny.vercel.app/`.
4. When Meta offers a partner or a code install, choose **Set up manually** only to copy the **Pixel ID**. Close the code sample. Do not email that code to a developer to paste into the layout. The layout is already built.
5. In the Vercel project that serves this site, set `NEXT_PUBLIC_META_PIXEL_ID` to that ID. Redeploy.
6. Open the site in a private window, accept cookies, and go to Events Manager → **Test events**. Browse Home, Services, and Contact. You should see `PageView` and `ViewContent`.
7. Submit a real test of the contact form with interest “Request a Live Demo”, using an internal email. You should see `Contact`, `Lead`, and the custom event `BookDemo`. `CtaClick` fires from tracked buttons. Sign-up is `CompleteRegistration` if you test registration.
8. If Test events stays empty, the environment variable is missing or the deploy did not pick it up. Do not add a second pixel to “fix” it.

The cookie banner is correct behaviour. A visitor who declines will not fire the pixel. Do not remove the banner to make ads easier.

## 12. Conversions API

Feasible. The route is `src/app/api/analytics/meta/route.ts`, and the browser events already try to share an event ID with the server so Meta can deduplicate.

1. Events Manager → the BuildView pixel → **Settings → Conversions API → Generate access token**.
2. In Vercel, set `META_CAPI_ACCESS_TOKEN` to that token. Optional: `META_CAPI_TEST_EVENT_CODE` while testing.
3. Redeploy. Repeat the test enquiry.
4. In Test events, confirm browser and server copies of `Lead` share an event ID rather than appearing as two people.
5. Remove the test-event code from production when the test looks right, or every live event stays marked as a test.

If the token is not set, the site still works. Browser events after consent are the fallback. Say “CAPI is not confirmed” until the server event appears. This audit did not see production credentials and does not claim they are set.

## 13. Website conversion tracking

Track these, and nothing vanity-adjacent, as the optimisation events:

| Event | When it fires in this product | Use it for |
|---|---|---|
| `PageView` | Cookie-accepted page load | Delivery check only |
| `ViewContent` | Home is not required; services, contact, and the Instagram landing page already send a content view | Learning what they opened |
| `CtaClick` | Tracked buttons, including Book Demo | Optional. Easy to inflate |
| `Contact` | Successful contact form | Secondary optimisation |
| `Lead` | Successful contact form | Primary optimisation once volume exists |
| `BookDemo` | Successful form when interest is the demo option | The business outcome. Custom event, so report on it even if you optimise delivery to `Lead` |
| `CompleteRegistration` | Account registration | Not the sales goal. Do not optimise ads toward sign-ups |

The contact form is the lead record today. It emails the configured inbox. It does not write to a CRM. Test one submission and confirm the email arrives before any ad points at `/contact`.

Scheduler bookings on the contact page are not, by themselves, a `BookDemo` event unless the person also submits the form or Calendly is connected to Meta. Until that is confirmed, ask demo visitors to submit the form as well, or check the scheduler’s own notification email every day.

UTM parameters already in the app:

- Profile: `utm_campaign=buildview_profile`
- Reels: `buildview_reels`
- Carousels: `buildview_carousel`
- Stories: `buildview_stories`
- Facebook: `buildview_facebook`

Read them in whatever analytics property is actually receiving traffic. GA loads only after cookie consent and only if `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set. If you do not see UTMs, check that ID the same way as the pixel. Do not install a third analytics tool for this launch.

## 14. Lead generation

For the first month, leads should land on the website form, not in a Facebook instant form.

Reason: the form already asks for name, work email, company, interest, and project context, and it matches the privacy policy. An in-platform form creates a second list that nobody has agreed to check. Add a Meta instant form later only if you have a person and a sheet or CRM ready the same day.

Path, when you do create ads later:

1. Ads Manager → campaign objective **Leads** or **Traffic**. Prefer **Leads** with the website as the conversion location, optimising for `Lead`, once test events are visible.
2. Destination: `https://buildview-tawny.vercel.app/contact?utm_source=instagram&utm_medium=paid&utm_campaign=buildview_demo&utm_content=lead`.
3. Do not publish. Readiness criteria are in `11-meta-ads-readiness.md`.

## Order of work

1. Choose the canonical Instagram account.
2. Create or confirm the portfolio and the Page.
3. Switch Instagram to Business and connect the Page.
4. Paste the approved profile copy.
5. Confirm the sales WhatsApp number, then connect it.
6. Send the test DM, test WhatsApp, and test contact form.
7. Create the pixel, set the Vercel ID, and confirm test events.
8. Add the Conversions API token and confirm deduplicated `Lead`.
9. Only then discuss a payment method and a small campaign.
