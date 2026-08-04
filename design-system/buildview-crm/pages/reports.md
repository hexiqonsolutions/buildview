# Reports Page Overrides

> **PROJECT:** BuildView CRM  
> Module 9 — Pipeline, conversion, and activity reporting.

---

## Intent

Analytics workspace on OLED black with orange accents. Date-range chips drive all metrics. Funnel/pipeline bars, conversion KPIs, activity mix, and lead trend. Dense but readable; empty states when no data. Brand tokens from MASTER.md (not blue/Inter).

---

## Layout

1. Hero strip + range filters (7d / 30d / 90d / Month / All)  
2. KPI row (leads, won, lost, win rate, pipeline $, won $)  
3. Two-column: Pipeline funnel + Activity mix  
4. Lead & revenue trend for selected range  
5. Source / owner summary tables

---

## Charts

- Funnel-style horizontal bars for pipeline stages  
- Recharts bar for activity types  
- Recharts area for leads/revenue trend  
- Always show numeric labels (a11y)

---

## Checklist

- [ ] Lucide icons only  
- [ ] cursor-pointer on filters  
- [ ] tabular-nums on metrics  
- [ ] Responsive 375 → 1440  
