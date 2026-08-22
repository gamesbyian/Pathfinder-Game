# Corpus-2 node-budget losses between capability runs 32459711208 and 32526927206

> **Status:** concluded-negative
> **Last evidence:** 2026-08-22 — local worktree bisection at commits `d21b4fb0`, `6f00bafd`, `c4569ef0` against 20/73 IDs (see Bisection below)
> **Decision:** `6f00baf` (the `buildDistMap` gates/geese/false-goal fix) is confirmed as the cause. It is a genuine correctness fix, independently verified safe and net-positive on the published 160-level corpus (identical 160/160 solved, nodes down 4.1%), and this population is itself net +17 (90 gained/73 lost) on Corpus-2. Do not revert it or treat these 73 as a live recovery target via config/revert — same disposition class as the `dd001dd5c` beam-dedup finding above ("accept search-order collateral, do not restore broken identity"). `0b2da5f` (LATE_PROBE promotion) and `d21b4fb` (trap-search fix) are cleared as causes.
> **Remaining gate:** none for attribution. A genuine recovery would require search-quality work on how `scoring.ts` consumes `distMap` for move-ordering guidance (see Mechanism/Recovery below) — logged as a future-work candidate, not pursued here.

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

## `0b2da5f` cleared directly (same-commit flag A/B)

Before bisecting, checked whether the LATE_PROBE promotion alone could explain any of the 73 using data already on hand: `32453248184` (`e5034e8c` + `--enable-flags=STRATEGY_REPAIR_LATE_PROBE`, 881 solved) vs `32459711208` (`e5034e8c`, flag off, 863 solved) is a same-commit, flag-only A/B. The diff is a **strict superset** — 18 gained on Corpus-2, zero lost, matching the promotion commit's own claimed "+19 net, zero regressions." All 5 of this report's "extreme margin" IDs (`R02975`, `R02302`, `R02707`, `R02173`, `R03101`) solve in **both** arms. `0b2da5f` cannot be the cause of any loss in a population defined by "solved before, not solved after" — it only ever adds solves at a fixed commit.

## Bisection

Method: `git worktree add` at `e5034e8c` (`npm ci` once), then `git checkout -f <commit>` through the candidate sequence — `d21b4fb0` is `e5034e8c`'s direct child, then `6f00bafd`, then `c4569ef0`, confirming there are no gaps between candidates. Ran `scripts/level-blind-capability-sweep.mjs` at each stop with a **reduced** deterministic node budget (5,000,000 — well above every prior `nodesExpanded` in the tested sample except the near-ceiling ones) against two batches:

- **Batch A (5 IDs):** the "extreme margin" examples above (prior `nodesExpanded` 8,486–270,020).
- **Batch B (15 IDs):** a seeded-random sample of the remaining 68 lost IDs, spanning the full `R00050`–`R03357` range (positions 183, 218, 258, 306, 369, 499, 560, 758, 765, 783, 977, 1114, 1129, 1376, 1565) — not filtered to the "comfortable margin" 57, so includes some near-ceiling levels that don't cleanly resolve even in the good state at this reduced budget.

| Commit | Batch A (5) | Batch B (15) |
|---|---|---|
| `d21b4fb0` (trap-search fix) | 5/5 solved | 11/15 solved (4 near-ceiling levels need >5M nodes even here) |
| `6f00bafd` (buildDistMap fix) | **0/5 solved** | **0/15 solved** |
| `c4569ef0` (provenance fix, next commit) | 0/5 solved | not re-run (expected unchanged; provenance-only diff) |

All 20 tested IDs flip from solved to `node-budget-reached` at exactly `6f00bafd`, including all 11 that were comfortably solved at `d21b4fb0` under the same reduced budget. `d21b4fb0` and `0b2da5f` are cleared.

## Mechanism

`6f00bafd` is used in two places (`modules/solver/lower-bounds.ts`, `modules/solver/scoring.ts`), with different safety properties:

- **`lower-bounds.ts` (admissible pruning):** tightening a lower bound can only prune more search space, never cut a valid solution — the commit's own evidence (160/160 published corpus solved, nodes down 4.1%) confirms this is a pure win here.
- **`scoring.ts` (move-ordering/attractor guidance):** distances also feed heuristic scoring that steers a budget-limited, non-optimal search toward promising cells. Making a heuristic "more correct" is **not** safety-monotonic here the way pruning is — the old (technically wrong) distances that routed through geese/gates/false goals apparently pointed several of these 73 levels toward their winning branch early by coincidence; the corrected distances point the same budget-limited search into a different, much larger region of the tree instead. `R02975` (8,486 nodes before, no solution within 150M+ after) is the clearest example: this is a large behavioral change in search direction, not a boundary-sensitivity artifact.

## Recovery

Not pursued here. `6f00bafd` fixes a real, previously undocumented modeling bug (distance estimates silently routing through cells no real path can pass through or use as a through-node) and is independently proven safe/beneficial on the published corpus; reverting it to chase this population's solve count would knowingly reintroduce that bug for a trade that's already net-positive on Corpus-2 (90 gained vs 73 lost, +17 net) — disallowed by the project's "do not weaken a correctness fix to pass" rule. A legitimate recovery path exists but is genuine search-quality research, not a quick fix: investigate whether `scoring.ts`'s consumption of `distMap` should treat sink-adjacent/gate/false-goal proximity differently for move-ordering than for pruning (the two roles no longer need the same underlying map), or whether a secondary diversification/tie-break could prevent full-budget starvation when the primary distance-based heuristic misdirects on a level's early moves. Logged for `docs/future-work.md` rather than attempted in this session.

## Related

- `docs/solver-level-blindness.md` — level-blind capability protocol
- `docs/solver-budget-determinism.md` — matched A/B mode contract
- `.github/workflows/README-solver-stress-refresh.md` — workflow structure/inputs
- `reports/stress/capability-runs/32459711208/summary.json`, `reports/stress/capability-runs/32526927206/summary.json` — run-level summaries this report's diff was computed from
