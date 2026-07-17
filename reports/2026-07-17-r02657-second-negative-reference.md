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

## A concrete, testable hypothesis this raises

R02657 falling into the `default` archetype — meaning no existing `ATTEMPT_POLICY` rule claims
it — is itself a data point for the roadmap's own "plausibly a new archetype" lever. A profile of
(small-to-medium grid, low `reqInt`, dense turn-constraint landmarks, no must-pass/must-cross
burden) may warrant its own routing rule with a strategy tuned for satisfying many independent
turn constraints along one path, rather than falling through to the generic full-ladder default.
**Not validated here** — this is one level, not a population-level pattern — but it's a concrete,
checkable hypothesis for a future session: sample more `default`-archetype `dfs-plain` members and
see if this landmark-turn-density profile recurs.

## Verification

Read-only diagnostic work, no code changed. All numbers directly reproduced from `Solver.solve()`
calls with correctly-isolated single-flag ablation configs.
