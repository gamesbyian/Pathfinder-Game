# The solver enters ~3 of every 4 provably-dead branches, and none of its prunes can catch them early (2026-07-31)

Differential diagnosis, following [`2026-07-31-cpsat-encoding-bug-and-external-hints.md`](2026-07-31-cpsat-encoding-bug-and-external-hints.md).
Answers the question that report left open: *we now know these levels are not intrinsically hard —
so what specifically is our search missing?*

**Headline**: at every decision point along a known solution, of the sibling branches that are
**provably dead** (no valid completion exists), our prune gauntlet rejects only about a quarter.
**74% of dead branches are entered** — 35/45 on R00044, 32/46 on R00001. Zero unsound prunes in 32
live branches, so this is purely missing inference, not a correctness problem. Critically, the
misses are spread evenly across the whole path, including branches with 90 steps remaining, and
**forcing connectivity on at every node does not catch them**.

---

## Method

`scripts/stress/prune-gap-probe.mjs`. Walk a stored referee-valid solution; at each decision point
take every alternative `getNeighbors` offers and cross two facts:

1. **Does our gauntlet prune it?** — `evaluatePrunedMove` from `modules/solver/prune-gauntlet.ts`,
   the real function `dfsFromGate` calls, not a reimplementation. Run with `cfg = null` (every prune
   enabled) and `runConnectivity: true`, so a "passed" verdict is a genuine miss and not an artifact
   of the search's own every-8-steps connectivity schedule.
2. **Is it actually dead?** — `cpsat-full-probe.py --prefix=<path+alt>` as a feasibility oracle:
   does any valid completion exist from that partial path?

An oracle timeout is `unknown` and excluded, never counted as "alive" — treating an indeterminate
result as a negative is the mistake `docs/solver-budget-determinism.md` warns about.

## Result

| | R00044 | R00001 |
|---|---|---|
| reqLen / reqInt / mustCross | 91 / 6 / 6 | 84 / 6 / 6 |
| dead branches | 45 | 46 |
| …pruned by us | 10 | 14 |
| …**entered** | **35 (78%)** | **32 (70%)** |
| alive branches | 11 | 21 |
| …wrongly pruned | **0** | **0** |
| oracle unknown | 0 | 3 |

**Zero unsound prunes across 32 live branches.** The probe doubles as a soundness audit and the
gauntlet passes it clean — worth having on its own, given how much of this codebase's history is
unsound-prune bugs.

## Three things this rules out

**1. It is not an ordering problem** — already known (68.1% first-choice accuracy on unsolved vs
65.1% on solved), and this is the complementary half: ordering decides which child to try *first*,
but three quarters of the doomed children are ones we should never have entered at all.

**2. It is not connectivity.** `isConnected` was forced on at *every* evaluated node here, not on
its production schedule (`rSteps <= 20 || (realLen & 7) === 0`), and 74% of dead branches still
passed. Making the connectivity check more aggressive is therefore not the fix — a cheap negative
result that saves someone an experiment.

**3. It is not primarily must-cross-positional.** Only **8 of the 35** R00044 misses are on or
orthogonally adjacent to a must-cross cell. A prune reasoning about where must-cross intersections
get spent — the plateau report's surviving lead — would address at most about a quarter of the gap.
This is the second independent result this week pointing the same way (21 must-cross-saturated
levels solved in 4–38s); the mechanic is real, but it is not the main lever.

## What the misses have in common: our prunes are budget-comparative

Position of the R00044 misses along the path, in deciles: `{0:4, 1:2, 2:5, 3:6, 4:4, 5:5, 6:6, 8:3}`
— essentially uniform. Remaining-steps at each miss runs from **90** down to 15. The early ones are
the expensive ones: a dead branch entered with 90 steps left can absorb an enormous subtree.

That distribution has a structural explanation in the gauntlet's own shape. Almost every prune we
have is a comparison against remaining budget:

```
PRUNE_DISTANCE_BOUND        gd  > rSteps
PRUNE_MUST_PASS_LB          lb  > rSteps
PRUNE_MUST_CROSS_LB         lb  > rSteps
PRUNE_SURROUND_LB           lb  > rSteps
PRUNE_ADJ_TURN_LB           lb  > rSteps
PRUNE_INTERSECTION_DEFICIT  (reqInt - ints) > rSteps
```

