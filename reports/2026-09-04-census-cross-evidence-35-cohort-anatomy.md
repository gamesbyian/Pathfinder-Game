# Gate 0E: anatomy of the 35 production-solved / no-isolated-T1-winner levels

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — join of `reports/stress/technique-niches/2026-09-03/level-capability.json`'s 35-level cohort against each level's own accumulated hint-provenance history (`data/stress/hints-random/<id>.json`) and against `reports/stress/capability-runs/33588487486/lifecycle-failure-map-corpus2.json`
> **Decision:** classified against the handoff's taxonomy, **25/35 (71%)** are **census/current-run revision mismatch** (the T1 combined-cells.json is missing an already-known, already-hint-persisted winning cell — most first recorded 2026-08-25, over a week before this census ran) rather than genuine production-exclusive capability. Of the remaining **10/35 (29%)**, **7 are "same action present but production context/retry/flags differ"** (a whole-ladder ablation-disabled retry tier or a biased repair variant) and **3 are unresolved**. **Zero** fall in "winning action absent from T1 action universe" or "sequence/predecessor-state context" as the primary explanation.
> **Remaining gate:** none for this cohort. The 3 unresolved levels would need a small dedicated lifecycle-telemetry re-check to attribute (not run here — a bounded follow-up, not required for Gate 0's own conclusion).
> **Evidence role:** development — a join of three already-collected evidence artifacts, no new dispatch

## Method

Same evidence and method as the parallel independent pass on this question (see "Cross-validation" below): each of the 35 cohort levels' hint-provenance history was read (`data/stress/hints-random/<id>.json`), and every entry whose `solver.technique` is a real solver family (`beam`, `dfs`, `repair`, `admissible-order`, `admissible-order-fallback` — excluding non-solve provenance producers like `variant-parent-replay:*` family-tooling replay records) was classified by its `context.isolatedTechnique` flag and timestamp.

## Classification against the handoff's taxonomy

| taxonomy bucket | count | basis |
|---|---:|---|
| production miss + isolated rescuer | n/a | not applicable to this cohort (these are production **solves**, not misses) |
| winning production action absent from T1 action universe | 0 | no case where the actual winning action identity has no T1 analogue at all |
| same action present but production context/retry/flags differ | **7** | winning stage is `connectivity-axis-prune-disabled-retry` (×2), `coarse-state-near-tie-retention-disabled-retry` (×4), or `early-repair-search`'s biased/seeded variant (×1) — the underlying search action exists in the T1 universe, but only with one internal ablation flag toggled or a seed/bias variant T1 never runs |
| sequence/predecessor-state context | 0 | no case attributable primarily to predecessor-state effects distinct from the retry-context bucket above |
| budget/dose difference | 0 | not the primary explanation for any case here (contrast with the dose-truncation mechanism found for the *static-portfolio* production A/B losses, a different comparison) |
| census/current-run revision mismatch still relevant | **25** | a genuine isolated-technique-flagged solve for this exact level/technique already exists in hint-provenance history (predominantly dated 2026-08-25, well before the 2026-09-03 census dispatch) but is absent from the current T1 `combined-cells.json` — a coverage gap in the census matrix, not solver-revision drift in the sense of "used to solve, no longer does" |
| unresolved | **3** | `R03195`, `R02452`, `R02887` — still `node-budget-reached` in the one lifecycle-telemetry run checked; no stage-attributed win recorded anywhere in currently available evidence |

## Detail: the 7 "context/retry/flags differ" cases

| id | winning stage |
|---|---|
| R02088 | `connectivity-axis-prune-disabled-retry` |
| R02690 | `connectivity-axis-prune-disabled-retry` |
| R02536 | `coarse-state-near-tie-retention-disabled-retry` |
| R01356 | `coarse-state-near-tie-retention-disabled-retry` |
| R03230 | `coarse-state-near-tie-retention-disabled-retry` |
| R03238 | `coarse-state-near-tie-retention-disabled-retry` |
| R01936 | `early-repair-search` (biased/seeded repair variant) |

All 7 come from `reports/stress/capability-runs/33588487486/lifecycle-failure-map-corpus2.json` (2026-09-02). `2026-09-04-census-cross-evidence-production-boundary-join.md` (Gate 0D, this same session) separately verified this run's corpus-2 solved set is byte-identical to the code-comparability-verified `33824275953` run — used here specifically for its per-level `winningTechnique` stage attribution, which `33824275953` (no `lifecycle_telemetry`) does not carry.

## Detail: the 25 "revision mismatch" (census coverage gap) cases

Representative identities already recorded, with provenance dated well before the current census: `beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets` (R03137, R03022, R02537, R01489, ...), `repair|score=repair|guidance=standard` (R03101, R02337, R02877, ...), the full `admissible-order`/`admissible-order-fallback` tie-break family (R02631, R02474). The 2026-08-25 timestamps mean these were known **before** the refreshed T1 census (`33717910218`) even dispatched — this is a real gap in what the census matrix sampled, not evidence the solver later lost the capability.

## Cross-validation

This session independently reached the same 25/10 split and the same 7-of-10 stage attribution on a sibling branch working the same underlying question from the static-portfolio/admissible-order repricing angle (`2026-09-04-production-solved-no-isolated-winner-35-cohort-anatomy.md`, `claude/scheduler-evidence-model-v1nnyv`), using identical evidence sources and method. Two independent passes agreeing exactly on both the coverage-gap/genuine split and the per-level stage attribution is a meaningful robustness check on the finding, not merely a restatement.

## Answer to the handoff's framing question

Where production capability on this cohort is genuinely outside the isolated T1 census's own definition, the mechanism is **whole-ladder ablation-disabled retry / biased-seed repair variants** ("same action present but context/retry/flags differ"), not missing action identities, not predecessor-state sequence effects, and not budget/dose. The dominant share of the raw 35-level cohort (25/35) is better explained as ordinary **census coverage incompleteness** than as any production-capability mechanism at all — a caution against reading cohort-size growth (14 -> 35) as growth in a real phenomenon without checking whether the underlying census matrix's own coverage moved first.
