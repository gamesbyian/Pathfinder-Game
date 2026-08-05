# Must-cross forces path structure the solver never derives (2026-07-31)

A direction out of the solvability plateau, plus the measurement that says which half of it to
build and which half to leave alone.

[`2026-07-30-solvability-plateau-diagnosis.md`](2026-07-30-solvability-plateau-diagnosis.md) closed
with one surviving lead and an explicit instruction: *"the fully-reserved must-cross regime is the
one unexploited lead … a structural property the solver counts but never reasons about
**positionally**. Prove the next one on paper before writing code."* This is that proof, plus a
falsification attempt against 15,032 stored solutions, plus a prevalence census. No solver code is
changed here.

**Headline**: a must-cross cell forces four specific cells onto the path and two specific straight
segments through it. The solver derives none of this. Its own *editor* validator already states the
rule; the search has no representation of it. On the failing population this amounts to a median of
**18 required cells the search does not know are required**, on top of the 5 it does.

And the correction that reopens the lead the plateau report closed: that report ruled out a degree
prune because "pending must-cross cells reserve intersections and hold `intNeeded` above zero." The
reservation is exactly what drives the *free* intersection budget to zero. The reasoning inverts.

---

## The derivation

Read out of `search-state.ts`'s `isMoveDynamicallyValid` and `applyMove`, not assumed:

1. **Two crossings, opposite axes.** `edgeUsage[target] & axisBit` rejects entering a cell along an
   axis already used to enter it. A must-cross cell's mask clears at `crossCounts >= 2`, so it needs
   two entries, and they must be on different axes.
2. **Each crossing is straight.** After the first visit, the must-cross lock (`isMoveDynamicallyValid`,
   the `_mcLockIdx` branch) rejects any exit that would consume both axis bits — so the exit axis must
   equal the entry axis. On the second visit the lock no longer applies, but by then `edgeUsage` at the
   cell has both bits set, so the ordinary turning check rejects a turn there anyway. Both passes are
   straight, for two independent reasons.
3. **Therefore all four orthogonal neighbours are on the path.** The H pass consumes the left and right
   neighbours; the V pass consumes the up and down neighbours. A must-cross cell is never the goal or a
   gate (one object per cell), so neither pass can terminate mid-cell.
4. **Each pending must-cross cell reserves exactly one future intersection.** Already the basis of
   `prune-gauntlet.ts`'s `PRUNE_MC_CEILING` (`ints + popcount(mustCrossMask) > reqInt` → reject). What
   that prune does *not* do is draw the next inference: the intersections available for revisiting
   **anything else** are `reqInt - ints - popcount(mustCrossMask)`. Call it the **free intersection
   budget**. `PRUNE_MC_CEILING` guarantees it is never negative on a surviving state.

The codebase already knows (1) and (2) — statically. `domain/level-validation.ts` rejects a block,
goose, or wrong-axis filter adjacent to a must-cross cell, with the comment *"a MustCross needs one H
pass AND one V pass"*, and records that it was verified against the solver. That knowledge stops at
level authoring. Nothing in `modules/solver/` derives the four forced cells, the two forced segments,
or the free budget.

The closest the solver comes is `prep.mcApproachDistMaps` (perpendicular-approach distances) — and
every one of its five read sites in `scoring.ts`/`lower-bounds.ts` is gated on
`state.crossCounts[i] === 1`. Axis reasoning begins only *after* the first crossing has happened. For
a must-cross cell the path has not reached yet, the solver treats it as an ordinary "get to this cell"
objective.

## Falsification attempt

If the derivation is wrong, a valid solution violates it. `scripts/stress/mustcross-forced-structure.mjs`
(added with this report) checks every stored solution in all three corpora — generator witnesses *and*
saved hints, the latter being PLAY-refereed paths found by every technique the project has ever run —
for a must-cross cell visited other than exactly twice, a non-straight pass, or a neighbour never
visited.

| corpus | paths checked | must-cross cell instances | violations |
|---|---|---|---|
| published | 2,778 | 4,290 | **0** |
| corpus-1 | 4,456 | 13,828 | **0** |
| corpus-2 | 7,798 | 31,968 | **0** |

