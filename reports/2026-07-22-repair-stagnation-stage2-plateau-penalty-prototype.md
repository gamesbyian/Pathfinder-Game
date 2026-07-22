# Repair-stagnation escape plan, Stage 2: signature-conditioned soft feature memory prototype (2026-07-22)

## What this is

Stage 2 of [`docs/repair-search-stagnation-escape-plan.md`](../docs/repair-search-stagnation-escape-plan.md)
— the plan's recommended primary experiment, built on Stage 1's findings
([`2026-07-22-repair-stagnation-stage1-signed-signature-features.md`](2026-07-22-repair-stagnation-stage1-signed-signature-features.md)).
A working, sound, tested prototype plus its A/B measurement. **Verdict: real, working, but not a
win as built — no solved-count gain on the sample and a roughly symmetric (sometimes severe)
bestBadness effect in both directions.** Documented as a mixed/negative prototype result, not
shipped.

## The mechanism

When repair-search's existing stagnation detector fires (the plateau signal), bias the greedy move
ranking away from the specific cells that stuck restarts keep funneling through — Stage 1's
"attractor" cells (the dead-end tip + revisited cells that are overrepresented conditional on the
plateau *shape*). The bias is a **finite, decaying, memory-blind-sampled score penalty**, never a
hard prune, so `isSolutionState` stays the sole authority and no reachable solution can be dropped.

Concretely, in `repair-search.ts`:

- Per `repairSearchFromGate` call, accumulate a conditional-frequency table keyed on plateau
  **shape** (residual *signs* + structural masks — Stage 1 finding 3, not the exact length residual):
  `shapeTotal`, global attractor-cell counts `cellGlobal`, and per-shape counts `cellByShape`.