When `rSteps` is 90, every one of these is vacuous: no admissible bound on an 11x11 grid approaches
90. They are structurally incapable of firing early, which is exactly where the costly misses are.
The three prunes that are *not* budget-comparative — `PRUNE_MC_CEILING`, `PRUNE_MUST_TURN_DEADLOCK`,
and connectivity — are the only ones that can fire early, and between them they account for the 24
branches we do catch.

This is a hypothesis about *why*, resting on reading the gauntlet, not a measurement of which prune
fired on which branch. The uniform miss distribution and the zero-effect connectivity result are the
measured parts. Attributing each of the 24 catches to a specific prune is the obvious next
refinement and is not done here.

## What CP-SAT does differently

It does not ask "is a lower bound bigger than the remaining budget." It propagates the constraints
against each other over the *whole remaining assignment* — the exact-intersection cardinality
constraint, the per-visit axis rule and reachability jointly — and derives that a partial assignment
is inconsistent regardless of how much budget is left. That is why it answers these prefix queries
in seconds and why its advantage does not decay when `rSteps` is large.

## Follow-up: is there a cheap structural signature? Mostly no

The obvious next question — *what would a prune have to detect?* — was tested by recording
structural features of every classified branch's post-move state and comparing the 68 missed (dead,
unpruned) against the 33 alive. Features chosen to be **non**-budget-comparative, since that is the
established weakness. `needFresh` is the count of distinct new cells the path still owes
(`reqLen + 1 - reqInt - distinctVisited`); these levels are near-Hamiltonian, so that is a real
constraint rather than a slack one.

| feature | missed [min, med, max] | alive [min, med, max] |
|---|---|---|
| `slack` (reachableFresh − needFresh) | −68, 7, 27 | 1, 21, 27 |
| `freshComponents` | 1, 4, 9 | 1, 3, 7 |
| `largestFreshComponent` | 11, 56, 101 | 16, 68, 104 |
| `stranded` (unreachable pending required cells) | 0, 0, 5 | 0, 0, 0 |
| `rSteps` | 2, 48, 90 | 8, 49, 87 |

**The two populations overlap on every feature.** As candidate prunes (must fire on dead, *never* on
alive):

| candidate | fires on missed | fires on ALIVE |
|---|---|---|
| `freshComponents > 1` | 61/68 | **27/33** — useless, kills live branches |
| `largestFreshComponent < needFresh` | 9/68 | 0/33 — but see below |
| `slack < 0` | 3/68 | 0/33 |
| `stranded > 0` | 3/68 | 0/33 |
| `!goalReachable` | 3/68 | 0/33 |

`slack < 0` and `stranded > 0` are **sound** — the flood fill over-approximates reachability (it
ignores the axis constraint), so "fewer reachable fresh cells than the path still owes" and "a
pending required cell is unreachable" are both safe conclusions. Together they catch about **6% of
the gap**.

`largestFreshComponent < needFresh` is the best empirical separator at 13%, and it is **probably
unsound**: the path may leave one fresh component through an already-visited cell that still has a
free axis and enter another, so requiring all remaining fresh cells in a single component is not a
theorem. Zero false positives on 33 live branches is not a proof, and this codebase's history is
mostly prunes that looked clean on a small sample.

**Conclusion: there is no cheap local structural signature for why these branches are dead.** The
sound cheap tests reach ~6%; the rest of the 74% is invisible to every per-node quantity measured.
That is itself the finding — it is consistent with deadness being a genuinely *global* property of
the remaining assignment, which is exactly what CP-SAT's whole-assignment propagation sees and what
no per-node bound can.

## The actionable shape

The gap is not a missing admissible bound, and — per the follow-up above — it is not a missing cheap
structural check either. **Do not build a targeted prune for this**; the measurement says one cannot
reach more than a few percent of it soundly.

That leaves two honest options:

1. **The ~6% that is soundly detectable** — **DONE**, see below.
2. **Real propagation, or nothing.** A periodic bounded consistency sweep over the remaining free
   cells reasoning about intersection budget and axis usage *jointly* — not another per-node bound.
   This is a substantial piece of work with a real chance of not paying off, and it should be entered
   deliberately rather than drifted into. **Its cost budget has since been measured**: ~1.5 µs
   amortized per candidate, i.e. tens of µs per call at a 1-in-10-to-50 frequency, and emphatically
   NOT to be sized in work units — see
   [`2026-07-31-propagation-cost-budget.md`](2026-07-31-propagation-cost-budget.md). That also rules
   out CP-SAT as an in-loop subroutine by five to six orders of magnitude.

