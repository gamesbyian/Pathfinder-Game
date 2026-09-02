# Static portfolio construction pilot: EW1 greedy ranking vs. real production win frequency

> **Status:** concluded-positive
> **Last evidence:** 2026-09-02 — this report
> **Decision:** Do not build a rung-2 fixed-work static portfolio from the EW1 60-level greedy ranking alone; it is a hard-residual-stratum sample and 3 of its top-7 picks never win in real production. Any future rung-2 candidate construction/A/B must anchor on the real production win-frequency ranking below (or a materially larger/representative sample), using EW1 only for its complementary oracle-exclusivity signal.
> **Remaining gate:** none for this pilot. The next gate-sequence (C) step is a materially larger design/implementation effort (a real bounded fixed-work portfolio scheduler mode + population-scale A/B), not yet started — see "Next gate" below.
> **Evidence role:** discovery
> **Selection:** observational — both rankings report their full curve (all 34 techniques), not a cherry-picked cardinality

## Context

[`docs/solver-optimization-workstreams.md`](../docs/solver-optimization-workstreams.md) Workstream 2's gate-sequence (C) rung 1 ("prune/race existing actions") is closed: four single/paired zero-or-near-zero-production-win DFS-tail action suppression candidates (`PROFILE_closureCommitment`, `PROFILE_nearClosureRescue`, `PROFILE_finishFirst`, alone and combined, on two populations) all came back a clean null — 0 gains/0 losses, aggregate work flat to noise. Per [`solver-scheduling-policy.md`](../docs/solver-scheduling-policy.md)'s complexity ladder, the next step is rung 2: "construct a small fixed-work static portfolio" — evaluated first as the smallest value-of-information pilot available: a **fully offline reanalysis of already-collected data**, no new dispatch.

Two data sources already exist and were not previously combined for this purpose:

1. **EW1 pricing snapshot** (`reports/stress/ew1/33156541827-pricing-snapshot.json`): 34 base attempt-config identities ("techniques"), each run independently to its own 10,000,000-work budget on a fixed 60-level frozen-gap sample (2,015 mechanically eligible cells; 12/60 oracle union). This gives a true per-technique solved/failed outcome for every eligible (level, technique) pair — the only source of real oracle-exclusivity evidence.
2. **Equal-work x production-reach join** (`reports/stress/capability-runs/33588487486/equal-work-production-reach.json`, landed on `main` via its own auto-commit): per-technique real production `winningLevels`/`work` aggregated across the full corpus1+corpus2 population (1,802 rows; 1,073 total production wins). Each production row's `winningConfig` credits exactly one technique, so a win-frequency ranking's cumulative coverage is exact, not overlap-estimated — but it only reflects techniques actually reached/credited under today's routing and reserve order, not full oracle capability.

## Method

New tool: `scripts/analyze-ew1-static-portfolio.mjs` (paired test: `scripts/analyze-ew1-static-portfolio-node-test.mjs`).

- `analyze()`: greedy marginal-coverage set cover over the EW1 technique x level solved matrix. At each step, add the technique that solves the most currently-uncovered levels; ties break toward lower mean `workSpent`, then toward the technique key itself, for full determinism. Reports the complete 34-step ranking, cumulative coverage, a sequential-charge aggregate work figure (see caveat below), and which technique-exclusive levels are still missing at each cardinality.
- `analyzeProductionRanking()`: sorts the same 34 techniques by real production `winningLevels` and reports the exact cumulative-coverage/cumulative-work curve.

Run:

```
node scripts/analyze-ew1-static-portfolio.mjs \
  --pricing-snapshot=reports/stress/ew1/33156541827-pricing-snapshot.json \
  --production-reach=reports/stress/capability-runs/33588487486/equal-work-production-reach.json \
  --out=reports/stress/portfolio/ew1-static-portfolio-construction.json \
  --summary-out=reports/stress/portfolio/ew1-static-portfolio-construction-summary.md
```

