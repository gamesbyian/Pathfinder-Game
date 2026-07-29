# Turn-load fragile/robust family-variant split: all 5 sampled levels are robust (2026-07-29)

## What this is

`docs/solver-development-roadmap.md`'s named highest-priority diagnostic, run for the first time
this session: for a sample of unsolved corpus-2 levels, generate structural variants (local mutations
+ symmetry transforms) and solve each. A level whose variants mostly SOLVE is **fragile** — a
heuristic/scoring problem, fixable by a targeted or diversity-style scoring change. A level whose
variants mostly FAIL is **robust** — a combinatorial problem needing new bounds/pruning/technique, not
a scoring tweak. Precedent: R02248 solved 35/45 variants (fragile, and the fix that came out of that
finding was the real SCORE_INTERSECTION_SETUP attraction-diversity pass); R00440 solved 0/45 (robust).

Turn-constraint load (`mustTurn + adjacentTurn + surround`) is corpus-2's strongest measured
solvability discriminator (Cohen's d = 0.750, from the same-day feature-solvability analysis) with
zero representation in the main-loop attempt policy — this run asks whether that population is
fragile (fixable by adding turn-aware scoring/policy) or robust (needs a structurally new technique).

## Method

5 unsolved corpus-2 levels selected spanning turn-load 8–17 with varied secondary mechanics
(portals, flippers, geese, must-cross, must-pass mix):

| Level | turnLoad | mustTurn | adjTurn | surround | navDensity | archetype | bestBadness |
|---|---|---|---|---|---|---|---|
| R00082 | 8  | 0 | 8 | 0 | 0.759 | high-intersection-burden | 26 |
| R02518 | 9  | 7 | 0 | 2 | 0.627 | high-intersection-burden | 6 |
| R00142 | 12 | 0 | 8 | 4 | 0.788 | high-intersection-burden | 29 |
| R01052 | 13 | 7 | 6 | 0 | 0.793 | high-intersection-burden | 4 |
| R00108 | 17 | 6 | 6 | 5 | 0.962 | high-intersection-burden | 10 |

For each: `scripts/family-generate.mjs` produced 15 `local-mutant` variants (seed 20260729) + 7
`symmetry` variants (the 7 non-identity rotation/reflection transforms) from the level's own stored
witness — 22 variants/level, 110 total. Each variant solved independently via
`scripts/portfolio-solve-sweep.mjs --scheduler-mode=legacy --budget-ms=8000 --node-budget=20000000
--workers=4 --save-hints` (the same node-budget as `logs/stress-corpus2-baseline.json`, so results are
directly comparable to the parents' own baseline verdicts; `--save-hints` so any solve's path+
provenance would be captured — see "Hint capture" below).

## Result: 0/110 solved — every sampled level is robust

All 110 variants across all 5 parent levels failed, every one terminating with
`status: "node-budget-reached"` (genuine exhaustion at 20M nodes across the full attempt ladder
including 6x repair-fallback budget — not a crash or early bailout). No scoring/heuristic signal was
even partially recovered by any structural perturbation or symmetry transform:

| Level | mutant (15) | symmetry (7) | total (22) |
|---|---|---|---|
| R00082 | 0 | 0 | 0 |
| R02518 | 0 | 0 | 0 |
| R00142 | 0 | 0 | 0 |
| R01052 | 0 | 0 | 0 |
| R00108 | 0 | 0 | 0 |
| **All** | **0/75** | **0/35** | **0/110** |

This is a cleaner result than either precedent case — not a mixed fragile/robust split within the
sample, but unanimous robust across all 5, despite the levels spanning a 2x range of turn-load (8–17)
and varied secondary mechanics (portals present/absent, flippers present/absent, geese present/absent,
must-turn-dominant vs. adjacent-turn-dominant mixes). The symmetry-variant failures in particular rule
out (for these 5 levels specifically, not as a general claim) "the solver has an orientation-dependent
bias that only fails on this exact rotation" — every rotation/reflection of each witness failed too.

## Caveat: archetype confound

All 5 sampled levels independently resolved to the same `detectArchetype()` bucket
(`high-intersection-burden`) — not a selection criterion, but an emergent property of turn-load-heavy
levels in this corpus (plausibly because high turn-load correlates with high `reqInt` in the generator,
or because `high-intersection-burden` is checked early in `detectArchetype`'s predicate order and wins
by default absent a more specific match). This means the finding **cannot yet distinguish** "turn-load
is what makes these robust" from "high-intersection-burden levels are robust regardless of turn-load."
Disambiguating needs a follow-up sample of high-turn-load levels from a *different* archetype bucket
(or high-intersection-burden levels with *low* turn-load) — not run here.

## Hint capture

`--save-hints` was used on every batch (after an earlier accidental run without it was caught,
killed, and restarted — see the mid-session correction). All batches reported "Hints: appended to 0
level(s); 0 hint file(s) changed on disk," consistent with 0/110 solved: there was nothing to capture.
Had any variant solved, its path+provenance would have been written to `data/families/hints/<variantId>.json`
via the same `hintKeyForLevel`/`writeLevelsWithHints` machinery every other corpus uses.

## What this means / recommendation

For this sample, turn-load-heavy corpus-2 unsolvability is **not** a scoring/attempt-policy
representation gap fixable by, say, adding a `SCORE_MUST_TURN_AVERSION`-style term or a turn-aware
attempt profile — every structural neighborhood of these 5 witnesses is itself infeasible under the
current search's reach, symmetry-invariant. That rules out the "fragile" branch of the roadmap's own
decision rule for this sample and points instead toward the "robust" branch: a genuinely new
bound/pruning/technique is needed for this population, not a heuristic retune. Given the archetype
confound above, the concrete next step is a second, archetype-differentiated sample before committing
further effort to designing that new technique — spending effort on a turn-load-specific mechanism
without first knowing whether turn-load or archetype is the operative variable would risk solving the
wrong problem.

## Verification

Read-only solver research; no solver code changed. All 110 variant corpora + manifests generated via
the checked-in `scripts/family-generate.mjs` and are committed under `data/families/` (see
`9d424b7e` for the corpus/manifest commit). Solve results are reproducible: rerun
`scripts/portfolio-solve-sweep.mjs` against any `data/families/family-<id>-<mode>.json` with the same
flags above. `check:lint` unaffected (no source changed this phase).
