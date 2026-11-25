# Instagram account audit

Audit date: 8 November 2026. Both profiles were opened in the browser while logged out. No setting was changed.

## The account this pack optimises

**@build_view360** — https://www.instagram.com/build_view360/

This is the new account named in the brief. It is the account to build into the B2B profile, after you approve the copy. It is not live as a business profile yet.

| Item | What is public today | Business effect |
|---|---|---|
| Username | `build_view360` | Usable and on-brand. The underscore is slightly harder to say and to search than a continuous name |
| Display name | `Buildview` | Misses every buying keyword. Search for construction monitoring will not find this name |
| Profile photo | Brand mark on a lime circular badge. It matches the file `Instagram Profile picture.png` | Recognisable at small size. It is glossier than the flat mark on the website |
| Bio | None visible | A visitor learns nothing and has no reason to tap through |
| Website | None visible | The profile cannot start the demo funnel |
| Category | Not shown on the logged-out profile | Cannot confirm a professional account without your login |
| Contact buttons | None visible | No email, call, or WhatsApp action |
| Posts | 0 | The grid does not yet explain the product |
| Followers / following | 0 / 0 | Expected for a new account. Do not buy followers |
| Highlights | None | No path for a serious buyer who does not want to watch the feed in order |
| Location | None visible | Thane, the published office, is not attached |

The avatar is the one asset already in place. Everything a buyer needs — what BuildView is, who it is for, and how to book a demo — is missing. That is the right moment to set the profile once, before the first post, so the grid and the bio tell the same story.

## A second account already exists

**@buildview.360** — https://www.instagram.com/buildview.360/

The live website still links here. The repository copy of `src/lib/site-config.ts` now points at @build_view360, and that change is not on the live site until it is deployed.

What was visible without logging in:

- Display name: `Buildview | Constructiom Tech`. “Constructiom” is a typo, so the searchable name is misspelled.
- Bio: “Construction Monitoring & Visibility / 360° Site Tours • Progress • Reports • Issues / Built for Developers, Architects & PMCs / See how BuildView works.”
- About 3,753 followers and 0 following.
- At least one public post. Before the login wall, that post was an interior advertisement: “Home interior…”, “1, 2 & 3 BHK”, and “Get quote today”.
- The same lime mark, on a paler circle.

This matters commercially. The website currently sends interested people to an account whose only public video sells interiors, while the application sells construction monitoring. The account holder has confirmed the followers were paid for. They are not customers, and they are not a reason to keep this as the company profile. Do not quote 3,753 anywhere. Do not reuse the interior video.

## Decision required before anything is pasted

Neither Instagram login has been edited. The company account is @build_view360.

| Option | When it is the right choice | Cost |
|---|---|---|
| A. Make @build_view360 the company account | This is the account to use. It has no paid audience and no interior video | The website link in the repo now points here. Production still shows the old handle until that change is deployed |
| B. Keep @buildview.360 as the company account | Do not. The followers were paid for, the only public video is an interior advertisement from 15 July 2024, and the display name is misspelled | Ads, verification, and sales claims would sit on an inauthentic audience |
| C. Run both | Do not. Two profiles split search and messages | A buyer will not know which one is real |

Recommendation: **use @build_view360.** Leave @buildview.360 alone. Do not post on it, do not advertise it, and do not describe its followers as reach. If you still control that login, the only useful edit is a short bio that says the company account is @build_view360, plus hiding the July 2024 video. Do not buy followers for the new account.

## What “optimised” does not include yet

These items need your login. The steps are in `05-meta-business-setup.md` and the exact profile copy is in `03-profile-optimisation.md`.

- Switch @build_view360 to a professional business account, if it is still personal.
- Category, bio, display name, website, email, phone, WhatsApp, and location.
- Connect it to a Facebook Page and a Meta Business Portfolio.
- Highlights, posts, and automated replies.
- Any username change.

## Audit conclusions

1. @build_view360 is a blank, on-brand shell. The logo is usable. The profile does not yet explain the software or offer a demo.
2. @buildview.360 is about two years old, has one public video from 15 July 2024, and its followers were paid for. It is not the company account.
3. `buildview.io` is not a safe bio link. The application buyers should see is https://buildview-tawny.vercel.app/links.
4. No post, highlight, or ad should go out until the new profile’s name, bio, and link are in place. Do not attach ads to the older account.
