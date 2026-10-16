# PG-H hidden semantic forcedness: frozen small reference pilot 001

> **Status:** concluded-positive
> **Last evidence:** 2026-10-16 — run [38977850830](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/38977850830) completed 8/8 reference shards and strict reconciliation: 45 child cases, 3 LIVE / 4 DEAD / 38 UNKNOWN, 2 resolved semantically forced states from one parent.
> **Decision:** Hidden semantic forcedness exists at the tested beam seam: R00242 has two separate 2-child states with one exact LIVE and one exact DEAD continuation each. The 14/16 unresolved states (38/45 UNKNOWN child queries) prohibit prevalence/economics extrapolation.
> **Remaining gate:** first test current-input, cheap semantic discriminators on the four proven children; diagnose 20-second CP-SAT abstentions and attempt a depth-targeted reference census only if its anticipated resolution/work improves materially.
> **Research question:** `WS2-SEMANTIC-FORCEDNESS`
> **Evidence role:** discovery
> **Selection:** preselected by deterministic hash independent of exact child outcomes.
> **Population identity:** run 38977850830 source commit 87a579074c3a850148b707fe1997915ea417c106; exact IDs and source SHA-256 in the run capture manifest.
> **Inference scope:** selected 8-parent development sample, first two eligible multi-child states per gate at fixed 500k beam work; not a population prevalence estimate or production-value claim.
> **Production effect:** none. The observer, exact references and reconciliation run separately from ordinary production search.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-10-16","decision":"Two independently observed beam states in the same Corpus-2 parent R00242 have exactly one exact LIVE continuation among two ordinary-prune survivors; vast early-prefix UNKNOWN fraction prevents prevalence inference.","remainingGate":"Cheap current-input discriminator on the four fully labelled child cases and a better-targeted exact-observability gate before population-scale estimates.","joins":{"researchQuestion":"WS2-SEMANTIC-FORCEDNESS","premiseRefs":["P170","P198","P204"],"measurementOpportunity":null},"evidenceRole":"discovery","scope":{"populationIdentity":"8 hash-frozen Corpus-2 parents and 45 cases captured at source 87a579074c3a850148b707fe1997915ea417c106 in GHA run 38977850830","selection":"outcome-blind deterministic parent hash; first two eligible 2–4-child beam states/gate","inferenceScope":"mechanism-existence witness at early prefix; no independent prevalence or native cold-solve increase"},"claimRefs":[],"sourceArtifacts":["scripts/stress/semantic-forcedness-capture.mjs","scripts/stress/semantic-forcedness-reconcile.mjs"],"successors":{"questions":[],"artifacts":[]},"prospective":{"expectation":"Some multi-successor post-prune states may be semantically forced despite locally admissible branches.","surprise":"Two states proved forced, both in one parent, but 84.4% of child cases remained UNKNOWN at 20s.","anomaly":null}} -->

## Result: demonstrated missing semantic forcedness, limited reference observability

The completed [PG-H run 38977850830](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/38977850830) froze eight independent parent IDs (R00242, R02941, R03030, R02405, R01229, R02307, R02561, R02240), observed 16 eligible 2..4-child parent states, and made 45 exact child-prefix queries. All eight CP-SAT shards succeeded; the combiner matched all 45 unique cases with **zero missing cases, input alarms or correctness alarms**.

| Exact child disposition | Count | Meaning |
|---|---:|---|
| LIVE | 3 | referee-valid exact completion |
| DEAD | 4 | CP-SAT infeasibility in the supported model |
| UNKNOWN | 38 | timed out at 20 s; never infer DEAD |
| **All** | **45** | 8 parents / 16 sibling-state groups |

**Two of the 16 sibling-state groups were fully resolved, and both were semantically forced.** They are *correlated evidence from one independent parent*, **R00242**:

- `R00242:g458762:s0:d0`: child `c0` LIVE, `c1` DEAD.
- `R00242:g458762:s1:d1`: child `c0` DEAD, `c1` LIVE.

