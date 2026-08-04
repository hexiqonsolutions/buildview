# Leads Page Overrides

> **PROJECT:** BuildView CRM  
> Overrides `MASTER.md` for Module 3 — Lead Management.

---

## Intent

Dense CRM lead workspace: searchable table, advanced filters, create/edit dialogs, bulk actions, CSV/Excel import & export. Soft OLED cards + orange accents. No bounce motion on table rows.

---

## Layout

1. **Topbar** — Leads + count
2. **Toolbar** — Search, filters toggle, Add Lead, Import, Export, bulk bar when selected
3. **Filter strip** — Status, Priority, Source, Industry, Owner (collapsible)
4. **Data table** — horizontal scroll on mobile; checkbox + key columns; row click → detail sheet
5. **Dialogs** — Create / Edit lead (large form, sections)
6. **Sheet** — Lead detail (notes, tags, follow-up, documents count)

---

## Table columns (default)

Company · Contact · Email · Phone · Status · Priority · Source · Expected Revenue · Next Follow-up · Owner

---

## Motion

- Toolbar / filter fade only (150–250ms)
- No overshoot on rows
- Dialog/sheet use Radix focus trap

---

## Empty / no results

- Empty org: “Add your first construction lead” + Add Lead CTA
- No filter match: “No leads match — clear filters or try another search”
