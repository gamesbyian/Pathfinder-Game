# BC1 perturbation microscope result (premise-generation lane A)

> **Status:** concluded-positive
> **Last evidence:** 2026-10-01 — raw width-500 beam, control vs `STRATEGY_BC1_FRESH_CONNECTIVITY_PRUNE`, frontier-level trace on the frozen 300-level random population.
> **Decision:** BC1's raw-beam gains are consistent with dead-state occupancy of the control frontier displacing live (winner-bearing) lineages early; no recurring *set-level property beyond dead occupancy* distinguishes gains, so no retention or merge-gate treatment is nominated. The mechanism is already harvested by the production consumer. Lane A is closed as a treatment generator.
> **Remaining gate:** none.
> **Evidence role:** discovery.
> **Owner:** `docs/solver-optimization-workstreams.md`.

Question (refresh report lane A, P144/P175/P183/P184/P187): what earliest frontier-set change separates BC1 gains from losses, and which scarce survivor property is displaced or preserved?

## Protocol

`scripts/stress/bc1-perturbation-microscope.mjs`. Population: the frozen 300 ids of `data/stress/bc1-prune-ab-001-{shard0,1,2}-ids.txt` (seeded random, disjoint from the Stage-B parents). Raw `beamSearchFromGate`, first gate, width 500, 3M nodes, default profile. Control = flag off with the fresh-only BC1 shadow tagging dead lineages; treatment = flag on. Per phase it stores the incoming frontier as path-prefix hashes, the post-hard-prune pool size, coarse-merge removals and width culls. An observer-free control run is checked to be identical in path and canonical work (300/300). Merged rows: `data/stress/bc1-perturbation-microscope-001.json`.

Outcomes reproduce the earlier A/B (gains 20, loss 1, both 22, neither 257). Unchanged levels are retained as the null group so descriptors are never read off the nominated gains alone.

## Findings

1. **First divergence is scheduled, not selective.** It occurs at the first connectivity-fresh depth with a flag (8 or 16 in 19 of 20 gains; R00386 at 34), and 275 of 300 levels diverge at all, so divergence by itself carries no information about gain.
2. **The coarse-merge gate is not the main mechanism.** The merge only runs when the pool exceeds the width, so BC1 removals can switch it off (R00180: pool 528 -> 421, 414 merge removals vanish, 306 extra states survive). That "merge-gate toggle" is the first-divergence mechanism for only 3/20 gains (3/10 toggle levels gain, vs 13/151 under-width and 4/114 over-width). Later merge-run asymmetry occurs in 89% of unchanged levels, so it does not discriminate. 13/20 gains diverge with the pool *under* width, where nothing was culled at all, so "freed slots at first divergence" is not the proximate cause either.
3. **Winning lineages leave the control frontier early.** The first depth at which the winning (treatment) lineage is absent from the control frontier is a median ~21% of path length (range 8-72%), a median ~10 depths after first divergence (range 0-50). The control frontier is a median ~57% BC1-dead at that depth.
4. **Dead occupancy is enriched where gains happen.** Control dead fraction at 15% / 20% / 30% of path length: gains 0.30 / 0.40 / 0.53 vs unchanged 0.09 / 0.15 / 0.30 (AUC 0.74 / 0.72 / 0.63). With dead fraction >= 0.3 at 20% of path the gain rate is 11/93 (11.8%) vs 9/207 (4.3%). The cut and threshold were chosen after seeing the data: exploratory, n=20 gains, not a predictor.
5. **No other descriptor separates gains.** required length, portal count, pool size, node count, frontier depth: AUC 0.3-0.5; flagged total 0.64; dead slots at divergence 0.70 (same family as finding 4).
6. **Poisoned control beams are common and cost nothing to detect after the fact.** In 136/300 levels the control frontier is entirely BC1-dead at some sampled depth; the median such level has ~26% of its depths remaining. Treatment does not save nodes there (unchanged-level node ratio 1.000) because live states culled in control fill the freed slots, and those mostly still fail.
7. **The loss does not look like the gains.** The single raw loss (R01210) is a both-over-width slot-freeing divergence whose control winner leaves the treatment frontier late (depth 81 of 119), versus early rescue for gains. n=1: a contrast, not a characterization.

## Interpretation

- P184/P141/P050: confirmed in a specific form. Dead states occupy a measurable share of the control frontier early, and winner lineages are displaced from it early. The relevant scarce property is **frontier occupancy by provably dead states**, which BC1 removes. This is not a new option-class retention premise.
- P175/P187: net-positive-with-exchange stands, but the raw-beam exchange is 20:1 and the displacement timing differs (early for gains, late for the loss). Pure trajectory noise would be symmetric, so the asymmetry is systematic benefit plus a small perturbation tail.
- The residual headroom is small: the fresh-only schedule already covers 86% of dead-lineage candidates (reports/2026-09-30-bc1-fresh-only-prefilter-result-001.md), and every-phase checking is closed on cost.

## What this does not establish

Raw width-500 beam only, not the production ladder; the nominated gain set is small; dead tagging uses the fresh-only shadow, so truly dead but unflagged states are undercounted (control dead occupancy is a lower bound). No treatment, routing or retention rule is justified by this report.

## Reproduce

```bash
node --import tsx scripts/stress/bc1-perturbation-microscope.mjs --ids-file=data/stress/bc1-prune-ab-001-shard0-ids.txt --out=<file>
```
Shards 0-2 merge into `data/stress/bc1-perturbation-microscope-001.json` (about 25 min on 3 cores for all 300).
