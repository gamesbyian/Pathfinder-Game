# PG-I: independent-parent fragile/robust technique response census 001

> **Status:** concluded-positive
> **Last evidence:** 2026-10-17 — source [715-cell pilot 37712397687](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/37712397687) independently regrouped by [hosted 39013986196](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39013986196): 6 parents / 18 modes / 125 variants / 39 technique vector changes, 8 of which preserve solved-technique count.
> **Decision:** scalar hardness based on number of successful techniques misses 8 technique-identity swaps in two of six selected parents. No variant was resistant to all five isolated techniques at 10M work; this selected cohort cannot characterize robust-hard families.
> **Remaining gate:** mine other retained independent parent families with complete comparable isolated-technique failures; no runtime selector from six response-enriched parents; PG-G owns the existing symmetry-tie mechanism.
> **Research question:** `WS2-VARIANT-RESPONSE-HARDNESS`
> **Evidence role:** discovery
> **Selection:** retrospective analysis of six deliberately selected response-enriched parents, 125 variants and five isolated techniques; development evidence only.
> **Population identity:** original GHA 37712397687 / artifact 11523005793 / family dataset commit 32132d6ba60f1203ee013ed0d475f46061eddd49, reanalysis GHA 39013986196 SHA 5889cc96c9b667c8ad3da2547953ca0c010fb1a7.
> **Inference scope:** technique response identity at equal 10M canonical-work ceiling for these selected six independent parent clusters; not solver-generalized hardness.
> **Production effect:** none.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-10-17","decision":"39 of 125 controlled variants change isolated technique-success identity; only 31 change successful-technique count, while 8 equal-cardinality swaps concentrate in two parents. Zero variants defeat all five methods at 10M equal work in this response-enriched cohort.","remainingGate":"Existing-data search for resistant independent parents with complete comparable multi-technique coverage, then cheapest nonredundant mechanism test; do not fit cold routing from six parent IDs.","joins":{"researchQuestion":"WS2-VARIANT-RESPONSE-HARDNESS","premiseRefs":["P113","P144","P145","P199"],"measurementOpportunity":null},"evidenceRole":"discovery","scope":{"populationIdentity":"original GHA 37712397687 / artifact 11523005793 / family dataset commit 32132d6ba60f1203ee013ed0d475f46061eddd49, reanalysis GHA 39013986196 SHA 5889cc96c9b667c8ad3da2547953ca0c010fb1a7.","selection":"retrospective analysis of six deliberately selected response-enriched parents, 125 variants and five isolated techniques; development evidence only.","inferenceScope":"technique response identity at equal 10M canonical-work ceiling for these selected six independent parent clusters; not solver-generalized hardness."},"claimRefs":[],"sourceArtifacts":["reports/stress/pg-i-parent-response-hardness-20261017-001.json","scripts/analyze-family-technique-response.mjs","scripts/parent-response-hardness-census.mjs"],"successors":{"questions":["WS2-VARIANT-RESPONSE-HARDNESS"],"artifacts":[]},"prospective":{"expectation":"Small controlled transformations can change which search methods solve at fixed work.","surprise":"Eight identity-changing technique swaps leave solved-method count unchanged; no all-five-resistant variant in the selected cohort.","anomaly":null}} -->


## Completed six-parent census

[Run 39013986196](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39013986196) retrieved the frozen original 715-cell artifact, ran the maintained family-technique response analyzer and computed the independent-parent census. All six parent × technique baselines matched exactly across their repeated family-mode blocks, 18 blocks and 125 edges were complete, and 39 actual solve-state flips agreed with the canonical analyzer. Full parent/mode machine evidence is permanently preserved in [`reports/stress/pg-i-parent-response-hardness-20261017-001.json`](stress/pg-i-parent-response-hardness-20261017-001.json).

| Parent (independent unit) | Baseline methods solving | Variant edges | Different successful-method sets | Equal-count identity swaps | Minimum methods solving a variant |
|---|---:|---:|---:|---:|---:|
| P00136 | 4/5 | 20 | 0 | 0 | 4/5 |
| P00144 | 5/5 | 21 | 4 | 0 | 4/5 |
| P00146 | 3/5 | 21 | 13 | **7** | 2/5 |
| R00631 | 4/5 | 21 | 7 | 0 | 3/5 |
| R00792 | 4/5 | 21 | 4 | 0 | 3/5 |
| R02976 | 3/5 | 21 | 11 | **1** | 3/5 |
| **All (not independent variant rows)** | — | **125** | **39** | **8** | **≥2/5** |

