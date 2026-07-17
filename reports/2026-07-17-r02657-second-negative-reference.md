# R02657: a second, clean negative reference for the fragile-scoring family (2026-07-17)

## Context

R00440's level reduction (same-day report) turned out to very likely be infeasible — a real
`stress:reduce-level` limitation for repair-gated levels, not a trustworthy minimal reproduction.
Following the roadmap's own recommendation, picked a **non-repair-gated** `dfs-plain` sample
member instead, specifically to avoid that blind spot: **R02657** (`default` archetype, `reqInt: 1`,
`mustCross: 1`, `mustPass: 0` — confirmed `needsRepairFallback` returns false before starting).

## Level reduction: clean, small, genuine fixed point

`stress:reduce-level` (`--node-budget=15000000 --time-budget-ms=20000`, target signature
`node-budget-reached`) on R02657: phase 1 freely stripped 11 off-witness blocks and 8 off-witness
geese (size 209→190). **Phase 2 made zero changes** — every one of 6 attempted removals broke the
target signature immediately, meaning the level was already essentially minimal after phase 1.
Final candidate: **11×11 grid, single gate, single `mustCross`, 14 landmarks (6 `adjacentTurn`, 8
`decorative` — both impassable), zero blocks/falseGoals/geese/mustPass, `reqLen: 68`, `reqInt: 1`**.

Because this level was never repair-gated, the reducer's own re-verification carries none of
R00440's blind spot — `node-budget-reached` here can only come from the main DFS/beam loop plus
the unconditional attraction-diversity pass, both of which report `timeout`/`failed` honestly.

## A structurally different profile from every case studied so far

Notably **`reqInt: 1`** — almost no self-intersection required, in sharp contrast to R00648
(`reqInt: 4`) and R00440 (`reqInt: 9`). This doesn't look like an intersection-planning problem at
all. `detectArchetype` classifies it as **`default`** — the catch-all bucket, not
`high-intersection-burden`/`must-cross-heavy`/`portal-heavy`/`near-closure` — and its real attempt
ladder (`getAttemptConfigs`) is accordingly the full, unrouted 16-config list (every profile and
structural template the solver has, from `cornerHarvest` through `portalCommitted`), since no
specific archetype rule claimed it.

## Ablation: a second clean negative reference

