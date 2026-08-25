# Learned-failure certificate audit (2026-08-24)

## Decision

Do **not** build a generic learned-nogood/CDCL layer from the current evidence.

Pathfinder already has three materially different kinds of memory/reasoning that must not be conflated:

1. **Repair-local experience memory** (`modules/solver/nogood-cache.ts`): a fine-grained signature of a repair state whose *previous randomized continuation* ended without solving. This is useful duplicate-work suppression inside one incomplete repair call, but it is not a proof that the state is globally dead.
2. **Sound projected numeric memoization** (`mustPassLowerBound` / `mustCrossLowerBound`): pure caches of admissible lower-bound values keyed by exactly the state fields on which those values depend. These are logical/numeric memoization, but not learned failure clauses.
3. **Sound direct prune predicates** (`prune-gauntlet.ts`): cheap local/resource/topology tests that can reject a state for a proven reason.

The current learned-failure question is therefore narrower:

> Is there an expensive sound rejection whose reason can be projected into a compact certificate that (a) recurs across genuinely distinct exact states, or (b) becomes usable materially earlier than the current expensive check, and saves enough work to repay certificate derivation and lookup?

The strongest current candidate is **connectivity-derived structural failure**. Most other prune families are already too cheap or already memoized to justify a separate learned-reason layer.

## Prior evidence that constrains the design

### Exact DFS transposition memory: real duplicates are rare

The 2026-07-17 DFS transposition investigation first measured 92-99% recurrence under a crude signature, then correctly re-ran the premise with a sound future-state signature including visited-cell identity, `edgeUsage`, portal history, masks, etc. The sound duplicate rate fell to **0.5-16%**, and was around 1-2% on most measured attempts. The full exact-state transposition idea was therefore downgraded as too weak to justify its hashing cost.

See `reports/2026-07-17-dfs-state-revisit-rate-transposition-premise.md` and commit `009cd13c446fee73fe8c83486637eea91b750c24`.

The analogous beam audit found an even smaller sound-signature duplicate ceiling, about **0.019%** of generated candidates. This is why current beam dedup is intentionally a heuristic survivor-selection compression rather than a claim of exact future-state equivalence.

See `reports/2026-08-06-beam-state-dedup-sound-signature-audit.md`.

### Repair-local recurrence: high, but not logical deadness

The 2026-08-07 repair-cache premise check found terminal failed-state signature repeat rates of **53.65%-98.09%** on seven hard repair-close levels, and the shipped cache reduced work on the targeted sample. That establishes real value for **experience memory** in randomized repair.

It does **not** establish that those signatures are globally dead. `repairSearchFromGate` records the state after one stochastic walk ends in `deadend`/invalid termination; a later cache hit merely declines to try a different stochastic continuation from the same matching signature. Because repair is incomplete anyway, this can change capability but cannot manufacture an invalid solution. The current source header has been corrected on this branch to make that semantic scope explicit.

The historical report/commit sometimes uses stronger phrases such as “already-proven-dead work” and “already-known-fruitless subtree.” Read those as historical shorthand for “previously failed under this repair continuation policy,” not as a SAT/CP-style proof claim.

See `reports/2026-08-07-repair-nogood-cache.md`, `modules/solver/nogood-cache.ts`, and `repair-search.ts`.

## Current prune-reason inventory

The shared `evaluatePrunedMove` gauntlet currently rejects for:

- fundamental exact-length / intersection overshoot;
- pending-must-cross intersection ceiling;
- goal invalidity;
- goal-distance lower bound;
- parity / portal-parity envelope;
- must-pass lower bound;
- must-cross lower bound;
- surround lower bound;
- adjacent-turn lower bound;
- must-turn axis deadlock;
- must-cross forced-neighbor deadlock;
- must-cross neighbor-budget deadlock;
- intersection deficit versus remaining steps;
- residual connectivity / reachable-volume failure.

The correct learned-failure disposition is not uniform.

