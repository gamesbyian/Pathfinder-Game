# R00648: a new confirmed fragile-scoring-interaction case, and a level-reducer caveat (2026-07-17)

## Context

Following the witness-divergence population-level correction (which found no aggregate
discriminator for `dfs-plain`), the recommended next step was concrete single-level work: level
reduction plus per-level ablation on a specific `dfs-plain` member. Picked **R00648** — the
highest-discrepancy member in the earlier (now-superseded) top-30 listing, and, incidentally, one
of the 4 levels my own Task 3 sweep (`reports/2026-07-17-attraction-diversity-fraction-and-flag-widening-evaluation.md`)
found solvable via the attraction-diversity pass at fraction 1.0.

## Level reduction: a genuinely minimal, mechanic-free hard case

`stress:reduce-level` on R00648 (`--max-iterations=150 --time-budget-ms=20000`,
`node-budget=15000000`, target signature `node-budget-reached`) **reached a genuine fixed point**
(not capped by the iteration limit), removing all 7 portal pairs and shrinking `reqLen` by 8
(141→133), landing on: **a completely empty 15×15 grid** — zero blocks, zero portals, zero
must-pass/must-cross/landmarks — single gate, single goal, `reqLen: 133`, `reqInt: 4`. This still
exhausts a 15,000,000-node search without solving. This is about as clean a minimal reproduction
of "pure path-length-constrained search hardness" as this corpus can produce: no mechanic
confounds at all, just a length+intersection requirement on open space.

## Direct probe: beam collapse signature

Running the reduced level through the production ladder directly: the 4 beam attempts (width
2000) all **genuinely exhaust** (not timeout) at tiny node counts (18–443 nodes) — frontier
collapse, not a budget cutoff. The 5 plain-DFS profile attempts each burn ~5.6s and 6–8 million
nodes before timing out. This beam-collapse-to-single/low-hundreds-node-counts signature is the
same one CLAUDE.md documents for the known R02248/R01465 fragile-scoring-interaction family.

## Ablation: confirmed as a fragile-scoring case — but the reduction changed the culprit flag

Testing each of the 5 known candidate `SCORE_*` terms individually, **using the correctly-isolated
`withFeatureDisabled()` helper from `scripts/ablation-config.mjs`** (starts from a fully-populated
`defaultConfig()`, flips exactly one flag — critical, since a bare `{ FLAG: false }` object
silently disables every *other* unset `STRATEGY_*`/`SCORE_*` flag too, the exact bug class this
codebase has already hit and fixed twice; an earlier version of this test using a bare object
produced a false "any flag unlocks it" result, caught by re-running with the correct helper):

| Ablation | **Original R00648** (portals, reqLen 141) | **Reduced R00648** (no portals, reqLen 133) |
|---|---|---|
| baseline (all enabled) | timeout, 25.9M nodes | timeout, 25.7M nodes |
| `SCORE_GOAL_ATTRACTION: false` | **SOLVED**, 7173ms, 3.4M nodes | timeout, 30.3M nodes |
| `SCORE_INTERSECTION_SETUP: false` | timeout, 23.8M nodes | **SOLVED**, 1075ms, 355 nodes |
| `SCORE_SURROUND_URGENCY: false` | timeout, 26.9M nodes | timeout, 26.1M nodes |
| `SCORE_OBJECTIVE_ATTRACTION: false` | timeout, 26.5M nodes | timeout, 26.1M nodes |
| `SCORE_PERIMETER_BIAS: false` | timeout, 29.3M nodes | **SOLVED**, 1418ms, 813 nodes |

**Both the original and the reduced level are genuine fragile-scoring-interaction cases** — each
solved almost instantly by disabling exactly one specific `SCORE_*` term, from tens of millions of
dead-search nodes down to a few hundred/thousand. But **the reduction process changed which term
rescues it**: the original needs `SCORE_GOAL_ATTRACTION` off (matching Task 3's finding exactly);
the reduced level needs `SCORE_INTERSECTION_SETUP` or `SCORE_PERIMETER_BIAS` off instead —
`SCORE_GOAL_ATTRACTION` does *not* unlock the reduced level at all.

## Two findings

1. **R00648 is a new, independently-discovered confirmed member of the fragile-scoring-interaction
   family** already documented in CLAUDE.md for R02248/R01465 and the 3 other Phase D cases. This
   is a different level from all of those (found via level reduction on a `dfs-plain` cluster
   member, not the earlier pattern-scan methodology) — real, independent corroborating evidence
   that this is a recurring family, not a small closed set of coincidences. It also newly confirms
   `SCORE_PERIMETER_BIAS` as an actual rescuing flag for a specific level (previously only
   mentioned in CLAUDE.md as relevant "to a lesser extent" per aggregate ablation sweeps, without a
   named single-level confirmation).
2. **A level-reducer caveat, worth recording for future use of `stress:reduce-level` on fragile-
   scoring cases specifically**: the tool's own definition of a valid reduction step is preserving
   the *failure signature* (status match — `timeout` stays `timeout`, etc.), which it does
   correctly and by design. But for this class of level, the *reason* a level fails can shift
   between different scoring-term culprits as the level shrinks, even while the surface-level
   signature stays identical. A minimized case found this way is not guaranteed to isolate the
   *same* root cause as the original — anyone using level reduction to investigate a specific
   flagged fragile-scoring level should re-run the ablation sweep on the *reduced* candidate before
   assuming it shares the original's culprit, not just trust the preserved signature label.

## Implication for `ATTRACTION_DIVERSITY_CANDIDATE_FLAGS`

Not acted on here (a constant change needs the full verification bar this session's Task 3 already
established), but worth noting: this is now the **second** independently-found level (after the
original 5-level Phase D diagnosis) whose rescue needs a flag outside the current single-flag
candidate set (`SCORE_GOAL_ATTRACTION` only) — the *reduced* R00648 needs `SCORE_INTERSECTION_SETUP`
or `SCORE_PERIMETER_BIAS`. Consistent with, not new evidence beyond, Task 3's finding that widening
the candidate set doesn't cleanly generalize (trades some rescues for others) — reinforces that any
future widening work needs the same rigor, not a quick flag addition based on one case.

## Verification

Read-only diagnostic work (level reduction + direct `Solver.solve()` calls with correctly-isolated
ablation configs) — no solver code changed. The false-positive "any flag unlocks it" result from
the first (bare-object) ablation attempt was caught and corrected before being reported, per this
codebase's own established practice around this exact bug class.
