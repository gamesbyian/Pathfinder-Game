# Learned-failure certificate audit

> **Status:** active
> **Last evidence:** 2026-08-24 — current prune-gauntlet/topology implementation, repair nogood-cache evidence, and prior sound DFS/beam recurrence audits
> **Decision:** do not build a generic learned-nogood/CDCL layer. The first genuinely plausible learned logical reason is a bounded connectivity-derived structural certificate, tested in shadow mode for recurrence, earliness, soundness, and work savings before any production cache.
> **Remaining gate:** instrument already-scheduled connectivity failures with conservative reason sketches and measure cross-state/cross-parent recurrence plus potential avoided flood-fill work and earlier firing; stop if sound projected reasons become nearly unique or expensive to match.
> **Evidence role:** discovery
> **Selection:** observational — candidate reason families were narrowed after inspecting existing Pathfinder prune/memoization and recurrence evidence.

## Decision context

Pathfinder already has three materially different kinds of memory/reasoning that must not be conflated:

1. **Repair-local experience memory** (`modules/solver/nogood-cache.ts`): a fine-grained signature of a repair state whose previous randomized continuation ended without solving. This suppresses duplicate randomized work inside one incomplete repair call, but it is not proof that the state is globally dead.
2. **Sound projected numeric memoization** (`mustPassLowerBound` / `mustCrossLowerBound`): caches of admissible lower-bound values keyed by the state fields on which those values depend. These are logical/numeric memoization, not learned clauses.
3. **Sound direct prune predicates** (`prune-gauntlet.ts`): local/resource/topology predicates that can reject a state for a proven reason.

The current learned-failure question is therefore narrower:

> Is there an expensive sound rejection whose reason can be projected into a compact certificate that either recurs across genuinely different exact states or becomes usable materially earlier than the current expensive check, while saving enough work to repay derivation and lookup?

The strongest current candidate is **connectivity-derived structural failure**. Most other prune families are already too cheap or already memoized.

## Prior evidence that constrains the design

### Exact DFS and beam recurrence is weak

The 2026-07-17 DFS transposition investigation initially saw very high recurrence under a loose signature, then correctly re-ran the premise with a future-complete state signature. Sound duplicate recurrence fell to roughly **0.5-16%**, around 1-2% on most measured attempts. That broad exact-state transposition direction remains weak.

The analogous beam audit found a sound-signature duplicate ceiling of about **0.019%** of generated candidates. Current coarse beam dedup therefore functions as survivor-selection compression, not exact future-equivalence detection.

### Repair recurrence is high, but it is experience memory

The 2026-08-07 repair-cache premise check found terminal failed-state signature repeat rates of **53.65%-98.09%** on seven hard repair-close levels. The shipped cache reduced work on the targeted sample.

That establishes a valuable fact: randomized repair revisits its own failed experience heavily.

It does **not** establish logical deadness. A repair cache hit means roughly “this matching repair state previously reached a terminal failure under this incomplete stochastic continuation policy.” It may decline to try another random continuation. That can change incomplete-search capability, but it cannot manufacture an invalid solution.

The source comment on this research branch was corrected to make that semantic boundary explicit. Historical wording such as “already-proven-dead work” should be read as stale shorthand, not CP/SAT proof semantics.

## Current prune-reason disposition

| Reason family | Current form | Learned-reason headroom |
|---|---|---|
| Length/intersection overshoot | O(1) arithmetic | none; recompute |
| MustCross intersection ceiling | popcount + arithmetic | negligible |
| Goal/distance bound | table lookup/arithmetic | negligible |
| Parity / portal parity | O(1) or tiny bounded scan | negligible |
| MustPass lower bound | sound numeric memoization already exists | separate failure cache duplicates current value cache |
| MustCross lower bound | sound numeric memoization already exists | same |
| Surround / adjacent-turn bounds | admissible numeric bounds | profile memoization cost before discussing learning |
| Must-turn deadlock | bounded local scan | already a compact direct certificate |
| MustCross forced-neighbor | bounded local reads | already direct |
| MustCross neighbor-budget | tiny local resource/Hall-style calculation | already effectively a compiled structural certificate |
| Intersection deficit | O(1) arithmetic | none |
| Connectivity / reachable volume | residual flood fill, hot and throttled | **credible new headroom** |

A crucial economic point follows. When a normal sound prune fires, it already deletes that subtree immediately. Learning the exact same failure cannot save descendants of that same rejection. A learned reason pays only if it can:

