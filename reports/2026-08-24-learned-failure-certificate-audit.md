# Learned-failure certificate audit

> **Status:** active
> **Last evidence:** 2026-08-28 — [`connectivity-rejection Stage A audit`](2026-08-28-connectivity-rejection-stage-a-audit.md): a first, unselected 80-level/67,179-rejection sample. Not a Stage-A negative — coarse-context recurrence (55.9% overall; 11.3% specifically for the dominant, index-free `goal`-unreachable subtype) survives across genuinely different exact states and different levels, earning Stage B.
> **Decision:** do not build a generic learned-nogood/CDCL layer. The first genuinely plausible learned logical reason is a bounded connectivity-derived structural certificate. The shadow pilot can start cheaper than previously stated: `isConnected()` already knows at the rejection site whether the failure is goal-unreachable, pending-MustPass-unreachable, pending-MustCross-unreachable, or residual-volume shortage, so that subtype plus existing state/resource fields can be logged with no second flood fill. Only pay for component/boundary fingerprints if this first-stage population is large/recurrent enough to justify them. If a future exact frontier/DD experiment independently produces dead interface states, treat those as an opportunistic second certificate population rather than building exact machinery for learning.
> **Remaining gate:** Stage A is now implemented (`modules/solver/topology.ts`'s `ConnectivityRejectionObserver`, `scripts/connectivity-rejection-audit.mjs`) and has run once with a positive-enough result to proceed. Stage B: add a bounded conservative boundary/blocker sketch for the dominant `goal`-unreachable, no-pending-obligation coarse cluster (the largest population share and cleanest cross-level signal), and test recurrence, soundness, avoided flood-fill work, and earlier firing per this file's own Stage B success/stop gates. Stop if useful reasons become nearly unique once geometry is represented, or fingerprinting/matching approaches flood-fill cost.
> **Evidence role:** discovery
> **Selection:** observational — candidate reason families were narrowed after inspecting existing Pathfinder prune/memoization and recurrence evidence. The Stage A population itself (corpus2 positions 1-80) was prespecified before inspection, not selected after seeing results.

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

## Existing zero-extra-traversal observation seam

The current `isConnected()` implementation performs one residual flood fill and then tests its result in a fixed sequence:

1. goal reachable?;
2. each pending MustPass reachable?;
3. each pending MustCross reachable?;
4. on portal-free levels, is `freshVolume + intNeeded >= remainingSteps`?

Each failed test returns `false` immediately. The function currently discards which test failed, but **the subtype is already known at that exact control-flow point**. Recording it does not require another connectivity call, separator search, or boundary reconstruction.

Likewise, several useful context fields already exist before the call/return:

- `intNeeded`;
- remaining counted length;
- pending MP/MC masks;
- `mcOpenMask` / reserved-intersection-wall regime;
- whether axis-exhaustion walls are enabled;
- the specific unreachable objective for MP/MC failures;
- `freshVolume` for volume failures;
- normal solver stage/action/work identity outside the function.

This means the first pilot should not begin by computing a sophisticated cut certificate. It can first answer whether there is enough repeated **failure population structure** to make such work plausible.

Caution: a rejection subtype such as “goal unreachable” is not itself a reusable certificate. It says *what the just-completed flood fill proved*, not *which compact facts would prove it again elsewhere*. Stage A is therefore observational triage, not a candidate production checker.

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

## Two-stage value-of-information pilot

Do not implement a production cache.

### Stage A: rejection-population audit

On connectivity calls that already execute and already reject, record only information available without another graph traversal:

- rejection subtype: goal unreachable / pending MP unreachable / pending MC unreachable / volume shortage;
- rejected objective index/key when applicable;
- remaining length and intersection resources;
- pending MP/MC masks and pending-MustCross count;
- reserved-intersection-wall regime / free intersections after MC reservation;
- MustCross first-pass summary only if already available cheaply at the caller;
- current position and a separate exact-state fingerprint;
- stage/action/parent identity and the work point at which the call occurred.

Stage A answers:

1. Which connectivity failure subtype actually consumes the failure population?
2. How much exact-state recurrence exists within each subtype?
3. Do coarse existing state/resource tuples recur across different exact histories and parents, or is the population already nearly unique before geometry is represented?
4. At what work/depth do these failures occur, and how often are there long gaps before the next scheduled connectivity call where earlier firing could matter?

A positive Stage A does **not** establish a sound learned reason. It only earns the more expensive reason-sketch work.

### Stage B: structural reason sketch

Only for promising Stage-A subtypes, add a bounded conservative sketch of the flood fill that just ran:

- canonical reached-component or boundary fingerprint;
- boundary blocker facts split by static / used-flipper / axis-exhausted / visited-wall categories;
- pending objective masks and MustCross phase only where logically needed;
- volume/capacity slack for shortage failures;
- exact-state fingerprint retained separately so abstract recurrence is not confused with literal state recurrence.

Because the reachable set is already materialized in the flood-fill scratch at the rejection point, Stage B should **read the existing result**, not rerun connectivity. Even so, scanning/canonicalizing up to the grid population and constructing blocker facts has a cost and should be measured separately.

Stage B answers the original four certificate questions:

1. How often does an abstract reason recur across more than one exact state?
2. Do repeats occur across genuinely different histories/branches/parents?
3. How many future flood fills could a sound matching reason avoid?
4. How often could a reason have fired earlier, between scheduled connectivity checks?

Both stages are observational only. They must not alter pruning, beam retention, ordering, PRNG consumption, or work budgets.

## Opportunistic exact-interface population

A future bounded frontier/ZDD or other independently justified exact-interface experiment may produce a second useful population: exact dead interface states.

Do **not** build such an experiment for learned failure. But if those states already exist, preserve enough provenance to ask:

1. do projected dead-interface descriptions recur across different exact histories or parents?
2. can a recurring projection be stated as a sufficient reason rather than merely a correlated signature?
3. does the resulting candidate fire in native states before or more cheaply than the original expensive exact/interface reasoning?

The pipeline is:

`already-paid exact dead interfaces -> projected recurring reason -> live-counterexample search + soundness derivation -> bounded cheap checker`

This can complement connectivity-derived certificates because the failure populations and representations are structurally different. The same stop rules apply: near-unique reasons, expensive matching, or loss of soundness after projection close the direction.

## Success and stop gates

Proceed from Stage A to Stage B only if the failure population is large enough and some subtype/coarse-context recurrence or earliness opportunity survives across unrelated parents. A Stage-A negative is enough to stop without paying for graph fingerprints.

Proceed from Stage B to one bounded reason checker only if all of the following hold across unrelated development parents:

- recurrence materially exceeds exact-state recurrence;
- repeated reasons cover a non-trivial fraction of connectivity cost or expose useful earlier firing;
- matching is substantially cheaper than `isConnected`;
- every projected literal has a conservative soundness argument;
- value is not confined to one selected puzzle family.

Stop if:

- Stage-A contexts are already nearly unique across exact states/parents;
- reason fingerprints become nearly unique once geometry is represented;
- useful recurrence disappears once enough state is retained for soundness;
- fingerprinting or matching itself requires graph analysis comparable to the original flood fill;
- savings are only a tiny number of already-scheduled calls with no earlier firing;
- recurrence is mostly one parent/family or exact-state duplication already known to be weak.

Only after that gate should reason minimization, bounded retention, backjumping, LCG/CDCL-style infrastructure, or global learned stores be discussed.

## Reference-model role

The CP-SAT prefix oracle can act as a counterexample source for proposed projected reasons:

- collect native states satisfying reason R;
- ask whether any supported exact prefix satisfying R is live;
- any live counterexample immediately disqualifies R as a hard dead-state certificate;
- failure to find a counterexample is supporting evidence only, not proof, unless R also has a mathematical soundness derivation.

A future independent exact frontier/interface model can play the same falsification role for its supported scope and can additionally expose exact dead boundary states. Agreement between exact models is useful evidence; disagreement is a correctness/model investigation, never a majority vote.

Timeout/UNKNOWN/unsupported never count as deadness.

The broad reference-model support/validation matrix is now closed. Landmark-specific validation debt should only be bought if the proposed certificate/query actually depends on those landmark semantics; do not reopen generic oracle validation merely because learned-failure work uses exact counterexamples.

## Queue implication

- Generic exact-state DFS memoization remains closed/weak.
- Repair-local experience memory remains useful but non-proof.
- MustPass/MustCross lower-bound caches already occupy part of the “remember repeated future information” space in a specialized, sound form.
- The next learned-failure action is **Stage B of the shadow connectivity reason audit** (a bounded boundary/blocker sketch for the dominant `goal`-subtype coarse cluster) — Stage A ran on 2026-08-28 and was not a negative; see [`2026-08-28-connectivity-rejection-stage-a-audit.md`](2026-08-28-connectivity-rejection-stage-a-audit.md).
- Dead-state reuse from a frontier/DD experiment is opportunistic only and does not change that rank.
- Stage A was positive on this first sample; if Stage B is negative, stop before any production cache.
- Only a positive Stage B earns one conservative monotone reason checker before any generic explanation framework.