- `computePlateauPenaltyCells()` (pure, unit-tested) turns the plateau shape's table into a
  cell→penalty map via smoothed log-odds overrepresentation (α=0.5), keeping only cells above a
  minimum log-odds and grading the penalty by the capped log-odds (`PLATEAU_PENALTY_UNIT ×
  min(logOdds, CAP)`, max 32 — same order as `scoreMove`'s own terms: revisit −8, exit-guidance +40).
- On a stagnation trigger the penalty map is (re-)armed from the current plateau shape; on any
  best-ever improvement it is retired (the "signature changed" event); it also decays after a fixed
  window. **1-in-`PLATEAU_MEMORY_BLIND_PERIOD` restarts run fully unpenalized** (support preservation).
- In `takePly`, the penalty is subtracted from `scoreMove`'s output before the greedy pick, so it
  only re-ranks candidates — the exploratory (random) branch is untouched, and a move that leads to
  a new best was never made illegal (automatic aspiration override).

### Two deliberate deviations from the plan's letter (with rationale)

1. **Gated by an opt-in parameter (`enablePlateauPenalty`), not an ablation flag.** The plan named a
   `SCORE_PLATEAU_FEATURE_PENALTY` ablation flag. But `orchestration.ts`'s `normalizeAblationConfig`
   Proxy defaults every *unset* flag to `true`, so the ablation framework cannot express a
   default-*off* flag — any non-null config would turn an unproven prototype on, and it would ship
   enabled in every production path (`(!cfg || cfg.FLAG)` reads `true` when no config is passed).
   For an experiment that must never accidentally ship on, an opt-in parameter (same pattern as the
   existing `enableMustTurnBias`/`nodeBudget` params) is the correct gate: default off →
   `repairSearchFromGate` is byte-identical to the pre-Stage-2 path (verified by a unit test), and
   only the A/B tooling passes `true`. Promoting it to a real flag is a follow-up *if* it earns its
   place, and would need framework support for default-off flags that doesn't exist today.
2. **Applied in `takePly`, not inside the shared `scoreMove`.** The plan called it "one more term in
   `scoreMove`," but `scoreMove` is shared with DFS/beam; threading a repair-only penalty map
   through its signature and every caller would be a large diff on the shared hot path. Applying the
   penalty to `scoreMove`'s return value inside `takePly` keeps the whole mechanism scoped to
   `repair-search.ts` — which is exactly the "architecturally lower-risk, scoped to repair" property
   the plan's own Stage 2 rationale lists as a benefit.

## A/B measurement

Same Stage 1 sample (16 `repair-close` levels), single gate, `budgetMs=8000`, `enablePlateauPenalty`
OFF vs ON, identical seed per level (the only difference is the penalty). "bestBad" = `out.bestBadness`
(lower is closer to solved); "Δbad" = OFF − ON (positive = ON got closer).

| id | OFF solved / bestBad / nodes | ON solved / bestBad / nodes | Δbad |
|---|---|---|---:|
| R01531 | false / 8 / 8,548,018 | false / 8 / 7,606,780 | 0 |
| R02025 | false / 15 / 3,316,217 | false / 20 / 2,833,633 | −5 |
| R02077 | false / 13 / 3,272,149 | false / 13 / 2,938,903 | 0 |
| R02150 | false / 5 / 2,364,486 | false / 5 / 2,035,719 | 0 |
| R02239 | false / 4 / 3,214,129 | false / 4 / 3,120,248 | 0 |
| R02267 | false / 8 / 6,336,410 | false / **3** / 4,906,372 | **+5** |
| R02279 | false / 17 / 4,109,932 | false / **5** / 3,592,878 | **+12** |
| R02358 | false / 24 / 4,663,045 | false / 25 / 3,789,401 | −1 |
| R02378 | false / 5 / 2,092,126 | false / 5 / 1,928,310 | 0 |
| R02575 | false / 3 / 7,565,239 | false / 3 / 6,568,290 | 0 |
| R02654 | false / 12 / 5,206,714 | false / **6** / 3,962,006 | **+6** |
| R02842 | false / 13 / 2,490,027 | false / 13 / 2,186,813 | 0 |
| R02859 | false / 3 / 5,293,508 | false / **18** / 4,233,921 | **−15** |
| R03280 | false / 18 / 3,227,410 | false / 15 / 2,693,920 | +3 |
| R03294 | false / 6 / 2,137,995 | false / 9 / 1,834,029 | −3 |
| R03349 | **true** / 2,164,417 | **true** / 1,197,923 | (solved both) |

**Solved: OFF 1/16, ON 1/16** — no new solves. **bestBadness among the unsolved: ON better on 4,
worse on 4, unchanged on 7.**

## Reading the result

- **The mechanism is real, not a no-op.** It reshapes the search substantially: R02279 (17→5),
  R02654 (12→6), R02267 (8→3) are large improvements in how close the best near-miss gets — steering
  away from the attractor genuinely found much better plateau states. R02279 is exactly a Stage 1
  must-turn + multi-term plateau, the target case.
- **But it is double-edged and sometimes badly so.** R02859 went 3→18 — a level that was one of the
  closest near-misses in the whole sample, pushed far away by penalizing cells that were evidently
  load-bearing for its near-miss. This is precisely the failure mode the plan and CLAUDE.md warn
  about ("a scoring term tuned for the common case can become actively self-defeating on a rare,
  dense one"): a blunt "penalize all overrepresented attractor cells" policy cannot tell a funnel
  cell that traps the search from one that is genuinely on the only good route.
- **No solved-count movement**, which for a mechanism whose whole point is shortening plateaus is
  the honest headline: it moves bestBadness around without tipping any additional level to solved in
  this budget/sample.
- **Cost caveat (confound):** ON does ~10–20% fewer nodes at equal wall-clock, because the
  per-restart shape/attractor recording is real work. Small bestBadness regressions (R02358 −1,
  R03294 −3) are partly attributable to less search, not only misdirection — but R02859 (−15) and
  the large improvements are far too big to be a node-count artifact; those are the penalty actually
  redirecting the walk.

## Verification

- Unit tests (`repair-search.test.ts`, 19/19): the pure `computePlateauPenaltyCells` arithmetic
  (overrepresented-vs-common cells, penalty cap, degenerate input), a soundness spot-check
  (`enablePlateauPenalty=true` only ever returns `isSolutionState`-valid paths), determinism with
  the flag on, and `enablePlateauPenalty=false` byte-identical to omitting it.
- `npm run solver:bench -- --check`: 160/160, no regressions (production default = flag off = the
  code is inert; confirming the signature/threading change is transparent to the published corpus).
- `tsc`/`eslint` clean.

## Recommendation / next steps

Do **not** ship this as-is (default-off prototype stays off). The idea has a real signal buried in a
blunt policy. Before Stage 3, the cheapest high-value refinements, in order:

1. **Protect near-solved states.** The R02859 disaster suggests suppressing the penalty (or
   shrinking it) when `bestBadnessEver` is already very small — don't perturb a level that's one or
   two moves from solved. This alone might turn the symmetric result net-positive.
2. **Penalize attractor cells more selectively.** The tip cell and a broad revisit set are probably
   too coarse; Stage 1's richer, deferred features (turn direction at the must-turn cell,
   edge/axis usage) may discriminate a trap cell from a load-bearing one better than raw cell
   identity. Finding 2 (must-turn dominance) argues for a penalty that targets *how* the must-turn
   cell is being (mis)approached, not just which cells are revisited.
3. **Equal-work A/B.** Re-run bounded by node budget rather than wall-clock to remove the recording-
   cost confound and measure the penalty's directional effect cleanly, plus the plan's decisive
   plateau-survival-curve metric rather than only endpoint bestBadness.

If those don't produce a solved-count gain, Stage 3 (bounded path relinking) becomes the better bet
— but it carries the reversible-edit-operator prerequisite the plan already flags.

## Caveats

16 levels, single gate, one budget, endpoint bestBadness (not the full plateau-survival curve).
Real evidence of the mechanism's behavior, not a population-level verdict. All five Stage 2 tunables
(`PLATEAU_PENALTY_UNIT`/`_MIN_LOGODDS`/`_LOGODDS_CAP`/`_WINDOW`, `PLATEAU_MEMORY_BLIND_PERIOD`,
`PLATEAU_MIN_SHAPE_SAMPLE`) are unmeasured starting values — this A/B is a single point in that
space, not a calibration sweep.