- recognize related failure elsewhere more cheaply than recomputing the originating predicate; or
- fire between scheduled evaluations of an expensive predicate.

Connectivity is unusual on both counts.

## Why connectivity is different

`isConnected` computes a residual reachable set, objective reachability, and fresh-volume capacity. It is one of the solver's hottest kernels. DFS and beam deliberately throttle it rather than running it at every node/candidate.

A compact structural reason could therefore have:

1. **replacement value:** avoid a future flood fill when a matching structural reason is already known;
2. **earliness value:** reject a state between normal connectivity checkpoints when the learned reason is already satisfied.

This is much more plausible than wrapping a clause store around parity arithmetic or a memoized lower bound.

## Candidate reason families

### Required-objective cut certificate

Conceptual shape:

`pending(objective) AND separator/wall facts S => objective unreachable from current component`

Initial reason literals should be conservative and visibly sound, favoring blocking facts whose semantics are monotone or explicitly represented:

- static block/gate geometry;
- used flipper;
- axis-exhausted cell (`edgeUsage == H|V`);
- visited-path walls when no free intersections remain;
- pending MustCross exceptions represented explicitly rather than accidentally swallowed into the wall set.

Do not begin by minimizing separators. First establish recurrence and economic value.

### Residual-volume/resource-capacity certificate

Portal-free connectivity already rejects when:

`freshVolume + intNeeded < remainingSteps`.

That is a sound state-level fact. The research question is whether equivalent residual-region/capacity failures recur under different exact histories in a form that can be checked much more cheaply.

`freshVolume` alone is not a sound generalized key. Equal scalar volume does not imply equivalent future geometry.

## Smallest value-of-information pilot

Do not implement a production cache.

On connectivity calls that already execute and already reject, record a bounded **shadow reason sketch**:

- rejection subtype: goal unreachable / pending MP unreachable / pending MC unreachable / volume shortage;
- remaining length and intersection resources;
- pending-MustCross count and free intersections after reservations;
- rejected objective when applicable;
- canonical reached-component or boundary fingerprint;
- boundary blocker facts split by static / used-flipper / axis-exhausted / visited-wall categories;
- pending objective masks and MustCross first-pass state where needed;
- a separate exact-state fingerprint so abstract recurrence is not confused with literal state recurrence.

The pilot answers four questions:

1. How often does an abstract reason recur across more than one exact state?
2. Do repeats occur across genuinely different histories/branches/parents?
3. How many future flood fills could a sound matching reason avoid?
4. How often could a reason have fired earlier, between scheduled connectivity checks?

The first pass is observational only. It must not alter pruning, beam retention, ordering, PRNG consumption, or work budgets.

## Success and stop gates

Proceed to one bounded reason checker only if all of the following hold across unrelated development parents:

- recurrence materially exceeds exact-state recurrence;
- repeated reasons cover a non-trivial fraction of connectivity cost or expose useful earlier firing;
- matching is substantially cheaper than `isConnected`;
- every projected literal has a conservative soundness argument;
- value is not confined to one selected puzzle family.

Stop if:

- reason fingerprints are nearly unique;
- useful recurrence disappears once enough state is retained for soundness;
- matching itself requires graph analysis comparable to the original flood fill;
- savings are only a tiny number of already-scheduled calls with no earlier firing;
- recurrence is mostly one parent/family or exact-state duplication already known to be weak.

Only after that gate should reason minimization, bounded retention, backjumping, LCG/CDCL-style infrastructure, or global learned stores be discussed.

## Reference-model role

The CP-SAT prefix oracle can act as a counterexample source for proposed projected reasons:

- collect native states satisfying reason R;
- ask whether any supported exact prefix satisfying R is live;
- any live counterexample immediately disqualifies R as a hard dead-state certificate;
- failure to find a counterexample is supporting evidence only, not proof, unless R also has a mathematical soundness derivation.

Timeout/UNKNOWN/unsupported never count as deadness.

## Queue implication

- Generic exact-state DFS memoization remains closed/weak.
- Repair-local experience memory remains useful but non-proof.
- MustPass/MustCross lower-bound caches already occupy part of the “remember repeated future information” space in a specialized, sound form.
- The next learned-failure action is a **shadow connectivity reason recurrence/earliness audit**, not a clause database.
- If that audit is negative, deprioritize learned logical failure and keep #6 focused on restart/continuation-value work.
- If positive, test one conservative monotone certificate family before any generic explanation framework.
