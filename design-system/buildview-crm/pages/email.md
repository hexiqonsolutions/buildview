# Email Page Overrides

> **PROJECT:** BuildView CRM  
> Module 4 — Email (Gmail). Brand orange/black OLED wins over generic inbox blue.

---

## Intent

Three-pane sales email workspace: folder nav (Inbox / Sent / Drafts / Scheduled / Templates / Campaigns), message list, reader + compose dialog. Soft elevated panels, dense list rows, Lucide icons only.

---

## Layout

1. Connect Gmail banner when no account
2. Left rail — folders + templates/campaigns
3. Center — message list (subject, snippet, time)
4. Right / dialog — reader or compose (TipTap rich text)
5. Personalization chips: `{{Name}}` `{{Company}}` `{{Project}}`

---

## Motion

- Folder active state orange wash
- List row hover 150–200ms (no layout shift)
- Compose dialog focus trap (Radix)

---

## Rules

- User always reviews before Send (no auto-send)
- AI controls deferred to Module 5
- Empty states with Connect / Compose CTAs
