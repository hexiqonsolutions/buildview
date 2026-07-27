# Dashboard (Client Portal) — overrides

> Overrides `design-system/buildview/MASTER.md` for `/dashboard/*`.

## Intent

Dense executive monitoring surface. Glass shell + industrial slate + BuildView lime accents. No marketing hero clutter.

## Rules

- **Accent:** `#A4CF30` (`brand-accent`) only — never orange CTAs
- **Typography:** Poppins display / Open Sans body (via `--font-display` / `--font-inter`)
- **Density:** Compact KPI grids (`gap-3`–`gap-4`), page rhythm `space-y-6`
- **Surfaces:** `.intel-card` / `.intel-hero-strip` with soft shadow + light blur
- **Nav:** Active item dark pill + lime accent bar (`.intel-nav-item-active`)
- **Motion:** 150–220ms ease-out; respect `prefers-reduced-motion` (shell skips Framer page transitions)
- **Cards:** Project / metric / quick-action cards use lift hover (`-translate-y-0.5`) without layout shift on press

## Do not

- Add purple gradients, cream editorial layouts, or orange safety CTAs
- Stack secondary marketing widgets in the first viewport of the overview
- Use emoji as icons