**Do not** run the "perfect oracle upper bound" experiment that suggests itself here. It is
vacuous: a search that only ever enters branches with a valid completion reaches the goal in
`reqLen` steps with no backtracking by construction, so it would return "yes, this converts" for
every level regardless. (Recorded because it was proposed in this session before the triviality was
noticed.)

**Correctness bar.** Anything here is a new prune on solver state, which is the single most
dangerous change class in this codebase (the MST scratch-buffer bug; the nogood signature that was
unsound on the first level tested). An under-keyed or over-eager prune silently discards reachable
solutions. This probe is itself a usable gate — its `alive + pruned` cell is exactly a soundness
check, and any candidate prune should be run through it on a corpus slice before it goes near
`solver:bench`.

## Caveats

- **Two levels**, both 11x11 and both must-cross-saturated. The 74% is not a corpus statistic.
- **Siblings of a known solution only.** This measures how readily the search steps into a doomed
  subtree adjacent to the right path; it does not measure the far larger waste deep inside wrong
  subtrees. If anything that makes 74% a floor on the problem, not a ceiling.
- Inherits the CP-SAT model's scope: no portals / filters / flipping filters (328/1700 corpus-2).
- The branching along a correct solution is remarkably low — on R00044, 47 of 91 decision points
  have **no** alternative at all, and the whole path offers just 56. Whatever the search is doing
  with 20M nodes, it is not exploring near the solution.

## Reproducing

```
node scripts/run-bundled.mjs scripts/stress/prune-gap-probe.mjs -- \
  --level=R00044 --every=1 --oracle-limit=30 --out=reports/stress/prune-gap-R00044.json
```

Per-branch data (including every missed branch's step and coordinates) in
`reports/stress/prune-gap-R00044.json` and `prune-gap-R00001.json`.

---

## Implemented: `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` (the soundly-detectable share)

The 6% turned out not to need a new prune at all — it was a **missing rule inside the existing
connectivity flood fill**.

`isConnected`'s fill decided traversability purely by visit count (`visited <= maxVisit`, where
maxVisit is 2 while intersection budget remains). But a cell whose **both axis bits are spent** can
never be entered again — entering along H needs H free, along V needs V free. That is independent of
visit count: a cell visited *once*, entered horizontally and left vertically, has `edgeUsage === 3`
with `visited === 1`, so the visit-count test admits a cell that is in fact a wall. Since the fill
routes *through* such cells, it was over-reporting reachability — which is why the probe found dead
branches whose goal or pending must-pass/must-cross cell was already unreachable, yet survived
`isConnected` with connectivity forced on at every node.

Fixing it inside the fill rather than bolting on a new check means one flood fill, not two, and it
tightens goal reachability, objective reachability and `freshVolume` (hence the volume check) all at
once. Cost is one extra typed-array read per cell.

**Soundness.** A prune is unsound if it can reject a state from which a solution is still reachable.
Every stored hint is a valid solution, so every prefix of one is a state with a known completion —
`scripts/stress/connectivity-soundness-check.mjs` replays all of them and asserts `isConnected`
never returns false. Result across all three corpora:

```
data/levels.json                      12600 paths,   451,823 prefix states
data/stress/stress-levels.json        13819 paths, 1,093,529 prefix states
data/stress/stress-levels-random.json 23702 paths, 2,132,287 prefix states
Total: 50,121 paths, 3,677,639 states -- zero rejections
```

That gate is committed and should be run after any future change to `topology.ts`; it is not
specific to this flag.

**Verification.**
- `topology.test.ts`'s randomized differential test against an independent BFS still passes — the
  reference was updated to encode the same rule, re-derived from `move-rules.ts` rather than copied
  from the implementation, since the rule is a property of the game and both must know it.
- A dedicated unit test pins the case the visit-count test cannot see (`edgeUsage === 3` at
  `visited === 1`, with intersection budget left), and checks that ablating the flag restores the
  old looser answer on the same state.
- `solver:bench --check`: **160/160, no regressions, nodes −0.2%** — it prunes marginally more.

