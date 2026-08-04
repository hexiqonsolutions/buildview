# Dashboard Page Overrides

> **PROJECT:** BuildView CRM  
> Overrides `MASTER.md` for Module 2 — Sales Dashboard.

---

## Intent

One dense sales command surface for construction BDMs: KPIs, pipeline funnel, revenue trend, follow-ups, meetings, and activity feed. Soft elevated cards on OLED black with orange accents.

---

## Layout

1. **Topbar** — Dashboard title + org context
2. **KPI row** (4–6 large cards) — Today's Emails, Leads Added, Follow-ups Due, Meetings, Revenue, Open Opportunities
3. **Charts row** — Pipeline funnel (left) + Revenue / leads trend area chart (right)
4. **Lists row** — Upcoming tasks / follow-ups (left) + Recent activities (right)

Max content width: full shell (~1400px). Dense gaps `gap-4` / `gap-5`.

---

## Components

| Block | Pattern |
|------|---------|
| KPI | Large soft card, label (muted), value (display/tabular), delta or helper text |
| Pipeline | Horizontal stage bars or funnel-style bars with count + % labels (a11y text always visible) |
| Trend | Area chart (Recharts), orange fill ~20% opacity, dashed secondary series if needed |
| Follow-ups | Grouped Due Today / Upcoming / Overdue with status chips |
| Activities | Timeline list: icon + title + time + actor |
| Empty | One sentence + muted secondary; never blank white space |

---

## Color (page)

- KPI accent strip / icon tint: orange `#F97316`
- Overdue: `#DC2626`
- Won / positive delta: `#22C55E`
- Pipeline stages: orange gradient (light → strong), not rainbow

---

## Motion

- Stagger KPI grid on mount (`opacity` + `y: 12`, 40–60ms stagger)
- No bounce/overshoot on data tables or dense lists
- Chart draw: gentle fade-in only

---

## Charts (from ui-ux-pro-max)

- **Pipeline:** Funnel / sequential stage bars (3–8 stages), conversion % as text
- **Revenue / leads over time:** Area or line chart; fallback data table for a11y if needed

---

## Empty / loading

- Loading: skeleton pulse cards (>300ms)
- Empty org data: “No leads yet — import or add leads in Module 3” style guidance
