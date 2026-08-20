# Solver-aware game architecture and rules

> **Status:** living plan/reference document, consolidated 2026-08-06 from two parallel
> investigations and reconciled through 2026-08-09. Point-in-time evidence for everything here
> lives in dated reports (cited inline); this document is the living, reprioritized summary — when
> the two disagree, the dated report is the primary source and this file should be corrected to
> match, not the other way around.
>
> This document asks two related lateral questions: (1) are there changes to the **game's rule
> representation, domain model, compilation pipeline, or mechanic contracts** that could make the
> solver faster, safer to optimize, or capable of finding more solutions; and (2) are there places
> where the **game's actual rule implementations** — live play, the submission/hint referee, and the
> solver's own move-generation — silently disagree with each other in ways that cost solvability or
> correctness?
>
> Several once-open findings in this document have since been resolved: the beam-dedup audit and
> duplicate-rate measurement, the fixed-width beam-key overflow, the mechanic-cardinality schema
> gap, the live-play rule drifts, and the flipper single-use design question. Historical reasoning
> is retained below, but resolved items are labelled as such rather than left looking actionable.

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
- **the beam dedup key's fixed-width bit-packing overflow, below** — another instance of the same family of bug, found by applying this exact principle to a mechanism nobody had re-checked since the per-mechanic object caps were raised.

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

