# R02248: why 4 of its 8 symmetry orientations resist the solver entirely

> **Status:** concluded-positive
> **Last evidence:** 2026-08-08 — reconciled by [`2026-08-08-symmetry-orientation-sensitivity-synthesis.md`](2026-08-08-symmetry-orientation-sensitivity-synthesis.md)
> **Decision:** retain R02248 as a worked interaction diagnosis, not as evidence for a universal `SCORE_INTERSECTION_SETUP` fix
> **Remaining gate:** none for this case study; broader prevalence and intervention selection belong to the synthesis and variant-corpus plan

**Date**: 2026-07-16. **Data collection and diagnosis only — no solver code changed.** Follows
directly from the Experiment 1 rerun (`reports/families/2026-07-15-symmetry-orientation-bias.md`'s
2026-07-16 updates): across the full 38-family re-test, R02248 was the one family whose "some
orientations don't solve at all" finding survived the elite-splice fix essentially unchanged (4/7
unsolved before, 3/7 after). This report is a focused follow-up asking *why*, now that it's the
most distinctive result left in the whole investigation.

## The level

R02248 (stress-corpus-2, position 579 in `data/stress/stress-levels-random.json`): 12×12 grid,
`reqLen: 101`, `reqInt: 7`, no must-pass/must-cross/portals/filters — just 21 blocks, 8 geese, and
3 surround landmarks (statue, library, park). With 144 total cells and 29 blocked/goose cells,
reqLen 101 means the path must cover roughly 88% of every open cell — a near-Hamiltonian instance,
the hardest general category for heuristic search (almost no slack; most partial paths dead-end).
navDensity 0.886, above both `DENSE_LEVEL_NAV_DENSITY` (0.70) and `POLICY.NEAR_HAMILTONIAN_DENSITY`
(0.82).

## Step 1: ruled out a generation/witness bug

Before treating "doesn't solve" as a solver phenomenon worth investigating, checked whether the
generated siblings are even valid. `family-generate.mjs` validates every sibling's transformed
witness (schema/structural/witness) before accepting it — confirmed via the manifest
(`generationAttempts: 3` for the hardest variant, meaning some candidate siblings were generated
and rejected before this one passed). All 7 siblings are known-solvable by construction (a
symmetry transform preserves the abstract puzzle exactly). The failure is a genuine solver
phenomenon, not a broken level.

## Step 2: the exact geometric pattern

Decomposed the 7 symmetry variants as elements of the dihedral group D4 (rotation `r` = 90°,
reflection `s` = flip-x), by directly matching each variant's gate/goal coordinates against
`domain/geometry.ts`'s `transformPoint` formulas:

- identity = e, variant 1 = r, variant 2 = r², variant 3 = r³
- variant 4 = s, variant 7 = rs, variant 5 = r²s, variant 6 = r³s

Post-fix results, both before and after the elite-splice fix, split cleanly along rotation
component alone, independent of whether a reflection is composed in:

| Group element | Variant | Status (post-fix) |
|---|---|---|
| e | parent | solves via beam, ~6.4s |
| r | 1 | solves via beam, ~6.8s |
| s | 4 | solves via beam, ~6.9s |
| rs | 7 | solves via beam, ~6.5s |
| r² | 2 | solves via repair, but only after 150.5M nodes / 275s |
| r³ | 3 | **does not solve** at 271M nodes / 425s |
| r²s | 5 | **does not solve** at 305M nodes / 425s |
| r³s | 6 | **does not solve** at 253M nodes / 425s |

**Easy = {e, r} × {no reflection, s}; hard = {r², r³} × {no reflection, s}.** The rotation
component being 0°/90° vs. 180°/270° is the entire story — reflection composed on top doesn't
change which side of the split a variant falls on. This exact same 4-variant split held both
before and after the elite-splice fix, which is what made it worth digging into: it survived a
change that erased or substantially altered almost every other finding in this investigation.

## Step 3: tracing the actual attempt ladder

