# Corpus-2 node-budget losses between capability runs 32459711208 and 32526927206

> **Status:** inconclusive
> **Last evidence:** 2026-08-22 — capability runs `32459711208` (commit `e5034e8c`) and `32526927206` (commit `ce4fc98a`)
> **Decision:** treat the 73 IDs below as candidate regressions from one of four intervening solver-behavior commits, not as noise; do not promote/rely on any config change in that commit range for these levels without re-checking them individually
> **Remaining gate:** bisect the 4 candidate commits (listed below) against a representative sample of the 73 IDs (start with the 57 "comfortable margin" ones) to isolate which commit(s) actually cause the loss

## Origin

Requested by the repo owner while reviewing capability run `32526927206` (level-blind, matched-A/B mode: `deterministic=true`, `persist_hints=false`, dispatched from branch `claude/solver-authority-consolidation-ky6tdq` at commit `ce4fc98a6ec4e87060c740161ea800dd04970a2b`). Corpus 1: 98/102, Corpus 2: 880/1700.

The most recent prior capability run available for comparison is `32459711208` (commit `e5034e8c`, control arm of a since-completed `STRATEGY_REPAIR_LATE_PROBE` A/B, `enableFlags: ""`). Corpus 1: 95/102, Corpus 2: 863/1700.

**This comparison is not apples-to-apples.** `e5034e8c..ce4fc98` contains ~47 commits, most of which are the solver-authority-consolidation refactor itself (verified behavior-neutral throughout via `solver:bench --check` node-count identity on the published 160-level corpus at every step). Filtering to commits that touch `modules/solver/*` and are not part of that refactor leaves exactly four candidates:

- `0b2da5f` — promote `STRATEGY_REPAIR_LATE_PROBE` to production default-ON
- `c4569ef` — fix: provenance can't distinguish full-ladder solves from isolated techniques or retry tiers
- `6f00baf` — fix: `buildDistMap` ignored gates/geese/false-goals, weakening every distance-based bound
- `d21b4fb` — fix: trap-search landmark check, surround goose exemption, path-coordinate and cardinality bugs

None of the 73 IDs below are in the published 160-level corpus, so `solver:bench --check`'s identical-node-count evidence does not cover them — the consolidation refactor is disfavored as the cause but not proven clean for this population.

## The diff

Corpus 2 solved-ID sets, `32459711208` (prior) vs `32526927206` (current):

- **Gained: 90** (solved now, not before)
- **Lost: 73** (solved before, not now) — full list below
- Corpus 1: gained 3 (`R00408`, `R01675`, `R01944`), lost 0

## The 73 lost IDs

```
R00050 R00143 R00180 R00433 R00440 R00527 R01086 R01124 R01211 R01342
R01477 R01489 R01500 R01504 R01535 R01571 R01854 R02010 R02038 R02158
R02168 R02173 R02178 R02198 R02216 R02227 R02229 R02275 R02302 R02337
R02376 R02427 R02434 R02438 R02439 R02452 R02468 R02474 R02484 R02500
R02505 R02567 R02575 R02622 R02624 R02631 R02646 R02655 R02670 R02707
R02718 R02765 R02783 R02798 R02823 R02835 R02842 R02877 R02887 R02890
R02931 R02975 R03045 R03063 R03101 R03137 R03195 R03204 R03211 R03234
R03260 R03333 R03357
```

Source data (both already committed, run-scoped, git-fetchable):
- `reports/stress/capability-runs/32459711208/per-level-corpus2.json`
- `reports/stress/capability-runs/32526927206/per-level-corpus2.json`

Clustering: 59 of the 73 IDs fall in `R02010`–`R03357`, a narrow band relative to Corpus 2's full ID span. Not evenly distributed — argues against pure budget-boundary jitter as the sole explanation.

## Per-level characterization

Cross-referenced every lost ID's row in both runs' `per-level-corpus2.json`.

**All 73 now fail with the same outcome:** `status: "node-budget-reached"`, `winningConfig: null`, `solution: null`. None crash, none report a solver defect directly — every one simply runs out of its node budget before finding a solution that the prior run found well inside budget.

