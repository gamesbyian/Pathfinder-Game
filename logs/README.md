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
- `logs/stress-corpus1-baseline.json` — the compiled regression baseline for the current
  102-level stress Corpus 1 (deliberately no level-count in the filename — the old
  `-450-`/`-1700-` naming went stale in both the docs and the filename itself the moment either
  corpus was resized by the 2026-07-11 square-grid cleanup; the count now lives only in the
  file's own content). As of the 2026-07-12 regeneration this is compiled entirely from a
  complete sequential-official benchmark run (`reports/stress/benchmark-latest.json`,
  102/102 covered, 85 solved) — the `batch-*.json` parallel-run stitch above is only a fallback
  for ids the official run doesn't cover, and isn't needed here anymore. Regenerate via
  `npm run stress:compile-baseline` (`scripts/stress/compile-baseline.mjs`) whenever the official
  run changes — do not hand-edit.
- `logs/stress-corpus2-baseline.json` — the compiled known-unsolved baseline for the current
  1700-level stress Corpus 2 (`data/stress/stress-levels-random.json`; same no-count-in-filename
  reasoning as above). As of the 2026-07-12 regeneration this too is compiled entirely from a
  complete sequential-official benchmark run (`reports/stress/benchmark-latest-random.json`,
  1700/1700 covered, 152 solved) rather than the `batch-*.json` fallback. Regenerate via
  `npm run stress:compile-baseline -- --mode=corpus2 --official=reports/stress/benchmark-latest-random.json`
  whenever that official run is refreshed. Not a "regression" baseline in the corpus1 sense —
  nothing here is expected to already pass — it's the starting point for
  `scripts/stress/diff-baseline.mjs` to detect genuine new solves against as solver work
  progresses on this corpus.
- `logs/solver-randoms-baseline/verify-sample-parallel2.json` — **historical, now obsolete**: a
  24-id deterministic-stride spot-check of Corpus 2, re-run at `--parallel=2` (vs. the original
  discovery run's 6-25) to test whether any of the "1700 unsolved" were false negatives from CPU
  contention rather than genuinely hard. Result at the time: 2 of 24 (R1089, R1669) solved at
  lower contention. Both of those ids were among the levels deleted by the 2026-07-11 square-grid
  cleanup and no longer exist in the corpus, so this file's `--verify=` correction is moot — the
  2026-07-12 `logs/stress-corpus2-baseline.json` regeneration is compiled entirely from a complete
  sequential-official run instead (see above), which needs no `--verify=` layering at all. Kept
  only as a record of the original methodology, not something to fold in going forward.

Do not add more files under `logs/solver-workflow/` unless a PR explains why the file is a
curated fixture. Prefer attaching generated raw audits to CI runs or releases.
