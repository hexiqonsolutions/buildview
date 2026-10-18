# Performance audit

## Baseline

No automated Core Web Vitals capture in this session. Findings are from code inspection.

## Confirmed bottlenecks

| ID | Area | Evidence | Status |
|----|------|----------|--------|
| BV-PERF-PROG-001 | Progression initial load | `ensureProjectFloorProgressions` ran sequentially for every floor when `ensureMissing` defaulted true | Fixed — reads default `ensureMissing: false`; selected floor still ensured in `loadFloorDetail` |
| BV-PERF-PROG-002 | Floor detail logs | Up to 500 log rows per selected floor | Open — acceptable for now; aggregate SQL if latency appears |

## Healthy patterns observed

- `getProgressionPercentByProjectIds` uses batched queries (not N+1).
- React `cache()` on `getProjectProgression` dedupes within a request.
- Floor switch intentionally skips full `revalidatePath` to avoid Floor-1 reset.

## Measurements

Not recorded (no staging timing harness). Re-measure Progression open on a 10+ floor project after deploy.