**Finding 4, corrected same day (the original version of this finding — "zero cost to disable" —
was retracted; see the cited report's own correction block for the full account): disabling
`STRATEGY_STATE_DEDUP` costs real solves.** The original measurement used a wall-clock budget tight
enough to be the actual binding constraint on both arms, making "zero divergence" an artifact of
both arms failing equally fast rather than a genuine null result — exactly the "sequential/
tight-budget A/B is untrustworthy" trap this project's own testing guidance warns about. A corrected
re-test (non-binding wall clock, same node cap) found **19 of 75** non-portal stress-corpus-2 levels
flip solved→unsolved when dedup is disabled, confirmed two independent ways (code swap and
ablation-flag toggle, both giving the identical divergent set).

This does not contradict Findings 1–2 — it explains why the mechanism matters despite them. Its
practical value was never about recognizing literally-identical futures (which are vanishingly rare,
Finding 1). Beam keeps only the top-`beamWidth` candidates by score at each step; without dedup,
many candidates that superficially converge on the same `(cell, mask-tuple)` — genuinely different
underlying paths, per Finding 2 — can crowd that ranking simultaneously, consuming beam width that
would otherwise go to candidates elsewhere. Dedup's real function is width management / implicit
diversity, not correctness, and removing it lets the beam get crowded by redundant-looking-but-
distinct candidates.

**Decision, corrected: kept the mechanism, fixed only the key's structural fragility (Finding 3).**
The originally-shipped decision — remove `useStateDedup` entirely — was retracted once Finding 4's
correction showed it cost 18 of those 19 divergent levels' solves. Rebuilding a *fully* sound key
was also rejected (Finding 1's ceiling means a sound key would merge almost nothing, eliminating the
same value). The actual fix: `sc` changed from a bit-packed `number` to a delimited **string** of
the exact field values, preserving the identical `(cell, full mask-tuple)` merge granularity Finding
4 shows has real value, while making the key itself collision-free regardless of any mechanic's
cardinality — closing Finding 3 without touching the mechanism's demonstrated value or reopening
Finding 2 (the key is still coarse by design, just no longer *additionally* broken by overflow).

**Verification**: typecheck and the full `modules/solver/` vitest suite (284 tests) pass.
`solver:bench --check` against the published-corpus baseline shows no regression (expected — no
published level exceeds the caps that trigger the overflow). Comparing the fixed key against the
original buggy key on the same 75-level sample: 71/75 identical (the fix preserves essentially all
18 of the dedup-dependent solves), 3 levels newly solve (the overflow bug was costing them), 1 level
flips the other way (a single-level sensitivity to the specific merge decision the bug happened to
make — within the noise band this project's own research already treats corpus-2 solved-count
deltas under, not a systematic regression).

**What remains open from the original two "live opportunities":** nothing structurally — both
questions (is the key sound; how many true duplicates exist) are answered. What changed since the
original write-up is the *interpretation*: this isn't "close the mechanism out," it's "the mechanism
earns its place for a different reason than a sound key would, so keep it and fix only what was
actually broken." The "could a cheap incremental fingerprint approximate the exact key" question
(former opportunity 2, item 5) is still moot given Finding 1 — but for a different reason than
originally stated: there's no *sound-signature* population worth approximating a key for, though the
current coarse key's *own* granularity is worth keeping exactly as coarse as it is.

## Measured and deprioritized: certified forced-sequence macro transitions

**2026-08-06**: this section's own "First experiment" was run — measure chain length/frequency
before building anything — and the premise did not hold up. Full detail:
`reports/2026-08-06-forced-chain-length-measurement.md`. Across published + both stress corpora +
the in-envelope stratum (280,000+ live cells), statically forced chains (runs of cells with exactly
one legal continuation, no mechanic that changes what's forced there) have median length **1**,
p90 **2**, and a max of 8-20 depending on corpus — essentially no "long deterministic stretches"
exist to amortize. The total cells a macro would collapse across an entire 1,700-level corpus is
~7,500 (≈4-5 per level), negligible against levels that routinely expand millions of nodes. Grids
here are small (11×15) and dense with objects by design, leaving little room for long empty
corridors to form. **Deprioritized** — recorded as a settled negative result (same class as the
transposition-caching findings elsewhere in this document), not re-proposed without materially new
evidence. The original proposal is kept below for the record.

<details>
<summary>Original proposal (2026-08-05, before measurement)</summary>

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

</details>

## Done: first-class dynamic mechanic contracts (2026-08-06)

[`docs/mechanic-state-contracts.md`](mechanic-state-contracts.md) instantiates the
`MechanicStateContract` shape below for all thirteen mechanics (edge-usage, visited-count,
must-pass, must-cross, regular filter, flipping filter, portal, gate, goose/false-goal, surround,
must-turn, adjacent-turn, decorative) — documentation and a table, per the "need not become
allocation-heavy runtime machinery" note below, not new types or code. It found one genuine latent
gap while doing it: `prep.ts`'s `(1 << n) - 1` initial-mask pattern is shared by five mechanics
(must-pass/must-cross/surround/must-turn/adjacent-turn), silently wrong starting at `n = 31`
objects — one earlier than the "31-bit mask" intuition suggests, since `1 << 31` is JS's int32 sign
bit rather than `+2^31` (verified directly: `(1 << 31) - 1 !== 2**31 - 1`). Must-pass and must-cross
were safe only because their count is capped at a documented 4, but surround/must-turn/
adjacent-turn had **no** documented count maximum anywhere, so nothing stopped a level from
exceeding 30 and getting a silently-wrong initial bitmask — exactly the shape of gap that turned
real once before (see the beam-dedup incident this section originally described, still below).
**Fixed same day**: `validateRawLevel` now rejects any level exceeding 30 of one mechanic, at the
same hard schema gate every level already passes through for the square-grid and cell-occupancy
invariants — see that doc's "Cardinality risk" section.

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

## Opportunity: region and separator facts as advisory signals (already substantially underway)

This overlaps with existing work on bounded global consistency, contradiction-only propagation, solver-response families, and structural analysis. It should not be presented as an unexplored new direction.

**2026-08-06 correction**: this consolidated doc previously listed "evaluate region/separator
features in shadow mode" as an open, unstarted item in its ranked programme. It isn't — a full
campaign already exists, one day ahead of this doc: `docs/solver-shadow-eval-harness.md`
(operationalizing `docs/solver-next-frontier-2026-08-02.md` and its multilingual-research-update
sibling), with a working CP-SAT-labelled evaluation harness (`scripts/stress/
interface-probe-harness.mjs`), a real prototype probe (`separator-resource-probe.mjs`, the
narrowest member of the "separator-state resource DP" family — single-articulation pendant
chambers), and actual numbers, not a proposal:

- **Applicability is genuinely rare**: 0.45% of labelled branches have an in-scope chamber at all
  (25/5,518 branches across 397 CP-SAT-eligible levels — a census result, not a small-sample
  artifact, confirmed at both 16 and 397 levels).
- **The probe itself is sound** (zero false rejects across every branch tested) but catches only
  0.4% of the atlas's total missed-dead branches — real, but too rare to matter at solver scale.
- **Verdict already reached: do not wire this specific shape into the production solver.** The
  soundness-verification and `solver:bench` A/B rigor any new prune requires costs real engineering
  time regardless of yield, and a catch rate this low predicts the same "correct and worthless"
  outcome the dead-flipping-filter-connectivity precedent already demonstrated.
- **Generalizes to portal-bearing levels** (the gauntlet misses ~50-60% of provable dead branches
  either way, mechanic-light or portal-bearing) but the CP-SAT oracle's own yield degrades on
  portals (more `unknown` outcomes), predicting flipping filters would be worse on both axes —
  closed without spending the encoding risk to find out empirically.

**Correction (same day)**: an earlier draft of this section said growing the atlas to the full
397-level pool was still pending. It wasn't — that full run already happened (`31042910431`,
2026-08-05, growing the atlas to 5,518 branches) and the probe was already re-scored against it
(same verdict, confirmed at scale: 0.45% applicability, zero false rejects). The source doc itself
had gone briefly self-contradictory (one section updated with the run's results, an older section
below it still saying "not dispatched yet") — both now fixed. **Update (2026-08-06): both other
Tier 2 candidates are now scored too** (`docs/solver-shadow-eval-harness.md`'s Parts 7-8) — a joint
must-pass/must-cross tour bound (bounded obligation-compatibility MDD, narrowed) applies to 11.9% of
branches but only uniquely catches 1 dead branch beyond the existing per-mechanic MST bounds; a
single-viable-goal-neighbor forced-revisit check (backward compatibility envelope, narrowed) applies
to just 0.036% of branches. Both sound (zero false rejects at full atlas scale), neither worth
production integration as scoped. All three of Tier 2's named candidates are now closed.

The remaining higher-level framing still holds: compile these facts once, expose them as advisory
features, evaluate in shadow mode, never promote to a hard prune without proof — which is exactly
the discipline the harness above already enforces mechanically (a probe declares its soundness
class, and the harness itself exits non-zero on any false reject, rather than trusting a probe
author's self-report).

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
other?" Full findings and the fixes: `reports/2026-08-06-game-rules-solver-alignment-plan.md`.

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

### Fixed: the must-cross lock was unenforced in live play

CLAUDE.md and the solver's `_isMoveDynValid` both state the rule: a must-cross cell must be crossed
**straight through** (same entry/exit axis) while its 2-visit requirement is still pending — turning
there consumes both axis bits and permanently forecloses the required second crossing. `isValidMove`
enforced no such thing, letting a player turn where no solver-produced path ever could.

This was initially misdiagnosed as an *intentional* solver-only pruning optimization (analogous to
the goose/false-goal exclusion the fuzzer below deliberately treats as a correct scope difference,
not a bug) — a plausible-looking conclusion that was wrong, corrected directly by report of actual
play behavior: turning inside a must-cross cell is illegal, full stop, not a solver-specific
shortcut. Fixed the same way as the flipping-filter case above: `isValidMove` now checks the same
entry-axis-vs-exit-axis condition the solver already enforced, using the axis value the function was
already computing for the (unrelated) edge-reuse check. `validateCandidatePath` inherits the fix
automatically (it delegates every step to `isValidMove`). Verified with new regression tests, a
tightened referee test, and — because this fix landed together with the fuzzer extension below — 0
mismatches on 900+ freshly generated levels both before the fix (where the gap showed up as a real,
reproducible divergence) and after.

### Fixed: `isValidMove`'s own win-metrics check was missing must-turn

Found while investigating a different item (tracing every real caller of `isValidMove` for the
"shared compiled graph" question below): `move-rules.ts`'s `checkWinMetrics` block checks
must-pass, must-cross, surround, and adjacent-turn when stepping onto the goal, but never
must-turn — while `runtime/game-rules.ts`'s `areWinMetricsSatisfied`, a separate function that is
the actual arbiter of live-play wins, correctly checks all five. The two had quietly drifted.

**Not a live bug**, confirmed by tracing every real caller: the referee (`path-validator.ts`, the
only caller with `checkWinMetrics` on) has its own independent, correct post-loop must-turn check
and never passes a `turnsAtMap` into `isValidMove`'s state anyway — so even the pre-existing
adjacent-turn check inside the same block already silently no-oped for this caller by design (an
"omitted contexts skip conservatively" rule its own comment states). Every interactive play caller
has `checkWinMetrics` off entirely, and the one preset that would use it with no compensating check
(`MoveContext.SOLVER`) has zero production call sites — it's a domain-layer test preset only; the
real solver never calls `isValidMove` at all. Fixed anyway: the referee's own checks *look*
redundant with `isValidMove`'s block to a future reader who hasn't traced exactly what state each
caller supplies, and a plausible "clean up the duplication" refactor could silently reintroduce a
real must-turn bypass. Closed the drift at the root instead of leaving that trap in place.

**Found a second, pre-existing bug while writing the regression test**: an existing `checkWinMetrics`
test passed for the wrong reason — its `state.path` already ended at the goal before validating a
move *to* the goal, so `isValidMove`'s unconditional `invalid-after-goal` rule fired first and the
test never actually exercised the must-pass check it claimed to. Confirmed via direct diagnostics,
then fixed the same way as the new tests (pass the pre-move path, not the post-move one).

### Fixed: extended the differential oracle fuzzer to catch this bug class in CI

`scripts/solver-oracle/fuzz.mjs` cross-checks the solver's move generation against an independent
reference implementation via move-by-move random walks — exactly the mechanism that would have
caught the flipping-filter bug above, and exactly the kind of check this document's own "semantic
principle" section argues every state-merging mechanism needs. It previously did not import or
exercise `move-rules.ts` at all, so it structurally could not catch **solver-vs-game** drift, only
**solver-vs-oracle** drift.

Added a third arm that walks `isValidMove` in lockstep with the existing two, asserting three-way
legal-move-set agreement at every step (not just win-condition agreement at the goal) — under
`MoveContext.TAP_ROUTE`, not `PLAY` as originally proposed: `PLAY`'s hazard checks would flag the
goose/false-goal scope difference above as a false mismatch, and `MoveContext.SOLVER` (tried first)
produced ~70% spurious mismatches from its `checkWinMetrics` gate refusing to step onto the goal
early, a question move generation never actually asks. This is the single highest-leverage,
lowest-risk item from that investigation, now shipped: it changes no game behavior, and it turned
the must-cross-lock gap above into an automatic, reproducible CI-style finding instead of another
by-hand report.

### Resolved: flipping filters are single-use

This question was initially open because live play/the referee did not explicitly reject re-entry
while `search-state.ts` did. The design and implementation audit subsequently resolved it in favor
of the solver's existing restriction: a flipping filter is single-use. The rule is now codified
explicitly in `isValidMove`/the referee rather than relying on axis matching and edge reuse to
coincidentally make a second crossing impossible. This also resolves the apparent “per-filter local
flip” alternative below: with only one use per filter, a local successive-use toggle would never
actually toggle, so the level-wide crossing-order parity is the meaningful flipping mechanic.

Do not treat the older “check whether witnesses re-enter a flipper before deciding” wording from
this investigation as an outstanding task. The design owner confirmed the global crossing-order
coupling is intentional, and the corresponding documentation was corrected to describe the actual
single-use/global-parity rule.

### Fixed: added an in-envelope stress stratum, separate from corpus-2's complexity envelope

`scripts/stress/generate-random.mjs` deliberately raises every object cap **+4 over the documented
published maxima** (the exact cap-raise that caused the beam-dedup overflow bug above) and draws
counts from the upper half of the raised range — a considered choice to avoid overfitting the
corpus to the current solver. But it means "solver solve rate on corpus-2" and "solver solve rate
on levels players will actually see" are different questions, and only the former was tracked.
Scoring every corpus-2 level by how many of the shipped game's own dimensions it exceeds (must-pass
≤4, must-cross ≤4, portals ≤3 pairs, flippers ≤4, filters ≤6, landmarks ≤5, reqInt ≤11) against the
"carries a valid hint from any source" upper bound: only 6 of 1700 levels sit fully inside the
shipped envelope (83.3% solved), dropping monotonically to 0% at 6 dimensions exceeded.

**Fixed 2026-08-06**: added `data/stress/stress-levels-envelope.json`, a separate 200-level stratum
generated by the same tool and philosophy (`generate-random.mjs --envelope-caps`) but with object
caps restored to CLAUDE.md's documented per-level maxima instead of the raised +4, tracked
independently from corpus-2's deliberately-hard-tail research population. An initial one-shot solve
pass (60s/20M per-level budget, no high-budget campaign) found **124/200 solved (62.0%)** — directly
confirming the hypothesis against corpus-2's own 605/1700 = 35.6% (as of 2026-07-25, itself already
inflated well past a typical-budget number by two rounds of targeted high-budget sweeping). Detail,
regeneration command, and file-table entries: `data/stress/README.md`'s "Third stratum: in-envelope"
section.

### Fixed: decoupled offline solve budgets from the interactive Solve button

Not a rule change, but the single largest measured lever found in either investigation.
`reports/2026-08-01-budget-vs-algorithm.md` (already in-repo) found that removing the 8-second
wall-clock deadline alone (same node/work budget) is worth **+32 corpus-2 solves**, and raising the
node budget 1.8× on top of that is worth **+25 more** — 505 → 562 combined, larger than the best
algorithmic change measured in the same report (+28). The 8-second deadline exists because
`solveLevel()` doubles as the live in-game hint generator, where latency genuinely matters; offline
batch/CI tooling has no such constraint but was inheriting it anyway.

Audited every solver call site first: `SolveOpts.disableExtraBudgetPasses` was already correctly
scoped to the interactive UI and internal tight-iteration sub-passes only — no batch/CI script sets
it. Ad-hoc debugging tools' small default budgets (`solver:direct`, `stress:smoke`, etc.) are the
right call for quick iteration, not a bug. `solver:bench`'s defaults deliberately match
`logs/solver-baseline.json`'s own generation parameters. The one real match: `.github/workflows/
solver-stress-refresh.yml` — the workflow that commits the persisted corpus/hint/baseline data to
`main` — defaulted to the same 8000ms/20M shape purely because that's what the very first
`solver-corpus2-batch-*.yml` scheme happened to use, carried forward through every rewrite since.

**Fixed 2026-08-06** (after explicit sign-off, since raising a workflow's routine, always-committing
defaults is a materially different and less reversible decision than wiring an opt-in flag):
`solver-stress-refresh.yml`'s routine defaults now match this report's own measured OFF@36M
configuration — non-binding 24h ms deadlines for both corpora, `corpus2_node_budget` raised to 36M,
and corpus-1 now always carries a real node ceiling too. `deterministic=true` keeps its narrower,
distinct purpose (a truly unbounded deadline for a precise A/B, never committing) rather than being
the only way to reach this configuration.

**Verified via a real dispatch**: run 31072921874 completed in ~29 minutes (sharding across 20
runners already parallelizes what the report measured as a 47,671s sequential run) and committed
**corpus-1 95/102, corpus-2 684/1700** to `main` — corpus-2 up from 605/1700, **+79 solves**, more
than the report's own predicted +57, likely compounding with other solver fixes landed since the
report's 2026-07-25 measurement. This is a dated result of that budget change, not the current
Corpus-2 solved-count source of truth; use the current baselines/future-work ledger for current
counts.

### Resolved: the global-parity flip is intentional design, not a smell

Every flipping filter shares one global toggle: the *k*-th distinct flipper crossed (anywhere on
the board, in any order) gets its declared axis XOR `(k−1) mod 2`, coupling a filter's effective
axis to traversal history elsewhere on the grid — originally flagged as global entanglement that
defeats local/regional reasoning about "sets of possible completions," with a per-filter local flip
(each filter alternates only on its own successive uses) proposed as a possible fix.

**That alternative isn't actually available**: flipping filters are single-use (see "Resolved"
above), so "its own successive uses" can never exceed one — a strictly local model collapses to
"always the declared axis," making a flipping filter indistinguishable from a plain one. The global
coupling is the *only* thing currently giving "flipping" any meaning at all.

**Confirmed with the design owner (2026-08-06)**: this interactivity is deliberate — a level
designer can force a specific flipper-crossing order using other board constraints (blocks,
geometry, must-pass placement), and the puzzle difficulty comes precisely from that dependency, not
from an accident to engineer away. Checked both branches before closing this out: no live evidence
the solver struggles with flipping filters ("never has," per the design owner), and the editor
currently has no tooling to help a designer verify their intended crossing order is actually forced
— but nobody has asked for that either, so it's recorded rather than built, per this project's own
build-for-measured-need discipline. **Fixed**: CLAUDE.md's mechanics table wording ("flips... each
time the path uses it") implied a per-cell repeat-use model the single-use rule makes impossible;
corrected to describe the actual level-wide crossing-order parity. No code change — the
implementation was already correct and intentional.

## Consolidated ranked research programme

Merges both investigations' priorities into one order. Items 1–15 below are done; item 16 is
explicitly deprioritized and item 17 is also done. The larger Tiers 3–5 research menu is triaged
separately below rather than being implicitly labelled open merely because its numbers are higher.

1. ~~Audit current beam dedup soundness~~ — **done**: unsound as suspected, but the fix was to
   correct the key's structural fragility, not remove the mechanism — see "Resolved" above.
2. ~~Measure beam-specific exact duplication~~ — **done**: sound-duplicate ceiling 0.019% (rules
   out building a fully sound key), but the *existing* coarse mechanism has separately measured
   real value as a width/diversity heuristic — see "Resolved" above.
3. ~~Fix the must-cross lock gap in live play~~ — **done**: `isValidMove` now enforces the same
   straight-through-while-pending rule the solver already did — see "Fixed" above.
4. ~~Extend the oracle fuzzer to cover `isValidMove`~~ — **done**: the third arm now catches
   solver-vs-game drift, not just solver-vs-oracle drift, and is what turned item 3 into a
   reproducible finding — see "Fixed" above.
5. ~~Decouple offline solve budgets from the interactive constraint~~ — **done**: audited every
   solver call site, found `disableExtraBudgetPasses` already correctly scoped, and traced the one
   real gap to `solver-stress-refresh.yml`'s routine defaults — raised to the report's own measured
   OFF@36M configuration after explicit sign-off, then verified via a real dispatch: **corpus-1
   95/102, corpus-2 684/1700** committed to `main` (+79 vs. the old 605/1700 baseline) — see "Fixed"
   above. These are dated campaign counts, not current live totals.
6. ~~Add an in-envelope stress corpus stratum~~ — **done**: 200 levels at the shipped game's
   documented caps, initial solve pass 124/200 (62.0%) vs. corpus-2's own then-current 35.6% —
   confirming the underlying hypothesis — see "Fixed" above.
7. ~~Resolve the flipper single-use design question~~ — **done**: ruled single-use, codified
   explicitly in `isValidMove`/the referee rather than relying on axis-matching and edge-reuse to
   coincidentally combine into the same result — see "Resolved" above.
8. ~~Prototype static forced-sequence macro transitions~~ — **measured and deprioritized**: the
   "First experiment" this item called for was run — median forced-chain length 1, p90 2, across
   280,000+ live cells in all four corpora — the "long deterministic stretches" premise doesn't
   hold for this game's level population. Settled negative result, see "Measured and deprioritized"
   above and `reports/2026-08-06-forced-chain-length-measurement.md`.
9. ~~Resolve the per-filter local flip vs. global-parity flip question~~ — **done**: confirmed with
   the design owner that the global crossing-order coupling is the intentional puzzle mechanism
   (not a smell to engineer away), and that neither the solver nor the editor has a live pain point
   that would justify further work — closed with a documentation fix only, see "Resolved" above.
10. ~~Evaluate region/separator features in shadow mode~~ — **done**: corrected 2026-08-06, this
    was not an unstarted item — a full campaign already exists (`docs/solver-shadow-eval-harness.md`),
    including the full-scale atlas run (397 levels, 5,518 branches) and a verdict already reached
    for the narrowest reasoner (do not wire into production, 0.45% applicability, confirmed at
    scale). **Update, same day**: the two other Tier 2 candidates it names (depth-limited
    future-cone MDD → bounded obligation-compatibility MDD; backward compatibility envelopes) are
    now scored too (Parts 7-8 of that doc) — both sound, both closed, neither worth production
    integration as scoped. See "Opportunity: region and separator facts as advisory signals" above.
11. ~~Audit symmetry prevalence~~ — **measured and deprioritized**: reused the production 8-way
    dihedral transform (`geometry.ts`, the "Whoa" display-variant machinery) to check whole-level
    automorphisms across all four corpora. Exact symmetry is essentially published-corpus-only —
    zero instances across 2,002 procedurally-generated levels (both stress corpora + in-envelope) —
    and rare even there (20/160 published levels, 12.5%), with only 4/160 (2.5%) manifesting as a
    genuinely duplicated gate root branch (the one concretely-actionable shape). Canonicalization
    would help at most 4 already-solved published levels and nothing in the research corpora.
    Settled negative result, see `reports/2026-08-06-symmetry-prevalence-measurement.md`.
12. ~~Extend the oracle fuzzer's differential coverage to must-turn/adjacent-turn/surround~~ —
    **done**: `oracle.mjs` independently re-derives all three (turn-direction geometry re-derived
    locally rather than imported, to keep the domain-arm cross-check meaningful — see its file
    doc), `generate.mjs` now sometimes places them, and the 3-arm fuzzer (oracle vs. production
    solver vs. live-play `isValidMove`) found zero mismatches across 5 independent seeds and
    ~830 landmark-bearing generated levels. Decorative/plain-mustPass roles needed no new logic.
13. ~~Write first-class dynamic mechanic contracts~~ — **done**: see "Done: first-class dynamic
    mechanic contracts" above and `docs/mechanic-state-contracts.md`.
14. ~~Fix the `(1<<n)-1` mechanic-cardinality gap~~ — **done**: `validateRawLevel` now rejects any
    level exceeding 30 mustPass/mustCross/surround/mustTurn/adjacentTurn objects, the point past
    which `prep.ts`'s initial-bitmask pattern is unsound. See `docs/mechanic-state-contracts.md`'s
    "Cardinality risk" section.
15. ~~Score the bounded obligation-compatibility MDD and backward compatibility envelope probes~~
    — **done**: see `docs/solver-shadow-eval-harness.md`'s Parts 7-8. Both sound at full-atlas
    scale (zero false rejects), both closed as not worth production integration as scoped — the
    joint must-pass/must-cross tour bound applies to 11.9% of branches but uniquely catches only 1
    dead branch beyond the existing separate per-mechanic MST bounds; the single-goal-neighbor
    forced-revisit check applies to just 0.036% of branches. All three of the multilingual doc's
    Tier 2 candidates (separator-state resource DP, bounded obligation-compatibility MDD, backward
    compatibility envelopes) are now scored and closed.
16. **Prototype a shared compiled graph with one additional consumer** — **deprioritized** in favor
    of items 12–13 above. The two obvious consumers disqualify themselves: the reference oracle's
    value depends on sharing zero implementation with the solver, and the editor validator has no
    low-risk general-adjacency extraction point. Revisit only with a genuinely new consumer.
17. ~~Winning-path archaeology (Tier 1, item 2 of the multilingual doc's section 16 ranking)~~ —
    **done**: see `reports/2026-08-06-winning-path-archaeology.md`. Replayed 40 sampled corpus-2
    winning paths through the real `getNeighbors`/`scoreMove` primitives; the heuristic ranks the
    known-correct move 1st among legal candidates ~70% of the time and averages a mean rank of
    1.3-1.4, in both cold-solved (72.3%) and cold-unsolved (69.5%) buckets — a small gap on a
    40-level sample. "Early ordering failure" does not look like a dominant driver of corpus-2's
    unsolved levels. This closes out all three Tier 1 "evidence engine" items.

### Triage of the remaining research menu (Tiers 3-5)

With Tier 1 and Tier 2 now addressed, here is where the multilingual doc's section 16 ranking's
remaining items stand, evaluated against evidence already gathered rather than left as an
undifferentiated backlog:

- **Tier 3 item 8 (contrastive failure-directed activity)**: no cheap kill-criterion check exists
  from current telemetry — its premise would need new per-branch sibling-outcome instrumentation
  during search that doesn't exist yet. Not started; no evidence yet either way.
- **Tier 3 item 9 (hazard-based adaptive capping / participation floors)**: partially already
  validated by precedent — "specialist starvation is real" was the exact finding behind the
  already-shipped `ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION` fix. A fully general survival-model
  version would need new censored-observation hazard-curve telemetry per attempt family.
- **Tier 3 item 10 (bidirectional multi-abstraction CEGAR)**: explicitly needs the atlas as an
  input — now exists (5,518 branches). A full CEGAR refinement loop is a substantial offline
  research machine, not a single-probe-sized task; scope it as its own effort if pursued.
- **Tier 4 item 11 (detour-gadget discovery + slack allocation)**: its safe first experiment is a
  cheap mining pass over existing stored solutions for interface-equivalent subpaths with different
  length/intersection deltas. One of the most actionable not-yet-done items in the remaining menu.
- **Tier 4 item 12 (interface-preserving repair surgery)**: gated on residual interfaces and causal
  windows. Residual interfaces are measured; causal windows are not. Not ready.
- **Tier 4 item 13 (partial-order / commuting-segment analysis)**: the safer first step is another
  cheap offline mining exercise over stored solutions. A plausible next measurement, not built.
- **Tier 4 item 14 (Eulerian/local-transition relaxation ladder)**: E0 alone is a bounded, cheap
  check close in shape to the Tier 2 probes. Not started.
- **Tier 4 item 15 (topology-signature diversity)**: not started; diagnostics-first scope is a
  larger build than a single probe.
- **Tier 5 items 16-17 (topology-first skeleton compilation; automatic rule synthesis)**: remain
  moonshots. Item 17 is gated on the atlas, CEGAR/counterexample machinery, and proof-certificate
  conventions; the atlas exists, CEGAR doesn't.

**Bottom line**: this triage does not recommend building all remaining items. Tier 4 items 11 and
13 stand out as cheap, well-scoped “mine existing stored solutions” measurements comparable in cost
to the Tier 2 probes; the rest need new instrumentation, a substantial standalone build, or remain
correctly deferred.

## What is most likely to find more solves?

Based on evidence from both investigations, the plausible direct routes are:

1. **Offline solve-budget decoupling** — no longer a hypothesis: verified via a real dispatch at
   **+79 corpus-2 solves** (605 → 684/1700) from configuration alone. Treat those counts as the
   dated experiment result, not the current live corpus total.
2. **Region/separator features used as guidance**, provided they add predictive information beyond
   current features; the three narrow hard-prune probes already scored are closed.
3. **Optional generation provenance**, especially for generated corpora and portfolio selection.

The flipper single-use question is resolved: single-use is the correct, intentional design, not a
solver-side restriction to relax. It is no longer a candidate lever for more solves.

## What should the solver do with this session's game-rule-alignment work?

Worth being explicit about what this session's fixes actually were: in every case,
`modules/solver/*.ts` was **already correct** — these were live-play/referee catch-up fixes, found
because comparing the solver's behavior against `move-rules.ts` exposed drift. Three things a
solver-improvement effort actually gets from this work:

1. **The hint corpus is safe to trust without a landmark-drift caveat.** `npm run
   test:hint-path-oracle` confirmed published stored hints remain PLAY-valid after the alignment
   fixes.
2. **The in-envelope stratum is a useful player-envelope validation corpus.** Its initial 62.0%
   solve rate was materially different from the then-current Corpus-2 result. Validate future
   shared solver changes against it alongside corpus-1/2 where relevant.
3. **A measured combined-obligation question remains conceptually interesting, but the first joint
   must-pass/must-cross tour probe has already been scored and closed as too weak.** Do not naively
   sum independent lower bounds; any stronger combined bound still needs an admissibility proof and
   differential testing.
4. ~~**Fix the cardinality gap before raising landmark caps.**~~ **Done 2026-08-06.**
   `validateRawLevel` now rejects more than 30 mustPass/mustCross/surround/mustTurn/adjacentTurn
   objects, matching the safe range of `prep.ts`'s `(1 << n) - 1` masks. The mechanic-contract
   document records the bound. This is a historical lesson about enforcing representation limits,
   not an outstanding action item.

One item that looked promising from first principles and is now a settled negative result, not an
untested hypothesis: **general, fully-sound transposition caching**, for both DFS and beam. Beam's
existing coarse dedup mechanism is different: it has measured value as width/diversity management
and should be kept, while its former structural bit-packing bug is fixed.

## Non-goals and cautions

- Do not reopen a general, *fully sound* DFS or beam transposition/dedup key without materially new
  evidence, such as an incremental sound key with radically lower cost than either measurement
  found. This is separate from beam's existing coarse dedup mechanism, which has measured value.
- Do not derive a production key from an incomplete field list, and do not assume a field's
  intended bit-width is actually enforced — verify against the current object caps.
- Do not treat advisory region facts as prunes without proof.
- Do not make gameplay call solver hot-path code, or make the solver depend on browser/controller
  machinery.
- Do not assume a more compact representation is faster; benchmark it.
- Do not count construction-guided or hint-guided solving as cold solving.
- Do not redesign player-facing rules solely for solver convenience unless the formulations are
  genuinely equivalent.
- Do not assume the independent rule implementations agree just because each one individually
  looks correct — verify with a differential check, not a read-through.

## Conclusion

Pathfinder is already highly solver-conscious, and much of the obvious state-merging territory has
been investigated and closed with real measurements rather than intuition. The beam-dedup work is
the clearest cautionary example: the fully sound duplicate population is tiny, the production key
is deliberately coarse, disabling that coarse mechanism costs solves because it manages beam width,
and the genuinely broken fixed-width encoding underneath it was fixed without removing the useful
heuristic behavior.

The parallel rule-alignment investigation found a complementary class of issues: independent rule
implementations had drifted. The flipping-filter entry-axis gap, must-cross lock gap, must-turn
win-metric drift, and corresponding differential-fuzzer coverage were all corrected; the flipper
single-use/global-parity design questions were resolved rather than left open. Offline budget
separation, the in-envelope corpus, mechanic contracts, schema cardinality enforcement, symmetry
measurement, forced-chain measurement, and the three Tier-2 shadow reasoners likewise all reached
explicit outcomes.

The remaining territory is therefore not a pile of unfinished items from this document's original
numbering. It is the separately triaged research menu above plus concrete live items in
`future-work.md`. Historical results remain here because they explain why apparently-obvious ideas
should not be rebuilt; their status labels should not be read as invitations to repeat work that has
already run to conclusion.