Testing all 5 known fragile-scoring flags (individually and combined, correctly isolated via
`ablation-config.mjs`'s `withFeatureDisabled`/`withFeaturesDisabled`):

| Config | Result |
|---|---|
| baseline | timeout, 46.3M nodes |
| `SCORE_GOAL_ATTRACTION: false` | timeout, 47.4M nodes |
| `SCORE_INTERSECTION_SETUP: false` | timeout, 46.0M nodes |
| `SCORE_SURROUND_URGENCY: false` | timeout, 44.5M nodes |
| `SCORE_OBJECTIVE_ATTRACTION: false` | timeout, 45.8M nodes |
| `SCORE_PERIMETER_BIAS: false` | timeout, 45.5M nodes |
| all 5 combined | timeout, 49.6M nodes |

**Every configuration times out using the full 15s budget at 44–50 million genuinely-explored
nodes** — no exhaustion, no rescue, and node counts within normal run-to-run noise of each other
regardless of which (if any) flags are disabled. This is a **second, methodologically clean**
negative reference for the fragile-scoring family (unlike R00440's reduction, this one is not
compromised by the repair-gated infeasibility risk) — and it's a structurally different profile:
small grid, low `reqInt`, no repair gate, `default` archetype trying every strategy the solver has
and failing all of them.

## Reading together with R00440

Two negative references now span meaningfully different structural profiles:

| | R00440 (unreduced — the reduction was compromised) | R02657 (reduced, clean) |
|---|---|---|
| Grid | 15×15 | 11×11 |
| Archetype | `high-intersection-burden` | `default` |
| `reqInt` | 9 | 1 |
| Repair-gated | yes | no |
| Node scale at timeout | ~6M (repair disabled) | ~46M |

Neither the "large grid, high self-intersection burden, repair-eligible" profile nor the "small
grid, minimal self-intersection, turn-constraint-dense, no archetype match" profile is touched by
any of the 5 known fragile-scoring terms. This is real evidence the harder majority of `dfs-plain`
is not one narrow, nameable pattern the current diagnostic toolkit hasn't quite reached yet — it
spans genuinely different structural shapes, consistent with Campaign 2's original framing
("research-shaped... the levers are better admissible bounds, better move ordering, and plausibly
a new archetype").

## A concrete, testable hypothesis — checked against the population and corroborated

R02657 falling into the `default` archetype — meaning no existing `ATTEMPT_POLICY` rule claims
it — is a data point for the roadmap's own "plausibly a new archetype" lever. Checked directly
(feature inspection only, no solving) against every other `default`-archetype member of the
100-level `dfs-plain` sample: **6 total, and all 6 share R02657's exact profile signature** — low
`reqInt` (1–3, well under both `POLICY.LOW_REQINT`=4 and `VERY_HIGH_REQINT`=7), small-to-medium
grids (11–13), and heavy combined turn-landmark density (`adjacentTurn`+`decorative`+`surround`+
`mustTurn`, 14–22 landmarks on grids of only 121–169 cells — 8–18% of every cell on the board):

| Level | `reqInt` | Grid | Turn-landmark count | % of grid |
|---|---:|---:|---:|---:|
| R00285 | 3 | 13 | 20 | 12% |
| R01129 | 1 | 13 | 17 | 10% |
| R02221 | 3 | 11 | 14 | 12% |
| R02356 | 2 | 12 | 20 | 14% |
| R02541 | 3 | 12 | 22 | 15% |
| R02657 | 1 | 11 | 14 | 12% |

**100% consistency across a small but complete same-sample population** (every `default`-archetype
unsolved level, not a cherry-picked subset) is a real, if not yet powered, signal: `default`
archetype currently means "none of `ATTEMPT_POLICY`'s specific rules matched," but empirically it
also means "low `reqInt`, turn-landmark-dense" for every unsolved member found here — suggesting
archetype detection currently has no rule that treats turn-landmark density
(`mustTurn`/`adjacentTurn`/`surround` counts) as a first-class routing signal, even though it's
clearly shaping this subgroup's puzzles. **Still not validated as a fix** — this is population
corroboration of the *pattern*, not a tested strategy or a proof that a dedicated archetype rule
would actually solve any of these 6 (or the wider `dfs-plain` population) faster.

## The cheap fix (policy reordering) is ruled out — checked directly, same day

Before recommending a policy-routing fix, checked whether it could plausibly work at all: gave
**each of R02657-reduced's 16 existing attempt configs its own full, dedicated 8-second budget**
(`runAttemptSearch` called directly per config, bypassing `solveLevel()`'s shared/diluted ladder
split entirely — every config previously only got a fraction of the shared budget).

**Every single one of the 16 configs times out using its full dedicated budget, each burning
20.8–29.7 million genuinely-explored nodes, zero solves.** This is decisive: the level isn't
failing because the *right* existing technique is being starved of budget by sharing the ladder
with 15 others — none of the 16 techniques, given complete independent attention, gets anywhere
close. **A policy-routing fix (reordering/prioritizing which existing profiles this archetype
tries first) would not help this level** — the gap is in what the search techniques themselves
can do, not in which order they're tried.

## Revised recommendation

The concrete next step for a future session is **not** a cheap policy-routing addition — that
lever is now ruled out by direct measurement. What's actually needed is a genuinely new technique
for this profile: either a materially better admissible lower bound that accounts for outstanding
turn-constraint landmarks (the same "better bound vs. new search paradigm" fork the batch-B
investigation already named for a different pattern), or a real new scoring/ordering strategy that
doesn't yet exist in the codebase (not just a different combination of the 16 that already do).
Either is substantial, open-ended research — appropriately scoped as its own future effort, not a
quick addition, and not attempted here.

## Verification

Read-only diagnostic work, no code changed. All numbers directly reproduced from `Solver.solve()`
calls with correctly-isolated single-flag ablation configs.
