# R03351 microscope: initial evidence notes 001

> **Status:** active / initial evidence
> **Last evidence:** 2026-09-12 — audit connected R03351 to the prior B1/B2 extinction-adjacent exact-prefix program and confirmed the current collector/reference tooling can execute the same core design without new search instrumentation.
> **Decision:** keep R03351 as the first specimen, but treat `top-ranked dead / culled witness live` as historical-phenotype recurrence rather than a new result. Start with the witness-culled, rank-1 survivor, and cutoff survivor only.
> **Remaining gate:** reproduce the ordinary width-2000 final support loss with ranked-pool detail, build the frozen three-case exact input, label rank-1/cutoff future feasibility, and compare the phenotype with B2 before considering a mechanism-specific intervention.

## Evidence already available before new compute

1. `R03351` is in the frozen 28-level first-loss population whose accepted witness support is lost through beam width competition rather than hard pruning or coarse-state merge.
2. Under the ordinary width-2000 control used by the retention canaries, its accepted-witness support survives to depth 47.
3. `intsBucketRetention` reaches only depth 46 and produces no solve.
4. Existing `mechanicBucketRetention`, applied research-only outside its normal routing regime, reaches only depth 34 and produces no solve, the canary's largest negative depth delta (`-13`).
5. The canonical hint is strongly cross-sourced through many referee-accepted family-parent replays. Any exact prefix of that full path is therefore genuinely live under the real game rules.

## Connection missed in the first microscope pass

The repo has already run a close ancestor of this experiment. [`2026-08-12-b2-extinction-adjacent-cpsat-labels.md`](2026-08-12-b2-extinction-adjacent-cpsat-labels.md) froze real beam score/width extinction decisions and exact-labelled:

- rank-1 retained candidates;
- known-supported culled candidates;
- cutoff survivors for width-saturated cases.

It found two important shapes. Several extinction points had a CP-SAT-proven **dead rank-1 candidate while a known-supported alternative was live**; other weak-margin points had **both candidates live**. After flipping-filter support was added, dead-top/live-alternative recurrence also appeared in width-saturated cases.

That changes the novelty bar for R03351. If its rank-1 survivor is dead, we have brought an established mechanism class into the current class-5 frontier, which is useful but not enough to justify another generic scorer/feature campaign. The microscope would still owe a mechanism-specific legal discriminator or a materially different architectural explanation.

## Existing tooling already covers the core experiment

No new `search.ts` instrumentation is required:

- `collect-known-solution-prefix-survival.mjs` can retain the full `rankedPool` and removal details while proving observer-on/off behavior identity;
- `KnownSolutionPrefixSurvivalObserver` already records the final support-loss depth and supported-pool ranks;
- `cpsat-explicit-prefix-reference.mjs` accepts packed-key explicit prefixes, replay-validates them against native move rules, exact-labels them, and referee-checks emitted SAT witnesses.

The only missing convenience seam is a deterministic postprocessor that turns one retained-ranked-pool survival artifact into the three frozen microscope cases.

## First execution target

Use:

`node scripts/run-bundled.mjs scripts/stress/collect-known-solution-prefix-survival.mjs -- --level-ids=R03351 --beam-width=2000 --node-budget=3000000 --include-stages --retain-all-removal-details --retain-ranked-pool-details --out=tmp/r03351-microscope-survival.json`

At the final `score-width-culled` support loss, freeze exactly:

1. **witness-culled** — best-ranked actually culled candidate matching a full accepted witness prefix;
2. **top-rank1** — rank-1 survivor from the same pre-selection pool;
3. **cutoff-survivor** — rank 2000, the last ordinary top-K survivor.

The witness case is a positive control because its full accepted continuation already proves liveness. The exact labels that add information are rank-1 and cutoff.

Interpretation then branches cleanly:

- **rank-1 dead, witness live:** B2-style mis-ranking recurrence; seek a new mechanism-specific discriminator, not generic scorer tuning;
- **rank-1 and cutoff live:** simple dead-vs-live ranking is falsified here; inspect live-hypothesis crowding, commitment, or longer-horizon competition;
- **rank-1 live, cutoff dead:** mixed frontier quality; investigate why the width boundary admits dead states while losing the known-live branch;
- **reference abstains:** do not infer mechanism from the missing label; improve only the bounded exact seam if cheap and decision-bearing.

No solver treatment is justified before these labels exist.