**Measured effect on the gap it was derived from** (R00044, same probe): dead branches pruned
**10 → 13**, missed **35 → 31**, gap **78% → 70%**. Zero unsound branches, unchanged.

Which is exactly the prediction — ~6% of the gap, no more. **The remaining 70% still needs real
propagation or nothing**, and that conclusion is unchanged by this change.

---

## Widened: the gap generalises (14 levels, 2026-07-31)

The original measurement was two levels, both 11x11 and both must-cross-saturated, and the whole
"real propagation or nothing" recommendation rested on it. Widened to a stratified sample before
anyone acts on it: 15 in-scope levels spanning all three must-cross classes, `reqLen` 59-118, both
solved and unsolved. Sampled every 2nd decision point with a 20s oracle limit (the original used
every point at 30s), so per-level counts are smaller and the unknown rate higher.

Run **after** both new connectivity walls landed — this repo's `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED`
and main's `PRUNE_MC_RESERVED_WALL` — so it measures the current gauntlet, not the one the original
74% was taken against.

| id | class | reqLen | solved | dead | pruned | missed | gap |
|---|---|---|---|---|---|---|---|
| R03196 | saturated | 59 | yes | 24 | 9 | 15 | 63% |
| R02939 | saturated | 70 | yes | 18 | 6 | 12 | 67% |
| R02544 | saturated | 78 | yes | 19 | 4 | 15 | 79% |
| R03262 | saturated | 86 | no | 19 | 6 | 13 | 68% |
| R00108 | saturated | 101 | no | 25 | 10 | 15 | 60% |
| R00986 | unsaturated | 73 | no | 29 | 9 | 20 | 69% |
| R02294 | unsaturated | 87 | no | 18 | 6 | 12 | 67% |
| R03295 | unsaturated | 106 | yes | 21 | 11 | 10 | 48% |
| R02017 | unsaturated | 118 | yes | 23 | 10 | 13 | 57% |
| R03360 | no-mc | 60 | yes | 14 | 5 | 9 | 64% |
| R02331 | no-mc | 81 | yes | 20 | 12 | 8 | 40% |
| R02909 | no-mc | 91 | yes | 11 | 6 | 5 | 45% |
| R02496 | no-mc | 102 | no | 30 | 11 | 19 | 63% |
| R02402 | no-mc | 117 | yes | 18 | 5 | 13 | 72% |
| **total** | | | | **289** | **110** | **179** | **62%** |

**The gap generalises.** 62% overall, and it is flat across the mechanic classes:

| class | levels | gap |
|---|---|---|
| must-cross saturated | 5 | 67% |
| must-cross unsaturated | 4 | 60% |
| no must-cross at all | 5 | 58% |

That is the important number. A 58% gap on levels with **no must-cross whatsoever** confirms
independently that this is a property of the search, not of a mechanic — the third result this week
against the "must-cross is the difficulty" framing, and the one that settles it, since it removes
the mechanic entirely and the gap barely moves. It is also flat across `reqLen` 59-118 and across
solved and unsolved levels, so it is not an artifact of level size or of picking hard levels.

**Zero unsound branches across 209 live ones** (241 counting the original run), now including both
newly-added connectivity walls. The gauntlet stays clean.

**On the 74% -> 62% drop:** two things changed at once — the two new walls landed, and this is a
different, wider sample at a coarser sampling rate. It is *consistent* with the walls having closed
part of the gap, and the ~6% predicted for the axis wall is the right order, but this run is not a
controlled A/B and should not be read as one. The honest statement is that the current gauntlet
enters roughly three of every five provably-dead sibling branches.

**Caveats.** 51 oracle timeouts excluded as unknown (the 20s limit, chosen for throughput, is
tighter than the original 30s) — a lower limit inflates unknowns and could in principle bias the
surviving set toward easier-to-refute branches. `R00943` (reqLen 130) was dropped: its hint file
exists but is empty, which the sample-selection filter tested for existence rather than content;
the probe refused it correctly rather than walking a bogus path.

**Verdict unchanged, now on 14 levels instead of 2.** The gap is real, general, and not
mechanic-specific; the cheap structural signatures do not separate dead from alive; so the
recommendation stands — take the soundly-detectable slivers where they appear, and treat anything
beyond that as needing real propagation, entered deliberately.
