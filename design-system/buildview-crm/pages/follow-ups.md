# Follow-ups Page Overrides

> **PROJECT:** BuildView CRM  
> Module 6 — Follow-ups / reminders.

---

## Intent

Dense task board for construction sales follow-ups: Due Today, Upcoming, Overdue, Done. Status chips use amber/red/emerald on OLED black + orange brand. Empty states with Add reminder CTA.

---

## Automatic reminders

- On authenticated app load, check pending follow-ups due today or overdue
- Toast (3–5s) summarizing counts + link to `/follow-ups`
- Persist `remindedAt` so the same items don't spam every navigation (remind again after 4 hours)

---

## Layout

1. KPI strip: Due today / Upcoming / Overdue counts  
2. Tab filters  
3. List cards with lead, due time, actions (Complete / Edit)  
4. Create/Edit dialog (lead select, title, notes, due datetime)
