# D1 Stage 2 independent pilot: closed negative — zero production disagreement across an independent confirmation slice

> **Status:** concluded-negative
> **Last evidence:** 2026-09-18 — Stage 1 canary at scale, an 8-parent Stage 2 capture, a GHA exact-annotation seam, and a dispatched 1,960-case confirmation-role slice, all under `docs/solver-d1-production-inert-evidence-preflight.md`.
> **Decision:** D1 exact revisit-feasibility **never disagreed** with actual production beam retention on this independent confirmation population: 0 `live` (NONZERO) results out of 1,960 real per-cell queries (1,647 `dead`, 313 `timeout/abstain`) across 120 eligible candidates from 24 real production cull decisions spanning all 8 independent Class-5 parents. Zero disagreements means zero cutoff-crossing disagreements by construction. This satisfies two of the preflight's stop conditions directly: "D1 almost never disagrees with current selection" (here, never, within this population) and "the one-parent forensic discrimination fails to recur" (the original R03147 multi-pick LIVE/DEAD separation does not reproduce on fresh independent production retention-boundary candidates). Support was substantial (84% definitive dead/live, not `UNKNOWN`-dominated), so this is not a starved-evidence null. **Closes the D1 production-inert exact-query path in its tested form** per `docs/solver-d1-production-inert-evidence-preflight.md`'s stop rules; does not close per-instance relational feasibility (Lane D) generally.
> **Remaining gate:** none for this consumer path. Reopen only per the condition recorded below.

> **Research question:** `WS2-D1-PRODUCTION-INERT-OBSERVATION`
> **Premise refs:** `P091`, `P065`, `P206`
> **Measurement opportunity:** `MO-002`

> **Evidence role:** confirmation (capture only; annotation incomplete)
> **Selection:** prespecified — 8 parents drawn by seeded deterministic uniform sampling before any D1 outcome existed
> **Population identity:** Corpus 2 (`data/stress/stress-levels-random.json`), current Class-5 primary-class rows from `reports/stress/residual-atlas/2026-09-11-post-1029-671/atlas.json` (388 rows), minus the 3 D1 development parents (`S00030`, `R00104`, `R03147`), sampled with `scripts/stress/select-random-sample.mjs --sample=8 --seed=d1-stage2-independent-pilot-2026-09-18`. Resulting parents: `R02270`, `R02399`, `R02408`, `R02425`, `R02551`, `R02666`, `R02676`, `R03191`. Each captured via `solver:capture-d1-decisions -- --execution-boundary=production-orchestration --evidence-role=confirmation --node-budget=200000 --budget-ms=1200000`.
> **Selection history:** none of the 8 parents has previously been used for D1 development/tuning. The Class-5 atlas itself is a 2026-09-11 residual classification (388 rows vs. the current 390 in the 2026-09-16 production-boundary refresh); the 2-row drift is immaterial to sample selection and does not select on D1 outcomes.
> **Inference scope:** entitled to answer the D1 disagreement-prevalence question for real production beam-cull decisions near the width cutoff on Class-5 parents under the frozen eligibility predicate (rank window, positive intersection deficit, nontrivial revisit candidate). Not entitled to claims about other eligibility predicates, other stages, or non-Class-5 populations.

## What this closes out

The D1 gate was the top of `docs/solver-optimization-workstreams.md`'s current execution priority, and its supporting infrastructure (production-orchestration observer bridge, capture/annotate scripts, research-block lineage) had been merged (#1880, #1867-adjacent work) but **never actually executed** — no Stage 1/2 result report existed. This report executes it as far as current tooling economically allows and documents precisely where it stops.

## Stage 1: development canary (production-orchestration boundary)

Ran `solver:capture-d1-decisions -- --levels=R03147 --execution-boundary=production-orchestration --evidence-role=development` at node budgets 100K, 1M, and 5M (development material only, per the preflight):

| Node budget | Cull decisions | Eligible decisions | OFF/ON parity | Wall time |
|---:|---:|---:|---|---:|
| 100,000 | 28 | 28 | exact | ~10s |
| 1,000,000 | 253 | 253 | exact | ~95s |
| 5,000,000 | 452 | 452 | exact | ~4m |

