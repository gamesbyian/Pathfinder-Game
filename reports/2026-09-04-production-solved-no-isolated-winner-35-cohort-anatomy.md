# Anatomy of the 35 production-solved / no-isolated-T1-winner levels

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — join of `reports/stress/technique-niches/2026-09-03/level-capability.json`'s 35-level cohort against each level's own accumulated hint-provenance history (`data/stress/hints-random/<id>.json`) and against the most recent lifecycle-telemetry production run (`reports/stress/capability-runs/33588487486/lifecycle-failure-map-corpus2.json`)
> **Decision:** the raw 35-level cohort overstates genuine census-blind production capability. **25/35 (71%)** already have a genuine isolated-technique-flagged solve recorded in their own hint history — most dated 2026-08-25, more than a week before the 2026-09-03 T1 census (`33717910218`) was generated — meaning these are **T1-census coverage gaps** (a known winning cell simply absent from `combined-cells.json`), not production finding something structurally invisible to isolated testing. Only **10/35 (29%)** show no isolated-technique provenance anywhere. Of those 10, 7 match a recent lifecycle-telemetry production run with an attributable winning stage, and **all 7 are additive whole-ladder retry tiers** (`connectivity-axis-prune-disabled-retry` ×2, `coarse-state-near-tie-retention-disabled-retry` ×4, `early-repair-search` ×1) — **zero** plain main-search wins among the attributable genuine-gap cases. This directly answers the question: where production capability is truly outside the isolated T1 census's own definition, the mechanism is whole-ladder ablation-disabled retry, not mechanic-bucket variants or unexplained sequence effects.
> **Remaining gate:** none for this cohort. The T1-census coverage-gap finding (25/35) is a data-completeness issue for a future census regeneration to consider, not a scheduler decision by itself.
> **Evidence role:** development — a join of three already-collected evidence artifacts, no new dispatch

## Why this cohort needs re-examination

`reports/2026-09-04-technique-census-refresh-direct-analysis-rejoin.md` flagged that the "production solved, no isolated T1 winner" cohort grew from 14 (2026-09-01 snapshot) to 35 (2026-09-03 refresh) and queued asking whether this growth reflects genuine production capability outside the isolated census's representable action space (additive retry contexts, sequence effects, mechanic-bucket variants, repair) or something else.

## Method and an important scoping correction

The 35-level cohort is `reports/stress/technique-niches/2026-09-03/level-capability.json`'s levels with `productionSolved: true` and `isolatedOracleSolved: false`. Checking that artifact's own `sourceIdentities` shows it does **not** join against one specific dated production capability-run file — its `productionSolved` flag derives from the corpus's own accumulated hint-persistence history (whichever run, of many over time, first found and saved a solution), not a single fixed production sweep. This is a real methodological difference from the original `2026-08-25-post-976-portfolio-exposure-rejoin.md`, which explicitly joined one dated production sweep (`32835403128`) against one frozen census (`32240161854`). Because of this, the richest available ground truth for "what actually solved each of these 35 levels, and when" is each level's own hint-provenance history (`data/stress/hints-random/<id>.json`), which records every solver run (isolated-technique or production-context) that has ever found and persisted a solution for that level, with a `context.isolatedTechnique` flag and timestamp per entry.

Each of the 35 levels' hint file was read and every provenance entry whose `solver.technique` is a real solver family (`beam`, `dfs`, `repair`, `admissible-order`, `admissible-order-fallback` — excluding non-solve provenance producers like `variant-parent-replay:*` family-tooling replay records, `ablation-ui:baseline`, `cpsat-full-probe`, and `prefix-anchored`, none of which represent a live solve of the canonical level) was classified by its `context.isolatedTechnique` flag.

## Result: two structurally different sub-cohorts

| sub-cohort | count | share | interpretation |
|---|---:|---:|---|
| has a genuine isolated-technique provenance entry | **25** | 71.4% | **T1-census coverage gap**, not a true capability gap |
| no isolated-technique entry anywhere in hint history | **10** | 28.6% | candidate genuine census-blind production capability |

### The 25-level coverage-gap sub-cohort

Every one of these 25 levels already has at least one hint-provenance entry with `context.isolatedTechnique: true` recording a real solved isolated cell — most first recorded **2026-08-25**, sixteen days before the 2026-09-03 T1 census (run `33717910218`) that currently shows `solverCount: 0` for these same levels. Representative identities: `beam:intersectionHarvest@5000(mb)` (R03137, R03022, R02537, R01489…), `repair:repair` (R03101, R02337, R02877…), the full `admissible-order`/`admissible-order-fallback` tie-break family (R02631, R02474), and a large multi-technique set for R03357/R02718 (10+ distinct isolated winners each, already recorded).

