# Exact repair-retreat CP-SAT (item C)

Date: 2026-08-12

This is item C from [`docs/claude-remote-solver-handoff.md`](../docs/claude-remote-solver-handoff.md): does the
repair-rollback pilot's ~63-step / 0.815×`reqLen` **demonstrated** rollback (longest common prefix
against a *known* solution) actually reflect the **minimum causal edit window**, or is it an
overestimate because the known-solution set is incomplete? [`reports/2026-08-11-repair-rollback-causal-window-pilot.md`](2026-08-11-repair-rollback-causal-window-pilot.md)
and its artifact ([`reports/stress/repair-rollback-census-pilot-2026-08-11.json`](stress/repair-rollback-census-pilot-2026-08-11.json))
were explicit that this was only an upper-bound witness. This report answers the exact version with
CP-SAT.

## Method

Four repair-search elites across the same 3 Corpus-2 levels the pilot used (`R00001`, `R00039`,
`R00044`, all from `data/stress/stress-levels-random.json`) were re-selected deterministically
(`scripts/stress/repair-elite-path-dump.mjs`, which reproduces `repair-rollback-census-pilot.mjs`'s
elite-selection bit-for-bit and additionally dumps full packed-key paths):

- `R00001:elite:0` (badness 5, eliteLength 80) and `R00001:elite:4` (badness 10, eliteLength 77) —
  two different observed near-misses from the same level/gate, to see whether the boundary is a
  property of the level's structure or of the individual elite;
- `R00044:elite:0` (badness 14, eliteLength 81);
- `R00039:elite:0` (badness 16, eliteLength 53), included specifically because it is where the pilot
  measured the *shallowest* demonstrated common-prefix (only the gate).

For each elite, `low` was seeded at the pilot's demonstrated-feasible depth (the elite's longest
common prefix with any known valid solution from that gate, minus one) — trivially CP-SAT-feasible
by construction, no oracle call needed, per the task framing. `high` started at the elite's full
stuck length. Binary search then walked forward from `low`: at each midpoint, the prefix (elite path
cells 0..depth) was replayed against the native solver for legality (same check
`cpsat-explicit-prefix-oracle.mjs` performs) and then submitted to `scripts/stress/cpsat-full-probe.py`
via the explicit `--prefix` seam. Feasible (`OPTIMAL`/`FEASIBLE`) raised `low`; infeasible
(`INFEASIBLE`) lowered `high`. This is valid because feasibility is monotonic non-increasing along a
single elite's own forced trajectory: a prefix with no exact completion stays infeasible for every
longer forced prefix built on top of it (more forced cells is a strictly stronger constraint, never a
weaker one). The search stops when `high - low = 1` — an exactly adjacent feasible/infeasible pair,
i.e. the exact minimum rollback.

The oracle used is the same `cpsat-full-probe.py` model / `cpsat-explicit-prefix-oracle.mjs` code path
as B1/B2 (`.github/workflows/cpsat-explicit-prefix-oracle.yml`), not a new model. Given the Actions
runner queue was backed up behind a long corpus sweep at dispatch time (rounds 1-2 ran there and are
recorded in `reports/stress/repair-retreat-round{1,2}-2026-08-12.json`), rounds 3+ and the final
consolidated sweep were run directly in this session's sandbox (`pip install ortools`, same
`cpsat-full-probe.py` invoked the same way) — same code, same referee, no shortcuts taken on
correctness. `scripts/stress/repair-retreat-binary-search.mjs` is the reusable driver.

Every one of the 25 final consolidated cases replayed legally against the native solver before being
submitted (checked programmatically, not just asserted). The full 25-case set — spanning every
probed depth across all rounds, both the feasible and infeasible sides, for all 4 elites — is
committed at [`reports/stress/repair-retreat-cases-2026-08-12.json`](stress/repair-retreat-cases-2026-08-12.json)
in the required `{corpus, cases:[{id, levelId, prefix}]}` format, and its labeled oracle result at
[`reports/stress/cpsat-explicit-prefix-oracle-repair-retreat-2026-08-12.json`](stress/cpsat-explicit-prefix-oracle-repair-retreat-2026-08-12.json).

## Results

