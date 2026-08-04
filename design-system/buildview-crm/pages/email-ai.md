# Email AI Assistant Overrides

> **PROJECT:** BuildView CRM  
> Module 5 — AI only inside the Email Editor / reader assist.

---

## Intent

Subtle AI assist toolbar in the composer (orange accent chips, not purple “AI SaaS” chrome). Loading spinners on buttons >300ms. AI never sends mail — drafts land in the editor for human review + Send.

---

## Controls

- Generate Email
- Improve
- Rewrite
- Shorten
- Expand
- Change tone (Professional / Friendly / Assertive)
- Summarize (reader + composer context)
- Reply draft (from selected inbound message)

---

## Rules

- OpenAI calls only from email AI actions
- No auto-send, no background campaigns with AI
- Show toast on success/failure; keep subject/body editable after insert
