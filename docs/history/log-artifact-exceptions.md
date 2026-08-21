# Historical log-artifact exceptions

This document preserves the chronology behind tracked raw evidence. Current policy and machine-readable classification live in [`../../logs/README.md`](../../logs/README.md) and [`../../logs/artifact-metadata.json`](../../logs/artifact-metadata.json).

## Random-corpus discovery batches

`logs/solver-randoms-baseline/batch-*.json` is the original 2,000-level parallel random-corpus run that determined which levels solved. The 300 solved levels were migrated into stress Corpus 1. These batches remain provenance evidence, although complete sequential benchmark runs now supply current baseline compilation.

`logs/solver-randoms-baseline/verify-sample-parallel2.json` is an obsolete 24-id deterministic-stride spot check of Corpus 2 at lower parallelism. Two sampled IDs solved under lower contention, but both were later removed during the 2026-07-11 square-grid cleanup. The complete sequential baseline supersedes its methodology; the file remains historical evidence.

## Stress baseline regeneration

The corpus baseline filenames deliberately omit level counts because count-bearing filenames became stale when the corpora changed. On 2026-07-12 both baselines were rebuilt from complete sequential benchmark reports rather than stitched parallel discovery batches:

- Corpus 1 used `reports/stress/benchmark-latest.json` (then 102/102 covered, 85 solved).
- Corpus 2 used `reports/stress/benchmark-latest-random.json` (then 1700/1700 covered, 152 solved).

Corpus 1 is a regression baseline. Corpus 2 is a known-unsolved/new-solve comparison baseline, not an assertion that its members should pass.

## Superseded batch archives

`logs/solver-corpus2-batches/archive/<dated-subdir>/` retains runs superseded because of stale checkpoints, stale branch code, or later reruns. Files were moved rather than deleted so the investigation remains inspectable. See [`../../reports/2026-07-17-corpus2-batch-refresh-and-regression-investigation.md`](../../reports/2026-07-17-corpus2-batch-refresh-and-regression-investigation.md) and [`../../reports/2026-07-17-corpus2-refresh-ran-stale-code-correction.md`](../../reports/2026-07-17-corpus2-refresh-ran-stale-code-correction.md).
