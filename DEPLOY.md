# Deploy BuildView CRM to Vercel

## 1. Push code to GitHub

```bash
git add .
git commit -m "Prepare Vercel deployment"
git push origin master
```

## 2. Import on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo **buildview-crm**
3. Framework: **Next.js** (auto-detected)
4. Root directory: `/` (repo root)

## 3. Environment variables (Vercel → Settings → Environment Variables)

Copy from your local `.env`:

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only |
| `DATABASE_URL` | **Pooler** URL port **6543** with `?pgbouncer=true` |
| `DIRECT_URL` | Direct URL port **5432** (migrations) |
| `NEXT_PUBLIC_APP_URL` | `https://YOUR-PROJECT.vercel.app` (set after first deploy) |
| `GOOGLE_CLIENT_ID` | Gmail OAuth |
| `GOOGLE_CLIENT_SECRET` | Gmail OAuth |
| `TOKEN_ENCRYPTION_KEY` | Random 32+ char secret |
| `OPENAI_API_KEY` | Optional — email AI only |
| `OPENAI_MODEL` | Optional, default `gpt-4o-mini` |
| `DOCUMENTS_BUCKET` | `documents` |

**Important:** After the first deploy, copy your Vercel URL and set:

```
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```

Then **Redeploy** so email open tracking and OAuth redirects work.

## 4. Supabase Auth redirect URLs

In Supabase → Authentication → URL configuration, add:

```
https://YOUR-PROJECT.vercel.app/auth/callback
```

## 5. Google OAuth redirect URIs

In Google Cloud Console → OAuth client, add:

```
https://YOUR-PROJECT.vercel.app/api/gmail/callback
```

Keep localhost URIs for local dev.

## 6. Deploy

Vercel deploys automatically on every push to `master`.

Or use CLI:

```bash
npx vercel
npx vercel --prod
```

## 7. Verify

- Login / signup works
- Dashboard loads
- Gmail connect works
- Send a test email → open tracking counts (images must load)

## Troubleshooting

| Issue | Fix |
|---|---|
| Prisma error on build | Ensure `DATABASE_URL` + `DIRECT_URL` are set in Vercel |
| Auth redirect loop | Add Vercel URL to Supabase redirect URLs |
| Gmail 403 | Add your email as OAuth test user |
| Opens not tracked | Set `NEXT_PUBLIC_APP_URL` to Vercel HTTPS URL and redeploy |
