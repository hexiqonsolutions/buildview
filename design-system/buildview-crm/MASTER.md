# BuildView CRM — Master Design System

> **Brand-locked overrides** applied on top of ui-ux-pro-max Soft UI Evolution + OLED dark recommendations.
> Product constraints (orange / white / black, dark theme, construction CRM) always win over generic SaaS blue/Inter.

---

## Brand

| Token | Value | Notes |
|------|------|------|
| Primary | `#F97316` | Construction orange |
| Primary strong | `#EA580C` | CTA / focus ring |
| On primary | `#0A0A0A` | Text on orange buttons |
| Background | `#0A0A0A` | OLED near-black |
| Surface | `#111111` / `#0F0F0F` | Soft elevated panels |
| Card | `#121212` | Soft UI Evolution depth |
| Foreground | `#FAFAFA` | Primary text |
| Muted | `#A1A1AA` | Secondary text (≥3:1 on dark) |
| Border | `rgba(255,255,255,0.08)` / `#27272A` | Visible on dark |
| Success | `#22C55E` | Won / positive |
| Warning | `#EAB308` | Due soon |
| Destructive | `#DC2626` | Overdue / lost |
| Ring | `#F97316` | Focus |

**Do not use:** purple/indigo SaaS defaults, Inter/Roboto/Arial as display, neon glow stacks, warm cream + terracotta newspaper layouts.

---

## Style

- **Name:** Soft UI Evolution × OLED Dark
- **Density:** High (dashboard) — 8–32px spacing scale
- **Effects:** Soft depth, 1px borders, orange accent washes (not heavy glow)
- **Motion:** Framer Motion stagger 40–80ms; micro 150–300ms; respect `prefers-reduced-motion`
- **Icons:** Lucide only (no emoji icons)
- **Charts:** Recharts — funnel/pipeline bars + area trend

---

## Typography

Keep existing app fonts (already loaded):

- **Display:** Syne (`--font-display`)
- **Body:** IBM Plex Sans (`--font-sans`)

Avoid Inter. KPI numbers use tabular figures via `tabular-nums`.

---

## Layout (App Shell)

- Sidebar + content (existing)
- Dashboard content max readable width ~1400px inside shell
- Large cards, dense grids: 4 KPI → 2 chart columns → lists
- Empty states with short copy + next action (no blank voids)

---

## Anti-patterns

- Excessive decoration / 3D / complex shadows
- Color-only status without text labels
- Frozen UI without skeleton/empty feedback
- Layout-shifting hover scales on KPI cards