Called `Solver.solve` directly on variant 3 (`F02248-sym-03`) with a large node budget (8M) to see
the full attempt-by-attempt trace (`orchestration.ts`'s `Attempt[]`, not just the final result):

| Attempt | Result | Detail |
|---|---|---|
| repair, seed 0 | fails | 2,000,003 nodes, `bestBadness: 11` |
| repair, seed 1 | fails | 2,000,002 nodes, `bestBadness: 10` |
| beam `intersectionHarvest@5000` | fails | **3 nodes — genuine exhaustion, not timeout** |
| beam `objectiveFirst@5000` | fails | **10 nodes — genuine exhaustion, not timeout** |
| DFS/LDS `intersectionHarvest` (unlimited width) | fails | 143,203 nodes, timed out, `finalBadness: 19` |
| DFS/LDS `objectiveFirst` (unlimited width) | fails | 308,097 nodes, timed out, `finalBadness: 28` |
| repair, full-budget fallback | fails | 3,548,692 nodes, `bestBadness: 11` (same plateau as the probe) |

Two things stand out. First, the width-5000 **beam searches don't time out — they run out of
legal candidates after only 3–10 expansions**, meaning the beam's own frontier collapses almost
immediately in this orientation (every beam member independently dies within the first few steps).
Second, **repair's `bestBadness` plateaus at 10–11 across three independent attempts with
different seeds** — not a fluke of one restart, a consistent ceiling repair's local search can't
get past regardless of where it starts from.

Since the underlying graph is isomorphic across all 7 orientations (a rotation only relabels
coordinates — the number of legal neighbors from any cell is identical in every orientation), a
difference in "how boxed in the search gets" can't come from the graph itself. It has to come from
scoring/heuristic terms that depend on *absolute* coordinates rather than graph structure alone.

## Step 4: isolating the term via ablation sweep

Called `beamSearchFromGate` directly (bypassing the full ladder, for speed) on variant 3 with each
`SCORE_*` ablation flag disabled one at a time (`scripts/ablation-config.mjs`'s registry, 19
flags). Four flags, disabled individually, flipped the beam search from "collapses at 3 nodes" to
"solves immediately" (verified genuine — 102-node solution paths, matching `reqLen: 101` exactly,
not a counting artifact):

- `SCORE_INTERSECTION_SETUP`
- `SCORE_PHASE_SCALING`
- `SCORE_REVISIT_PENALTY`
- `SCORE_SURROUND_URGENCY`

Re-ran all 4 flags against all 4 hard variants (2, 3, 5, 6) to see which one generalizes:

| Flag disabled | v2 | v3 | v5 | v6 |
|---|---|---|---|---|
| `SCORE_INTERSECTION_SETUP` | **solves** | **solves** | **solves** | **solves** |
| `SCORE_PHASE_SCALING` | fails | solves | fails | solves |
| `SCORE_REVISIT_PENALTY` | fails | solves | fails | solves |
| `SCORE_SURROUND_URGENCY` | fails | solves | fails | solves |

**`SCORE_INTERSECTION_SETUP` is the one flag that unlocks all 4 hard variants, consistently.** The
other 3 only help 2 of the 4 (v3 and v6, not v2 or v5) — informative on its own (v2/v5 and v3/v6
apparently have a different specific bottleneck even though all 4 share the intersection-setup
sensitivity), but not the common thread.

## The mechanism

`scoring.ts:517`, `SCORE_INTERSECTION_SETUP`:

```js
if (!cfg || cfg.SCORE_INTERSECTION_SETUP) {
    const intNeeded = level.reqInt - state.ints;
    if (intNeeded > 0 && state.visited[target] > 0 && target !== level.goalKey && !prep.gateFlags[target]) {
        score += wi * 12;
    } else if (intNeeded > 0) {
        score += wi * 1;
    }
}
```

This gives a large reward (`wi * 12`) for stepping onto an already-visited cell whenever the path
still needs more self-intersections — a reasonable, generally-necessary counterweight to
`SCORE_REVISIT_PENALTY`'s default aversion to revisiting cells, since R02248 needs exactly 7
self-crossings (`reqInt: 7`) and the search has to be pushed to create them somewhere.

The orientation-dependence isn't in this term itself — `reqInt` doesn't change with rotation. It's
in what the term acts *on*. The graph is identical across orientations, but the early greedy
trajectory the beam actually takes is shaped by other, genuinely position-dependent terms (goal
attraction, perimeter bias) that differ by absolute coordinate. In the 4 hard orientations,
whatever trajectory those terms produce puts the search in a position where the large
revisit-reward fires early and locks in a self-crossing that this near-Hamiltonian level (needing
~88% of all open cells) can't afford — burning through adjacency options it needs later to reach
unvisited territory. In the 4 easy orientations, the differently-shaped early trajectory never
triggers the same self-defeating crossing.

**This is an interaction effect, not a single broken term.** `SCORE_INTERSECTION_SETUP` is doing
exactly its documented job; it simply combines badly with the specific early trajectory that
emerges in exactly half of this level's 8 dihedral orientations, for this level's specific
near-Hamiltonian-density-plus-surround-landmark structure.

## Interpretation

This is now the third finding in this investigation (after the multi-seed retry's node-cost
variance and the R02208 grid-growth rescue, both already documented) traced to a concrete, named
mechanism rather than left as an unexplained correlation. Unlike R02208's rescue (a pure win, more
open space always helped) or the general orientation-flip pattern (mostly explained away by the
elite-splice bug), R02248's resistance is neither a bug nor an artifact — it's a genuine, traceable
consequence of how `SCORE_INTERSECTION_SETUP`'s revisit-incentive interacts with orientation-shaped
early trajectories on a level dense enough that there's no slack to recover from an early mistake.

