# Turn-bias corpus-2 A/B validation + probe-budget stacking fix (2026-07-23)

## What this is

The first real corpus-2 A/B for `STRATEGY_REPAIR_TURN_BIAS` (see
[`2026-07-22-repair-stagnation-turnbias-production-wiring-validation.md`](2026-07-22-repair-stagnation-turnbias-production-wiring-validation.md)'s
"remaining gate"): two full `solver-stress-refresh.yml` runs, same commit, same budgets
(8000ms / 20,000,000 nodes), baseline vs `enable_flags=STRATEGY_REPAIR_TURN_BIAS`.

| Run | Timestamp | Corpus-2 solved |
|---|---|---|
| Before (turn-bias OFF) | 2026-07-23T12:36:07Z | 436/1700 |
| After (turn-bias ON) | 2026-07-23T13:21:57Z | 441/1700 |

Raw diff: **17 new solves, 12 regressions, net +5.**

## The 12 regressions are mostly not real

Checked which regressed levels actually recorded a `repairTurnBiased` attempt (the only reliable
evidence the new code path ran at all):

- **9 of 12** (R00314, R00460, R02044, R02423, R02634, R02698, R02716, R02876, R02050) have **zero**
  `repairTurnBiased` attempts — either they're not repair-gated at all (`needsRepairFallback` requires
  `mustCross`/`mustPass` thresholds or very-high `reqInt`, not `mustTurn`), or they went through
  ordinary repair only. Reproduced locally: running these levels twice, back-to-back on one machine,
  baseline vs turn-bias-on, gives **identical repairConfigs and identical outcomes' code path** — the
  CI-measured difference traces to garden-variety CPU-throughput variance in the main loop's
  time-bounded DFS/beam attempts (confirmed directly: the same `objectiveFirst`/`intersectionHarvest`
  attempts got different `nodesExpanded` counts within their fixed 8s window across the two CI runs),
  matching the workflow's own `timingTrustworthy: false` caveat. Not a turn-bias effect.
- **3 of 12** (R00934, R02900, R03031) genuinely invoked `repairTurnBiased`. All three hit
  `node-budget-reached` at exactly 20,000,000.

**Corrected net result: 17 new solves, 3 genuine regressions → net +14**, not +5.

## Root cause of the 3 genuine regressions

`runRepairProbe` (`orchestration.ts`) iterates `repairConfigs` sequentially, granting each "biased"
tier (`repairMustTurnBiased` or `repairTurnBiased`) the full `REPAIR_PROBE_BIASED_NODE_BUDGET`
(6,000,000 nodes) — a constant calibrated (see its own comment) against exactly **one** biased tier's
worst case, back when `repairMustTurnBiased` was the only one that existed. Turning on
`STRATEGY_REPAIR_TURN_BIAS` on a must-turn level adds a **second** biased tier to the same list, and
the probe was granting it its own full 6,000,000 as well — stacking to 12,000,000 just for the two
biased probe tiers (16,000,000 total with the 4,000,000 ordinary-tier probe), before the main
loop/fallback ever gets a share of a bounded external `nodeBudget`. Confirmed directly on R00934: the
probe burned `objectiveFirst` DFS main-loop attempts down to a sliver, and the final
ordinary-repair-fallback attempt — using the exact same winning seed the "before" run used
(`randomSeed: 788388390`, needing 9,408,148 nodes) — got truncated at 3,960,183 nodes before timing
out, one probe-stacking away from reproducing the original win.

## Fix

`runRepairProbe` now splits `REPAIR_PROBE_BIASED_NODE_BUDGET` across however many biased tiers are
actually present in `repairConfigs`, instead of granting each the full fixed amount:

```
const biasedConfigCount = repairConfigs.filter(c => c.repairMustTurnBiased || c.repairTurnBiased).length;
const biasedNodeBudgetPerTier = Math.floor(REPAIR_PROBE_BIASED_NODE_BUDGET / Math.max(1, biasedConfigCount));
```

- **Byte-identical when 0 or 1 biased tier is present** (every production level, and every must-turn
  level with `STRATEGY_REPAIR_TURN_BIAS` off) — `biasedConfigCount` is always ≤1 there, so
  `biasedNodeBudgetPerTier === REPAIR_PROBE_BIASED_NODE_BUDGET` exactly.
- With both tiers present, each gets half (3,000,000), restoring the probe's combined biased-tier cost
  to the originally-calibrated total.

**Verified**:
- `npm run test` (solver suite): 243/243 pass.
- `solver:bench --check`: **160/160, no regressions** (published corpus never has 2 biased tiers —
  confirms production inertness directly, not just by code inspection).
- Re-ran the 3 genuine regressions (R00934, R02900, R03031) with the fix at the same 8000ms/20M-node
  budget: each now shows the probe's `repairTurnBiased`/`repairMustTurnBiased` attempts at exactly
  3,000,000 nodes apiece (down from 6,000,000 each pre-fix) — the combined probe cost is back to
  10,000,000 (4M ordinary + 3M + 3M biased), matching the original single-biased-tier total. None of
  the three solved within this exact 20M ceiling on this run, but that residual outcome now traces to
  the same ordinary main-loop timing variance affecting the 9 non-attributable "regressions" above,
  not the stacking bug — the structural over-consumption is fixed regardless of whether these three
  specific levels clear this specific node ceiling on a given run.

## What's still open