| Reason family | Current cost/representation | Learning headroom | Disposition |
|---|---|---|---|
| Length/intersection overshoot | O(1) arithmetic | None | Recompute directly |
| MC ceiling | popcount + arithmetic | Negligible | Recompute directly |
| Distance bound | table lookup | Negligible | Recompute directly |
| Parity / portal parity | O(1) / tiny bounded scan | Negligible | Recompute directly |
| Must-pass LB | expensive enough to matter, but already soundly memoized by `(pos, mpVisitedMask)` | Separate failure cache duplicates the existing value cache | Keep numeric memoization |
| Must-cross LB | expensive enough to matter, already memoized on position + pending/cross-axis state | Separate failure cache duplicates the existing value cache | Keep numeric memoization |
| Surround / adjacent-turn LB | admissible numeric bounds | Potential memoization question only if profiling supports it; not a clause-learning question | Profile before touching |
| Must-turn deadlock | bounded scan of pending cells | Already a compact structural certificate | Recompute directly |
| MC forced-neighbor | bounded local reads | Already a compact structural certificate | Recompute directly |
| MC neighbor-budget | bounded small-set/resource calculation | Already essentially a Hall/resource certificate | Recompute directly |
| Intersection deficit | O(1) arithmetic | None | Recompute directly |
| Connectivity / volume | flood fill, one of the hottest kernels, deliberately throttled in DFS/beam | **Real**: avoid repeated flood fills and/or fire between scheduled connectivity checks | First learned-certificate candidate |

This classification also answers an important economic question. When a normal sound prune fires, it already deletes the entire subtree immediately. Learning that exact failure cannot save that subtree again. A learned reason can pay only if it recognizes a related failure on another state more cheaply, or can fire at a state where the expensive originating predicate was not scheduled.

That is why connectivity is qualitatively different. `isConnected` performs a residual flood fill and checks goal/objective reachability plus fresh-volume capacity. The code comments identify it as a major hot kernel. DFS intentionally runs connectivity only every 64 nodes and in the final 10 remaining steps; beam runs it every eighth real-length step and in the final 20. A compact structural reason could therefore have two possible sources of value:

1. **replacement value**: detect a repeated structural failure without paying another flood fill;
2. **earliness value**: detect a previously learned structural failure on an intervening state where connectivity would otherwise be skipped.

## Why the MustCross neighbor-budget rule is a useful model, not a learning target

`mustCrossNeighborBudgetDeadlocked` is close to what a good learned reason would look like conceptually:

- it identifies a small set of required neighbor cells;
- de-duplicates shared requirements;
- accounts for reserved intersections separately;
- deliberately abstains on unsupported dynamic cases;
- proves `freeInt < extraNeeded`;
- costs only bounded local reads.

It is effectively a hand-derived resource/Hall-style certificate compiled into a direct predicate. Since the certificate can be recomputed cheaply, storing instances of it would add overhead rather than capability.

This should be the design standard for any future learned structural reason: the reason language must have an explicit soundness derivation and clear abstention conditions. If a recurring learned reason later becomes simple enough to recompute directly, compile it into a prune rather than retaining a general clause store.

## First candidate: residual cut / capacity certificates from connectivity

`isConnected` currently computes more structure than its boolean return exposes:

- the entire residual reachable set from `pos` under its admissible over-approximation;
- whether goal and each pending must-pass/must-cross object are reachable;
- reachable fresh volume;
- implicit boundary cells that prevent expansion;
- special monotone wall facts such as used flippers and axis-exhausted cells;
- when free intersections are exhausted, the visited-path wall plus explicitly reserved pending-MustCross exceptions.

A failed flood fill can therefore potentially emit a **reason sketch** without another traversal.

Two subfamilies are worth distinguishing.

### A. Required-objective cut certificate

Shape:

`pending(objective) AND separator/wall facts S => objective unreachable from current component`

Useful wall literals should initially be restricted to facts whose blocking status is monotone or otherwise explicitly represented, for example:

- static block/gate geometry;
- used flipper;
- axis-exhausted cell (`edgeUsage == H|V`);
- ordinary visited cells when `freeInt == 0` and therefore revisits are no longer affordable;
- pending-MustCross exceptions handled explicitly rather than swept into the wall set.