The third LIVE occurred on R02941 with unresolved siblings; two additional DEAD results occurred on R02240 with unresolved siblings. The remaining 14 sibling groups are `unresolved`, not branching or semantically dead. The 2/2 rate **among the resolved states** is not an estimate of semantic-forcedness prevalence: only 2/16 states fully resolved, 1/8 parent families contributed proof, and 38/45 child cases (84.4%) abstained at this information budget.

This is a **positive mechanism-existence** result but a **negative 20-second early-prefix information-throughput** result. Re-running the same shallow (depth 0–1) sample unaltered is not worthwhile. Study features distinguishing the four fully labelled R00242 continuations first, then price whether a deeper-prefix, outcome-blind observer produces enough exact resolution at fixed information cost. Avoid replacing unknown outcomes with guessed negatives, and do not introduce a production CP-SAT query or prune.

## Decision this pilot can make

At a normal beam hard-prune seam, several children may survive yet only one may possess an exact valid completion. Such **hidden semantic forcedness** could justify a future cheap recognizer or branch prioritizer, but only if it occurs at interesting depth and enough work to matter. Merely finding exact-D E A D children is not a cold solve. The pilot first tests whether this type of branching exists, how often reference answers resolve within a small time allowance and whether its work/headroom could plausibly pay for a lightweight consumer.

## Frozen prospective selection

From the current `data/stress/stress-levels-random.json` file, sort the entire level population by SHA-256 of `pg-h-semantic-forcedness-20261016-pilot-001|<id>`, tie-break by ID, and take the first **8 parents** before inspecting a child reference label. The materializer writes full ID/position list, input file SHA-256 and runner commit in the uploaded capture artifact. Each independent unit is the level parent, not each correlated prefix/child.

The capture uses `scripts/stress/semantic-forcedness-capture.mjs` with **objectiveFirst, width 500, 500,000 canonical work per gate, 10-minute wall-safety limit, 2..4 ordinary-prune-surviving children, first two eligible parent states per gate**. Group membership depends on production-only generation order, never an exact oracle label. Preserve per-gate reach, termination and work. Reject an empty sample and fail rather than silently select more than 320 child cases.

## Reference protocol

All selected explicit child prefixes use the **existing** `cpsat-explicit-prefix-reference.mjs` and canonical `extractExplicitPrefixCases` normalizer. CP-SAT is bounded to 20 seconds per child, sharded across eight jobs; UNKNOWN, unsupported mechanics, invalid inputs and errors remain abstentions. Every LIVE claim needs the existing native referee validation of the CP-SAT witness. Combine all eight shards through the maintained integrity checker before classifying any parent; no missing rows accepted.

Reconcile via `semantic-forcedness-reconcile.mjs`. The only immediately decision-worthy verdict is whether any **fully resolved** multi-successor state has exactly one LIVE child, alongside its opportunity prevalence and measured parent-expansion work. Report unknown share, independent-parent count, depth, control-side exposure and per-case costs. Do not divide by only answered cases and present that as the population rate without coverage caveats.

## Stop / continuation

- Zero eligible children: capture/population incompatibility; inspect instrumentation before buying more exact queries.
- Majority unknown: improve the exact-observability pilot, do not infer absence of semantic forcedness.
- Fully resolved but no hidden forcedness across selected parents: close this **bounded early-state/width-500 form**, not the parent premise at other depths/techniques.
- Positive forcedness: first test a **cheap current-state discriminator** against the exact labels and price its cost at the real beam seam. A costly CP-SAT oracle is not a plausible near-typical-budget consumer.
- Keep results in dated evidence and update the canonical workstream next gate; no production flag promotion without a legal current-input, matched-work cold A/B and independent confirmation.

Execution used a temporary branch-local workflow, retained through git history and completed GHA run 38977850830. The workflow is removed from the final PR to avoid converting a one-off into unregistered standing CI infrastructure. Full manifests, exact cases/results and reconciled machine verdict are retained as run artifacts; production defaults, hints and canonical baselines were not changed.
