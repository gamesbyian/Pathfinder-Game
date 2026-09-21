<!-- agent-context-budget: warn=7000 max=9500 -->
# Solver parity-phase, capacity, and response-signature preflight

> **Status:** ACTIVE CHEAP PREMISE TESTS; phase-distance and checkerboard-capacity observers are implemented, and a static response-signature analysis is queued. Production decisions unchanged.
> **Owner:** `docs/solver-optimization-workstreams.md` Lane H.
> **Origin:** [parity invariant audit](../reports/2026-09-19-solver-parity-invariant-audit-001.md).
> **Question:** can exact checkerboard/twist-phase structure prove additional dead states or explain differentiated solver response strongly enough to justify a production consumer?

This preflight turns the parity audit into three bounded premise tests. It does **not** authorize a new prune, scorer, repair term, routing feature, retry, or level classifier.

## 1. Canonical invariant

For an ordinary orthogonal move:
- counted length increases by 1;
- checkerboard parity toggles.

For a portal jump:
- counted length increases by 0;
- checkerboard parity toggles iff the portal terminals have opposite parity.

Call an opposite-parity portal pair a **twist portal**.

At a stable current cell `pos` with `rSteps` counted steps remaining, any exact completion obeys

`parity(pos) XOR parity(goal) XOR (rSteps & 1) XOR futureTwistParity = 0`.

Therefore the required parity of future twist jumps is

`futureTwistParityRequired = parity(pos) XOR parity(goal) XOR (rSteps & 1)`.

The prefix phase is derivable without another mutable state field:

`pastTwistParity = parity(startGate) XOR parity(pos) XOR (realLen & 1)`.

Do not substitute `portalJumps & 1`: same-parity portal jumps increment `portalJumps` without toggling checkerboard phase.

## 2. Premise `WS2-PARITY-PHASE-DISTANCE`: phase-conditioned relaxed goal distance

### Hypothesis

A two-layer relaxed shortest-path representation can identify decision-bearing states that the current scalar goal distance plus ordinary parity checks do not.

Layer state is `(cell, q)`, where `q` is the parity of twist jumps still used on the suffix.

Relaxed edges:
- ordinary cardinal move: cost 1, layer unchanged;
- same-parity portal jump: cost 0, layer unchanged;
- twist portal jump: cost 0, layer toggled.

Let `D[q][cell]` be minimum counted cost to reach the goal with future twist parity `q`.

For a current state:
1. derive `qRequired` from the invariant above;
2. read `D[qRequired][pos]`;
3. shadow-label the state **phase-distance-dead** when the distance is infinite or exceeds `rSteps`.

This is a relaxation. It may ignore dynamic visited/edge walls, consumed portal terminals, filter state, intersections and landmark obligations. Those omissions can only make the relaxed route set larger / cheaper. A production hard reject is sound only if it rejects when even this over-permissive graph cannot complete in the required phase and counted length.

### First falsifier

Instrument or probe **without changing decisions**.

Required output, by opportunity population:
- evaluated states/candidates;
- incremental phase-distance deaths not already rejected by current scalar distance/parity before the same decision;
- depth / remaining-length distribution;
- portal pair count and twist-pair count;
- whether the death occurred at a candidate-ranking seam, hard-prune seam, or only after another existing reject would already fire;
- work/overhead of obtaining the label.

Prefer one shared helper/map producer if it can serve multiple observational consumers. Do not separately implement a scorer-only and prune-only derivation.

### Stop / advance

**Stop the phase-distance premise** if incremental decision-bearing incidence is negligible at the cheapest representative pilot or construction/runtime overhead is plainly disproportionate.

**Advance the phase-distance premise** only if there is non-trivial incremental opportunity. Then:
1. build minimal synthetic witnesses;
2. replay stored valid solution prefixes / known referee-valid paths and require zero false rejects;
3. run differential/reference checking as appropriate;
4. only then nominate the smallest consumer.

Consumer preference:
1. admissible-order ranking if the fact changes ordering often but hard-prune economics are weak;
2. hard prune if sound incremental deadness is frequent enough to repay cost;
3. portal guidance only after the exact phase representation exists and matched-work evidence is needed;
4. routing/attempt selection only after current-input phase features predict differentiated response.

The 2026-08-08 existence-only portal envelope remains closed. `WS2-PARITY-PHASE-DISTANCE` is a materially different conditioned-distance predicate, not a rerun of “some twist remains / all twists consumed.”

## 3. Premise `WS2-CHECKERBOARD-CAPACITY`: checkerboard-split connectivity capacity

### Hypothesis

On future-no-twist states, total reachable volume can be sufficient while one checkerboard color has insufficient arrival capacity for the exact remaining counted length.

For current color `p` and `rSteps`:
- if `rSteps = 2k`, the suffix needs `k` counted arrivals of each color;
- if `rSteps = 2k+1`, it needs `k+1` arrivals of `p XOR 1` and `k` of `p`.

The existing connectivity fill already computes the reachable relaxation. Shadow-count reachable fresh cells by color as `fresh[0]`, `fresh[1]`.

Use the deliberately generous per-color capacity

