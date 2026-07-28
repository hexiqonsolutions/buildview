# Dashboard (Client Portal) — overrides

> Overrides `design-system/buildview/MASTER.md` for `/dashboard/*`.

## Intent

**Minimal, modern, useful** — one chrome system across every client dashboard route.
Clean white surfaces, slate hierarchy, BuildView lime accents only.

## Rules

- **Page chrome:** Every non-home route uses `IntelPage` (icon + title + optional eyebrow/actions/back)
- **Home:** `intel-hero-strip` welcome (construction + portfolio) + content below — not a second design system
- **Surfaces:** `.intel-card` only (aliases: `portal-card`, legacy empties, compare cards). No `ops-card` in client portal
- **Accent:** `#A4CF30` (`brand-accent`) — never violet/orange CTAs
- **Typography:** Poppins display / Open Sans body
- **Density:** Standard–dense (`space-y-6`, card `p-4`–`p-6`)
- **Motion:** Subtle (150–220ms); no hover translate; respect reduced-motion
- **Empty/loading:** Design-system / legacy empties both render as `intel-card`; loading mimics `intel-hero-strip`

## Do not

- Mix admin `ops-card` into client routes
- Use purple/violet accent panels
- Add decorative mesh/blur clutter on the shell
- Use emoji as icons
- Force “Executive Overview” eyebrow on unrelated pages