- **A related but separate latency concern, not fixed here**: the *full-budget fallback loop* (after
  the probe) also grants each repair config — ordinary, `mustTurnBiased`, `turnBiased` — its own full
  `timeBudgetMs × REPAIR_EXTRA_BUDGET_FRACTION` window if earlier ones fail, uncapped by tier count.
  With 3 repair configs now possible (vs. 2 before turn-bias existed), worst-case repair-fallback wall
  time in production (unbounded `nodeBudget`) grows accordingly. This wasn't the mechanism behind the
  3 measured regressions above (those were governed by the bounded `nodeBudget`, not wall time), and
  wasn't investigated further here — worth a look before promoting `STRATEGY_REPAIR_TURN_BIAS` to
  default-on, alongside CLAUDE.md's existing `(1 + 6 + 1) × timeBudgetMs` worst-case-latency note
  (written before a third repair-fallback tier was possible).
- `--prime-winner` priming from a baseline snapshot that changes between successive refresh triggers
  (each run primes off whatever `stress-corpus2-baseline.json` is on `main` at checkout, which the
  *previous* run just updated) is a secondary confound noticed while diagnosing R00934, not a bug in
  this feature — flagged for awareness, not investigated further.

## Update (2026-07-23, later same day): the fresh post-fix refresh revises the verdict downward

A follow-up corpus-2 refresh with the fix applied (commit `18715b9`, same 8000ms/20M-node budget,
`enable_flags=STRATEGY_REPAIR_TURN_BIAS`) landed **435/1700** — 1 *below* the original turn-bias-off
baseline (436), not the "+14" this report originally claimed.

Diffing the fixed run against the **original** baseline (436, turn-bias fully off, predates any of
this work): **17 lost, 16 gained.** Applying the same "did a `repairTurnBiased`/`repairMustTurnBiased`
attempt actually fire" filter used above to separate signal from CI noise:

- **Losses**: 10 of 17 have zero biased attempts (noise, same class as before). **7 are genuine** —
  caused by the fix itself, not the original stacking bug.
- **Gains**: of 16, **8 won via a `winningConfig` explicitly tagged `(turnBiased)`** — directly
  attributable. The other 8 (5 via plain `dfs:repair:repair`, 3 via non-repair main-loop configs) show
  no clean attribution signal and are most likely noise, same as the losses.

**Net genuine effect: 8 − 7 ≈ +1, not +14.**

### Why the earlier "+14" was wrong

The 3 originally-diagnosed regressions (R00934, R02900, R03031) were real, but the *other* apparent
"genuine" wins the pre-fix run showed (R01778, R02076, R02321, and by the same mechanism likely
contributing to R02900/R03031 too) came from `repairMustTurnBiased` accidentally getting a **second
full 6,000,000-node probe budget** on top of `repairTurnBiased`'s — i.e., the bug was silently handing
the repair mechanism **double its calibrated resources** on affected levels. Some of those levels
needed something in the 3M–6M range that only the *over-generous, unfixed* budget could reach within
the probe stage (confirmed directly for R01778: the pre-fix run's winning `repairMustTurnBiased` PROBE
attempt used exactly 4,297,476 nodes — above the fixed code's new 3M-per-tier cap, below the old
buggy 6M-per-tier cap). Once the probe budget is correctly capped, those wins disappear along with the
regressions the bug caused — because both were symptoms of the *same* excess resource allocation, not
independent effects. The earlier "+14" figure measured the bug's leftover generosity, not
`STRATEGY_REPAIR_TURN_BIAS`'s own standalone value.

There's also a second-order effect worth naming: `repairTurnBiasedAttempt` is deliberately placed
*first* among repair configs (both in the probe and the full-fallback loop, per `attempts.ts`'s
comment, to solve fast rather than being buried). That ordering means a level whose real win depends
on `repairMustTurnBiased` can now lose its shot to `repairTurnBiased`'s own unsuccessful full-fallback
attempt consuming the remaining external node budget first — confirmed directly on R01778's post-fix
attempt trace, where the full-fallback's `turnBiased` attempt burns 7,847,963 nodes and exhausts the
20M ceiling before `mustTurnBiased`'s own full-fallback turn ever comes up.

## Verdict

**Revised down from the original version of this report.** The probe-budget-stacking fix is still
correct and necessary (it closes a real, provable over-consumption bug, verified inert on the published
corpus) — but once resource sharing between the two biased tiers is done properly, turn-bias's
population-level effect on corpus-2 is **a wash (~+1, within this corpus's demonstrated ~10-level
noise floor)**, not a clear win. The mechanism still solves real levels no other technique reaches
(R02003 remains the clean, reproducible, non-noise case first validated 2026-07-22), but at the
population scale it now trades away roughly as many previously-working solves as it adds, because both
directions route through the same scarce shared node budget. Promoting `STRATEGY_REPAIR_TURN_BIAS` to
default-on is **not justified by this data** as currently structured. Worthwhile next steps before
reconsidering promotion, in rough order of promise:

1. **Don't share budget between the two biased tiers — choose one.** Rather than splitting
   `REPAIR_PROBE_BIASED_NODE_BUDGET` (this fix), pick a feature-based or cheap-preliminary-check
   heuristic for whether a must-turn level is more likely to need `turnBiased` or
   `repairMustTurnBiased`, and only run that one at full budget. Avoids the "two half-strength
   attempts" tradeoff entirely.
2. **Change the ordering so the historically-reliable technique isn't starved by the newer one.**
   `repairTurnBiasedAttempt` is placed first specifically for latency; that same placement is what let
   its unsuccessful full-fallback attempt consume R01778's remaining budget before
   `repairMustTurnBiased` got a turn. Worth measuring an ordering where the *established* technique
   goes first and the newer one only runs if that fails, trading turn-bias's own latency win for
   protecting the existing mechanism's solves.
3. **The full-budget-fallback-loop latency question above is still open** and matters more, not less,
   once a "pick one" design (item 1) is on the table — that redesign would also need to reason about
   worst-case wall time with up to 3 sequential fallback tiers.