`capacity[c] = fresh[c] + intNeeded`.

Giving the *entire* remaining intersection budget to each color independently over-approximates what a real suffix can do. Therefore `capacity[c] < requiredArrivals[c]` is safe as a relaxed impossibility test.

Initial scope:
- portal-free levels;
- portal levels with zero twist pairs.

Twist-bearing levels require an explicit phase-layer extension before using a fixed color schedule.

### First falsifier

Add a research-only shadow count to the existing connectivity reached-set consumer, avoiding a second flood fill.

Report:
- connectivity evaluations;
- current total-volume rejects;
- incremental color-capacity rejects where total volume passes;
- remaining steps, `intNeeded`, reached fresh counts by color;
- search depth / routing regime / coverage ratio;
- incremental work overhead.

### Stop / advance

**Stop the checkerboard-capacity premise** if incremental rejects are negligible or concentrated only where another same-cost reject fires immediately.

**Advance the checkerboard-capacity premise** on non-trivial incremental opportunity, then require:
1. synthetic witnesses where total volume passes but one color is provably short;
2. stored-solution/referee-valid prefix replay with zero false rejects;
3. differential checking of the reached-set color counts;
4. matched-work production A/B before default-on promotion.

## 4. Premise `WS2-PARITY-RESPONSE-SIGNATURE`: parity as a capability-response axis

Reuse existing evidence before new compute: test a compact current-input parity feature basis against technique-census pairwise discordance, then use saved hint/provenance only for within-success path mechanism evidence. Do not predeclare level classes; derive categories only if stable response regions emerge. Any routing descendant requires independent shared-budget transfer.

Full feature basis, evidence semantics and stop/advance rules: [parity response-signature preflight](solver-parity-response-signature-preflight.md).

## 5. Secondary observational seams

These do not outrank the phase-distance and checkerboard-capacity premises and should reuse their representation rather than creating parallel parity machinery.

### Admissible-order propagation

Measure how often a candidate later rejected solely/earliest by parity is ranked ahead of a live sibling by `rankByAdmissibleSlack`.

If common, make the admissible bound consume a shared parity/phase feasibility helper. This is ordering economics, not a correctness repair.

### Repair residual explanation

Extend repair diagnostic/signature output, not scoring, with:
- current required future twist parity;
- phase-conditioned relaxed reachability/distance once H1 exists;
- no-twist checkerboard-capacity status once H2 exists.

Ask whether best/plateau near-misses concentrate in phase/capacity-incompatible states. Only a positive observer result can nominate a repair scoring/operator change.

### Exact all-gates infeasibility

On no-twist levels, zero parity-feasible gates proves whole-level exact-length infeasibility. Current `getActiveGates` falls back to all gates.

Before changing behavior:
- verify empty-active-gate semantics across production/static/legacy schedulers and telemetry;
- measure actual wasted work after first-step prune;
- prefer one explicit solve-level infeasibility result to an accidental empty-loop behavior.

Likely low solve-value; treat as correctness/representation cleanup unless measurement shows otherwise.

### Complete/random hint enumeration

Sound ordinary parity rejection can reduce complete enumeration on no-twist levels without changing completeness. Keep this outside the production solve priority unless hint-enumeration cost makes it independently worthwhile.

## 6. Derivations that are not premises

Do not create experiments from these without a new constraint:

- parity-rounding each must-pass/MST segment: waypoint parities telescope to the endpoint invariant;
- turn-count parity;
- standalone intersection-count parity;
- flipping-filter used-count parity as checkerboard parity;
- `portalJumps & 1` as twist phase;
- “twist portal exists” as proof that both suffix phases remain reachable from the current state.

## 7. Evidence and promotion discipline

Any hard consumer follows [solver correctness hardening](solver-correctness-hardening.md):
- approximation direction stated explicitly;
- smallest counterexamples;
- stored valid-path replay;
- referee/reference differential where available;
- no production promotion from observer incidence alone.

Any soft consumer follows the ordinary matched-work research rules:
- same work envelope;
- participation measured;
- gains/losses enumerated;
- current-input-only features;
- no per-level historical outcome leakage.

## 8. Queue boundary

Lane H is a cheap premise-acquisition lane and may run in parallel with the current Workstream-2 failure-response gate. It does not replace or reorder that gate.

`WS2-PARITY-PHASE-DISTANCE`, `WS2-CHECKERBOARD-CAPACITY`, and `WS2-PARITY-RESPONSE-SIGNATURE` are active premise tests. The remaining seams are downstream or secondary measurements. Contingent architectures/treatments belong in `solver-future-work.md`, not here or in the audit report as a second queue.


## 9. Implemented observational seam

The phase-distance and checkerboard-capacity observers are production-inert and share the real production solve path. `solver:parity-invariant-shadow` runs both under a strict whole-solve work envelope and emits the canonical research-resolution envelope. Synthetic witnesses cover incremental phase-distance and color-capacity cases; no production prune, ordering, scoring, routing or repair change is authorized.

The response-signature premise is analysis-first and has no new runtime instrumentation yet. See [its preflight](solver-parity-response-signature-preflight.md).