**Margin before the regression, by prior `nodesExpanded` as a fraction of that run's ~100M node ceiling:**

| Prior margin | Count |
|---|---|
| Used >50% of budget (near-ceiling already) | 16 |
| Used ≤50% of budget (comfortable margin) | 57 |

The 57-level majority is the stronger signal — these were not borderline solves before. A few extreme examples (prior `nodesExpanded` → current, both budget-exhausted at run's end):

| ID | Prior nodesExpanded | Prior margin | Current nodesExpanded (exhausted) |
|---|---|---|---|
| `R02975` | 8,486 | 0.008% | 150,000,230 |
| `R02302` | 159,138 | 0.16% | 102,000,006 |
| `R02707` | 174,713 | 0.17% | 150,000,073 |
| `R02173` | 183,291 | 0.18% | 102,000,000 |
| `R03101` | 270,020 | 0.27% | 150,000,230 |

`R02975` solving in 8,486 nodes before and not at all within 150M+ nodes now is the single strongest data point in this set — that is not budget-boundary sensitivity, that is a large behavioral change in what the search does on this level.

**Prior `winningConfig` distribution for the 73 (what technique used to close each one out):**

`dfs:repair:repair` (18), `ida:default` (10), `beam:intersectionHarvest@beam5000` (8), `beam:intersectionHarvest@beam5000(diverse)` (8), `dfs:repair:repair(mustTurnBiased)` (7), `ida:none` (7), `beam:objectiveFirst@beam5000` (4), `beam:perimeterSweep/perimeterCW@beam2000` variants (6), others (5).

No single winning technique dominates, so the cause is unlikely to be "one strategy got worse" and more likely something upstream that affects search cost broadly (pruning/bound strength, ordering) or budget allocation across the ladder.

## Reading

- **Regression, not pure config-sensitivity.** The 57-level "comfortable margin before, total failure now" pattern is inconsistent with these levels merely sitting near a decision boundary that shifts with any config tweak — a boundary-sensitive level would show a modest margin change, not going from 0.008%-of-budget solved to fully exhausted.
- **`6f00baf` (buildDistMap fix) and `d21b4fb` (trap-search/pruning fixes) are the leading suspects.** Both correct pruning/bound logic that had previously been under-strength (ignoring gates/geese/false-goals; landmark/goose-exemption/path-coordinate bugs). A bound or prune that becomes more conservative — because it was previously wrong in a way that happened to cut search space aggressively — can turn a fast prior solve into a budget-exhausted one on affected levels while also *fixing* correctness elsewhere (consistent with the 90 gained IDs on the same run). `0b2da5f` (`STRATEGY_REPAIR_LATE_PROBE` default-ON) is a secondary suspect: it changes budget allocation across the ladder, which could starve a technique that used to get enough budget.
- **Not yet isolated to a single commit.** This report characterizes the failure mode but does not bisect it — see Remaining gate.

## Suggested next step

Bisect: re-run the level-blind capability sweep for a sample of the 57 "comfortable margin" lost IDs (start with `R02975`, `R02302`, `R02707`, `R02173`, `R03101`) at each of the four candidate commits individually (`0b2da5f`, `c4569ef`, `6f00baf`, `d21b4fb`), same level-blind/deterministic/matched-budget protocol, to find which commit(s) actually flip these levels from solved to node-budget-reached. `scripts/level-blind-capability-sweep.mjs` / `level-blind-capability-worker.mjs` can run a small manual ID subset outside the full 20-shard GHA matrix for this.

## Related

- `docs/solver-level-blindness.md` — level-blind capability protocol
- `docs/solver-budget-determinism.md` — matched A/B mode contract
- `.github/workflows/README-solver-stress-refresh.md` — workflow structure/inputs
- `reports/stress/capability-runs/32459711208/summary.json`, `reports/stress/capability-runs/32526927206/summary.json` — run-level summaries this report's diff was computed from
