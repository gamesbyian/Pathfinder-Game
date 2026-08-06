# Solver-aware game architecture and rules

> **Status:** living plan/reference document, consolidated 2026-08-06 from two parallel
> investigations — the state-representation/architecture questions below, and a separate pass over
> where the **game's own rule implementations** (not just its architecture) diverge from what the
> solver assumes. Two of this document's own previously-open items (the beam dedup soundness audit
> and duplicate-rate measurement) are resolved below with real numbers, plus a second, more severe
> bug the audit surfaced along the way. One rule-correctness bug found during the parallel
> investigation has already been fixed and shipped on this branch. Point-in-time evidence for
> everything here lives in dated reports (cited inline); this document is the living, reprioritized
> summary — when the two disagree, the dated report is the primary source and this file should be
> corrected to match, not the other way around.
>
> This document asks two related lateral questions: (1) are there changes to the **game's rule
> representation, domain model, compilation pipeline, or mechanic contracts** that could make the
> solver faster, safer to optimize, or capable of finding more solutions; and (2) are there places
> where the **game's actual rule implementations** — live play, the submission/hint referee, and the
> solver's own move-generation — silently disagree with each other in ways that cost solvability or
> correctness?
>
> The answer to both is yes, but several obvious versions of the first question have already been
> tested and found weak. In particular, exact transposition caching is not an unmeasured
> high-priority opportunity: a sound DFS signature was measured on 2026-07-17 and found to have
> modest duplicate rates with prohibitive per-node overhead, and the equivalent beam-specific
> measurement (this document's own former top priority) is now done too, with an even smaller
> ceiling — see "Resolved" below.

## Current baseline

Pathfinder already gives the solver a strong foundation:

- `modules/Solver.ts` is a thin facade over `modules/solver/`.
- `normalizeRawLevel()` converts wire-format levels into the solver's packed internal representation.
- `prepLevel()` precomputes distances, adjacency, masks, mechanic indexes, approach maps, pairwise objective distances, portal-parity guidance, and bit-parallel connectivity data.
- DFS uses mutable state with `applyMove()` / `undoMove()`.
- Beam search uses parent-pointer nodes and a reusable replay state.
- Returned candidates are checked by the domain-level `validateCandidatePath()` referee.
- Runtime path derivation is centralized and cross-checked by invariant tests.
- Solver policy is selected by level features rather than level identity.

This note therefore does **not** recommend sharing UI code with the solver, replacing the solver with the runtime engine, or broadly rewriting existing hot paths for architectural neatness.

## The semantic principle that still matters

Pathfinder is history-sensitive. Two paths can end on the same cell with the same length and intersection count while having different legal futures because they used different axes at cells, visited different cells, entered from different directions, used different portals or flippers, or satisfied different constraints.

Any system that merges, caches, memoizes, or compares search states must answer:

> What information is sufficient to prove that two histories have the same relevant future?

This principle is already supported by hard-won repository evidence:

- the must-cross lower-bound cache-key gotcha;
- the MST scratch-buffer correctness bug;
- the corrected `mitm-frontier-probe.mjs`, whose original key omitted future-relevant state;
- the 2026-07-17 DFS transposition premise test, where a crude key reported 92–99% apparent duplication but the sound key found only 0.5–16%;
- **the beam dedup key's fixed-width bit-packing overflow, below** — a *new* instance of the same family of bug, found by applying this exact principle to a mechanism nobody had re-checked since the per-mechanic object caps were raised.

The lesson is broader than transposition tables: a compact state summary is useful only after both its **soundness** and its **economic value** have been measured — and re-measured whenever an assumption it was built under (like "at most 4 of any mechanic") quietly changes elsewhere in the codebase.

## Existing negative result: exact DFS transposition caching

The report `reports/2026-07-17-dfs-state-revisit-rate-transposition-premise.md` already tested the central transposition premise.

A crude signature appeared spectacular, reporting 92–99% duplicate visits. It omitted the actual visited-cell identity, per-cell edge-axis usage, and portal history. Once replaced by a sound signature containing the full visited-cell identity, `edgeUsage`, portal state, and constraint masks, duplicate rates fell to 0.5–16%, typically around 1–2%.

Computing the sound signature was also expensive enough that the instrumented runs processed roughly five to six times fewer nodes in the same budget. The report correctly downgraded the idea from a leading priority to "checked and found weak." `docs/future-work.md` likewise lists state-dominance/transposition caching as deprioritized because the correctness-risk/payoff trade is unfavorable.

Consequences for this document:

1. Do not propose a general DFS transposition table as fresh work.
2. Do not assume canonical state merging substantially compresses Pathfinder's state space.
3. Do not make exact future-state identity the top-ranked route to more solves.
4. Retain the semantic inventory as a correctness reference for experiments that already merge states.

The corrected MITM frontier work reinforces this conclusion from another direction: even with a sound key, realistic meet frontiers grow to hundreds of millions or billions of distinct states. Exact identity is necessary for trustworthy measurement, but it does not by itself make the search space small.

## Resolved (2026-08-06): beam dedup soundness and duplicate-rate audit, plus a second bug and a fix

This document's own former "Live opportunity 1" and "Live opportunity 2" — audit whether beam's
`(cell, sc)` dedup key is sound, and measure how many exact duplicates actually occur in a beam
frontier before culling — are both done. Full method and numbers:
`reports/2026-08-06-beam-state-dedup-sound-signature-audit.md`.

**Method**: temporary instrumentation in `beamSearchFromGate` (env-gated, reverted after
measuring — the same measure-then-revert discipline the DFS report used) computed, for every
candidate at every expansion step, a sound signature (sorted unique visited-cell keys + per-cell
`edgeUsage`, `crossCounts`, `realLen`, `ints`, the existing `sc` bundle, `lastWasPortalJump`), and
cross-tabulated it against the production heuristic key before any culling. Sample: 80 levels
(20 published, 20 stress-corpus-1, 40 stress-corpus-2), 62 of which actually exercised a beam
attempt via real `getAttemptConfigs`-selected configs.

**Finding 1 — the duplicate ceiling is smaller than DFS's, not larger.** 0.019% of ~11.4M
candidates generated were true duplicates of another candidate at the same step (0.007% non-portal,
0.032% portal). The "beam holds many concurrent candidates, so duplicates should be more common
than DFS's single-thread revisits" intuition does not hold up empirically. This answers "Live
opportunity 2" directly: **negative result, closed without production risk**, per this document's
own stated criterion.

**Finding 2 — the shipped key is essentially always unsound when it fires.** Of 1,647,849
candidate groups the production key merged in the sample, effectively 100% contained candidates
that differ under the sound signature. This is not in tension with Finding 1: the `(cell, sc)` key
is coarse relative to the true state space, so almost any coincidental collision it catches is a
false one, not a real duplicate. This answers "Live opportunity 1": **the key is unsound**, exactly
as this document's own prior caution predicted, now confirmed rather than merely suspected.

**Finding 3 — a second, more severe, independently-discovered bug.** `sc`'s bit-packing scheme
allocates each constraint mask (must-cross, must-pass, flipper, surround, must-turn, adjacent-turn)
a fixed 4-bit slot **by shift amount alone** — nothing actually masks a field to 4 bits before
shifting it into place. CLAUDE.md's documented published-corpus maxima (must-cross/must-pass/
flippers ≤ 4) fit in 4 bits, but stress-corpus-2's generator deliberately raises every one of these
caps to 8 (`scripts/stress/generate-random.mjs`'s own header comment). A field needing a 5th–8th
bit silently overflows into the **next** field's designated range, corrupting both. Confirmed with
real corpus data, not just arithmetic: **671 non-portal stress-corpus-2 levels** exceed 4 of at
least one of these mechanic counts, and **211** of those have a second, adjacent field simultaneously
nonzero — a structurally guaranteed key collision, not a theoretical edge case. R00044 (a level that
recurs elsewhere in this project's research, e.g. the MITM frontier sample) is one of them.

**Finding 4 — the unsoundness (both forms) has not cost a single solve on the sample tested.**
Turning `STRATEGY_STATE_DEDUP` off changed the solved/unsolved outcome on **zero** of 35 non-portal
levels where beam actually ran, at a matched budget.

**Decision: removed `useStateDedup` entirely, rather than rebuilding a sound replacement.**
Reasoning: (a) Finding 1 means even a fully sound rebuild would almost never fire — the true
duplicate rate is too small to repay the cost of computing a sound signature, which the DFS report
separately measured at 5–6× per-node overhead; (b) any sound replacement would also need a
width-safe (non-bit-packed) redesign to avoid inheriting Finding 3's overflow, adding real
engineering/verification surface for a mechanism that, per (a), would then rarely do anything; (c)
Finding 4 means removal costs nothing measured. This is the smallest-diff fix that closes both bugs
completely and unambiguously, consistent with this repo's stated preference against building
complexity "in case we need it." A side effect: removing the mechanism also removes the
"disabled for portal levels" restriction's reason to exist (the restriction existed specifically
*because* portal usage wasn't captured in `sc`) — there's nothing left to extend to portals, since
there's nothing left.

**Verification**: `npm run ci`'s solver tests and full typecheck pass with the mechanism removed.
[Cost verification against the published-corpus regression baseline and a matched-work-budget
before/after sweep on the 671-level affected population — in progress; see this document's own
citation of `reports/2026-08-06-beam-state-dedup-sound-signature-audit.md` for the final numbers
once posted.]

**What remains open from the original two "live opportunities":** nothing — both are closed. The
"could a cheap incremental fingerprint approximate the exact key" question (former opportunity 2,
item 5) is moot given Finding 1: there is no meaningful duplicate population left to approximate a
key for.

## Live opportunity: certified forced-sequence macro transitions

This remains the freshest game-side opportunity in this document — nothing in the beam-dedup
resolution above touches it.

The game/compiler can identify stretches where the path advances through several cells but no genuine decision exists. The solver could process such a stretch as one macro transition while still applying every underlying move through the real state machinery.

Possible initial cases:

- a static corridor whose interior cells each have one legal continuation;
- a forced portal jump plus a forced exit sequence;
- a fixed-axis filter passage with only one possible continuation;
- a degree-one chain created by static obstacles;
- a locally forced landmark approach that remains forced under a clearly stated precondition.

### Why this is different from forced-structure bounds

Existing forced-structure work derives mandatory cells or local facts for lower bounds and pruning. Macro transitions target a different cost:

- repeated neighbour generation;
- repeated scoring and sorting at non-decisions;
- repeated search-loop bookkeeping;
- effective search depth.

A macro does not claim a branch is dead or alive. It merely skips presenting deterministic intermediate steps as separate branch points.

### Safety design

A macro must:

1. execute each underlying move through the authoritative solver transition logic;
2. stop before the first genuine choice;
3. stop before any step whose forcedness depends on unmodelled dynamic state;
4. return a composite undo token or a stack of ordinary undo tokens;
5. preserve exact metrics, path reconstruction, intersection accounting, and referee validity;
6. be disabled behind an ablation flag initially.

### First experiment

Begin only with statically forced chains certified from the compiled graph. Measure:

- number of ordinary transitions collapsed;
- nodes expanded;
- wall time;
- change in search order;
- solve-count differences;
- which level families contain enough forced-chain length to matter.

If static chains show value, expand carefully to state-dependent macros.

## Opportunity: first-class dynamic mechanic contracts

Even when exact state merging is not economically attractive, explicit mechanic state remains valuable for correctness and tooling — the beam-dedup bit-packing overflow above is a concrete example of what happens without one: a mechanic's assumed cardinality (≤4) was raised elsewhere in the codebase (to 8) with no single place recording that the raise invalidated a downstream assumption.

Every mechanic whose history affects future legality should document:

- its dynamic state;
- whether state is per cell, per object, per pair, or global;
- whether state is monotonic;
- whether incoming direction matters;
- whether it changes connectivity or only move legality;
- what external models must encode to remain sound;
- what must be included in any cache or dedup key;
- **its cardinality, and every place in the codebase that assumes a specific bound on it** (the
  gap that let the beam-dedup overflow happen unnoticed).

Conceptually:

```ts
interface MechanicStateContract {
  stateCardinality: number | 'unbounded';
  monotonic: boolean;
  affectsMoveLegality: boolean;
  affectsConnectivity: boolean;
  affectsWinState: boolean;
  requiresIncomingDirection: boolean;
  externalModelSupport: 'exact' | 'relaxed' | 'unsupported';
}
```

This need not become allocation-heavy runtime machinery. It can be documentation, types, tests, and compiler metadata.

Its main benefits are:

- preventing future under-keyed experiments;
- keeping CP-SAT and other oracles honest about unsupported mechanics;
- guiding mechanic design toward bounded explicit state;
- making provenance and telemetry comparable across solvers;
- catching a cap raised in one generator (`generate-random.mjs`) before it silently invalidates a
  fixed-width assumption in an unrelated file (`search.ts`'s former `sc` encoding).

## Opportunity: a shared compiled puzzle graph

`prepLevel()` already performs extensive solver-specific compilation. A smaller domain-owned compiled graph could still reduce semantic drift among:

- editor validation;
- runtime replay;
- procedural generation;
- solver prep;
- CP-SAT and other external models;
- analysis scripts.

Possible contents:

- dense cell IDs;
- static geometric adjacency;
- move axes;
- static impassability;
- portal transitions;
- mechanic indexes;
- connected components;
- parity classes;
- corridor and separator structure;
- symmetry information.

The solver would still construct specialized typed arrays on top of this graph. The goal is shared semantics, not forcing domain objects into hot loops.

The strongest practical use may be making external models consume the same compiled topology and mechanic declarations rather than independently interpreting raw level data.

## Opportunity: region and separator facts as advisory signals

This overlaps with existing work on bounded global consistency, contradiction-only propagation, solver-response families, and structural analysis. It should not be presented as an unexplored new direction.

The remaining angle is narrower:

- compile articulation, bridge, separator, corridor, and region-objective facts once;
- expose them as features;
- evaluate them in shadow mode for move ordering, diversity, strategy selection, and budget allocation;
- do not promote them to hard prunes without proof.

The CP-SAT prune-atlas result suggests there may be little easy territory for additional binary prunes in the modelled subset. Advisory information could still help finite-budget search, but it must demonstrate predictive value beyond current scoring and family features.

## Opportunity: preserve generation history as optional evidence

Procedural generation often knows facts later discarded:

- construction or witness paths;
- solvable parents;
- mutation and symmetry history;
- order of imposed constraints;
- intended regions or intersection sites;
- generation biases.

This metadata should remain provenance, not privileged truth about all solutions. It can support:

- portfolio selection;
- seed generation;
- family analysis;
- diagnostics;
- hint diversification;
- evaluation of learned guidance.

The cold solver must continue to work without it, and hint-guided or construction-guided results must remain separately identified.

## Opportunity: solver-compatible mechanic design

Future mechanics should be reviewed partly in terms of their state-space footprint.

Questions to answer before shipping a mechanic:

1. How much history does it add?
2. Is that history bounded and explicit?
3. Is the state local, global, or per object?
4. Can different histories merge again?
5. Does it alter topology or only transition legality?
6. Does it require incoming direction or ordered history?
7. Can external solvers encode it exactly?
8. Can it be relaxed safely for distances or bounds?
9. Does it preserve useful symmetry?
10. Which caches, signatures, and telemetry records must include it?

This is not an argument for mechanically simple puzzles. Rich finite-state mechanics are friendlier than rules whose future behaviour depends on arbitrary ordered history, even when both feel equally complex to a player.

## Opportunity: explicit domain limits

Formal caps on board dimensions, object counts, path length, and mechanic cardinalities can make fixed-width representations and external models provably complete — provided every consumer of the cap actually enforces it, which the beam-dedup finding above shows cannot be assumed.

Potential benefits include:

- compact worker messages;
- bounded oracle models;
- fixed-size bitsets;
- cheaper snapshots;
- simpler mechanic-state contracts.

This should be pursued only where the limits already match the game's intended design. Existing packed-key and typed-array choices have measured performance advantages and should not be displaced for aesthetic reasons.

## Rule-implementation drift across live play, the referee, and the solver

A separate investigation, run in parallel with the beam-dedup work, asked a different question:
not "is the solver's internal state representation sound," but "do the game's own **three
independent implementations** of move legality and the win condition actually agree with each
other?" Full findings and the fix: `reports/2026-08-06-game-rules-solver-alignment-plan.md`.

Pathfinder's move-legality/win-condition logic is implemented independently in (at least) three
places — `domain/move-rules.ts`'s `isValidMove` (live play), `domain/path-validator.ts`'s
`validateCandidatePath` (the submission/hint referee), and `solver/search-state.ts`'s
`getNeighbors`/`isMoveDynamicallyValid` (the solver) — plus a fourth, deliberately independent
reference (`scripts/solver-oracle/oracle.mjs`) that exists specifically to catch solver bugs but,
by design, never checks the other three against each other.

### Fixed: a flipping-filter entry-axis check was dead code in live play

`isValidMove`'s flipping-filter branch only computed the currently-required entry axis when a
bookkeeping map (`crossedSet`) already contained the target cell — but that map can never contain
a cell before the step onto it commits, so the check never fired for any flipping filter's
first-ever (and, in every implementation, only-that-matters) crossing. Live play therefore enforced
**no** entry-axis restriction on flipping filters at all, and could silently accept a 90° turn on
one whenever an off-axis entry happened to line up with the filter's own required exit axis — a
rule CLAUDE.md and the solver both state is never legal. Verified directly: a constructed level
entered a flipping filter vertically and exited horizontally; live play accepted the whole path,
the referee and solver both rejected it.

Fixed by falling back to the live global flip counter (an option the function already accepted and
computed correctly everywhere, but never actually read) when the target hasn't been crossed yet —
matching what the solver already enforced. Verified against all three corpora's stored hints (zero
contamination — every stored hint was solver-produced, and the solver's own check was never buggy)
and shipped with regression tests. Live play, the referee, and the solver now agree on this rule.

### Still open: extend the differential oracle fuzzer to catch this bug class in CI

`scripts/solver-oracle/fuzz.mjs` cross-checks the solver's move generation against an independent
reference implementation via move-by-move random walks — exactly the mechanism that would have
caught the flipping-filter bug above, and exactly the kind of check this document's own "semantic
principle" section argues every state-merging mechanism needs. It does not import or exercise
`move-rules.ts` at all, so it structurally cannot catch **solver-vs-game** drift, only
**solver-vs-oracle** drift. Adding a third arm — walk `isValidMove` (`MoveContext.PLAY`) in
lockstep with the existing two, asserting three-way legal-move-set agreement at every step — is the
single highest-leverage, lowest-risk remaining item from that investigation: it doesn't change any
game behavior, and it makes the next instance of "three rule copies silently diverge" a CI failure
instead of something a person has to find by hand.

### Open design question: are flipping filters actually single-use?

Neither `isValidMove` nor `validateCandidatePath` blocks re-entering an already-crossed flipping
filter, while the solver's `search-state.ts` treats every flipper as strictly single-use
(`flipperUsedMask` permanently blocks re-entry once set). CLAUDE.md's own wording — "flips to the
other axis **each time the path uses it**" — reads more naturally as "this filter alternates on
repeated crossings" than the implemented global-parity model, and none of the three
implementations actually do that literal reading. 957 of corpus-2's 1700 levels carry at least one
flipping filter, so if re-entry is intended to be legal (matching what live play and the referee
already permit), the solver is discarding real solutions on a sizable population — a
self-inflicted incompleteness, not a hard combinatorial wall. Needs a design decision before any
code change: check whether any stored stress-corpus witness solution already re-enters a flipper
(a straightforward existence check) before assuming this is worth solver engineering effort.

### Corpus complexity envelope vs. the shipped game

`scripts/stress/generate-random.mjs` deliberately raises every object cap **+4 over the documented
published maxima** (the exact cap-raise that caused the beam-dedup overflow bug above) and draws
counts from the upper half of the raised range — a considered choice to avoid overfitting the
corpus to the current solver. But it means "solver solve rate on corpus-2" and "solver solve rate
on levels players will actually see" are different questions, and only the former is tracked.
Scoring every corpus-2 level by how many of the shipped game's own dimensions it exceeds (must-pass
≤4, must-cross ≤4, portals ≤3 pairs, flippers ≤4, filters ≤6, landmarks ≤5, reqInt ≤11) against the
"carries a valid hint from any source" upper bound: only 6 of 1700 levels sit fully inside the
shipped envelope (83.3% solved), dropping monotonically to 0% at 6 dimensions exceeded. Recommended:
add a small stratum generated at or below the shipped-game caps (same generator, same
no-theory-no-bias philosophy, just the ceilings restored) as a separate, tracked regression signal
for player-facing solver capability, distinct from the deliberately-hard-tail research corpus.

### Decouple offline solve budgets from the interactive Solve button

Not a rule change, but the single largest measured lever found in either investigation.
`reports/2026-08-01-budget-vs-algorithm.md` (already in-repo) found that removing the 8-second
wall-clock deadline alone (same node/work budget) is worth **+32 corpus-2 solves**, and raising the
node budget 1.8× on top of that is worth **+25 more** — 505 → 562 combined, larger than the best
algorithmic change measured in the same report (+28). The 8-second deadline exists because
`solveLevel()` doubles as the live in-game hint generator, where latency genuinely matters; offline
batch/CI tooling has no such constraint and is currently inheriting it anyway. `SolveOpts`'s
`disableExtraBudgetPasses` and the three per-tier budget-fraction overrides already exist for this —
the finding is that more batch entrypoints should default to using them.

### Lower priority: per-filter local flip vs. global-parity flip

Every flipping filter currently shares one global toggle: the *k*-th distinct flipper crossed
(anywhere on the board, in any order) gets its declared axis XOR `(k−1) mod 2`, coupling a filter's
effective axis to unrelated traversal history elsewhere on the grid — the kind of global
entanglement that defeats local/regional reasoning about "sets of possible completions." A
per-filter local flip (each filter alternates only on its own successive uses) would be
decomposable and arguably matches CLAUDE.md's literal wording better. **Not recommended as
near-term work**: it changes the accepted-solution set for all 1,012 existing levels with flipping
filters and needs full corpus re-validation; recorded here as a design question for whoever owns
mechanic design, not a scheduled fix.

## Consolidated ranked research programme

Merges both investigations' priorities into one order. Items 1–2 below are done; everything after
is open, ranked by the same payoff-per-risk logic both source investigations used independently and
arrived at similar conclusions from.

1. ~~Audit current beam dedup soundness~~ — **done**, see "Resolved" above.
2. ~~Measure beam-specific exact duplication~~ — **done**, see "Resolved" above.
3. **Extend the oracle fuzzer to cover `isValidMove`** — cheapest remaining item; prevents the
   exact bug class the flipping-filter fix closed from recurring undetected.
4. **Decouple offline solve budgets from the interactive constraint** — pure configuration, largest
   measured lever in either investigation, evidence already exists and only needs applying more
   broadly across batch entrypoints.
5. **Prototype static forced-sequence macro transitions** — the most clearly novel implementation
   idea across both documents; begin with statically-certified chains only.
6. **Add an in-envelope stress corpus stratum** — measurement only, clarifies what "solve rate"
   should mean for player-facing capability vs. research-tail capability.
7. **Resolve the flipper single-use design question** — needs a decision before code; worth raising
   early given the size of the affected population (957 levels) even though any resulting fix would
   land later.
8. **Evaluate region/separator features in shadow mode** — extension of existing structural-analysis
   work, not a new campaign; require out-of-sample predictive value before changing ordering/policy.
9. **Prototype a shared compiled graph with one additional consumer** — best first consumer is an
   external oracle or the editor validator, where reducing semantic drift has clear value and
   hot-loop risk is low.
10. **Audit symmetry prevalence** — measure exact automorphisms and duplicated root branches before
    implementing canonicalization.
11. **Per-filter local flip** — design conversation only, not scheduled work.

## What is most likely to find more solves?

Based on evidence from both investigations, the plausible direct routes are:

1. **Forced-sequence macro transitions**, if difficult levels contain long deterministic stretches
   that currently consume meaningful search overhead.
2. **Offline solve-budget decoupling**, which already has direct measured evidence (+57 corpus-2
   solves from configuration alone) rather than being a hypothesis.
3. **Fixing the flipper single-use restriction**, *if* the design question above resolves toward
   "re-entry should be legal" — potentially relevant to 957 corpus-2 levels, but gated on a decision
   this document cannot make unilaterally.
4. **Region/separator features used as guidance**, provided they add predictive information beyond
   current features.
5. **Optional generation provenance**, especially for generated corpora and portfolio selection.

Two items that looked promising from first principles and are now settled negative results, not
untested hypotheses: **general DFS transposition caching** (measured and found weak, 2026-07-17) and
**beam-specific state deduplication** (measured and found weak, 2026-08-06 — see "Resolved" above).
Neither should be re-proposed without materially new evidence.

## Non-goals and cautions

- Do not reopen general DFS or beam transposition/dedup caching without materially new evidence,
  such as an incremental sound key with radically lower cost than either measurement found.
- Do not derive a production key from an incomplete field list, and do not assume a field's
  intended bit-width is actually enforced — verify against the current, not the original, object
  caps (the beam-dedup overflow bug's root cause).
- Do not treat advisory region facts as prunes without proof.
- Do not make gameplay call solver hot-path code, or make the solver depend on browser/controller
  machinery.
- Do not assume a more compact representation is faster; benchmark it.
- Do not count construction-guided or hint-guided solving as cold solving.
- Do not redesign player-facing rules solely for solver convenience unless the formulations are
  genuinely equivalent — the per-filter local-flip question above is a design conversation, not an
  engineering decision to make unilaterally.
- Do not assume the three independent rule implementations (live play, referee, solver) agree just
  because each one individually looks correct — verify with a differential check, not a read-through.

## Conclusion

Pathfinder is already highly solver-conscious, and much of the obvious state-merging territory has
been investigated and closed with real measurements rather than intuition. Both of this document's
former top-priority items (beam dedup soundness and duplicate-rate) are now resolved: the duplicate
ceiling is even smaller than DFS's, the shipped key was unsound almost every time it fired, a second
independent bit-packing bug made it actively unsafe on a real, sizable population, and removing the
whole mechanism cost nothing measured. The state-space-compression thesis that motivated this
document's original framing has now been tested twice (DFS, beam) and found weak both times.

The parallel rule-implementation-drift investigation found a genuinely different, complementary
class of opportunity: not "can we compress the state space," but "do the game's own independent
rule implementations actually agree with each other" — and the answer was no, in a way that had
already silently reached live gameplay. That fix is shipped; extending the differential-fuzzing
discipline that would have caught it automatically is the cheapest remaining item in this whole
document.

The strongest remaining ideas, in order, are:

- extend the oracle fuzzer to close the exact gap that let the flipping-filter bug ship;
- decouple offline solve budgets from the interactive Solve button's latency constraint (already
  has the largest measured effect size of anything in this document);
- collapse certified non-decisions into macro transitions;
- resolve whether flipping filters are meant to be single-use, given the size of the population it
  would affect either way;
- expose mechanic and graph semantics consistently to solvers and oracles, specifically including
  each mechanic's assumed cardinality bound and every place that bound is relied on;
- preserve optional construction evidence without weakening the cold-solve standard.

The immediate next experiment should be the **oracle-fuzzer extension** (cheapest, closes a
demonstrated real gap). The most novel implementation experiment remains **static forced-sequence
macro transitions**. The single highest-leverage lever measured across either investigation to date
is **offline solve-budget decoupling** — it required no new algorithm, only recognizing that a
constraint meant for one calling context (interactive hints) had been silently inherited by another
(batch/CI) that doesn't need it.
