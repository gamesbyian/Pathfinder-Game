# Differential diagnosis on R02751: not a scoring-term problem (2026-08-06)

Executes the specific next step `reports/2026-08-06-near-twin-solver-response-comparison.md`
recommended for its 31 `real-attempt` cases and `docs/ai-assisted-manual-solving.md`'s one
validated use of manual solving: hand-solve a level the solver currently fails on, then diff the
accepted path against the solver's own search trace at each divergence point.

**Target**: `R02751` (11×11, `reqLen: 73`, `reqInt: 5`, 7 must-pass, 7 must-turn, 5 flipping
filters, 4 portal pairs, 0 hints — genuinely, completely unsolved, not merely under-provisioned).
Named in the source report as "a strong, concrete starting candidate" via its near-twin `R02669`
(distance 1.001 — the closest low-badness pair found), which solves in under 1,000 nodes via
`beam:perimeterSweep`.

## The "hand-solve": using the level's own withheld witness, not inventing a path from scratch

`R02751` was procedurally generated (`stress-corpus-random-generator`, `random-uniform-v1`), and
every level in that corpus carries a `stressMeta.witnessSolution` — a path constructed at
generation time and **withheld from the production solver** (never read by `Solver.solve()`). This
is exactly the "second, independently-constructed accepted path" the recommended method calls for,
and using it is more rigorous than inventing one by hand: a human (or AI) manually tracing 73 moves
through 7 must-pass cells, 7 must-turn landmarks, 5 flipping filters (whose required axis depends on
level-wide crossing order — see CLAUDE.md's flipping-filter gotcha) and 4 portal pairs on an 11×11
grid is exactly the kind of task the P00002 worked demonstration in `docs/ai-assisted-manual-
solving.md` shows is slow and error-prone even for a simple 21-length, single-mechanic level; the
witness is already independently constructed, generator-side, with zero access to the solver's own
search.

**Verified, not assumed.** Per the doc's own "never trust a manually-constructed solution" rule, the
witness (78 nodes) was run through `validateCandidatePath` (`modules/domain/path-validator.ts`) —
`{ ok: true, path: [...73 counted length after 4 portal jumps...] }`. It was also independently
replayed through the real search-core primitives (`getNeighbors`/`applyMove`/`isSolutionState` via
`scripts/stress/witness-divergence.mjs`, which every stress-corpus witness gets replayed through for
exactly this purpose): 0 invalid steps, `finalStateIsSolution: true`. Both checks agree — this is a
genuine, currently-unused solution the solver's own search has never reached.

## The diff: scoring-order discrepancy is low, not high

`witness-divergence.mjs` measures, at each witness step, the rank of the witness's actual move among
`scoreAndSort`'s own greedy ordering of legal candidates (0 = the solver's own top choice) — the
exact technique that found the real R02248/R01465 fixes (CLAUDE.md's "attraction-diversity
last-resort pass" gotcha references this as its "batch-B cluster" discovery method, where a
discrepancy of 22–35 was the signature of a self-defeating scoring term).

```
R02751  cumulativeDiscrepancy=38  maxStepRank=2  meanStepRank=0.655  steps=77
```

**This is a LOW discrepancy, not a high one.** Across 77 scored steps, the witness's move was never
worse than the search's 3rd-ranked candidate (`maxStepRank=2`), and averaged under 1 rank below the
solver's own top pick. Compare to the batch-B cluster's 22–35 signature (which drove real fixes) —
R02751's total of 38 spread over more than double the steps is a fundamentally different shape.

**Per-flag `SCORE_*` ablation confirms no single term is responsible** (18 flags tested, each
disabled independently, `normalizeAblationConfig` used throughout so no sparse-override footgun):

```
SCORE_MUST_PASS_URGENCY   disabled -> discrepancy=32  delta=-6   (largest "helps if fixed" swing)
SCORE_GOAL_ATTRACTION     disabled -> discrepancy=44  delta=+6   (largest "hurts if removed" swing)
... every other flag: delta in [-1, +2]
```

No flag comes close to the R02248-style dramatic single-term collapse. `SCORE_GOAL_ATTRACTION` —
the exact term the attraction-diversity last-resort pass exists to disable — moves in the *opposite*
direction here: disabling it makes the discrepancy worse (+6), meaning it's mildly *helping* the
witness on this level, not sabotaging it.

**Untemplated replay across all 12 non-repair profiles stays in a narrow band** (31–40), never near
zero and never dramatically high — `intersectionHarvest` (31) and `knotBuilder` (34) score modestly
better than `default` (38), but nothing suggests a completely different profile would trivially find
this path either.

## Interpretation

This rules out, specifically for R02751, the mechanism CLAUDE.md's own solver gotchas document as
already-found on other levels: **no scoring term actively repels the witness path.** The solver's
own greedy preference ordering is, at worst, one or two ranks away from the correct move at every
single step of a 73-length solution. Combined with the source report's finding that 20+ distinct
attempt configs (perimeterSweep×4 templates, objectiveFirst, intersectionHarvest, knotBuilder,
mustCrossFirst, repair×2, admissible-order×5, …) all exhaust their budget (up to the 20–36M node cap)
without finding it, the remaining, better-supported explanation is a genuine **combinatorial /
search-budget limit**: the correct path is locally easy to *recognize* as good but the surrounding
search tree (73 moves, 11×11 grid, 7 must-pass + 7 must-turn + 5 flippers + 4 portals, all of which
add branching or dynamic pruning-gauntlet checks) is large enough that DFS/beam backtracking doesn't
reach it within budget even with near-optimal move ordering.

**What this does not test.** `witness-divergence.mjs` (like `hint-divergence.mjs`, by the same
established convention — see that script's own comment) replays only `getNeighbors`/`scoreAndSort`/
`applyMove`, never the dynamic pruning gauntlet (`evaluatePrunedMove`, the lower-bound/connectivity/
deadlock checks that only run inside the real `dfsFromGate`/beam search loops). A low scoring
discrepancy rules out "scoring order sabotages the search" but does not rule out "a dynamic prune
falsely rejects continuing along this path at some intermediate state" (the shape of bug CLAUDE.md's
`mustCrossForcedNeighborDeadlocked` and MST-scratch-buffer gotchas document elsewhere) — that would
need the pruning gauntlet itself replayed against this witness, which no current tool does and which
this diagnosis did not attempt.

## Per CLAUDE.md's ablation-validation bar

This is a **negative result** (no single term is responsible) rather than a positive causal claim, so
the doc's "validate across a symmetry family before trusting a positive finding" bar doesn't apply
the same way — there is no single suspect flag to re-test on rotated/reflected siblings. The result
that *does* generalize immediately is procedural: this exact replay (`witness-divergence.mjs` +
per-flag ablation) is cheap (a pure replay, no search) and could be run over the rest of the 31
`real-attempt` population from the source report to see whether R02751's "low discrepancy, real
budget exhaustion" shape is typical of that population or unusual — that's the natural next step,
not attempted here (scope: one level, per the task).

## Reproduce

```bash
node scripts/run-bundled.mjs scripts/stress/witness-divergence.mjs \
    --corpus=data/stress/stress-levels-random.json --levels=R02751 \
    --out=/tmp/wd-r02751.json
```

The per-flag `SCORE_*` ablation and untemplated-profile sweep above were run via a scratch script
(not committed — same shape as `scripts/stress/hint-divergence.mjs`'s existing per-flag loop,
retargeted at `stressMeta.witnessSolution` instead of `data/hints/<id>.json`; a committed,
witness-native version of that tool would be a reasonable follow-up if this technique proves out
over the broader `real-attempt` population).
