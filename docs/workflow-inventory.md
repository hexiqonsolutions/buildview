# Workflow inventory

Status: discovered from source; not every path E2E-tested in browser this session.

| Module | Entry UI | Server path | Auth | Notes |
|--------|----------|-------------|------|-------|
| Login / logout | `/(auth)/login` | Supabase Auth | Public | Middleware redirects |
| Admin projects | `/admin/projects` | `getAdminProjectsListData` | Staff | Progress % from Progression for construction |
| Client project detail | `/dashboard/projects/[id]` | RSC + actions | Client roles | Construction tabs vs portfolio |
| Progression tick | Progression tab | `setProgressionStep` | `canEditProgression` | Service-role write after check |
| Progression floor switch | Floor chips | `selectProgressionFloor` | `canViewProgression` | Fixed viewer gate |
| Issues | Issues tab / admin | `src/lib/actions/issues.ts` | Role + project access | |
| Uploads | Upload flows | upload actions + Storage | Role + buckets | |
| Notifications | Bell / pages | `src/lib/notifications/server.ts` | In-app + optional email | |
| Invoices | Client admin | invoice data/actions | `canViewClientInvoices` | |
| Portfolio showcase | Portfolio dashboard | `portfolio-data.ts` | Portfolio clients | No Progression |

## Critical journeys to prioritize for E2E (when a runner exists)

1. Staff creates project + floors → Progression seeds → tick survives refresh.
2. `client_user` cannot load Progression payload.
3. Portfolio client never sees Progression tab / data.
4. Suspended client blocked from portal.
5. Cross-client project IDOR denied.
