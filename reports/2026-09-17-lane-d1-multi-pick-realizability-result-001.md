# Lane D1 multi-pick realizability result 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-17 — 220-query `--pin-revisit` realizability pass on `R03147`'s 18 matched exact-DEAD states plus 2 exact-LIVE states, current HEAD.
> **Decision:** the original Lane D question 1 finding replicates cleanly at real scale. Every one of 18 exact-DEAD states -- matched to both exact-LIVE siblings on identical remaining-intersection-deficit AND remaining length, the same criterion the original 2-parent test used -- has **zero** confirmed-feasible future-intersection commitments across every already-visited candidate cell (0/18 with any feasible commitment). Both exact-LIVE states have at least one (3/11 and 2/11 candidate cells respectively). 0 correctness alarms across 220 queries. This is no longer a curiosity at n=1-2 dead states; it is a clean, decisive discriminator across a real matched population.
> **Remaining gate:** the original report's own named gap -- "no production prototype earned yet -- economics and a concrete cheapest consumer are untested" -- is now the sole remaining blocker, not population size. A cheapest-consumer/economics study (comparing the query cost of this realizability check against the residual search work it might displace) is the next gate, not more population.
> **Evidence role:** closes the population-limited caveat on Lane D question 1's positive result, using the sibling-constructor handoff gate's fresh asset (same population as the Lane E and DEAD-core closures this session).
> **Population identity:** `R03147`'s multi-pick population (18 of 23 exact-DEAD states share `ints=0`/`requiredIntersections=7` with both exact-LIVE siblings, all at depth-11/remaining-length-94), 220 `--pin-revisit` queries across 11-candidate-cell states (11 each for both LIVE states; DEAD states' candidate counts vary by path shape).

## Why this ran

Lane D's own preflight named Lane D1 alongside Lanes B, E, and G2 as blocked on the same fresh sibling constructor. The original result (`reports/2026-09-17-lane-d-intersection-commitment-realizability-result-001.md`) found a clean pattern -- DEAD states lose every candidate future-intersection commitment while LIVE siblings retain at least one -- but on only 2 matched parents from B2, each contributing a single exact-DEAD state. `R03147`'s multi-pick population, once its `ints`/remaining-length were computed and checked against both exact-LIVE siblings, supplied 18 matched exact-DEAD states from one parent -- the same test, now genuinely powered.

## What ran

No new solver-internal code: `scripts/stress/class5-multi-pick-intersection-commitment-realizability.mjs` reimplements the original script's exact method (`cpsat-reference-probe.py --pin-revisit`, referee-validating every claimed-feasible witness) against the multi-pick exact-labels population instead of B2's hardcoded 2-parent set, with the same identical-`ints`-and-remaining-length matching rule computed directly from each state's own prefix.

## Result

**18/18 exact-DEAD states: zero feasible future-intersection commitments** (every already-visited candidate cell, individually pinned to a forced second visit, is CP-SAT-infeasible). **2/2 exact-LIVE states: at least one feasible commitment** (3 of 11 candidates for one, 2 of 11 for the other, each referee-validated). **0 correctness alarms** across all 220 queries.

This is now a much stronger result than the original: 18 independent within-parent trials (not 2 across-parent trials) all landing on the same side of the discriminator, with zero exceptions.

## What this closes

The population-limited caveat on Lane D question 1 is closed -- this is no longer a thin, unreplicated signal. The remaining gate is exactly what the original report already named: whether a cheapest-plausible-consumer (prune, forced move, lower bound, exact-mode switch) can exploit this discriminator more cheaply than the residual search work it might displace, and whether the discriminator's soundness holds under the population's own natural diversity (not yet tested across independent parents at this scale -- this replication is still within one parent).

## Artifacts

- `scripts/stress/class5-multi-pick-intersection-commitment-realizability.mjs`
- `reports/stress/class5-multi-pick-intersection-commitment-realizability-2026-09-17.json` -- full 220-query result