**15,032 paths, 50,086 instances, zero exceptions**, including 530 portal-bearing corpus-2 levels
(a portal jump onto a neighbour still traverses it, so the claim survives portals).

Separately: **zero** must-cross cells in any corpus have a blocked or off-grid orthogonal neighbour
(4,816 cells) — consistent with (3), and with the editor validator having enforced its static half all
along. A first pass at this check reported 9 apparent counterexamples; all 9 were gate-adjacent cells,
i.e. the check was wrong, not the derivation. Gates are passable *as the source of a crossing* because
the path starts on one. Which leads to a sharper prediction, tested: on all **96** corpus levels where
a gate is orthogonally adjacent to a must-cross cell, the witness's first move is gate → that
must-cross cell. 96/96, no exceptions.

## Prevalence on the population that fails

`node scripts/stress/mustcross-forced-structure.mjs --corpus=data/stress/stress-levels-random.json
--report=reports/stress/typical-budget-corpus2.json --hints-dir=data/stress/hints-random`

939 of corpus-2's 1,700 levels carry must-cross; **782 of them are unsolved — 62% of the entire
1,266-level unsolved population.**

| | unsolved (n=782) | solved (n=157) |
|---|---|---|
| median must-cross count | 5 | 4 |
| median *declared* must-pass | 5 | 5 |
| median **implied forced cells** | **18** | 14 |
| levels with a forced-straight cell (a cell adjacent to ≥2 must-cross cells) | 358 | 54 |
| levels with an overloaded cell (≥3 must-cross roles → needs a revisit) | 20 | 4 |
| levels with must-cross adjacent to a gate (first move forced) | 75 | 15 |
| **levels with zero free intersection budget** (`reqInt ≤ must-cross count`) | **536** | 120 |

The last row is the plateau report's own 42.3% figure, arrived at independently. Solve rate in that
regime is 18.3%, against 36.4% for must-cross-free levels.

## The correction that reopens the closed lead

The plateau report's argument against a degree prune:

> The only sound corner is `intNeeded == 0`, where the return trip's intersection is unaffordable —
> and that never coincides with the must-cross-heavy regime, since pending must-cross cells reserve
> intersections and hold `intNeeded` above zero.

`intNeeded` is the wrong quantity. The in-and-out detour the report correctly identifies as legal
costs one intersection *at the neighbour it backs out through*, and the intersections reserved by
pending must-cross cells cannot pay for it — they are already committed to their own cells. The
affordability test is the **free** budget, not `intNeeded`. And `reqInt ≤ must-cross count` drives the
free budget to zero **from the first move and for the whole search**, because each satisfied must-cross
cell consumes exactly the one intersection it reserved (`ints` up 1, `popcount` down 1, difference
unchanged).

So the regime the report dismissed as never coinciding with a zero intersection budget is precisely
the regime whose *free* budget is zero throughout: 536 unsolved corpus-2 levels.

What that unlocks, all sound, none implemented:

- **The visited path becomes a wall.** `topology.ts`'s `isConnected` sets
  `maxVisit = intNeeded > 0 ? 2 : 0`, so on these levels every visited cell stays traversable in the
  flood fill for the entire search — at `reqLen` ~100 that is ~50 cells of phantom reachability
  inflating both the reachability test and `freshVolume`. Reservation-aware, only *pending must-cross*
  cells stay traversable; everything else the path has touched is impassable. This is the same shape of
  fix as the just-shipped dead-flipper connectivity marking, two orders of magnitude larger.
- **Egress becomes decidable.** With no free intersection, the in-and-out rescue is gone, so a pending
  required cell that can no longer be both entered and left is provably dead — the prune the plateau
  report wanted, sound under the correct condition.
- **Forced-cell availability becomes a dead-state test.** Each of the four neighbours of a pending
  must-cross cell must still be enterable. Once the path has consumed one and cannot pay to re-enter it,
  the branch is dead — detectable at the move that consumes it rather than millions of nodes later.

## The half not to build: bound tightening

The obvious use of 18 extra required cells is to feed them to the MST lower bound. **Measured, and it
is weak.** MST over the shortest-path metric closure of `{gate, goal} ∪ must-pass ∪ must-cross`, versus
the same set widened with the implied forced cells, on the 306 portal-free single-gate unsolved corpus-2
levels that carry must-cross:

| | unsolved | solved |
|---|---|---|
| median `reqLen` | 102 | 84 |
| median required points, base → widened | 10 → 29 | 10 → 25 |
| median MST bound, base → widened | 29 → 40 | 28 → 36 |
| median slack (`reqLen` − bound), base → widened | 72 → **62** | 58 → 49 |
| levels proven infeasible by the widened bound | 0 | 0 |

+10 steps against 72 steps of slack. The bound stays nowhere near tight, and
[`2026-07-30-mst-tightening-reverted-net-negative.md`](2026-07-30-mst-tightening-reverted-net-negative.md)
already measured what a modest sound tightening does at operating budget: **−12 levels net**, because
tightening reorders a budget-limited heuristic search as much as it prunes it. Feeding implied cells to
`mustPassLowerBound` would be the same experiment with a bigger constant factor. **Do not lead with
it.**

The distinction that matters, and the one this report is really arguing for: prefer deductions that
**eliminate a branch outright or force a move** over deductions that **tighten a number**. The first
changes what the search space is; the second only changes what order it is walked in — and this repo has
now measured three separate times that reordering a budget-limited search is a coin flip
(MST tightening −12; archetype routing −4 and −8; move-gen exclusion of dead flippers, −1 solve).

## The precedent that argues against all of this

[`2026-07-30-dead-flipping-filter-awareness.md`](2026-07-30-dead-flipping-filter-awareness.md) derived
a structurally identical rule for flipping filters — straight-through crossing, so both neighbours on
one axis must be open, so a flipper with neither axis open is fatal — validated it against 17,398 stored
paths with zero violations, shipped the connectivity half, and measured its effect: **+0.005% nodes on
corpus-1, −0.0002% on corpus-2, zero new solves out of 340 chances.** Its own verdict on the move-gen
half was "correct and worthless."

That is the honest base rate for this class of idea in this codebase, and it should temper the
expectation here. The reasons to expect a different outcome are differences of magnitude, not of kind:
a dead flipper removes one cell from a 225-cell grid and wastes one node per entry, whereas the
reservation-aware wall removes roughly *half the grid* from the connectivity fill on 536 levels, and
the forced-cell availability test kills subtrees rather than single nodes. Whether that magnitude
survives contact with a budget-limited search is exactly what has not been measured, and no part of
this report should be read as predicting it will.

## Recommended sequence

Ordered by evidence-per-unit-cost. Each step is independently ablatable and independently revertable.

> **Step 1 is done and it worked** — see
> [`2026-07-31-reserved-intersection-wall.md`](2026-07-31-reserved-intersection-wall.md). Shipped as
> `PRUNE_MC_RESERVED_WALL`: **2.25x faster** on the published corpus with 134/160 levels
> bit-identical on `nodesExpanded`, and **+2 solves on a 24-level unsolved sample at 73% of the wall
> time** once the freed budget is spent. The prediction in the Precedent section below — that the
> magnitude, not the kind, would be what differed — held. Two cautions that report records and this
> one did not anticipate: at *matched nodes* the change is −1 solve (the same coin flip as every
> earlier idea; it only pays once the speedup is spent as budget), and `workSpent` is blind to it,
> reporting +11% work on a change that halved CPU.

