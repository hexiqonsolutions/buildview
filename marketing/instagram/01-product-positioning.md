# BuildView product positioning

Audit date: 8 November 2026.

Sources inspected:

- Live application: https://buildview-tawny.vercel.app/ (home, about, services, projects, contact, link-in-bio, and sign-in all returned the BuildView product).
- Public Instagram profiles: https://www.instagram.com/build_view360/ and the account the website currently links, https://www.instagram.com/buildview.360/.
- Application repository: the Next.js product in this repo (`README.md`, marketing pages, admin and client routes, roles, and integrations).

Signed-in dashboards were not opened. Production login was not available for this audit, so authenticated behaviour is classified from the implemented application, not from a live click-through of a client project.

Nothing in this pack was published, and no Instagram, Meta, or application setting was changed.

## What BuildView is

BuildView is a construction monitoring and documentation platform for developers, architects, contractors, project management consultants, and project owners.

The public product promise, already on the live site, is: see what is happening on site without chasing updates. The platform brings 360° site tours, progress reports, documents, issue tracking, and project timelines into one workspace, with a role-based client portal.

It is not a generic 360° photography studio, an interior-design lead page, or a general project-management suite with a camera attached. Capture hardware is part of delivery. The product being marketed is the software workspace.

## How the product actually works

BuildView staff operate an admin console. Client organisations use a separate portal. A public marketing site sits in front of both.

360° tours are published as Matterport links. Super Admin and Admin can add those links. The live site names Insta360 as the capture hardware used to document sites. The software does not itself scan a site, and it should not be advertised as if the camera, the scan processing, and the platform are one automated product.

A project can carry tours, site images, a timeline, reports, a document library, issues, team members, and comments. Construction projects can also carry buildings, floors, and a progression view for the roles allowed to see it. Some client organisations use a portfolio-style project view for walkthroughs and media, without the construction progression report.

## Value proposition

**For the buyer:** one place to see a construction project remotely, with a dated visual record and the documents and issues that explain it.

**For the operator:** BuildView’s team can publish tours, reports, photos, files, and timeline updates instead of sending them through separate chats and email threads.

**Differentiator that is safe to say:** visual site records, progress documentation, issues, and project files are organised in the same construction workspace, and each person sees only what their role allows.

Do not claim measured outcomes. There are no approved client results, time savings, or project counts to publish.

## Who it is for

The live site already names the buyers. Use these, and only these, as audiences:

- Developers who need portfolio visibility across projects.
- Architects who need to review execution and drawings remotely.
- Contractors who need reporting, documentation, and a shared record.
- Project management consultants who track milestones, quality, and issue resolution.
- Project owners who want to stay informed without being on site every day.
- Consultants who need evidence for reviews and decisions.

## Positioning statement

BuildView is the construction monitoring platform that gives project teams a shared visual record of the site, together with the reports, documents, timeline, and issues needed to make the next decision.

Supporting line already used on the product: “See every construction project. Make every decision faster.”

Use that line. Do not replace it with a photography or interior-design slogan.

## Proof we can use

Safe:

- The product’s own screens, recorded from a demo or a project BuildView has permission to show.
- The module names on the live site: virtual tours, compare progress, progress reports, document hub, issue tracking, project timeline, client dashboard.
- The operating model already published: capture, monitor, review, deliver.
- The office and contact details published on the site: Lok Upvan Phase 2, Thane, Maharashtra; buildviewsales@gmail.com; the two published phone numbers.
- Insta360 named as capture hardware, which is how the site already describes it. Do not call Insta360 a customer or an investor.

Not safe:

- Named clients, project photographs presented as customer work, testimonials, follower counts as social proof, or performance statistics.
- Inactive names present in the codebase but switched off on the site (Autodesk, Procore, Trimble, Ricoh, Bentley). They are not partners.
- The interior advertisement visible on @buildview.360. That creative talks about home interiors, BHK layouts, and a quote. It does not represent this software.
- https://buildview.io/ — it responds, then sends visitors to a nearly empty `/lander`. It is not the BuildView application. Do not put it in the Instagram bio.

## Feature classification

“Implemented” means the route, data model, and interface exist in the application. It does not mean every production workflow was clicked end to end in this audit. “Incomplete” means the capability exists but is limited, environment-dependent, or not confirmed in production. “Do not advertise” means it is absent, internal-only, or not safe to claim.

### 1. Implemented

