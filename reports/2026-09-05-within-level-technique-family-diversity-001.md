# A level's stored hint pool draws from ~3 distinct technique families on average, up to 10

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — distinct top-level technique families (`repair`/`beam`/`dfs`/`admissible-order`/`cpsat-full-probe`/`variant-parent-replay`/etc.) per level's hint pool across all 1,700 files in `data/stress/hints-random/`, no new dispatch
> **Decision:** mean within-level technique-family diversity in the hint stash is 2.96 (max 10). The distribution is a fairly even spread: 501 levels draw from exactly 1 family, 371 from 2, 271 from 3, 229 from 4, tapering to 3 levels drawing from all 10 tracked families.
> **Remaining gate:** none — descriptive characterization using already-collected data.
> **Evidence role:** discovery — a new characterization of hint-pool composition not previously reported this session
> **Selection:** whole corpus2 population (1,700 levels), not a sample

## Method

For each level's hint file, extracted the top-level family token (`technique.split(':')[0]`) of every stored hint's `provenance[0].solver.technique`, counted distinct families per level.

## Result

| distinct families | levels |
|---:|---:|
| 1 | 501 |
| 2 | 371 |
| 3 | 271 |
| 4 | 229 |
| 5 | 115 |
| 6 | 94 |
| 7 | 59 |
| 8 | 40 |
| 9 | 17 |
| 10 | 3 |

Mean 2.96, max 10.

## Interpretation

This is a solution-pool diversity metric distinct from `solverCount` (which counts distinct *specific configs* solving a level in the frozen T1 census specifically) — this counts distinct *families of solver run* (including production/repair/replay/exact sources) contributing to the historical hint record. A level whose hints come from only 1 family (501/1,700, 29.5%) has had a narrower base of solving approaches recorded historically than one drawing from many; this is useful context for any future work assessing how much independent evidence exists for a level's solvability.

## What this does not establish

- Does not test whether family diversity predicts anything (production success, stability, etc.) — purely descriptive here.
- The family taxonomy used (splitting on the first `:`) is coarse and includes non-technique categories like `variant-parent-replay` alongside genuine solving techniques like `repair`/`beam`/`dfs`; a stricter technique-only diversity metric was not computed separately.
- Single hint-stash snapshot, corpus2 only.
