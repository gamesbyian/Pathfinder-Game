# PG-H deep dead-branch cheap-bound falsifier 003

> **Status:** concluded-negative
> **Last evidence:** 2026-10-17 — [read-only run 39007906782](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39007906782) tested all 35 previously exact-DEAD prefixes; 2 were already handled by production's next-step goal terminal check, 0 violated counted length, 0 violated the permissive portal-augmented goal-distance lower bound, and 33 escaped all tested elementary checks.
> **Decision:** Close the **elementary counted-length/static-goal-distance** explanation for the nonterminal PG-H deep DEAD cases. This does not close the parent semantic-deadness premise; stronger current-state facts and actual downstream work savings have not been measured.
> **Remaining gate:** replay the 33 nonterminal prefixes with existing dynamic prune telemetry, identify a nonredundant cheap *sound* impossibility certificate and measure actual post-prefix descendant work. Then use intermediate residual-counted-length strata before broader exact spend or any cold A/B.
> **Research question:** `WS2-SEMANTIC-FORCEDNESS`
> **Evidence role:** discovery
> **Selection:** all 35 outcome-known exact-DEAD cases from the earlier deliberately depth-selected eight-parent study; retrospective calibration only.
> **Population identity:** 35 previously frozen child prefixes across 16 states and 8 Corpus-2 parents from run 39005597866; zero-query audit run 39007906782 at corpus SHA d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb
> **Inference scope:** overlap and weakness of simple current-state checks on this development set. No new cold solves, promotion or population prevalence estimate.
> **Production effect:** none.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-negative","lastEvidenceDate":"2026-10-17","decision":"On the selected 35 CP-SAT-DEAD deep children, two are already next-step terminal in production beam; zero counted-length overruns and zero optimistic static goal-distance contradictions; 33 require stronger state-specific facts to decide.","remainingGate":"Replay the 33 nonterminal deep children through full dynamic prune accounting and quantify future descendants/work actually avoided; construct a sound current-state nonredundant certificate before any matched-work A/B.","joins":{"researchQuestion":"WS2-SEMANTIC-FORCEDNESS","premiseRefs":["P170","P198","P204"],"measurementOpportunity":null},"evidenceRole":"discovery","scope":{"populationIdentity":"35 previously frozen child prefixes across 16 states and 8 Corpus-2 parents from run 39005597866; zero-query audit run 39007906782 at corpus SHA d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb","selection":"all 35 exact-DEAD cases from prior deliberately deepest-group sample; retrospective calibration only","inferenceScope":"weak-check overlap on known-dead development states, not solve rate or prune economics"},"claimRefs":[],"sourceArtifacts":["reports/stress/pg-h-deep-weak-bound-audit-20261017-001.json","reports/stress/pg-h-deep-reference-cases-20261016-001.json"],"successors":{"questions":["WS2-SEMANTIC-FORCEDNESS"],"artifacts":[]},"prospective":{"expectation":"A subset of exact-DEAD deep states may be rejected by cheap counted-length or permissive goal-distance facts.","surprise":"Only the two premature-goal cases are trivially terminal, already handled by production; the other 33 pass these weak checks.","anomaly":null}} -->

## Frozen population and reproducible execution

The source is the **same 35 child prefixes** from [PG-H-002](2026-10-16-pg-h-deep-prefix-observability-pilot-002.md), for which [exact run 39005597866](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39005597866) proved 35/35 DEAD, all 16 groups semantically dead, with zero reference errors/UNKNOWN. The [audit run 39007906782](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39007906782) downloaded the immutable source-run artifact, exercised a self-tested offline zero-query inspector, and verified the exact Corpus-2 content SHA. Its full 35-case output remains attached to that run. The compact decision-bearing [machine verdict](stress/pg-h-deep-weak-bound-audit-20261017-001.json) and original [full exact case-label map](stress/pg-h-deep-reference-cases-20261016-001.json) are retained in git.

| Test / opportunity | Count | Decision |
|---|---:|---|
| Exact-DEAD child prefixes | 35 | source reference, not a new prune |
| Independent parents / branching states | 8 / 16 | deep, outcome-enriched development sample |
| End already at goal with counted length incomplete | **2** | existing beam `pos === goal` rejects at next frontier expansion |
| Counted length already greater than required | **0** | no simple overrun |
| Optimistic full-board goal distance greater than remaining counted moves | **0** | no static lower-bound contradictions |
| Cases not rejected by any of these weak tests | **33** | needs stronger current-state reasoning |
| Remaining counted moves across cases | **2–37** | raw path depths 53–105 are misleading in portal levels |

The two directly terminal cases are `R02240:g196616:s0:d65:c1` and `R02240:g196616:s1:d65:c1`. They have **two counted moves still required** but the current endpoint is already the goal. The beam implementation in `modules/solver/search.ts` checks `pos === level.goalKey` and stops expanding such a frontier state when `isSolutionState` is false. Therefore those exact-DEAD labels **must not** count as incremental solver capability. No proposed new prune should spend runtime checking what the beam already terminates.

For the remaining 33, the offline inspector counts portal jumps as **zero** and uses an optimistic 0/1 shortest-path graph over *all* board cells: cardinal edges cost one, all possible portal edges cost zero. It deliberately ignores blocks, geese, visit/axis depletion, portal-use limits, mandatory objects and path legality, so its goal distance cannot overstate a legal completion length. This very weak lower bound rejects none. An impossibility certificate will have to account for **already consumed path resources, pending objectives and/or coupled transition constraints**, not just initial board geometry or raw remaining length.

This is not yet a monetary/work opportunity claim. The original exact reference summary's 239 units of `resolvedParentExpansionWork` measures the immediate parent expansions, **not** work spent exploring every future descendant of these 35 children. A cheap nonredundant check might still be too rare or expensive to improve near-typical cold solve rates. Estimate marginal descendant cost against current search, and preserve a zero-false-prune soundness witness gate before considering any solver behavioral change.

## Stop and continuation

The terminal-overlap and optimistic-static-goal-distance formulations are closed **on this population and seam**. Keep the deeper semantic-deadness and shallower forcedness questions active. Next diagnostic should use **actual remaining counted moves and unsatisfied mechanics**, not sort by raw path depth or consume known oracle labels in production.

The ephemeral diagnostic script/workflow used to obtain these counts were removed from the final PR. Their exact source and run evidence remain in git history and GHA, with no production runtime or hint changes.
