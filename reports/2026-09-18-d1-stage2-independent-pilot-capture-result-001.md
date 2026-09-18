# D1 Stage 2 independent pilot: capture complete, annotation blocked on tractable exact-query execution

> **Status:** inconclusive
> **Last evidence:** 2026-09-18 — Stage 1 canary at scale, an 8-parent Stage 2 capture, and a GHA-execution seam for exact annotation, all under `docs/solver-d1-production-inert-evidence-preflight.md`.
> **Decision:** the D1 production-inert observation infrastructure (merged in #1880) is now validated end-to-end through capture, and a working, tested GHA execution path for exact annotation now exists (`cpsat-explicit-prefix-reference.yml` extended with a `pinRevisit` case field, plus a converter/reconciler pair). But the frozen confirmation-role population's true per-cell query volume is now precisely known and is too large to responsibly dispatch as one CI campaign without an explicit sizing decision: **220,841 independent CP-SAT queries** (6,663 eligible candidates x an average ~33 revisit cells each) across the 1,339 eligible decisions. At the ~15-30s/query cost measured locally, that is on the rough order of 1,000-1,800 CPU-hours. No D1 disagreement/economics conclusion is drawn from this report; a mechanical smoke test on one real candidate (6 cells) did complete and is reported below only as pipeline validation, not as population evidence.
> **Remaining gate:** decide and run a deliberately bounded exact-annotation case population (see Reopen/next gate) through the now-working GHA path, sized well below 220,841 cases, before any Stage 2/3 disagreement or economics verdict.

> **Research question:** `WS2-D1-PRODUCTION-INERT-OBSERVATION`
> **Premise refs:** `P091`, `P065`, `P206`
> **Measurement opportunity:** `MO-002`

> **Evidence role:** confirmation (capture only; annotation incomplete)
> **Selection:** prespecified — 8 parents drawn by seeded deterministic uniform sampling before any D1 outcome existed
> **Population identity:** Corpus 2 (`data/stress/stress-levels-random.json`), current Class-5 primary-class rows from `reports/stress/residual-atlas/2026-09-11-post-1029-671/atlas.json` (388 rows), minus the 3 D1 development parents (`S00030`, `R00104`, `R03147`), sampled with `scripts/stress/select-random-sample.mjs --sample=8 --seed=d1-stage2-independent-pilot-2026-09-18`. Resulting parents: `R02270`, `R02399`, `R02408`, `R02425`, `R02551`, `R02666`, `R02676`, `R03191`. Each captured via `solver:capture-d1-decisions -- --execution-boundary=production-orchestration --evidence-role=confirmation --node-budget=200000 --budget-ms=1200000`.
> **Selection history:** none of the 8 parents has previously been used for D1 development/tuning. The Class-5 atlas itself is a 2026-09-11 residual classification (388 rows vs. the current 390 in the 2026-09-16 production-boundary refresh); the 2-row drift is immaterial to sample selection and does not select on D1 outcomes.
> **Inference scope:** none yet — this report establishes population/capture only. No SUPPORTED D1 classification exists for a large, trustworthy fraction of this population (see below), so no disagreement-rate, cutoff-crossing, or economics claim is made.

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

To validate the new tooling, `R02270`'s `score-width-culled@14#0` decision (5 eligible candidates, 67 revisit-cell cases) was converted and run through the real executor with `ortools` present: every result observed is genuine `dead`/`timeout-abstain` CP-SAT output (no `live`), confirming the pipeline reproduces exactly the behavior already confirmed in the isolated 3-case check above rather than the earlier no-`ortools` artifact. The first candidate's full 13-cell set completed (6 `dead`, 7 `timeout-abstain`); feeding those genuine labels into `reconcile-d1-explicit-prefix-cases.mjs` correctly reconstructed the `annotate-d1-production-decisions.mjs`-shaped output (`support: UNKNOWN` via `classifyD1CandidateQueryResults`, matching field-for-field what the local annotator would have produced). This is pipeline/mechanism validation on one candidate out of 6,663, not a disagreement-rate or support-rate finding.

## Disposition

- Stage 1 (canary): **concluded-positive.** Instrumentation is sound at scale under the production-orchestration boundary.
- Stage 2 capture: **concluded-positive.** Frozen, independent, parity-clean, committed population of 1,339 eligible decisions across 8 parents.
- GHA execution seam: **concluded-positive.** `pinRevisit` extension, converter, and reconciler are implemented, tested, and mechanically validated end to end.
- Stage 2 annotation at population scale: **inconclusive — blocked on a sizing decision, not on a negative result or an unsolved engineering problem.** The full 220,841-case population is technically executable but was deliberately not dispatched pending an explicit scope decision (see next gate). No `SUPPORTED`/disagreement-rate finding exists yet.
- No advancement or stop verdict is reached on `WS2-D1-PRODUCTION-INERT-OBSERVATION`. The premise and consumer are unchanged; the population, its exact query cost, and the execution path are now precisely known.

## Reopen / next gate

1. **Size a bounded first case population deliberately**, before inspecting any further outcomes beyond the single smoke candidate above (which is excluded from whatever population is chosen, to avoid re-using peeked evidence). A reasonable starting point: a fixed, small number of eligible decisions per parent (e.g. 3-5), chosen by decision-ordinal order (mechanical, not outcome-selected), run through `d1-decisions-to-explicit-prefix-cases.mjs` -> `cpsat-explicit-prefix-reference.yml` -> `reconcile-d1-explicit-prefix-cases.mjs`. Label this honestly: a decision-ordinal-truncated subsample of a confirmation-role capture is discovery/development-tier evidence for the disagreement question, not full confirmation, until the whole frozen population is annotated.
2. Only if that bounded run shows non-trivial eligibility-conditional disagreement and a plausible positive information-value envelope, size and dispatch progressively larger slices toward the full 220,841-case population — this is exactly the preflight's own staged-expansion discipline, now applied to the annotation step itself rather than only to parent selection.
3. If even a small bounded slice shows negligible disagreement or overwhelmingly `UNKNOWN`/timeout support, that is informative on its own and should be weighed against the measured per-query cost under the preflight's stop criteria before requesting a larger allocation.
4. Independently, consider whether a cheaper proxy (e.g. a shorter time-limit tier, or a graph-reachability pre-filter before invoking CP-SAT) could reduce the ~33-cells/candidate cost without weakening the ZERO/NONZERO/UNKNOWN semantics — but treat that as a separately justified investigation, not a prerequisite for step 1.

Do not repeat the discarded 30-second-timeout, no-`ortools` local run from earlier in this session, and do not report its 100%-`UNKNOWN` numbers anywhere as evidence.