1. **Reservation-aware connectivity** (`freeIntBudget === 0` → visited non-pending-must-cross cells are
   walls in `isConnected`'s flood fill). Cheapest real test of the whole thesis: a per-row bitmask of
   pending must-cross cells OR'd back into `_rowPassable`, no new BFS, no new precomputation. Fires on
   536 unsolved corpus-2 levels and **35 published levels — so `solver:bench --check` is not blind to
   it**, unlike the dead-flipper change.
2. **Forced-cell availability as a dead-state test** (each of the four neighbours of a pending
   must-cross cell must still be enterable; count those needing a revisit and compare against the free
   budget). O(pending × 4) typed-array reads, no BFS.

   > **Step 2 is done and it worked** — shipped as `PRUNE_MC_FORCED_NEIGHBOR`
   > (`lower-bounds.ts`'s `mustCrossForcedNeighborDeadlocked`, same shape as `mustTurnDeadlocked`,
   > checking the cell's neighbours instead of the cell itself): if a still-needed pass's neighbour
   > has become a hard wall (both axis bits spent, or an already-used flipper), the state is
   > provably dead. Caught a real soundness bug before it ever shipped default-on: the first
   > version checked the path's own CURRENT position too, which can legitimately show
   > edgeUsage-both-bits-spent on arrival while still being free to continue straight through on
   > its very next move (the same `pos` exemption `isConnected`'s flood fill already grants) — 261
   > false rejections on real, referee-accepted published-corpus paths before the fix, 0 across all
   > three corpora (27,170 valid paths, 2,646,971 steps replayed) after it. `solver:bench --check`
   > 160/160, `nodesExpanded` **−7.9%** vs baseline. A matched-node (3M) A/B on a 120-level unsolved
   > must-cross corpus-2 sample: **+3 solves (3 gained, 0 lost)**, total node count across the
   > sample also down slightly. Small sample — see step 1's own note above on why a 24-level sample
   > under-sold that step's effect — but positive on every axis measured, unlike the freeInt
   > dilation and axis-aware connectivity reverts that came after step 1.
3. **Forced-first-move derivation** (a gate orthogonally adjacent to a must-cross cell forces the first
   step; `prep._forcedFirstStepKey` already exists as the mechanism, currently only ever set by offline
   tooling). 96 levels, exact, near-zero cost — but honestly a ≤4× reduction at the root only, since all
   96 turn out to be single-gate levels, so no gate choice gets eliminated. Cheap, small, do it last.

   > **Step 3 is done — sound, free, and (as predicted above) solve-neutral.** Shipped as
   > `PRUNE_MC_FORCED_FIRST_MOVE`, a NEW per-gate `prep.gateForcedFirstStepKey` map (not a reuse of
   > `_forcedFirstStepKey`, which is a single caller-supplied value the offline-tooling call sites
   > still take priority over) — see `prep.ts`'s own derivation comment. Caught a real bug before
   > shipping: `mustCrossIndex`/`mustPassIndex`'s doc comments claimed "-1 if absent" but the actual,
   > already-correctly-used-elsewhere convention is "+1 bias, 0 = absent" (same as
   > `staticNeighborKeys`) — checking `!== -1` against an array that's never actually -1 made the
   > first version force onto a gate's only neighbor regardless of whether it was must-cross at all,
   > and the resulting "90 instances, 0 violations" soundness pass was vacuous (a gate's one-and-only
   > neighbor can never be contradicted by a real solution, whatever the rule claims about it). Fixed
   > and re-verified for real: 99 gate-forced instances, 1,466 solutions, 0 violations across all
   > three corpora. `solver:bench --check` 160/160, nodes essentially unchanged from step 2 alone. A
   > matched-node A/B isolating step 3's own contribution (step 2 on in both arms, 120-level unsolved
   > must-cross sample): 5/120 both arms, one gained one lost, total nodes flat — a net wash, exactly
   > matching the "≤4× at the root only, no gate choice eliminated" prediction. Same category as the
   > dead-flipper change: correct, closes a real gap, not a solve-count driver, kept anyway.
4. **Forced-edge propagation** on the 358 unsolved levels with a cell adjacent to ≥2 must-cross cells:
   both of that cell's path edges are forced, so no other edge at it is usable. This is the genuine
   constraint-propagation direction that `docs/future-work.md` has listed as untried through two
   campaigns. Materially bigger than 1–3 and should follow their result, not precede it.

   > **Step 4 is FALSIFIED as described — "no other edge usable" is not true in general, and no
   > simple sound narrowing of it was found either.** Unlike steps 1–3, this entry was apparently
   > never independently derived-then-falsified before being listed — the two checks below caught
   > it before any solver code was written, which is exactly what the falsify-first discipline is
   > for.
   >
   > **The error, and it's the same one twice.** My first attempt derived something even broader
   > than the text above: that a single must-cross neighbor already forces its axis-sibling edge
   > unusable. Falsified immediately — 63,496 violations over 1.1M replayed edges. The bug: a
   > cell's axis gets marked "used" by ONE straight pass through it, and that pass can legitimately
   > continue straight through to the axis's OTHER side in the same motion
   > (`[west-of-MC]→MC→C→[east-of-C]`) — the identical "leaving along a used axis is legal when
   > going straight" exemption that caused step 2's near-miss (see that step's own callout above).
   > It is not a violation; it is the ordinary way a must-cross pass extends past its forced
   > neighbor. Narrowing to the text's actual claim — a cell with BOTH axes claimed (one must-cross
   > neighbor on H, one on V) — still fails: **5,206 violations over 225,094 checked edges**,
   > because each axis's straight-through extension is independent, so all four edges at such a
   > cell (both must-cross-facing, both "other side") can be legitimately used at once. P00124's
   > violations trace to an even richer case the simple model never anticipated: four must-cross
   > cells forming a solid 2×2 block, each one adjacent to two OTHER must-cross cells, not just
   > ordinary neighbors.
   >
   > **Why no corrected, narrower version was found either (the requested follow-up).** A cell C
   > adjacent to must-cross neighbors on both axes has at least two structurally distinct, both
   > individually legal ways to satisfy its obligations: (a) two separate straight passes (one per
   > axis, C visited twice), or (b) one combined visit that enters via one axis and TURNS to exit
   > via the other, satisfying both neighbors' pass requirements in a single visit (legal because
   > the straightness requirement is checked AT the must-cross cell, not at C — C itself has no
   > straightness obligation unless it is also must-cross). These two patterns don't even agree on
   > C's total visit count, let alone which of C's other edges end up used, so there is no fact
   > about C's "spare" edges that holds across every valid completion — the invariant that survives
   > is exactly what step 2 already checks (the two mandatory must-cross-facing edges must stay
   > enterable), nothing more.
   >
   > **Conclusion:** a genuinely correct version of this idea is not a static edge exclusion at
   > all — it would need to enumerate the compatible local patterns at a qualifying cell and check
   > which remain jointly satisfiable, which is real constraint propagation (closer in kind to the
   > "bounded global-consistency propagator" family of ideas than to steps 1–3's direct
   > derivations) and a materially larger, higher-risk undertaking than "step 4" as scoped here.
   > The must-cross forced-structure sequence is complete at steps 1–3.