| Capability | What is actually there | How to talk about it |
|---|---|---|
| Public site | Home, About, Services, Projects, Contact, privacy, terms, cookies, and `/links` | Send Instagram traffic to `/links`, then to Contact |
| Demo request | Contact form with interest types, including “Request a Live Demo”. Contact page also renders a scheduler | Primary conversion is “Book a demo” |
| Sign-in | Email and password, Google sign-in, password reset. New accounts start as a client until staff assign a role | Mention a client login. Do not imply open self-serve onboarding |
| Client portal | Dashboard, project list, project workspace, notifications, profile, support | “Role-based client dashboard” |
| Project workspace | Overview, tours, site images, timeline, reports, documents, team, issues. Invoices only for allowed roles | Describe the modules by these names |
| 360° tours | Matterport viewer, tour list, shareable tour links that can ask a viewer for name, phone, and email | “360° virtual site tours” and “remote walkthroughs” |
| Compare progress | Side-by-side tour comparison and saved comparisons | “Compare site visits by date” |
| Reports | Progress, quality, inspection, and safety reports stored on the project | “Progress and inspection reports” |
| Timeline | Dated project events, including site photos | “A dated project history” |
| Documents | Folders and categories for drawings, BOQs, contracts, approvals, technical documents, and other files | “One project document library” |
| Issues | Create, assign, locate, and move status. Photo-backed observations are supported | “Capture and track site observations” |
| Comments | Project discussion and replies for roles that are allowed to comment | “Project comments”, not a live chat product |
| Buildings and floors | Staff can structure a project by building and floor | “Floor-by-floor organisation” |
| Users and roles | Staff: Super Admin, Admin, Operations Manager. Client side: Client Admin, Site Supervisor, Site Engineer, Client, Client User, Read-only Client, Consultant | “Each stakeholder sees the right project information” |
| Client companies | Staff client manager, including the ability to suspend a client | Internal. Do not feature suspension in ads |
| Notifications | In-app notifications, with optional email | “Updates inside the platform” |
| Staff console | Projects, uploads, tours, timeline, reports, documents, photos, issues, invoices, users, tour viewers, analytics, storage, activity, settings | This is how BuildView operates the product. It is not the customer advertisement |
| Link-in-bio page | `/links` already routes to demo, services, tours, and contact, with Instagram campaign parameters | Use this as the Instagram website field |

### 2. Implemented, but incomplete or conditional

| Capability | Limit | Marketing rule |
|---|---|---|
| Structured progression checklist | A floor-by-floor progression report exists for staff, Client Admin, Site Supervisor, and Site Engineer. Other viewers do not see it. A later pre-slab / post-slab revision was still unapplied in the engineering notes of 21 October 2026 | Say “progress tracking and timelines”. Do not promise a pre-slab / post-slab checklist until production is confirmed |
| Contact email delivery | The form sends mail only when Resend and the contact inbox are configured. Otherwise the visitor is told to email directly | Send one test enquiry before spending on ads |
| Scheduler | The live contact page shows “Schedule a live walkthrough”, so a scheduler URL is configured | Keep “Book a demo” pointed at `/contact` |
| Meta Pixel and Conversions API | The code exists and loads only after cookie consent, and only if the pixel ID is set. The server event route exists. This audit did not confirm the production ID or token | Do not tell Meta the pixel is live until Events Manager shows test events |
| WhatsApp alerts inside the product | Twilio templates are coded for critical issues, invoices, and project removal. They send only when Twilio credentials exist | This is an alert channel, not the sales WhatsApp inbox |
| Report digest labelled in code as an AI summary | It is a rule-based digest of reports, issues, and timeline items already stored on the project. It is not a generative model | Do not advertise AI, predictions, or automatic insights |
| Portfolio projects | Some projects are presented as walkthroughs and media, without construction progression | Do not turn the brand into real-estate photography or interior sales |
| Operations Manager | Same staff console as Admin, except virtual-tour upload | Do not say every staff role publishes tours |
| Custom domain | The live product is the Vercel URL. `buildview.io` does not serve this application | Bio and ads use the Vercel URL until a real domain is pointed at this app |
| Instagram link on the website | The site and `site-config` point to @buildview.360, not the new @build_view360 | Leave the site unchanged until you approve one canonical account |

### 3. Do not advertise

- Native site scanning inside the app, drone capture, LiDAR, BIM coordination, IoT sensors, or live CCTV.
- Automatic report writing, cost control, scheduling, procurement, or a full construction ERP.
- A public client directory, case studies, or “trusted by” logos. The site’s trust line lists professions, not customers.
- Invoices as a customer benefit. They are a billing view for Client Admin and staff.
- A built-in CRM, WhatsApp sales bot, or Meta inbox inside BuildView.
- Partnerships with Autodesk, Procore, Trimble, Ricoh, or Bentley.
- Any claim that every listed module has been re-tested in production on 8 November 2026.

## Message hierarchy

1. Construction monitoring and documentation platform.
2. Remote visibility through 360° site tours.
3. Progress, reports, documents, timeline, and issues in the same project.
4. Role-based access for the people who need to decide.
5. Book a demo.

Every Instagram caption should be able to survive this test: a developer, architect, contractor, or PMC can tell what the software does, and a homeowner looking for an interior quote cannot mistake the post for that offer.
