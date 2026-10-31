# BuildView Experience Demos

Standalone sibling Next.js app that clones Construction Intelligence and Portfolio Showcase UIs with **fixture data** and **git-preloaded Matterport** models. Does not modify the main BuildView product.

## Run locally

```bash
cd experience-demos
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

## Experience links

| Path | Experience | Matterport model |
|------|------------|------------------|
| `/construction` | Construction Intelligence — completed multi-year project | `v5TCYAotrVB` |
| `/interior` | Portfolio Showcase — interior / architecture | `q62axSynTRZ` |
| `/real-estate` | Portfolio Showcase — real estate listings | `Zz8QkH6ps96` |

Also:

- `/construction/projects/exp-construction-meridian-tower` — full project workspace (scans, photos, timeline, progression, issues, comments)
- `/construction/compare` — dual Matterport panes (same model, early vs handover dates)

## Notes

- Public, no login. Read-only demo banner; no Supabase / auth.
- `robots`: noindex (see `public/robots.txt` and page metadata).
- Deploy as a separate Vercel/Node project pointing at `experience-demos/`.
