# Audit automation

## Manual run

Generate a full `New Hint` audit and store outputs:

```bash
npm run audit:newhint:full
npm run check:audit-output -- audits/raw/latest.json
```

Outputs:

- `audits/raw/latest.json`: latest full export payload.
- `audits/raw/<timestamp>-<sha>.json`: timestamped raw history snapshots.
- `audits/metrics/latest.json`: latest compact metrics summary.
- `audits/metrics/<timestamp>-<sha>.json`: timestamped metrics snapshots.
- `audits/metrics/history.ndjson`: append-only metrics history for easy trend parsing.

## CI run (post-merge)

Workflow: `.github/workflows/audit-export.yml`.

On pushes to `main`, CI will:

1. Run the headless audit exporter (`npm run audit:newhint:full`).
2. Run output guard checks (`npm run check:audit-output -- audits/raw/latest.json`).
3. Upload raw full audit JSON as build artifact.
4. Commit both `audits/raw` and `audits/metrics` updates back to `main` for durable history in git.

This now keeps both full raw payloads and compact metrics in git history (with artifacts still available for CI runs).
