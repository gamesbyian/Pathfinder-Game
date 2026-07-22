# Repair-stagnation escape plan, Stage 3: scatter-search recombination prototype (2026-07-22)

## What this is

Stage 3 of [`docs/repair-search-stagnation-escape-plan.md`](../docs/repair-search-stagnation-escape-plan.md)
— the plan's secondary experiment. **Verdict: the most promising of the three prototypes — it is
the only one that produced a solved-count gain (a genuinely new solve, R02239) — but still net-mixed
on near-miss quality, with the same near-solved-regression failure mode as Stage 2. Kept default-off.**

## What was built, and what it is *not*

The plan is explicit that true path relinking needs **reversible edit operators** (replace a segment
between two shared anchors, insert/remove a loop, reroute a suffix) so a solution can be walked
incrementally toward another — and that `repairSearchFromGate`'s restarts are **append-only** (extend
a spliced prefix forward until dead end; never edit an existing path), so those operators don't exist
and designing/verifying them is a separate piece of work. This prototype is therefore the
append-only-compatible **approximation** the plan names: **scatter-search recombination via
guide-biased construction**, not strict path relinking. On an elite-splice restart it splices a
"base" elite's prefix as usual, then softly rewards forward moves toward a "guide" elite's cells
(`GUIDE_REWARD`, added to `scoreMove`'s output in `takePly`) — recombining the base prefix with the
guide's shape. Soft reward, never a filter → same soundness as Stage 2 (`isSolutionState` untouched;
support preserved by the always-unbiased fresh restarts and stagnation bursts). Gated by an opt-in
`enableRecombination` param (default off ⇒ byte-identical to the pre-Stage-3 path, unit-tested),
same rationale as Stage 2's opt-in.

## Guide selection matters a lot — and distance-alone is actively harmful

The plan specifies the guide is picked for "large structural distance **and** complementary satisfied
constraints." I built and measured both readings, equal-work (fixed 3,000,000-node budget,
deterministic), OFF vs ON, over the Stage 1 sample:

### Distance-only guide (most structurally different elite) — net-harmful, LOST a solve

| metric | result |
|---|---|
| Solved | OFF 1/16, **ON 0/16** (recombination *broke* R03349, which plain repair solves) |
| bestBadness (unsolved) | ON better 5, **worse 9** |

Picking the *most different* elite as guide rewards moving toward the most unrelated structure, which
scatters a productive walk (R02150 5→23, R01531 8→18). Distance-alone is a mis-reading of the spec,
and the measurement shows it: it costs a solve.

### Complementarity-primary guide (fixes what base is missing, distance as tiebreak) — a real solve, still mixed

`selectGuideCells` prefers the candidate that satisfies the most objective bits the base still lacks
(`complementarity()` over the pending mp/mc/surround/mustTurn/adjTurn masks), breaking ties by
structural distance — the plan's actual criterion.

| id | OFF | ON | Δbad |
|---|---:|---:|---:|
| R01531 | 8 | 6 | +2 |
| R02025 | 15 | 13 | +2 |
| R02077 | 13 | 12 | +1 |
| R02150 | 5 | 25 | **−20** |
| R02239 | 4 | **SOLVED** | +4 |
| R02267 | 8 | 9 | −1 |
| R02279 | 19 | 5 | **+14** |
| R02358 | 24 | 15 | +9 |
| R02378 | 5 | 5 | 0 |
| R02575 | 3 | 7 | −4 |
| R02654 | 12 | 21 | −9 |
| R02842 | 13 | 18 | −5 |
| R02859 | 3 | 13 | **−10** |
| R03280 | 18 | 20 | −2 |
| R03294 | 6 | 14 | −8 |
| R03349 | SOLVED | SOLVED | 0 |

**Solved: OFF 1/16, ON 2/16** — recombination **solves R02239**, which plain repair only reaches
badness 4 on. bestBadness among the still-unsolved: ON better 5, worse 8.

## Reading the result

- **The first solved-count gain in the whole investigation.** Neither Stage 2 (soft penalty) nor
  distance-guide recombination tipped any level to solved; complementarity-guided recombination
  solves **R02239** — which is, tellingly, Stage 1's one *pure-length-deficit* plateau (no structural
  terms, just short). Recombining its short base prefix toward a complementary elite extended it to
  `reqLen` — exactly the "reach a length the random walk can't extend to on its own" problem Stage 1's
  Finding 1 (all plateaus are length-short) said was the real target. That the win lands on the
  pure-length case is a coherent, not accidental, result.
- **But it is still net-negative on near-miss quality, and destroys some near-solved levels**
  (R02150 5→25, R02859 3→13) — the identical failure mode as Stage 2's penalty: a flat cell-level
  bias (reward *or* penalty) cannot tell a load-bearing cell from an incidental one.
- **The near-solved regime is where both the gain and the damage concentrate**, which closes off the
  Stage 2-style "protect near-solved states" guard for this mechanism: R02239 (solved) was itself a
  near-ish plateau (badness 4), so suppressing recombination on small-badness plateaus would suppress
  the one real win alongside the R02150/R02859 damage. Unlike Stage 2, you cannot cheaply separate
  them by *how close* the search is — only by *which cells* are load-bearing.

## Verification

- Unit tests (`repair-search.test.ts`, 23/23): pure `selectGuideCells` (complementarity beats mere
  distance; distance tiebreak; skips base/null), soundness (`enableRecombination=true` returns only
  `isSolutionState`-valid paths), determinism with the flag on, and `enableRecombination=false`
  byte-identical to omitting it.
- `npm run solver:bench -- --check`: 160/160, no regressions (production default = flag off = inert,
  despite the elite-object/`takePly`-signature changes).
- `tsc`/`eslint` clean.

## Recommendation / next steps

This is the direction to keep, but not to ship as-is (stays default-off). Two forks:

1. **The shared bottleneck with Stage 2 is cell-level discrimination.** Both a reward toward guide
   cells and a penalty away from attractor cells fail for the same reason — flat cell identity can't
   tell load-bearing from incidental. The one lever that addresses this is Stage 1's richer, deferred
   features (turn direction at the must-turn cell; edge/axis usage) used to make the bias *selective*.
   If pursued, it should be built once and shared by both prototypes, not re-done per stage.
2. **This is also the natural on-ramp to real path relinking.** Complementarity-guided recombination
   already gets a solve with only a soft nudge; the plan's reversible-edit-operator relinking (splice
   base prefix to a shared anchor cell that also lies on the guide, then replay the guide's suffix,
   each step validated by the existing gauntlet) would recombine *structurally* rather than by soft
   attraction — a better-targeted move that sidesteps the cell-discrimination problem entirely,
   because it copies a whole known-good guide segment instead of nudging toward scattered cells. That
   is the "design + verify new edit primitives" sub-investigation the plan flags — a real, separate
   implementation, and the recommended Stage 3 continuation now that the soft approximation has shown
   the recombination *direction* can actually solve levels.

## Caveats

16 levels, single gate, one node budget, endpoint bestBadness (not the plan's full plateau-survival
curve). One new solve in a 16-level sample is real but not a population-level number. `GUIDE_REWARD`
and the guide-selection policy are unmeasured starting values; this is two points (distance vs
complementarity) in that space, not a sweep. The complementarity masks are captured at elite-insert
time from that restart's dead-end state — a reasonable proxy for "what this elite satisfies," not a
guarantee the recombined path preserves it (it can't, and doesn't need to: `isSolutionState` remains
the sole authority on any returned path).