| elite | reqLen | eliteLength | pilot demonstrated rollback (steps / frac) | exact minimum rollback (steps / frac) | boundary (low feasible → high infeasible) |
|---|---:|---:|---:|---:|---|
| `R00001:elite:0` | 84 | 80 | 65 / 0.7738 | **65 / 0.7738** | depth 15 (live, OPTIMAL) → depth 16 (dead, INFEASIBLE) |
| `R00001:elite:4` | 84 | 77 | 62 / 0.7381 | **62 / 0.7381** | depth 15 (live, OPTIMAL) → depth 16 (dead, INFEASIBLE) |
| `R00044:elite:0` | 91 | 81 | 81 / 0.8901 | **81 / 0.8901** | depth 0 (live, OPTIMAL) → depth 1 (dead, INFEASIBLE) |
| `R00039:elite:0` | 65 | 53 | 53 / 0.8154 | **abstain** (unsupported-mechanics) | tested at depth 26 and depth 53, both abstained |

Summary across the 25-case final sweep: **3 live / 20 dead / 2 abstain, 0 correctness alarms, 0 input
alarms** (`reports/stress/cpsat-explicit-prefix-oracle-repair-retreat-2026-08-12.json`, solver ref
`c495fbb7`). Every `live` label carries a referee-valid emitted witness
(`Solver.validateCandidatePath` returned `ok: true` for all three); every `dead` label is a genuine
`INFEASIBLE` CP-SAT result on a replay-legal prefix, not a timeout or unsupported-mechanics fallback.

For the two `R00001` elites, the binary search bottomed out at exactly the pilot's own demonstrated
boundary: depth 15 is the last cell shared with the matched known solution (`commonPrefixSteps=16`
means cells 0..15 match), and CP-SAT confirms it's live — but the very next cell (depth 16, the first
point where the elite's trajectory diverges from every known solution) is already provably
infeasible. Same pattern for `R00044:elite:0`: only the gate (depth 0) is shared with any known
solution, and CP-SAT confirms the elite's first actual move (depth 1) is already infeasible.

`R00039:elite:0` could not be resolved either way: `cpsat-full-probe.py` reports `unsupported-mechanics`
at both the full elite length and the midpoint, consistent with B1's finding that R00039 is outside
this CP-SAT model's supported mechanics. This is an abstention, not a dead branch — no exact rollback
number exists for this elite from this oracle. (The pilot's own R00039 numbers remain a demonstrated,
not exact, figure.)

## Interpretation

**The heuristic was already exact, not an overestimate, for every elite this oracle could resolve.**
In all three resolved cases the exact minimum rollback equals the pilot's demonstrated
longest-common-known-prefix rollback to the step — not "close to," identical. The very first cell
where a retained repair elite's trajectory parts ways with every known valid solution from that gate
is already the point of no return: CP-SAT proves no exact completion exists one step later, and proves
one exists at that exact boundary (with a referee-valid witness, which happens to be a real 84/84 and
91/91-length solution respectively).

This is a real, if narrow, finding, not the one hypothesized going in. The original expectation
(stated by the task itself) was that CP-SAT might reveal the true minimum rollback to be considerably
shorter than 63 steps, i.e. that repair search's near-misses might have unrecorded shortcuts back
toward validity closer to their dead end. That did not happen for the 2 levels/3 elites resolvable
here. Instead: once a repair elite's trajectory diverges from every currently-known solution, it is
*immediately* unrecoverable in these cases — there is no slack. That argues **against** "repair search
over-commits to doomed branches early" in the sense of committing well before the actual divergence
point is visible; the commitment happens exactly where the divergence itself happens, not earlier.
It is also consistent with (not contradicting) the idea that the *choice* made at the divergence point
is the real defect to study — these results just say the window for fixing it after the fact is zero,
not that the choice itself was inevitable.

Whether this generalizes is genuinely open. The evidence base is thin by design (2 resolvable levels,
1 abstained; the two `R00001` elites share the same divergence cell since they're both near-misses
from the same repair run before diverging from each other later, so they are closer to one data point
on "does the boundary move" than two). It does **not** establish that every repair elite has zero
rollback slack — only that the 3 tested here do. A broader sample, especially ones with a *smaller*
`commonPrefixSteps` gap or a `reqInt`/must-cross-heavy profile unlike these three, could still show
slack the way the task's original hypothesis expected.

