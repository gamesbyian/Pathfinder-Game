# D1 Stage 2 independent pilot: capture complete, annotation blocked on tractable exact-query execution

> **Status:** inconclusive
> **Last evidence:** 2026-09-18 — Stage 1 canary at scale plus an 8-parent Stage 2 capture, both under `docs/solver-d1-production-inert-evidence-preflight.md`.
> **Decision:** the D1 production-inert observation infrastructure (merged in #1880) is now validated end-to-end through capture. A clean, frozen, independent 8-parent confirmation-role population exists with 1,339 eligible decisions and exact OFF/ON parity. Full exact annotation of that population is not tractable on a single local machine; it requires GHA sharding. No D1 disagreement/economics conclusion can be drawn yet.
> **Remaining gate:** execute exact annotation of the committed capture population via a sharded GHA job (extend `cpsat-explicit-prefix-reference.yml`'s case format to carry `pinRevisit`, or an equivalent shard-per-decision job), then apply the preflight's advancement/stop gates to the complete result.

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

### Why this is not run through GHA in this report

`cpsat-explicit-prefix-reference.yml` already exists as exactly the right execution seam — round-robin-sharded, independent-case execution of `cpsat-reference-probe.py` across up to 20 Actions runners with full case-population integrity checking. It currently passes `--pin=<json>` (a single must-pass-through cell) per case, not `--pin-revisit=<json>` (revisit-at-least-twice) — D1's actual query shape. Converting the 1,339 frozen eligible decisions' candidate/revisit-cell triples into that workflow's case format is a small, well-scoped extension (new `pinRevisit` case field threaded through `cpsat-explicit-prefix-reference-lib.mjs` and `cpsat-explicit-prefix-reference.mjs`'s probe invocation), not a new framework. It was not implemented in this session for lack of remaining time to also validate it properly (parity/schema tests, a real dispatch, and watching a multi-shard run that this workflow itself budgets up to 350 minutes per shard for). Attempting it hastily risked a defect in shared exact-reference tooling other consumers rely on.

## Disposition

- Stage 1 (canary): **concluded-positive.** Instrumentation is sound at scale under the production-orchestration boundary.
- Stage 2 capture: **concluded-positive.** Frozen, independent, parity-clean, committed population of 1,339 eligible decisions across 8 parents.
- Stage 2 annotation: **inconclusive — blocked on execution, not on a negative result.** No `SUPPORTED` D1 classification exists in bulk yet; the one contaminated (pre-`ortools`) pass is discarded, and the one genuine-but-partial pass was stopped deliberately rather than left to run for many hours locally.
- No advancement or stop verdict is reached on `WS2-D1-PRODUCTION-INERT-OBSERVATION`. The premise, consumer, and population all remain exactly as previously stated; only the annotation execution path is now better understood.

## Reopen / next gate

1. Extend `cpsat-explicit-prefix-reference.mjs`/`-lib.mjs` to accept a `pinRevisit` case field that maps to the probe's `--pin-revisit=`, with its own test coverage alongside the existing `--pin=` path.
2. Write a converter from the committed `pilot-capture-*.json` files (`context.d1Eligibility.candidates`/`eligibleCandidateIds`) to that workflow's `cases` document shape, preserving stable per-(decision, candidate, revisit-cell) case IDs for the workflow's existing population-integrity check.
3. Dispatch `cpsat-explicit-prefix-reference.yml` (or a close variant) against the full 1,339-decision population with a bounded per-case time limit (this report suggests starting near 15-30s; the workflow already treats timeout as neutral `UNKNOWN`), sharded generously (the workflow defaults to 20).
4. Recombine into the shape `summarizeD1AnnotatedDecisions` expects (or extend that summarizer to read the sharded case-result format) and apply the preflight's Stage 2/3 advancement and stop gates verbatim.
5. If real-world exact-query cost at GHA scale is still judged to dominate plausible displaced work once genuine SUPPORTED-rate data exists, that is a legitimate stop per the preflight's own cost criterion — but that verdict needs real supported/unknown-rate data, which this report does not yet have.

Do not repeat the discarded 30-second-timeout, no-`ortools` local run, and do not report its 100%-`UNKNOWN` numbers anywhere as evidence.