This is the kind of thing worth knowing about the scoring architecture in general, even though it
doesn't point to an obvious universal fix: a term tuned to help the common case (reward revisits
when intersections are still needed) can become actively harmful on the rare level that combines
near-Hamiltonian density with a nontrivial `reqInt`, and whether it helps or hurts can depend on
absolute grid orientation in a way that has nothing to do with the puzzle's actual difficulty.

## Caveats

- **Resolved follow-up to the original n=1 caveat.** The targeted pattern scan found R01465 with
  the same high-level beam-collapse/repair-plateau signature, but its dominant ablation was
  `SCORE_SURROUND_URGENCY`, not `SCORE_INTERSECTION_SETUP`. Phase D then found three more fragile
  families implicating still other attraction/navigation terms. The recurring phenomenon is now
  supported; this exact term-level mechanism remains specific to R02248. See
  [`2026-07-16-r02248-pattern-scan.md`](2026-07-16-r02248-pattern-scan.md),
  [`2026-07-16-phase-d-fragile-group-ablation-diagnosis.md`](2026-07-16-phase-d-fragile-group-ablation-diagnosis.md),
  and the current synthesis linked above.
- **Diagnostic only — no solver change proposed or made.** Disabling `SCORE_INTERSECTION_SETUP`
  unlocks this specific level in this specific orientation; it is very likely load-bearing for
  other levels that genuinely need the revisit-incentive to hit their `reqInt` at all (that's the
  term's whole purpose). Any change here would need the same corpus-wide solvability *and* speed
  verification this session's other solver changes required (`solver:bench --check` plus a
  full-corpus before/after sweep) — not attempted, out of scope for a diagnostic investigation.
- **v2/v5 vs. v3/v6 asymmetry unexplained.** All 4 hard variants share the
  `SCORE_INTERSECTION_SETUP` sensitivity, but 3 of the other 4 flags each affect v3/v6 without
  affecting v2/v5 — there's a second, more localized difference between these two variant-pairs
  not chased down here.
- `nodesExpanded`'s raw magnitude for the beam attempts (3–10) reflects that profile's own
  internal counting convention (likely a per-generation-batch counter, not per-candidate), not a
  literal "only 3 states were ever considered" — the qualitative signal (genuine exhaustion,
  `timedOut: false`, vs. a timeout) is what matters here, confirmed by checking `ok`/solution
  length directly rather than trusting the raw count alone.
- Scoped to the `legacy` scheduler mode and the solver as it exists on this branch as of commit
  `451ac24` (post elite-splice-fix, post repair-probe-retry-width re-tune).