The 39 true technique-vector flips partition into **31 successful-method cardinality changes** and **eight same-count identity swaps**. Five P00146 swaps occur on semantically equivalent D4 symmetry variants 01, 02, 03, 05 and 06, exchanging DFS gains for admissible-order losses. Two other P00146 swaps are local mutants 01 and 03; R02976 local mutant 04 supplies the last. Only **two distinct parent families** contribute all eight swaps. PG-G already owns the symmetry-tie ordering follow-up, so PG-I should not duplicate its current-puzzle policy prototype.

P00136 has an unchanged five-method success vector across all 20 tested variants. **Twenty variants** were solved by all five, while **none of 125** was solved by zero or one of the methods. That is a negative *sample-opportunity* result for searching robust-hard families in this six-parent selected cohort, not a claim that robust hardness does not exist elsewhere. The sample was intentionally enriched for structural/technique response and is heavily inspected development evidence.

The next useful PG-I gate is to interrogate **different independent parents** in retained variant-library and current technique/failure-response data, requiring complete method coverage and comparable work. Distinguish not-attempted/unknown from measured failure. If no such current observations exist, run a small outcome-blind exposure canary before authorizing fresh isolated-solver compute. No hint, family identity, saved outcome or diagnosis may steer production solving.

The first branch push GHA 39013858705 was instrument-invalid because source code had not yet arrived. Only the corrected successful [run 39013986196](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39013986196) supports this result; the one-shot readout workflow is retired after integration.

## Why this rejoin is different

The existing [October 15 response-pilot recovery](2026-10-15-controlled-technique-response-pilot-recovery-result-001.md) correctly reports 39/125 edges with an actual technique solve-state flip, across six selected parents. It does not separately report whether the **number** of techniques that solve a level changes, or the successful-technique identity alone changes while its cardinality stays fixed. A scalar "hardness" measure based only on how many techniques solve the level cannot distinguish the latter.

The new parent-grouped census uses the **maintained** `scripts/analyze-family-technique-response.mjs` output, rather than inventing another cell/evaluation identity dialect. It requires complete per-variant technique rosters and asserts that the same parent's repeated observations in different transformation blocks agree exactly on solved state, status, canonical work and nodes. If a shard/technique is missing or the parent baseline drifts, the report aborts. Each variant edge contributes within one `parentId` cluster, never as independent evidence for population prevalence.

Measured channels are separate: changed technique-success vector, changed successful-technique count, unchanged-count/changed-identity technique swaps, and observed zero/one-technique coverage. Counts cannot establish deep algorithmic inability because methods have a fixed 10M work ceiling.

## Work protocol

1. Read the original 715-cell `combined-cells.json` from GHA run `37712397687`, artifact `controlled-technique-response-analysis`.
2. Run `node scripts/analyze-family-technique-response.mjs --input=.../combined-cells.json --out=.../canonical-analysis.json`. This is the existing identity/transition owner.
3. Run `node scripts/parent-response-hardness-census.mjs --analysis=.../canonical-analysis.json --out=.../parent-verdict.json`. It verifies agreement on 6 parents, 125 variants and 39 actual response-flip edges, groups the repeated family-mode blocks by parent and emits the richer parent response.
4. Inspect counts, every parent and mode, selection bias and test-invariant alarms; retain an exact, small machine verdict and update `docs/solver-optimization-workstreams.md` and `WS2-VARIANT-RESPONSE-HARDNESS`.
5. Retire branch-local one-shot workflow before merge; no solver rerun, no generated variants and no production changes.

This is a diagnostic, not a scheduler rule. A next consumer would need a **solve-local** descriptor that predicts which technique has marginal value, its cost at the existing scheduler and matched-work cold A/B, plus independent whole-parent confirmation. Parent identity/label, stored success vectors and transformation ancestry are explicitly forbidden at runtime.
