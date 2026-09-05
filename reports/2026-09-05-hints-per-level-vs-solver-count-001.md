# Stored solution-hint count scales strongly with isolated technique multiplicity, but the two are distinct populations

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — hint counts per level across all 1,700 files in `data/stress/hints-random/`, joined against `solverCount` buckets in `reports/stress/technique-niches/2026-09-03/level-capability.json`, no new dispatch
> **Decision:** mean stored hint count rises monotonically with `solverCount` bucket — 34.5 (bucket 0) → 62.3 (1) → 87.2 (2) → 89.7 (3-5) → 164.7 (6-10) → 206.7 (11+). But even `solverCount=0` levels (no T1-census heuristic technique solves them in isolation) still average 34.5 stored hints — because the hint stash draws from a much broader set of solver runs (production attempts, variant-parent replay, exact-solver probes, historical repair runs) than the narrow, fixed T1 census menu `solverCount` measures. The two are correlated but not the same population, and `solverCount=0` should not be read as "zero known solutions."
> **Remaining gate:** none — descriptive characterization using already-collected data.
> **Evidence role:** discovery/methodological — clarifies what `solverCount` does and does not capture, using a data source (`hints-random` provenance) not otherwise mined this session
> **Selection:** whole corpus2 population (1,700 levels), not a sample

## Method

Counted `hints.length` per level file in `data/stress/hints-random/`, then computed mean hint count within each `solverCount` bucket already used elsewhere this session (0, 1, 2, 3-5, 6-10, 11+).

## Result

| `solverCount` bucket | n | mean hint count |
|---|---:|---:|
| 0 | 643 | 34.5 |
| 1 | 174 | 62.3 |
| 2 | 92 | 87.2 |
| 3-5 | 208 | 89.7 |
| 6-10 | 181 | 164.7 |
| 11+ | 402 | 206.7 |

## Interpretation

The monotonic relationship confirms hint-pool richness is a real, correlated proxy for capability multiplicity — consistent with, and complementary to, this session's other multiplicity-predicts-success findings. But the nonzero mean at `solverCount=0` (34.5, not 0) is an important methodological caution: `solverCount` is a narrow measurement (a fixed, frozen T1 technique menu run in isolation under one budget), while the hint stash aggregates solutions from many other sources — production's real retry/repair machinery, cross-variant replay, and even the exact `cpsat-full-probe` solver (see `2026-09-05-cpsat-full-probe-rescue-coverage-001.md`). A level with `solverCount=0` genuinely has no *T1-census-menu* isolated winner, but it is not necessarily a level with no known solution at all — any future work using `solverCount=0` as a proxy for "hard/unsolved in every sense" should check the hint stash first.

## What this does not establish

- Does not decompose hint-count by source (production vs. variant-replay vs. exact-probe) at the per-level, per-bucket level — see the separate variant-parent-replay-dominance and cpsat-coverage reports for source-level detail.
- Correlational; hint-count richness could itself be an artifact of how much attention/compute a level has historically received, not purely a property of its intrinsic difficulty.
- Corpus2 only; see `2026-09-05-corpus1-corpus2-hint-pool-richness-001.md` for the corpus1 comparison.