This means the current T1 census artifact (`reports/stress/technique-census/33717910218/combined-cells.json`) has **real, measurable coverage gaps**: known-and-already-hint-persisted winning level/technique cells that simply are not present in the current combined census table. This is consistent with the workstream docs' own note about "one historically partial shard" in earlier census generations and with the general risk that a re-run census can miss cells a differently-scoped prior run covered. It is a census-completeness finding, not evidence that production discovered something isolated testing structurally cannot find — a fresh isolated re-check of these 25 at the same technique would very plausibly reproduce the already-recorded solve.

### The 10-level genuine census-blind sub-cohort

`R02088, R02536, R01356, R03195, R02452, R02690, R02887, R03230, R01936, R03238` show no isolated-technique-flagged entry anywhere in their hint history. Cross-referencing this exact set of 10 against the most recent lifecycle-telemetry production run (`33588487486`, 2026-09-02) that records a per-level `winningTechnique`:

| id | lifecycle-run status | winning stage |
|---|---|---|
| R02088 | success | `connectivity-axis-prune-disabled-retry` |
| R02536 | success | `coarse-state-near-tie-retention-disabled-retry` |
| R01356 | success | `coarse-state-near-tie-retention-disabled-retry` |
| R03195 | node-budget-reached (this run) | — |
| R02452 | node-budget-reached (this run) | — |
| R02690 | success | `connectivity-axis-prune-disabled-retry` |
| R02887 | node-budget-reached (this run) | — |
| R03230 | success | `coarse-state-near-tie-retention-disabled-retry` |
| R01936 | success | `early-repair-search` |
| R03238 | success | `coarse-state-near-tie-retention-disabled-retry` |

**7/10 are directly attributable, and every one of the 7 is an additive whole-ladder retry tier or a biased/seeded repair variant — zero plain main-search wins.** `coarse-state-near-tie-retention-disabled-retry` (4/7) and `connectivity-axis-prune-disabled-retry` (2/7) each disable exactly one internal pruning/retention mechanism and rerun the ordinary main-search menu; `early-repair-search` (1/7) is a seeded/biased repair variant. These are, by construction, outside the T1 isolated census's own definition (`docs/technique-census-analysis.md`: T1 cells are single-technique, no ablation, no retry-tier context) — so it is structurally correct that no isolated cell could represent them, not a coverage gap like the 25-level sub-cohort above. The remaining 3/10 (`R03195`, `R02452`, `R02887`) did not solve within this specific lifecycle run's node budget, so their eventual production solve (recorded elsewhere in the corpus's hint history without a stage-attributed entry, since older hint-schema versions in this dataset do not carry a `stageId` field) cannot be mechanism-attributed from currently available evidence — plausibly a different additive tier, a different seed/run, or run-to-run nondeterminism, but not confirmed.

## Answer to the original question

"Is production systematically getting capability from additive retry contexts, sequence effects, mechanic-bucket variants, repair, or action identities the isolated census doesn't represent?" — **yes, specifically from additive whole-ladder retry contexts (ablation-disabled retries and biased repair variants), not from mechanic-bucket retention variants or unexplained sequence effects**, and only for the genuine 10-level sub-cohort. The other 25/35 of the raw cohort are a census-completeness artifact and should not be read as production capability evidence at all. This reframes the workstream question productively: the real "production capability the isolated census can't represent" residual on this evidence is closer to **10 levels** (0.5% of the 1,962-level census), not 35, and its mechanism is already well-characterized and already reflected in this session's `2026-09-04-production-ladder-marginal-value-tail-audit-001.md` marginal-value table (which independently found these same whole-ladder retry tiers carry real, if rare, per-population value — `coarse-state-near-tie-retention-disabled-retry`/`connectivity-axis-prune-disabled-retry` both won 0/22 on that report's 40-level sample but are shown here to be capable of real wins on other levels, consistent with the low-hit-rate/real-value reading that report already gave them, not a contradiction).

## Caveats

- Hint-provenance history is itself an accumulation across many different tool runs, solver revisions, and dates (some entries span 2026-07 to 2026-09) — a solve recorded months ago does not guarantee the current solver revision reproduces it, though the census-refresh line's own drift finding (`2026-09-03-frozen-technique-census-staleness-spotcheck.md`) suggests such drift is real but modest (3/12 spot-checked) over a two-week span, not the dominant explanation here.
- The 3 unattributed genuine-gap levels remain genuinely unattributed; if this residual becomes decision-relevant, a small dedicated lifecycle-telemetry re-check of just these 3 ids would resolve it cheaply.
- This is one 35-level cohort from one census snapshot; it is evidence about this specific gap's composition, not a general claim about all future production/isolated-census disagreements.