**Scope discipline, matching B2's own boundary**: this is exact-label evidence gathering only. No
change to `modules/solver/repair-search.ts`'s retention policy, elite scoring, or rollback/suffix
regeneration is proposed or implied by this result — consistent with the task's own instruction and
the concurrent collision-avoidance constraint on that file this session was run under.

## Broadened sample (2026-08-13) — the zero-slack finding does NOT generalize

This section directly answers the "whether this generalizes is genuinely open" question above. It
does not generalize — the opposite pattern (large, real slack) shows up just as readily once the
sample is deliberately chosen to include smaller-`commonPrefixSteps`-gap and `reqInt`/must-cross-heavy
elites, exactly the population the original report flagged as untested.

**Method**: `repair-rollback-census-pilot.mjs` and `repair-elite-path-dump.mjs` both gained
deterministic stratified sampling / direct-id selection (same FNV-1a → mulberry32 → Fisher-Yates
convention used throughout this session). A cheap 40-level stratified census (`--sample=40
--seed=repair-retreat-broaden-2026-08-13`, no CP-SAT — pure repair-search + known-solution matching)
surfaced four candidates satisfying both of the original report's stated criteria simultaneously:

| elite | reqLen | eliteLength | commonPrefixSteps | rollbackSteps (demonstrated) | reqInt | mustCross |
|---|---:|---:|---:|---:|---:|---:|
| `R03176:elite:2` | 141 | 76 | 50 | 27 | 10 | 5 |
| `R00630:elite:0` | 70 | 65 | 37 | 29 | 5 | 5 |
| `R00648:elite:4` | 141 | 32 | 4 | 29 | 4 | 0 |
| `R02449:elite:3` | 76 | 44 | 15 | 30 | 2 | 2 |

Same binary-search driver, same `cpsat-full-probe.py` oracle. Two abstained on **`unsupported-
mechanics`** even at full elite length (`R00630`, `R02449`, both `mustCross ≥ 2`) — described at the
time as a coverage gap distinct from the previously-known flipping-filter one.