Verification protocol, non-negotiable per this repo's own history:

- Pinned `--work-budget` with a non-binding `--budget-ms` on every A/B (`docs/solver-budget-determinism.md`);
  wall-clock-bounded comparisons are not valid across a pruning change.
- **Before/after against the already-SOLVED population**, not only the targeted unsolved one. This is
  the single lesson of the MST revert: a sweep over `ok:false` levels can only discover wins.
- `solver:bench --check` 160/160, plus the cost comparison it cannot see.
- An `oracle:fuzz` pass and a written admissibility argument for anything that rejects a state — step 2
  is a *rejection*, so it carries the full MST-scratch-buffer-bug rigor, not just "tests pass."

## Two other under-leveraged levers found while reading

Recorded here rather than pursued, both cheap relative to their potential.

**`admissible-order-search`'s ordering signal is turn-blind, and ordering needs no admissibility.**
The +117-solve technique ranks children by slack against `admissibleRemainingBound`, which maxes over
goal distance, must-pass, must-cross, surround and adjacent-turn — and has **no must-turn term at all**,
while turn load is the strongest measured discriminator on this corpus (d = 0.750,
`reports/stress/corpus2-failure-categorization-2026-07-29.md`). Its own report lists "which admissible
bounds contribute to the ranking" as the first untried lever. The key point: `rankByAdmissibleSlack`'s
own doc says it *"only orders, it never excludes — a bug here can misorder exploration but can never
cause a missed solution,"* so the ordering signal **does not have to be admissible**. The MST bounds
reverted on 2026-07-30 for being net-negative *as prunes* could be reused as ordering input at zero
soundness risk, inside a tier that runs only after everything else has already failed. That is a
different experiment from the one that failed, not a retry of it.

