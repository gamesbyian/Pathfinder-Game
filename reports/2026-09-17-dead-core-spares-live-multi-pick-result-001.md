# DEAD-core spares-LIVE multi-pick result 001

> **Status:** concluded-negative
> **Last evidence:** 2026-09-17 — 215-query size-1 relaxation pass on `R03147`'s 23 exact-DEAD multi-pick siblings (0 flips, 0 alarms), current HEAD.
> **Decision:** no size-1 causal core exists for any of the 23 tested exact-DEAD states (0/215 single-commitment relaxations flipped to feasible; 8-11 pending must-pass commitments tested per state, average 9.3). Unlike the earlier confounded 0/38 result on the naive-walk harvest (whose construction method was independently shown incapable of finding LIVE siblings at all, so a core-negative reading there could not be separated from a construction artifact), this population is now known-good: all 23 DEAD states and both held-out LIVE siblings come from the SAME real production beam-search frontier at the SAME depth (`R03147`, depth-fraction 0.1, 5000-wide `intersectionHarvest` beam), the frontier independently proven to contain genuine LIVE continuations. This is therefore a clean, non-confounded core-negative for the size-1 tested form. The "spares LIVE" specificity test (the preflight's second half) is moot -- there is no core to test the specificity of.
> **Remaining gate:** a bounded size-2 pass is technically permitted by the preflight ("for unresolved states, whether a bounded size-2 pass is justified by the observed candidate count") but is a materially larger, not-yet-justified escalation -- roughly 43x the query count (~989 pairwise queries across 23 states at ~9.3 candidates each) for a form the preflight itself frames as needing separate justification, not an automatic next step. Not attempted in this pass.
> **Evidence role:** closes the DEAD-core "runtime nogood" premise's size-1 tested form on the fresh multi-pick asset -- the cleanest population this investigation has produced (matched LIVE/DEAD siblings sharing one real production frontier, not post-hoc scalar matching).

## Why this ran

`docs/solver-fresh-dead-sibling-harvest-preflight.md` names DEAD-core confirmation as the fresh asset's "First consumer": for every exact-DEAD state, apply the existing single-commitment relaxation hook first, then test whether the derived core rejects other DEAD siblings while sparing LIVE siblings from the same parent. `reports/2026-09-17-production-search-sibling-construction-result-001.md` (this session, same day) just produced exactly the population this consumer needs -- `R03147`'s 2 exact-LIVE + 23 exact-DEAD siblings, all drawn from one real production search frontier at one depth, the cleanest matched contrast this investigation has ever had.

## What was built

`scripts/stress/class5-multi-pick-dead-core-relaxation.mjs`: reads the multi-pick exact-labels file directly (no separate harvest-metadata join needed, since that file already carries each case's full raw-XY prefix), replays each DEAD case's prefix with the real `createState`/`applyMove` primitives to recover its pending must-cross/must-pass obligations, then relaxes each one individually via `cpsat-reference-probe.py`'s existing `--relax` hook -- the exact same size-1 causal-core test the B2 pilot and the naive-harvest pilot both used, no new relaxation machinery.

## Result

215 single-commitment relaxation queries across `R03147`'s 23 exact-DEAD multi-pick siblings (8-11 pending must-pass commitments each, average 9.3; the depth-11 prefixes have no pending must-cross obligations to test on this level). **0/215 flipped to feasible. 0 states with any size-1 core. 0 correctness alarms.**

This reproduces the direction of the earlier B2-confounded and naive-harvest-confounded results (both also found 0 clean size-1 cores), but on evidence that cannot be dismissed as a construction artifact: this exact population's construction method is independently proven capable of finding real LIVE siblings (2/25 on this same parent/depth, referee-verified) -- the absence of a size-1 core here is therefore a property of these DEAD states themselves, not of a walk too weak to find one.

## What this closes and what stays open

**Closed:** the size-1 causal-core premise, on the strongest population available. Pending must-pass obligations on these residual Class-5 levels are not individually dispositive -- no single missed commitment explains a DEAD outcome on any of the 23 tested states.

**Open, not attempted:** a bounded size-2 (pairwise) relaxation pass. The preflight explicitly gates this behind "justified by the observed candidate count," and 43x the query volume for a form not yet motivated by any size-1 near-miss (there is no case where relaxing one commitment came close to flipping) is not obviously worth spending before a smaller signal justifies it.

**Also open:** whether R01600's 25/25-DEAD multi-pick sample (no LIVE siblings found at that sample size) reflects a genuinely lower live fraction, zero live fraction under this technique/width, or is a construction limitation like the original naive walk's -- not tested by this pass, which focused on `R03147` where a matched contrast actually exists.

## Artifacts

- `scripts/stress/class5-multi-pick-dead-core-relaxation.mjs`
- `reports/stress/class5-multi-pick-dead-core-relaxation-2026-09-17.json` -- full 215-row result