> **Correction (2026-08-15): this was a misattribution, not a distinct gap.** Both `R00630` and
> `R02449` also carry flipping filters (5 each), which is what actually caused the abstention — the
> skip check in `cpsat-full-probe.py` fires unconditionally on `filters`/`flippingFilters`, before
> any mustCross-specific logic runs. `mustCross` of any count was never unsupported: the model's
> `visits[c] == 2` constraint for must-cross cells is unconditional on count, and a direct check
> confirms levels with mustCross up to 8 (the corpus maximum) resolve cleanly — `R00001` in this
> same report's first pass (mustCross=6) is itself a working counter-example that was available the
> whole time. Flipping filters are now encoded (see
> [`reports/2026-08-15-cpsat-flipping-filter-support.md`](2026-08-15-cpsat-flipping-filter-support.md)),
> so both `R00630` and `R02449` are re-runnable through this same binary-search protocol; not
> re-run here (out of that report's own scope). Kept the original text above unedited, per this
> repo's standing rule that superseded reasoning stays visible rather than silently rewritten.
>
> **Follow-up (2026-08-15): re-run, and it surfaced a second, independent pre-existing CP-SAT bug.**
> Running `R00630`/`R02449` through the binary search exposed a real-`reqLen` under-constraint defect
> in `cpsat-full-probe.py` (a `--prefix=`-mode-only exploit — `--check-witness` mode cannot trigger
> it) that produced two referee-rejected false-SAT results before being root-caused and fixed. Full
> mechanism, fix, and re-validation:
> [`reports/2026-08-15-cpsat-flipping-filter-support.md`](2026-08-15-cpsat-flipping-filter-support.md)'s
> Part 4. Post-fix results: `R00630` converges cleanly to an exact minimum-rollback boundary of
> **low=36 (feasible), high=37 (infeasible)** — real slack of ~28 steps vs. its 65-step elite length,
> consistent with the "small-rollback elites correlate with slack" pattern this report's broadened
> sample already found.
>
> **`R02449`, narrowed further (2026-08-15, ad hoc `--prefix=` probes outside the bisection driver):**
> the plain-midpoint probe (`depth=29`) timing out at both 60s and 180s is a real CP-SAT timeout, not
> a modeling defect — but rather than keep doubling time at that one point, probing depths closer to
> the known-dead end (which have a smaller residual, and are cheaper for CP-SAT to resolve either
> way) moved the boundary substantially: `depth=37` → dead in 3.6s (high: 44→37); `depth=19` → live
> in 26.2s, **independently referee-validated** (`Solver.validateCandidatePath` → `ok: true` on the
> emitted completion, not just a CP-SAT-internal "feasible" claim) (low: 14→19). Final boundary:
> **low=19 (feasible, referee-verified), high=37 (infeasible)** — real slack of at least 18 steps.
> The interior `[20, 36]` resisted resolution at three separate points (`depth=22`, `25`, `29`) across
> budgets up to 240s, a pattern consistent with a genuine SAT phase-transition hard region rather than
> a budget artifact (points just outside that band resolved in seconds). Not narrowed further here —
> diminishing returns past four consecutive interior timeouts.

The other two (`R03176:elite:2`, `R00648:elite:4`) resolved cleanly at full length to `dead
(infeasible)`, matching the original pattern — but their first midpoint probe returned CP-SAT
`UNKNOWN` (genuine time-limit exhaustion at 60s, not a structural abstention), so a second round
re-ran just those two at `--time-limit=240` to let the bisection actually converge.

**Result — real, large slack, not zero:**

| elite | eliteLength | demonstrated rollback | exact minimum rollback | boundary |
|---|---:|---:|---:|---|
| `R03176:elite:2` | 76 | 27 | **1–2** | depth 74 (live, OPTIMAL) → depth 75 (dead, INFEASIBLE) |
| `R00648:elite:4` | 32 | 29 | **1–2** | depth 30 (live, OPTIMAL) → depth 31 (dead, INFEASIBLE) |

Both elites are exactly recoverable to within one or two steps of their own dead end — nothing close
to the demonstrated (known-trajectory) rollback of 27–29 steps. The demonstrated-rollback proxy
overestimated the true minimum by roughly **25–27×** on both cases. This is the mechanical opposite
of the original 3-elite finding: there, the true boundary sat exactly at the point where the elite's
trajectory first diverged from every known solution (zero slack beyond visible divergence); here, a
real exact continuation exists almost the entire remaining length, and the known-solution set simply
never happened to contain a path matching that near-full-length prefix — the divergence-from-known-
solutions proxy was measuring "how different is this from a path we happened to store," not "how
close is this to any valid completion."

**Practically**: both `R03176` and `R00648` are already solved by the production ladder overall
(confirmed via `level-blind-capability-sweep.mjs` at 25M nodes, presumably by a different technique
or a different repair restart than the specific stuck elites tested here) — so this is not two new
capability gaps. The value is in what it says about the population, not these two levels specifically:
**selecting elites by small demonstrated rollback appears to correlate with real, large exact slack
near the elite's own end (2/2 resolved cases here)**, which is a very different profile from the
large-demonstrated-rollback population the original 3 cases came from (where zero slack held both
times). This is suggestive, not proven, at n=2 resolved — but it directly falsifies "zero slack is a
general property of stuck repair elites," which the original report's own hedging already anticipated
might happen.

**Implication for future repair-search work, not acted on here** (scope discipline unchanged from the
original report — no `repair-search.ts` change is made or implied by this finding): the existing
`closeLengthGap`/`enableElitePrefixDfs` bounded-backtrack mechanisms already try exactly this kind of
last-mile recovery, but apply broadly and were found net-negative or marginal at population scale
(see `docs/repair-search-stagnation-escape-plan.md`). A version gated specifically on "small
demonstrated rollback" (a cheap, already-computed signal — no new instrumentation needed) rather than
applied indiscriminately might be a meaningfully different, more targeted experiment than what's
already been tried — but that is a new mechanism proposal for a future session, not evidence gathered
here.

## Why `closeLengthGap` doesn't already close R00648's gap (2026-08-13 diagnostic)

The "gate on small demonstrated rollback" idea above cannot actually be built: demonstrated rollback
is measured against known solutions (hints), which a live solve cannot use without violating
`docs/solver-level-blindness.md`. What's testable instead is more direct: `closeLengthGap` is already
default-on and already hint-free (triggers on live `structuralDeficit ≤ 1` at any dead end,
unconditionally) — does it already recover the two elites this report just proved have real slack?

Direct isolated `repairSearchFromGate` runs (`PF_LENGTH_GAP_DEBUG=1`, 2,000,000-node budget):
- **R03176**: solves on its own. `closeLengthGap` fires 583 times across the run and succeeds at
  restart 914 (~1.86M nodes total). No gap here.
- **R00648**: does **not** solve within 2,000,000 nodes, despite `closeLengthGap` firing 500+ times
  and the search reaching `bestBadness=16` (far better than elite:4's own badness of 117 — the search
  has moved on to different, better near-misses, not stuck reproducing that one elite).

**First hypothesis (backtrack floor too shallow) — tested and falsified.** `closeLengthGap` can only
backtrack within the current restart's own construction, back to `floor` (the splice point) — not
into an elite's already-spliced prefix. If the critical branch point sits inside a spliced prefix,
`closeLengthGap` structurally cannot reach it. Tested directly: replayed the CP-SAT-verified
depth-30-feasible prefix through the real state machinery (`replayToPrefix`/`applyMove`), then called
`closeLengthGap` (now exported as `__closeLengthGapForTests`, mirroring `__takePlyForTests`) with
`floor=0` (full backtrack range, all the way to the gate) and a 2,000,000-node budget — 500x its
production budget of 4,000. **It still did not find the completion.** So the floor wasn't the
bottleneck; something else is.

**Second hypothesis (this is a needle-in-a-haystack position) — tested and confirmed.** Ran 2,000
independent randomized rollouts from the exact same verified-feasible depth-30 state, using the same
epsilon-greedy construction (`takePly`) repair's own main restart loop uses. **0/2000 solved**, and
the search died almost immediately every time — average 4.3 nodes per attempt, best attempt reached
only depth 60 of the required 141. Essentially every continuation from this point dies within a
handful of moves; the one CP-SAT-found completion is a specific, long (111-move), precisely-threaded
path through what is evidently a tightly-constrained region.

**Conclusion**: neither of repair-search's own techniques is well-matched to this residual problem.
Randomized rollout has no mechanism for finding one narrow long path among an astronomically larger
set of quick dead ends. `closeLengthGap`'s deterministic, heuristically-ordered DFS-backtrack is
exactly the search paradigm this codebase's own history already identified as failure-prone on hard
levels — accumulating rank-discrepancies from early ordering mistakes — which is the *original*
motivation for building randomized repair-search in the first place (see `repair-search.ts`'s own
header comment). CP-SAT succeeds here because it performs real constraint propagation and systematic
branch-and-bound, a different technique class entirely, not because it searches the same space better.
This is not a triggering, floor, or budget defect in `closeLengthGap` — it's a genuine mismatch
between the technique and the shape of this specific residual, and no tuning of the existing
mechanism's parameters would be expected to close it.

## R03176 vs. R00648: what actually differs (2026-08-13, same-day follow-up)

Ran the identical diagnostic (`closeLengthGap` with `floor=0`/2,000,000 nodes, plus 2,000 random
rollouts) on R03176's own CP-SAT-verified branch point (depth 74, the boundary from the original
retreat check) for a fair apples-to-apples comparison against R00648's depth-30 point:

| | R00648 (depth 30, residual 111) | R03176 (depth 74, residual 67) |
|---|---|---|
| `closeLengthGap` (floor=0, 2M nodes) | fails | fails |
| Random rollouts (2,000 trials) | **0/2000 solved**, avg 4.3 nodes/trial, best depth **60**/141 | **0/2000 solved**, avg 6.5 nodes/trial, best depth **134**/141 |

So it isn't that R03176's specific branch is "easy" and R00648's is "hard" — **neither exact branch is
solved by either mechanism.** The difference is in how close blind search gets: R03176's random
rollouts routinely push to within 7 cells of the full 141-cell requirement before dying; R00648's die
with 81 cells still to go. R03176's residual is a "wide, forgiving" space with many almost-complete
trajectories; R00648's is a narrow trap that kills nearly every attempt almost immediately.

That difference shows up directly in which technique actually solves each level in the real ladder
(`level-blind-capability-sweep.mjs`, 25M nodes): **R03176 is solved by plain repair** (`profile:
'repair'`, 1,857,430 nodes — reproducing the isolated test's own figure exactly, via some other
restart's trajectory than the one tested here) — repair's blind restarts have enough forgiving basin
to eventually stumble onto a full solution, just not through this particular branch. **R00648 is
solved by admissible-order search** (`profile: 'default'`, admissible-order tier) in only **223
nodes** — three orders of magnitude cheaper, because admissible-order's sound bounds let it discard
the vast majority of near-instant-death branches by proof rather than by playing them out. Random/
heuristic local search has no equivalent of a bound; it can only find out a branch is dead by actually
walking it.

**A structural hypothesis, not a proven cause (n=2, suggestive only)**: R00648 has 14 blocks and zero
must-cross/must-pass constraints (`reqInt=4` only); R03176 has zero blocks, 5 must-cross constraints,
and a higher `reqInt=10` — mechanically *more* loaded, yet the *easier* one for repair. This points
away from raw mechanic count as the driver and toward board topology specifically: blocks reduce
navigable space and can create the kind of narrow-corridor structure where almost every move is a trap
unless bound-based pruning is available — consistent with CLAUDE.md's own noted gotcha that open board
space (or its absence) is a first-class puzzle-difficulty variable, not inert scaffolding. This is one
matched pair, not a validated predictor; it would need a real sample (e.g. blocks-per-navigable-cell
vs. repair-vs-admissible-order winner, across many solved levels) to become more than a hypothesis.

## Testing the topology hypothesis at population scale (2026-08-13)

**First attempt: underpowered.** A fresh 60-level stratified sample of Corpus-2 (seed
`topology-hypothesis-2026-08-13`), solved at 15,000,000 nodes, produced only 21 solves and **zero
admissible-order wins** (8 repair, 13 beam) — confirming admissible-order-specific wins are rare
enough that blind resampling isn't an efficient way to test this hypothesis; a much bigger blind
sample would be needed to collect enough admissible-order wins for a real comparison.

**Better approach: mine existing hint provenance instead of resolving more levels.** Corpus-2's own
hint corpus already records which technique won each stored solution (`solver.technique`/
`solver.profile`, see CLAUDE.md's hint-provenance section). Scanning `data/stress/hints-random/`
(filtered to cold, non-hint-guided entries only — `!context.hintGuided`, excluding
`prefix-anchored`/`witness`/`human-solved`, per the standing rule for capability questions) found
**97 distinct levels with an admissible-order/`'default'` cold win** and **205 distinct levels with an
unforced repair cold win** — real population samples, no new solves needed.

Structural features (`getNavigableDensity`/raw block count from `archetype.ts`, the same navDensity
already used by the solver's own attempt-policy routing) by winning technique:

| feature | admissible-order (n=97) | repair (n=205) |
|---|---|---|
| `navDensity` median | 0.765 | 0.724 |
| `blocksFraction` median | **0.174** | **0.124** |
| `blocks` median | 25 | 19 |
| `reqInt` median | 4 | 7 |
| `mustCross` median | 0 | 3 |
| `mustCross=0` rate | 59% | 35% |
| `blocks=0` rate | **1%** | **5%** |

The `mustCross` split mostly reproduces already-known routing (repair-search was built specifically
for the must-cross-heavy cluster — see this file's own header comment), so it isn't fresh evidence on
its own. **Isolating the `mustCross=0` subset (57 admissible-order-won vs. 71 repair-won levels)
removes that confound and the blocks effect survives, undiminished:**

| feature (mustCross=0 only) | admissible-order (n=57) | repair (n=71) |
|---|---|---|
| `blocksFraction` median | **0.174** | **0.102** |
| `blocks` median | **24** | **14** |
| `reqInt` median | 3 | 8 |

Within levels that have *no* must-cross constraint at all, admissible-order-won levels still have
roughly **70% more blocks** (by fraction) than repair-won levels, median 24 vs. 14 blocks. `reqInt`
flips direction in this subset (admissible-order wins on *lower* `reqInt`, repair on higher) —
consistent with repair's randomized construction being well-suited to satisfying a flexible count of
self-intersections (many ways to cross a path), while dense obstacle fields need the kind of
systematic, bound-pruned navigation admissible-order provides through narrow, low-choice corridors.

**Verdict: the topology hypothesis holds at population scale, independent of the mustCross confound.**
Board obstacle density (not overall difficulty, not raw mechanic count) measurably predicts which
technique class wins a level — real, if not yet causally proven (this is observational correlation
over stored provenance, not a controlled matched-pair intervention). Scope discipline unchanged: no
solver-policy, archetype-routing, or attempt-ordering change is proposed or implied by this finding —
it explains an existing pattern, and could inform future archetype/routing work, but isn't acted on
here.

## Artifacts

- Topology-hypothesis provenance mining: distinct level-id lists and the full quartile analysis:
  [`reports/stress/admissible-order-default-winner-levels-2026-08-13.json`](stress/admissible-order-default-winner-levels-2026-08-13.json),
  [`reports/stress/repair-winner-levels-2026-08-13.json`](stress/repair-winner-levels-2026-08-13.json),
  [`reports/stress/topology-hypothesis-analysis-2026-08-13.txt`](stress/topology-hypothesis-analysis-2026-08-13.txt)
- Elite-path dump tool (deterministic, reproduces the pilot's exact selection):
  [`scripts/stress/repair-elite-path-dump.mjs`](../scripts/stress/repair-elite-path-dump.mjs)
- Case-builder + local-replay validator:
  [`scripts/stress/cpsat-explicit-prefix-round-builder.mjs`](../scripts/stress/cpsat-explicit-prefix-round-builder.mjs)
- Binary-search driver (used for the local continuation once the Actions queue was long):
  [`scripts/stress/repair-retreat-binary-search.mjs`](../scripts/stress/repair-retreat-binary-search.mjs)
- Round 1/2 case files (GitHub Actions, `cpsat-explicit-prefix-oracle` runs 3/4 on this branch):
  [`reports/stress/repair-retreat-round1-2026-08-12.json`](stress/repair-retreat-round1-2026-08-12.json),
  [`reports/stress/repair-retreat-round2-2026-08-12.json`](stress/repair-retreat-round2-2026-08-12.json)
- Round 3 case file (also dispatched to Actions before the local run superseded it):
  [`reports/stress/repair-retreat-round3-2026-08-12.json`](stress/repair-retreat-round3-2026-08-12.json)
- Final consolidated case file (required deliverable format):
  [`reports/stress/repair-retreat-cases-2026-08-12.json`](stress/repair-retreat-cases-2026-08-12.json)
- Final labeled oracle result (0 correctness alarms, 0 input alarms):
  [`reports/stress/cpsat-explicit-prefix-oracle-repair-retreat-2026-08-12.json`](stress/cpsat-explicit-prefix-oracle-repair-retreat-2026-08-12.json)

**Broadened-sample artifacts (2026-08-13)**:
- Elite paths for the 4 new candidates (small-rollback / `reqInt`-`mustCross`-heavy):
  [`reports/stress/repair-retreat-broaden-elite-paths-2026-08-13.json`](stress/repair-retreat-broaden-elite-paths-2026-08-13.json)
- Round 1 (`--time-limit=60`, all 4 elites — 2 abstained `unsupported-mechanics`, 2 hit `UNKNOWN` at their midpoint probe):
  [`reports/stress/repair-retreat-broaden-round1-2026-08-13.json`](stress/repair-retreat-broaden-round1-2026-08-13.json)
- Round 2 (`--time-limit=240`, the 2 `UNKNOWN`-midpoint elites only — both resolved to an exact boundary):
  [`reports/stress/repair-retreat-broaden-round2-retry-2026-08-13.json`](stress/repair-retreat-broaden-round2-retry-2026-08-13.json)
