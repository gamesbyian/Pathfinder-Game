# Audit/log artifact policy

The solver run files in this directory (`logs/`) are **not ordinary source files** — they are
raw, generated per-run output (solve traces, benchmark dumps, determinism logs), as opposed to
curated human-readable analysis, which lives in [`reports/`](../reports/) instead. `logs/` files
can create noisy diffs and hide meaningful code changes if every local or CI run is committed.

## What belongs in git

- Small, intentionally curated fixtures that a test or documented investigation
  depends on.
- Historical baselines that are explicitly named in this policy or in a future
  fixture manifest.
- Human-written documentation that explains how audit output should be produced,
  compared, or archived.

## What should not be committed by default

- Routine `logs/solver-workflow/*.json` output from every solver-audit run.
- Large exploratory local runs that are useful only during one debugging session.
- CI-generated audit output that can be uploaded as a workflow artifact instead.

## Current tracked raw-audit exceptions

The repository currently keeps these raw audit snapshots as compatibility
baselines while the solver/audit workflow is being cleaned up:

- `logs/solver-workflow/2026-06-12T22-57-04Z-ca8febfb44f0.json`
- `logs/solver-workflow/latest.json`
- `logs/solver-randoms-baseline/batch-*.json` — the raw per-batch solver run (2000-level random
  corpus, `--parallel`) that determined which levels were solvable; the solved 300 were migrated
  into `data/stress/stress-levels.json` (Corpus 1). Kept as the source-of-truth provenance for
  those 300 levels' results — see `data/stress/README.md`.
- `logs/stress-corpus1-450-baseline.json` — the compiled regression baseline for the full
  450-level stress Corpus 1, stitching the sequential-official 150-level benchmark
  (`reports/stress/benchmark-latest.json`) with the parallel-run solves above. Regenerate via
  `npm run stress:compile-baseline` (`scripts/stress/compile-baseline.mjs`) whenever either
  source changes — do not hand-edit. Its own `sources[].timingTrustworthy` field flags that the
  300 migrated levels' `elapsedMs` is CPU-contention-inflated and not an official timing number.

Do not add more files under `logs/solver-workflow/` unless a PR explains why the file is a
curated fixture. Prefer attaching generated raw audits to CI runs or releases.