Full output (all 34 rows of both curves): [`reports/stress/portfolio/ew1-static-portfolio-construction-summary.md`](stress/portfolio/ew1-static-portfolio-construction-summary.md), machine-readable: [`reports/stress/portfolio/ew1-static-portfolio-construction.json`](stress/portfolio/ew1-static-portfolio-construction.json).

**Work-charge caveat (EW1 curve only):** EW1 priced every technique independently against its own fresh 10,000,000-work budget. Summing prefix `workSpent` as a sequential-portfolio charge only approximates a real shared-envelope run for cells that reached natural exhaustion; a cell whose `status` is `work-budget-reached` would likely spend less real work under a smaller shared remainder. Every row in the EW1 curve reports 0.0% `work-budget-reached` share among its decisive (solving) cells, so this caveat does not materially affect the coverage-vs-cardinality shape reported here, only the absolute work totals.

## Result 1: EW1 greedy ranking (60-level frozen-gap sample)

The full 12/60 oracle union is reached at cardinality **7** (of 34 techniques, ~20% of the menu), at 2,344,208,536 aggregate charged work versus 12,039,808,152 for the full 34-technique menu — about **5.1x less charged work for identical coverage on this population**:

| k | added technique | family | coverage |
|---:|---|---|---:|
| 1 | `beam\|score=intersectionHarvest\|bias=none\|width=5000\|retention=mechanic-buckets` | beam | 5/12 |
| 2 | `beam\|score=perimeterSweep\|bias=perimeterCCW\|width=2000\|retention=plain` | beam | 7/12 |
| 3 | `beam\|score=harvestThenFinish\|bias=none\|width=2000\|retention=plain` | beam | 8/12 |
| 4 | `admissible-order\|tieBreak=nearClosureRescue\|lds=off` | ida | 9/12 |
| 5 | `repair\|score=repair\|guidance=standard` | repair | 10/12 |
| 6 | `dfs\|score=finishFirst\|bias=none` | dfs | 11/12 |
| 7 | `admissible-order\|tieBreak=none\|lds=off` | ida | 12/12 |

## Result 2: real production win-frequency ranking (full corpus1+corpus2, 1,802 rows)

Coverage climbs faster in relative terms and the tail is sharply defined: the top **11** techniques already reach 947/1073 (88.3%) of all real production wins; the top **26** reach **100.0%** (1073/1073). The remaining **8** techniques (of 34) never win a single production level in this joined population:

```
admissible-order|tieBreak=intersectionHarvest|lds=off   0 wins
admissible-order|tieBreak=mustCrossFirst|lds=off         0 wins
admissible-order|tieBreak=nearClosureRescue|lds=off      0 wins
beam|score=harvestThenFinish|bias=none|width=2000|retention=plain   0 wins
beam|score=knotBuilder|bias=none|width=2000|retention=plain         0 wins
dfs|score=closureCommitment|bias=none                    0 wins
dfs|score=finishFirst|bias=none                          0 wins
dfs|score=nearClosureRescue|bias=none                     0 wins
```

Removing this entire zero-win tail **together** (not just the two already individually/jointly tested — `closureCommitment`, `nearClosureRescue`, `finishFirst`, all previously closed negative in isolation) would save at most 203,754,701,458 − 203,025,311,609 = 729,389,849 work units, **0.36% of total charged production work**. This generalizes rung 1's already-closed individual/paired-suppression nulls to the *entire* zero-production-win action set at once: even removing every such action together barely moves aggregate work. **Rung 1 (prune/race existing actions) is now closed with a complete accounting, not just the four previously tested candidates** — the zero-win tail's collective footprint was never large enough to matter, so no descendant of pure zero-win suppression is worth testing further.

## Cross-validation: the two rankings disagree, and that disagreement is itself the finding

Checking the EW1 pilot's 7-technique pick against the real production ranking:

| EW1 pick (rank in greedy order) | Real production rank | Real production wins |
|---|---:|---:|
| `beam\|intersectionHarvest\|width=5000\|mechanic-buckets` | 3 | 121 |
| `beam\|perimeterSweep\|perimeterCCW\|width=2000` | 6 | 76 |
| `beam\|harvestThenFinish\|width=2000` | 30 | **0** |
| `admissible-order\|tieBreak=nearClosureRescue` | 29 | **0** |
| `repair\|score=repair\|guidance=standard` | 1 | 224 |
| `dfs\|score=finishFirst` | 33 | **0** |
| `admissible-order\|tieBreak=none` | 10 | 29 |

**3 of the EW1 pilot's 7 "essential" techniques have never won a single real production level** across 1,802 corpus rows — two of them (`finishFirst`, and `PROFILE_nearClosureRescue`'s tie-break sibling) are exactly the actions rung 1 already tested and closed negative for suppression. Conversely, several of the highest-value real production techniques never appear in EW1's top-7 at all: `beam\|score=perimeterSweep\|bias=perimeterCW\|width=2000` (170 wins, #2 overall), `beam\|score=intersectionHarvest\|width=5000\|retention=plain` (93 wins, #4), `beam\|score=objectiveFirst\|width=5000\|retention=plain` (90 wins, #5).

This is not a bug in either ranking — it is a direct, expected consequence of what EW1's sample *is*: a deliberately mined 60-level **frozen-gap residual stratum** (levels the production baseline does not already solve), not a representative draw. A portfolio built to cover that hard residual naturally needs narrow specialists the residual happens to require and naturally omits the broadly-useful workhorses that solve their assigned levels long before reaching that residual. **Do not use the EW1 greedy ranking alone to select or suppress techniques for a real portfolio decision.** It remains valid, real evidence for oracle-exclusivity claims (which technique is the *only* one that can solve a given hard case) but is the wrong population for a coverage/frequency-based menu-size decision. The real production ranking above is the correct anchor for that question; a future oracle-exclusivity audit should stay clearly labeled as a distinct, narrower claim.

## Rare/exclusive-capability guardrail

Per the workstream's cross-item guardrail ("Scheduler/repricing experiments must report rare-capability retention... audit singleton/doubleton and specialist-only cohorts so a cheaper portfolio does not silently erase distinct capability"): the EW1 curve's `exclusiveLevelsMissing` column (full detail in the JSON/summary artifact) shows every EW1 technique-exclusive level is only recovered once its sole solving technique is added — by construction, since the greedy rule always credits a technique for its exclusive levels the moment it is picked. The real production ranking cannot make an exclusivity claim (a technique's production win does not prove no other technique could also have solved that level — only one was tried to a winning conclusion under real routing), so any future rung-2 candidate that drops a technique below the top ~11–15 by production win frequency should be cross-checked against the EW1 oracle-exclusivity table (or a fresh equal-work census on a representative, not hard-residual, sample) before being treated as safe.

## Next gate

This pilot nominates a much better-informed starting point than either ranking alone: **a real rung-2 candidate portfolio should anchor on the real-production top ranks (roughly the top 11, which already cover 88.3% of wins) plus deliberately retained narrow specialists identified by a *representative* (not hard-residual-only) equal-work census**, not the EW1 60-level sample by itself. Building and dispatching that candidate requires:

1. a real bounded fixed-work portfolio execution mode (an explicit ordered technique list run under `strictTotalWorkBudget`, bypassing `ATTEMPT_POLICY` routing) — a materially larger design/implementation effort against `modules/solver/attempts.ts`'s production orchestration, appropriately left as its own gate per the ladder rather than folded into this offline pilot;
2. a population-scale development A/B on a population that is not the already-heavily-mined EW1 60-level sample, following the usual selection/confirmation rules in [`solver-evaluation-evidence.md`](../docs/solver-evaluation-evidence.md).

This report does not implement or dispatch either; it closes the "smallest value-of-information pilot" step and hands the next agent a concrete, evidence-informed starting candidate design instead of an unguided rung-2 search.