> **Superseded, twice.** This entry originally (2026-07-31) overstated its own cited source: the
> frontier measurement it summarized as "10^9-10^10 states" was explicitly a range with an open,
> storable end (~16M) that the source itself called "not conclusive," not the single figure quoted
> here. **That has since been corrected for real (2026-08-05)** — the measurement's own dedup key
> was found to be unsound (undercounting states, which is exactly the direction that would make the
> range look better than it is) and its traversal died at depth ~20, short of any tested level's
> real meet depth. Both fixed and re-measured across 8 levels including the real 5-8 flipper-count
> range: every level's frontier is now solidly in the hundreds-of-millions-to-billions range with no
> sign of the growth ratio decaying, closing the range this entry previously (and prematurely)
> treated as closed. See [`docs/future-work.md`](../docs/future-work.md)'s "CLOSED (2026-08-05)"
> entry for the numbers. The verdict this blockquote asserted turns out to be correct, but it was
> not yet earned when first written. Backward search as a bounded *oracle* is NOT ruled out and is
> untried.

**Bidirectional search** is the one lever identified so far with the right *shape*
(`2026-07-30-move-ordering-not-the-bottleneck.md`): at median `reqLen` 99 with ~68% first-choice
accuracy in both populations, every constant-factor improvement is multiplying against an exponential.
Meeting in the middle changes the exponent. The hard part is merging halves under exact `reqInt` and
the mask constraints — and note that the forced structure above supplies natural meeting points, since
a must-cross cell's two straight passes are fixed local shapes the two frontiers could be required to
agree on.

## The req-length sweep tool has never been run

`scripts/req-length-sweep.mjs` + `docs/req-length-sweep.md` are complete, unit-tested, and documented,
and there is **no committed report or log output from them anywhere** (`logs/req-length-sweep/` does not
exist; no report references them). "No conclusions drawn" is literally accurate — the instrument has not
been used.

Its documented framing (which lengths solve, where parity proves impossibility, where cost cliffs sit)
is a per-level characterisation. The question it is actually positioned to answer, and which this report
would want answered, is narrower: **does a level's solvability cliff sit where the free intersection
budget crosses zero?** Sweeping `reqLen` at fixed `reqInt` changes slack without changing the
reservation; sweeping `reqInt` at fixed `reqLen` moves the free budget directly. If solve rate collapses
at the free-budget-zero boundary rather than smoothly with slack, that is independent causal evidence for
this whole thesis — and it needs the two-dimensional `reqLen × reqInt` variant the doc currently defers
as "a different question." That is a small extension to an existing tool, and the cheapest available
causal test of the diagnosis.

## Limitations

- **Nothing here is measured against a running solver.** Every number is a derivation, a check against
  stored solutions, or a read-only corpus census. The prevalence figures say where the structure is, not
  that exploiting it will solve anything.
- **The derivation is validated, not proven, against portals.** The paper argument covers portal jumps
  (a jump onto a neighbour still traverses it) and 530 portal-bearing levels show zero violations, but
  the forced-*edge* arithmetic in step 4 does need portal-free gating, since a jump into a cell consumes
  no ordinary edge.
- **Flipping filters interact with step 2** and are deliberately excluded from the reasoning above: a
  flipper's traversable axis is dynamic state, so "is this neighbour still enterable" must not consult it
  (the same trap `2026-07-30-dead-flipping-filter-awareness.md` documents for its own rule).
- **The MST measurement is single-state.** It samples the gate state only, not mid-search states the way
  `2026-07-17-adjturn-mst-bound-offline-analysis.md` did before drawing its conclusion. It is enough to
  say the widened bound is not close to tight; it is not enough to say the widened bound never helps
  anywhere.

## Reproducing

```bash
node scripts/stress/mustcross-forced-structure.mjs \
    --corpus=data/stress/stress-levels-random.json \
    --report=reports/stress/typical-budget-corpus2.json \
    --hints-dir=data/stress/hints-random \
    --out=reports/stress/mustcross-forced-structure-corpus2.json
```

Also run for corpus-1 (`--corpus=data/stress/stress-levels.json --hints-dir=data/stress/hints`) and
published (`--corpus=data/levels.json --hints-dir=data/hints`); outputs are committed alongside. The
solved/unsolved split uses the 2026-07-30T114427Z typical-budget baseline (434/1700 at 8000 ms /
26,800,000 work units), not `logs/stress-corpus2-baseline.json`'s 605, which includes high-budget-sweep
and hint-discovery finds that no typical-budget run reproduces.
