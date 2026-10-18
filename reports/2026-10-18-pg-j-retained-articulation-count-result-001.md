# PG-J retained prefix-induced articulation-count falsifier 001

> **Status:** concluded-negative
> **Last evidence:** 2026-10-18 — read-only 28-row exact-fork source reconstruction on the current seven-puzzle retained population; script `scripts/stress/pg-j-retained-articulation-count.mjs`.
> **Decision:** adding endpoint-component articulation-point count to same-level endpoint/raw-depth signatures distinguishes 5/7 previously mixed exact-fate groups, but leaves 2 mixed LIVE/DEAD groups, and reduces shared-signature rows to 8/25. The scalar is not a sound exact completion key, and pure count-based caching/pruning must not be implemented.
> **Remaining gate:** PG-J continues only through a materially distinct, current-state, discrete completion-regime consequence with significant measured descendant work; obtain realistic cost/representation before any solver-consumer test. Do not replay this scalar alone as a production feature.
> **Research question:** `WS2-TOPOLOGY-COMPLETION-REGIME-SUCCESSOR`
> **Evidence role:** retrospective development falsifier
> **Selection:** all 28 retained CP-SAT-labelled topology-fork source rows, 25 unique prefix identities, seven independent source levels; no outcome-based case exclusion
> **Population identity:** original/extension/replication frozen exact-label tables from 2026-09-16/17, grouped by level+entire prefix, compared only within the same level
> **Inference scope:** cheap **proxy graph** morphology on a selected exact-fork diagnostic sample, not a proof of correct mechanic-state representation, independent generalization, path feasibility, work savings, or cold solves
> **Production effect:** none

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-negative","lastEvidenceDate":"2026-10-18","decision":"Endpoint-component articulation count separates five of seven retained exact LIVE/DEAD endpoint/depth signatures, but two remain mixed and only 8/25 rows still share a descriptor; scalar has neither exact outcome fidelity nor healthy compression.","remainingGate":"Materially different current-state completion regime and measured retained descendant work before any consumer; no count-only memoization/prune.","joins":{"researchQuestion":"WS2-TOPOLOGY-COMPLETION-REGIME-SUCCESSOR","premiseRefs":["P198","P204"],"measurementOpportunity":null},"evidenceRole":"retrospective development falsifier","scope":{"populationIdentity":"original/extension/replication frozen exact-label tables from 2026-09-16/17, grouped by level+entire prefix, compared only within the same level","selection":"all retained observations; morphology computed before inspecting oracle fate in group step","inferenceScope":"retrospective proxy-graph signature purity and compression on preexisting selected exact-fork cases only"},"claimRefs":[],"sourceArtifacts":["scripts/stress/pg-j-retained-articulation-count.mjs","reports/stress/class5-topology-fork-exact-labels-2026-09-16.json","reports/stress/class5-topology-fork-extension-exact-labels-2026-09-17.json","reports/stress/class5-topology-fork-replication-exact-labels-2026-09-16.json"],"successors":{"questions":["WS2-TOPOLOGY-COMPLETION-REGIME-SUCCESSOR"],"artifacts":[]},"prospective":{"expectation":"cheap prefix-conditioned bottleneck count may distinguish some same-endpoint opposite-fate forks while retaining repeated signatures","surprise":"5/7 groups separate descriptively, but 2 mixed exact fates survive and compression collapses to 8/25 rows","anomaly":null}} -->

## Question and cheap method

[PG-N 001](2026-10-17-pg-n-retained-exact-fate-interface-collision-001.md) found that endpoint/raw depth merges seven different-fate pairs/groups on the 25 unique topology-fork prefixes, while retaining full visited-cell occupancy separates all 25 but leaves no compression. [PG-J](../docs/solver-optimization-workstreams.md) still seeks a discrete, **current-state** completion regime, distinct from the previously falsified continuous winding phase and cheap local side bit. Does one much cheaper prefix-induced graph bottleneck number preserve any meaningful future-sufficiency evidence?

The disposable observer builds a **proxy** residual undirected graph after removing cells used earlier in the current prefix and removing `blocks` and `geese` cells in the raw level. It retains the active prefix endpoint. Orthogonal free-grid edges are included; each declared portal pair adds an undirected edge as a deliberately over-permissive geometry approximation. Tarjan articulation counting runs on the endpoint-reachable component, O(V+E) after constructing that proxy. All signature features are formed **from the puzzle and current prefix alone**, before `referenceLabel` is used to group the results. A full-source-prefix deduplication rejects conflicting oracle labels.

**Critical limitation:** This graph is not the authoritative Pathfinder transition system. It ignores per-axis revisits/intersections, filter/flipper states, mutable mechanics, directionality and the true portal transition rule; geese are removed as a simplistic obstacle model. Its articulation count is a *descriptive structural covariate*, never a sound necessary-condition feasibility test. No existing production `BC1`/connectivity logic is replaced.

## Complete retained-corpus falsifier

| Measure | Endpoint + raw depth | Add endpoint-component articulation count |
| --- | ---: | ---: |
| Unique signatures on the same 25 rows | 12 | **21** |
| Signatures with two or more different prefixes | 12 | **4** |
| Rows inside repeated signatures | 25/25 | **8/25** |
| Mixed exact LIVE/DEAD signatures | **7** | **2** |
| Mixed rows | 15 | 4 |
| Distinct exact-fate mixed groups separated by count | n/a | **5/7** |

The two surviving mixed keys are the first depth-5 P00009 fork and a depth-10 P00137 fork, each with an exactly identical graph articulation count in LIVE and DEAD siblings. The four repeated signatures after augmentation comprise those two still-mixed pairs plus one LIVE/LIVE P00075 pair and one DEAD/DEAD P00148 pair. The five apparently discriminated pairs include portal-bearing P00124 and nonportal P00137/P00009/P00148 examples, but **their separation is not a sound reason to prune**: scalar counts can coincide across unrelated states and do not encode history-sensitive mechanics.

The 25 unique rows comprise 17 LIVE and 8 DEAD exact-labelled prefixes across seven independent source puzzles, retained because they were previously interesting topology forks. Neither the 5/7 fraction nor the 8/25 compression fraction estimates performance on the unsolved population. This is a diagnostic comparison with PG-N's existing source support, not a new oracle expenditure, a new capability witness or a solve result.

## Decision

**Close the exact-count-only form.** One scalar identifies more path-history structure than endpoint/depth, so the graph is not completely insensitive to the relevant forks. Nevertheless, it fails the universal consequence needed by an exact cache/prune and its remaining repeated support is low and half mixed. Broadening graph counting to huge samples or developing a Tarjan-every-node production subsystem based on this result would be unwarranted.

The surviving PG-J task is to discover a *different* small representation or actionable condition with genuine measured **retained downstream work headroom** and a proof-grade relationship to future legal completion. A cheap one-off synthetic/programmatic falsifier is permitted; production solver rewrites and costless oracle assumptions are not. This result changes no difficulty labels or production search behaviour.

Reproduction with the fully retained literal population:

```bash
node scripts/stress/pg-j-retained-articulation-count.mjs --self-test
node scripts/stress/pg-j-retained-articulation-count.mjs --out=tmp/pg-j-retained-articulation.json
```