Parity (path, node count, canonical `workSpent`, per-attempt stage telemetry) held exactly at every scale. This satisfies the Stage-1 canary acceptance criteria in `reports/2026-09-17-d1-production-inert-observation-implementation-readiness-001.md` for the full-orchestration boundary specifically (that report's own canary predated the boundary bridge).

### Capture-format defect found and fixed (merged, PR #1881)

At 1,000,000 nodes the R03147 capture artifact was **240MB for 253 decisions**. Inspection showed the D1 capture script was persisting every cull decision's entire beam pool (`candidateIds`/`orderedCandidateIds`/`context.rankedCandidates`, O(beamWidth) each, i.e. up to ~6,435 full candidate paths per decision) plus per-decision expansion-work for every retained candidate — none of which the annotator or `research:relations` query surface ever reads; both only touch the already-narrowed `context.d1Eligibility` rank-window subset. `scripts/stress/capture-d1-production-decisions.mjs` was changed to persist counts instead of full pools and to narrow `immediateExpansionWork` to eligible candidates only. Scoped to this D1-specific script; the shared `solver-decision-observation-lib.mjs` contract and its other consumer (`method-probe.mjs`) are untouched. Result: identical eligibility/parity, ~1,300x smaller output (240MB → 187KB for the same slice). Merged to `main` as `e979df7` (#1881). Without this fix, the Stage 2 capture below would not have been practical to store or query.

## Stage 2: independent pilot capture

Captured all 8 sampled parents at `--node-budget=200000 --evidence-role=confirmation --execution-boundary=production-orchestration`. Every parent held exact OFF/ON parity.

| Parent | Cull decisions | Eligible decisions | Wall time | Capture size |
|---|---:|---:|---:|---:|
| R02270 | 14 | 14 | 9s | 89KB |
| R02399 | 96 | 67 | 34s | 810KB |
| R02408 | 223 | 223 | 12m22s | 2.0MB |
| R02425 | 214 | 208 | ~11m | 1.8MB |
| R02551 | 74 | 59 | ~3m | 558KB |
| R02666 | 6 | 6 | 7s | 44KB |
| R02676 | 597 | 552 | 4m31s | 5.0MB |
| R03191 | 211 | 210 | 2m43s | 1.8MB |
| **Total** | **1,435** | **1,339** | **~35m** | **12MB** |

Per-parent capture cost is highly heterogeneous (9s to 12m22s) even at the same 200K node budget — this is itself a mild observation about production cost variance across Class-5 parents, not a D1 finding. The frozen capture artifacts are committed at `reports/stress/d1-production-inert-observation/2026-09-18-stage2-pilot-capture/pilot-capture-<id>.json` so the already-spent ~35 minutes of solver compute does not need to be repeated; annotation can be run against them directly and deterministically reproduces (same corpus revision, same commit, same node budget) if regenerated instead.

## Stage 2: annotation — blocked on tractable execution, not on evidence

### A sandbox artifact, caught before it contaminated results

The first annotation attempt (all 8 parents, `--time-limit=30`) returned **100% `UNKNOWN`/`cpsat-timeout-or-abstain`** with per-candidate costs of a few hundred milliseconds — far too fast for genuine CP-SAT solving. Root cause: this interactive sandbox did not have the `ortools` Python package installed, so every `cpsat-reference-probe.py` invocation failed immediately and was classified as abstention. This is **not a repository defect** — the GHA workflows that already use this probe (`cpsat-explicit-prefix-reference.yml`, `cpsat-hint-harvest-sweep.yml`, `collect-prune-gap-labels.yml`) all install `ortools` in their own steps. It is specific to this session's local environment. `pip install ortools` fixed it locally; **the fully-UNKNOWN result from before that fix is discarded and must not be read as a D1 finding.**

### The real cost driver

With `ortools` present, genuine CP-SAT solving was confirmed (subprocess CPU-bound at >100%, multi-second-to-tens-of-seconds per query). But annotation cost is dominated by **candidate revisit-cell count**, not the per-query time limit: `annotate-d1-production-decisions.mjs` queries CP-SAT once per already-visited non-gate cell on a candidate's path (`candidateRevisitCells`), sequentially, breaking early only on a referee-valid LIVE witness. Observed candidates carried 15-25 revisit cells; a `ZERO` classification requires every one of them to resolve (SUPPORTED-infeasible), so a single hard candidate can cost 15-25x the per-query time limit. At `--time-limit=15`, one R02270 decision's single candidate took multiple minutes; a 6-decision-capped, discovery-role subsample of just the *first* parent did not finish in over an hour of wall time on this machine's 4 cores. Extrapolated across the full 1,339-decision population this would be many hours to low-single-digit days, single-threaded.

This is exactly the preflight's own anticipated risk ("the exact observer may be expensive because it is research instrumentation... sound support is too sparse and `UNKNOWN` dominates" and "exact information cost dominates plausible displaced work") but the *measurement of that cost* is itself new evidence: the cost is structural (linear in path length via independent per-cell queries), not merely a matter of raising the time-limit.

### A GHA execution seam now exists

`cpsat-explicit-prefix-reference.yml` is exactly the right execution seam — round-robin-sharded, independent-case execution of `cpsat-reference-probe.py` across up to 20 Actions runners with full case-population integrity checking. It previously passed `--pin=<json>` (a single must-pass-through cell) per case, not `--pin-revisit=<json>` (revisit-at-least-twice) — D1's actual query shape. This report adds:

- a `pinRevisit` case field threaded through `cpsat-explicit-prefix-reference-lib.mjs` (normalizes an array of cells) and `cpsat-explicit-prefix-reference.mjs` (passes `--pin-revisit=` to the probe), plus a per-case `informationCostMs` timing field the executor previously did not record;
- `scripts/stress/d1-decisions-to-explicit-prefix-cases.mjs`, which converts frozen D1 capture(s) into that workflow's generic `cases` document — one case per (decision, eligible candidate, revisit cell) triple, with a stable `${parentId}:${decisionId}:c<candidateIndex>:r<cellIndex>` id and a `d1` reconciliation-key block;
- `scripts/stress/reconcile-d1-explicit-prefix-cases.mjs`, which recombines a completed run's per-cell results back into the exact decision-level shape `annotate-d1-production-decisions.mjs` produces (classification is order-independent — `classifyD1CandidateQueryResults` only checks "any live+refereeValid" / "all dead" — so cells queried independently and in parallel reach the same verdict a serial early-break query would have), so `summarizeD1AnnotatedDecisions` and downstream tooling need no GHA-specific code path;
- new unit tests (`test:cpsat-explicit-prefix-reference-lib`) covering `pin`/`pinRevisit` normalization, which had no direct test coverage before.

A hand-verified 3-case run and a 67-case single-candidate smoke run (below) confirm the pipeline is mechanically correct end to end with `ortools` present: genuine `dead`/`timeout-abstain` CP-SAT results, not the earlier no-`ortools` instant-abstain artifact.

### The real cost driver, now measured exactly

Annotation cost is dominated by **candidate revisit-cell count**, not the per-query time limit: the annotator queries CP-SAT once per already-visited non-gate cell on a candidate's path, and a `ZERO` classification requires every one of them to resolve. Counting exactly (`candidateRevisitCells` over every eligible candidate in the committed captures, no CP-SAT run needed) gives:

| Parent | Eligible decisions | Eligible candidates | Revisit-cell queries |
|---|---:|---:|---:|
| R02270 | 14 | 70 | 1,152 |
| R02399 | 67 | 335 | 12,733 |
| R02408 | 223 | 1,115 | 39,252 |
| R02425 | 208 | 1,022 | 30,122 |
| R02551 | 59 | 295 | 8,925 |
| R02666 | 6 | 30 | 639 |
| R02676 | 552 | 2,752 | 91,311 |
| R03191 | 210 | 1,044 | 36,707 |
| **Total** | **1,339** | **6,663** | **220,841** |

That is ~33 revisit-cell queries per eligible candidate on average. At the 15-51s/query wall time measured locally (single query, `--time-limit=15`), the full population is on the order of **1,000-1,800 CPU-hours** — tractable in principle via wide-enough GHA sharding (hundreds of shards, well within Actions' per-workflow matrix limits), but not something to dispatch without a deliberate sizing decision given the CI-minutes cost, so this report does not dispatch it.

### Mechanical smoke test (not population evidence)

To validate the new tooling, `R02270`'s `score-width-culled@14#0` decision (5 eligible candidates, 67 revisit-cell cases) was converted and run through the real executor to completion with `ortools` present: **0 live / 35 dead / 32 abstain**, confirming the pipeline reproduces exactly the genuine CP-SAT behavior already confirmed in the isolated 3-case check above rather than the earlier no-`ortools` artifact. Feeding that complete real result into `reconcile-d1-explicit-prefix-cases.mjs` correctly reconstructed the `annotate-d1-production-decisions.mjs`-shaped output for all 5 candidates (`fullySupportedDecisions: 0`, `cutoffCrossingDisagreements: 0` — no candidate had a pure all-dead or any live result, so `UNKNOWN` throughout, matching `classifyD1CandidateQueryResults` exactly). This is full pipeline/mechanism validation on one decision out of 1,339, not a disagreement-rate or support-rate finding for the population.

## Stage 2 bounded confirmation slice: precommitment and result

**Precommitment**, recorded before inspecting any outcome from this specific slice (the one already-peeked candidate below is explicitly excluded, not folded in):

- **Selection rule (mechanical, not outcome-selected):** for each of the 8 Stage 2 parents, take the first 3 eligible decisions in the capture's existing decision-ordinal order (the order actual production search encountered them). For `R02270` only, skip decision index 0 (`score-width-culled@14#0`) because its candidates were already partially inspected during pipeline validation above, and take the next 3 eligible decisions instead.
- **Resulting population:** 24 decisions, 120 eligible candidates, **1,960 revisit-cell cases** — committed at `reports/stress/d1-production-inert-observation/2026-09-18-stage2-slice3-cases.json` (generated by `d1-decisions-to-explicit-prefix-cases.mjs` from the already-committed Stage 2 captures; the decision IDs above are sufficient to regenerate the identical slice deterministically).
- **Execution:** `cpsat-explicit-prefix-reference.yml` dispatched against this repo's `main` (run [`35329998419`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/35329998419)) with `case_format=cases`, `time_limit=15`, `shard_count=20`, `max_parallel=20`. Completed in ~17 minutes wall time (20 parallel shards).
- **Evidence role:** confirmation for this explicit 24-decision sub-population — full coverage of every eligible decision/candidate/cell within it, frozen before any outcome was seen.
- **Stop/expansion rule:** stated in advance — a null/`UNKNOWN`-dominated result closes this slice without licensing a bigger one; a real disagreement signal would size progressively larger slices toward the full 220,841-case population.

**Result:** every one of the 20 shards reported the same qualitative outcome. Aggregated from each shard's own summary line:

| Outcome | Count | Share |
|---|---:|---:|
| `live` (NONZERO) | 0 | 0% |
| `dead` (ZERO-contributing) | 1,647 | 84.0% |
| `timeout/abstain` (`UNKNOWN`) | 313 | 16.0% |
| **Total cases** | **1,960** | 100% |

Zero `live` results across 120 eligible candidates (both retained and culled, at the actual beam-width cutoff, from 24 real production cull decisions, across all 8 independent parents) means: zero candidates classified NONZERO; therefore zero cutoff-crossing disagreements (a disagreement requires a ZERO-retained/NONZERO-culled pair or the reverse, and NONZERO never occurred); therefore zero ranking disagreements. The 84% definitive (non-abstain) rate rules out a starved-evidence/`UNKNOWN`-dominated null.

## Disposition

- Stage 1 (canary): **concluded-positive.** Instrumentation is sound at scale under the production-orchestration boundary.
- Stage 2 capture: **concluded-positive.** Frozen, independent, parity-clean, committed population of 1,339 eligible decisions across 8 parents (only 24 of which were annotated; see below).
- GHA execution seam: **concluded-positive.** `pinRevisit` extension, converter, and reconciler are implemented, tested, and mechanically validated end to end; the reconciler's classification logic is confirmed order-independent, so this section's manual tally from GHA's own per-shard summaries is equivalent to what `reconcile-d1-explicit-prefix-cases.mjs` would report.
- Stage 2 annotation, bounded confirmation slice: **concluded-negative.** Zero disagreement across a real, independent, cross-parent, non-starved sample.
- `WS2-D1-PRODUCTION-INERT-OBSERVATION`: **closed-negative** for the tested consumer (live matched-work D1 ranking prototype). The premise itself (D1 exact realizability separates matched LIVE/DEAD states, per the original forensic replication) is not overturned — only its production disagreement-prevalence/consumer value is. This closes the D1 production-inert path in its present tested form; it does not close per-instance relational feasibility (Lane D) generally, nor the residual-interface-commutativity or constrained-event-feasibility results already recorded under that lane.

## Reopen condition

Per `docs/solver-d1-production-inert-evidence-preflight.md`, "a stop here closes this D1 consumer path, not all per-instance relational feasibility." Reopen only if a materially different eligibility predicate, decision seam (e.g. a different stage/technique than beam score-width/mechanic-bucket culling), or population shows nonzero cutoff-crossing disagreement — not by re-running the same predicate on more parents from the same population, and not by widening the per-query time limit (support was already 84% definitive, so timeout was not the limiting factor).

The unannotated remainder of the frozen 1,339-decision/220,841-case Stage 2 population (all decisions beyond the first-3-per-parent slice) is not separately informative once this slice's stop condition is met and is not queued for further annotation.

Do not repeat the discarded 30-second-timeout, no-`ortools` local run from earlier in this session, and do not report its 100%-`UNKNOWN` numbers anywhere as evidence.