Do **not** begin by minimizing separators. The first question is recurrence/value, not reason elegance. A large exact boundary fingerprint is acceptable for a shadow measurement if it lets us estimate whether unrelated exact states repeatedly die for the same structural cause.

### B. Residual-volume / resource-capacity certificate

Current portal-free connectivity rejects when:

`freshVolume + intNeeded < remainingSteps`.

That is already a sound state-level certificate. The learning question is whether the *same residual region/capacity situation* recurs under enough distinct exact states that a cheaper fingerprint can predict the failure without rerunning the flood fill.

Again, a scalar `freshVolume` alone is not a sound generalized key. Two states can have the same volume while exposing completely different future interfaces. Any generalized certificate needs enough residual-region/interface information to preserve the implication.

## Smallest value-of-information pilot

Do not implement a production cache yet.

Instrument only connectivity calls that already happen and already reject. For each rejected state, record a bounded **shadow reason sketch**:

- rejection subtype: goal unreachable / pending MP unreachable / pending MC unreachable / volume shortage;
- real length, remaining steps, intersections used, pending-MC count, `freeInt`;
- rejected objective identity when applicable;
- a canonical fingerprint of the reached component or its boundary;
- boundary blocker facts split by type: static, used flipper, axis-exhausted, visited-wall-under-zero-freeInt;
- current pending objective masks and MustCross first-pass state where needed for interpretation;
- exact-state fingerprint separately, so abstract recurrence can be distinguished from literal exact-state recurrence.

The pilot answers four questions:

1. **Abstract recurrence:** how often does one reason sketch occur across more than one exact state?
2. **Cross-branch recurrence:** are repeats merely the same path/state reconstruction, or genuinely different histories?
3. **Potential replacement value:** how many future connectivity calls would a sound matching reason have avoided?
4. **Potential earliness value:** on descendants/related states between scheduled connectivity checks, how often is the reason already satisfied before the next flood fill would run?

The first pass can be completely observational. It need not alter pruning, beam retention, ordering, PRNG consumption, or work budgets.

## Success and stop gates

Proceed to a bounded reason checker only if all of the following are true on unrelated development parents:

- recurrence is materially above exact-state recurrence;
- repeated reasons cover a non-trivial fraction of connectivity cost or expose meaningful skipped-depth earliness;
- the reason can be checked substantially cheaper than `isConnected`;
- a conservative soundness argument exists for every literal in the projected reason;
- the benefit is not confined to one selected puzzle family.

Stop if:

- reason fingerprints are nearly unique;
- useful recurrence disappears once enough state is included to make the reason sound;
- matching requires another graph traversal comparable to the original flood fill;
- savings are only a small number of already-scheduled BFS calls with no earlier firing;
- the apparent recurrence comes from one parent/variant family or from exact-state duplication already known to be weak.

Only after this gate should reason minimization, bounded retention, local/global scope, backjumping, or LCG/CDCL-style machinery be discussed.

## Interaction with the reference model

The CP-SAT prefix oracle is useful here as a **counterexample checker**, not as the source of every reason.

For any proposed projected structural reason R:

1. collect native states satisfying R;
2. ask whether any supported exact-prefix state satisfying R is CP-SAT-live;
3. if yes, R is not a sound dead-state certificate and must remain heuristic/predictive only;
4. if no counterexample is found, that is supporting evidence, not a proof unless R also has a mathematical soundness derivation.

Timeout/UNKNOWN/unsupported mechanics never count as confirmation of deadness.

## Implications for the queue

- Generic exact-state DFS memoization remains closed/weak.
- Repair-local experience memory remains useful but must be described as heuristic/incomplete-search memory, not logical UNSAT learning.
- MP/MC bound caches already occupy part of the “learn repeated future information” design space in a sound, specialized form.
- The next #6 learned-failure action is a **shadow connectivity reason-recurrence/earliness audit**, not a clause database.
- If that audit is negative, learned logical failure should be deprioritized and #6 should continue primarily through restart/continuation-value work.
- If positive, build one bounded, monotone structural certificate checker before considering general explanation infrastructure.
