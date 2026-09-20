# Solver parity invariant audit

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — H1/H2 production-inert shadow observers and the combined fixed-work corpus probe are implemented; production decisions remain unchanged.
> **Decision:** ordinary parity handling is sound in its current domains, while phase-conditioned distance and checkerboard-split connectivity capacity merit bounded premise measurement before any production treatment.
> **Remaining gate:** run the combined H1/H2 observer on a representative fixed-work population, interpret opportunity through the canonical resolution machinery, then advance only premises that earn replay/differential/economic gates.
> **Started:** 2026-09-19
> **Branch:** `chatgpt/solver-parity-invariant-audit-2026-09-19`
> **Scope:** solver correctness, feasibility, search ordering, state identity, scheduling, repair, portal semantics, and research surfaces where checkerboard/grid parity or equivalent bipartite-walk invariants can affect decisions.
> **Production behavior:** unchanged by this audit branch.
> **Live owner:** [solver optimization workstreams](../docs/solver-optimization-workstreams.md), Lane H.
> **Execution preflight:** [parity phase + checkerboard capacity](../docs/solver-parity-phase-capacity-preflight.md).
> **Deferred descendants:** [solver future work](../docs/solver-future-work.md).
> **Hard-consumer safety contract:** [solver correctness hardening](../docs/solver-correctness-hardening.md).

## Question

Audit the solver from first principles rather than by vocabulary:

> Which facts implied by the grid's bipartite structure, exact counted path length, portal phase changes, and remaining path resources are already represented correctly; which are represented only at one layer; which are missing from decision-making; and which apparent parity rules would be unsafe or redundant?

The audit is deliberately two-sided. It looks for both missed deductions and parity assumptions that become invalid in the presence of zero-length portal jumps or dynamic mechanics.

## Core model

For an ordinary orthogonal move, checkerboard color flips and counted length increases by one. For a portal jump, counted length increases by zero while checkerboard color changes by

`keyParity(source) XOR keyParity(destination)`.

Call an opposite-color portal pair a **twist portal**. Every twist jump toggles the ordinary endpoint-parity phase; a same-color portal jump does not. At any stable non-portal state, exact completion to the goal therefore obeys:

`parity(pos) XOR parity(goal) XOR (remainingCountedSteps mod 2) XOR (futureTwistJumps mod 2) = 0`.

Portal-free and same-color-portal-only levels collapse to the ordinary bipartite invariant because the final term is necessarily zero.

This identity is the reference point for the rest of the audit. It is stronger and less ambiguous than searching source for the word “parity”.

## Existing coverage found so far

### Correctness / hard pruning

`hard-prune-pipeline.ts` already has a production-default `PRUNE_PARITY` check. It applies:
- on portal-free levels;
- on portal levels with no twist pairs, where zero-length portal jumps preserve parity;
- on the first counted step always, and deeper only under the existing corridor-rich gate (`blockSet.size >= 10`).

The retained default-off `PRUNE_PORTAL_PARITY_ENVELOPE` handles twist-portal levels conservatively: at stable non-portal positions, a naive parity mismatch becomes fatal only after every twist pair has been consumed. The 2026-08-08 experiment found this existence-only envelope sound but operationally negligible and closed that exact experiment shape.

The default hard-prune stack was replayed over 207,900 referee-valid stored paths / 20,127,497 steps on 2026-09-11 with zero violations. Any stronger hard parity deduction must preserve that soundness discipline.

### Gate selection

`getActiveGates` in `orchestration-contracts.ts` already extends parity gate filtering to portal levels with zero twist pairs when a prepared level is available. This is newer than the terse ablation description (“portal-free levels”) and means the obvious gate-scheduling propagation gap is already closed on the production solve path.

### Portal guidance

`prep.ts` precomputes distance maps to twist portal pairs. `scoring.ts` uses them when gate/goal/required-length parity requires an odd number of twist crossings.

This is guidance only, not a correctness authority.

### False-goal endpoint reasoning

`false-goal-trigger-search.ts` rules endpoint cells out by parity when no twist portal exists. If any twist portal exists it conservatively treats both endpoint parities as possible.

### State identity

Beam coarse-state identity now carries a bitset of consumed portal pairs. Repair's fine-grained state signature includes path length, portal jump count, visited/edge state, and `lastWasPortalJump`. The audit has not found a parity-relevant state distinction being silently erased at these two caches.

## Concrete propagation seams under investigation

### 1. Admissible-order ranking does not mirror parity feasibility

`admissible-order-search.ts::admissibleRemainingBound` says it mirrors the hard-prune bounds used by `evaluatePrunedMove`, but currently includes distance/objective lower bounds and omits parity.

Consequently a child that the shared hard-prune pipeline can prove parity-dead immediately may still receive finite admissible slack and rank ahead of a live child. The hard prune later rejects it, so this is not a correctness bug, but it is a real mismatch between the documented ordering contract and the solver's available exact knowledge.

Questions:
- quantify how often parity-dead siblings are ranked ahead of live siblings;
- decide whether the shared parity predicate should become a reusable helper consumed by both pruning and admissible ordering;
- preserve the existing deep-check gate unless evidence justifies changing policy separately.

### 2. Portal-parity guidance models “first twist used”, not current phase

The scoring term computes whether the start-to-goal problem requires odd twist parity, then disables itself permanently once *any* twist terminal has been visited.

That is a coarse proxy for the actual invariant:
- entering a twist portal terminal marks it visited before the forced zero-length jump occurs, so guidance can switch off one transition early;
- after one completed twist crossing the parity deficit is repaired;
- after a second completed twist crossing the phase toggles back, but the current scorer never asks for another compensating odd crossing;
- the beam implementation already has pair-consumption machinery, showing the repo can represent more precise portal history when it matters.

This is guidance-only, so the safe first move is measurement, not promotion of a more aggressive rule.

### 3. Exact-length repair has no explicit parity residual

Repair badness prominently models exact length, exact intersections, and structural deficits, and repair itself shares the hard-prune pipeline. But its optimization landscape does not appear to distinguish a residual that is parity-compatible from one that requires a twist-phase change.

This may matter precisely in the documented plateau where all structural obligations are satisfied and repair is trying to hit exact integer length/intersection targets. The right question is not “add a parity penalty” blindly; it is whether parity compatibility predicts which near-finish states can be usefully repaired under the remaining operators.

### 4. Lower bounds encode distance magnitude, not parity/capacity structure

The ordinary endpoint parity test already captures the total path-length congruence on a bipartite graph. Simply rounding every BFS/MST lower bound to the desired parity would be suspect or redundant because intermediate waypoint parities telescope to the endpoint parity.

A genuinely stronger parity bound would need additional resource information, not just distance parity. Candidate families include checkerboard-color visit capacity and reachability-constrained future twist phase. These require derivation before code.

## Important non-findings / traps

- Turns do not change checkerboard parity behavior: every ordinary orthogonal move flips color whether it turns or continues straight.
- Intersection count has no obvious standalone checkerboard parity congruence; do not invent one from the fact that revisits occur.
- Flipping-filter “even/odd” orientation state is a different parity concept. It can interact with reachability, but it is not checkerboard parity by itself.
- A portal-aware distance of `d` does not imply endpoint checkerboard difference `d mod 2`, because twist portal edges have zero counted cost and may flip color.
- The August existence-only portal envelope is a closed negative. Re-running “all twist portals consumed” without a materially tighter premise would ignore existing evidence.

## Next audit passes

1. Trace parity-relevant behavior through every search family (DFS, beam, admissible-order, repair, false-goal search, variety search) and every cache/merge boundary.
2. Derive checkerboard color-capacity bounds from actual visit/edge rules and determine whether any sound nontrivial bound exists.
3. Audit portal phase at the action level: entry, forced jump, exit, consumption, revisit prohibition, and multi-twist sequences.
4. Inspect policy/features/budgeting for places where a static parity signature could change attempt selection without leaking level identity.
5. Build small synthetic witnesses for confirmed gaps before touching production behavior.
6. Prefer observer/probe evidence for guidance/order changes; require stored-solution/referee/differential evidence for any hard prune.


## First-principles deductions

### A. Phase-conditioned portal distance is stronger than the closed existence envelope

The August envelope asks only whether a parity-repairing twist portal remains somewhere. That loses two kinds of information: whether a route to the goal exists with the **required parity of future twist crossings**, and whether such a route fits inside the remaining counted length.

A better static relaxation is a two-layer 0-1 shortest-path graph:

- state: `(cell, q)`, where `q ∈ {0,1}` is future twist-jump parity;
- ordinary cardinal edge: cost 1, `q` unchanged;
- same-parity portal jump: cost 0, `q` unchanged;
- twist portal jump: cost 0, `q` toggled.

Let `D_q(pos)` be the relaxed minimum counted distance from `pos` to the goal using twist parity `q`. From a stable state with `rSteps` remaining, the required future twist parity is

`qRequired = parity(pos) XOR parity(goal) XOR (rSteps mod 2)`.

Then either of these is a sound rejection in the relaxed graph:

- `D_qRequired(pos) = Infinity`;
- `D_qRequired(pos) > rSteps`.

Why this remains admissible:
- the graph may ignore dynamic walls, consumed portals, edge-axis history, forced-turn details, and exact intersection obligations, so it can only invent extra routes or make routes cheaper;
- rejecting only when even that relaxation cannot supply the required phase/length therefore cannot remove a real completion;
- portal forcing needs care in the implementation, but using an over-permissive ordinary+portal-edge relaxation is still safe for a lower bound.

This is a **materially tighter parity argument** than “all twist pairs consumed”, so it satisfies the 2026-08-08 report's reopen condition rather than repeating the closed experiment.

Potential consumers:
1. hard prune as a new conditioned distance bound;
2. `admissibleRemainingBound`, where it can improve ordering even before promotion as a prune;
3. portal guidance, replacing “head toward the first twist” with a state-relative phase deficit;
4. false-goal endpoint search, if a conditioned endpoint formulation proves useful.

### B. Checkerboard-split connectivity volume

On any state where future twist parity is fixed to zero (portal-free or only same-parity portals), the colors of the next `rSteps` counted arrivals are fixed.

If current color is `p`:

- when `rSteps = 2k`, future counted arrivals require `k` of color 0 and `k` of color 1;
- when `rSteps = 2k+1`, they require `k+1` arrivals of color `p XOR 1` and `k` of color `p`.

The current connectivity-volume prune is color-blind:

`freshVolume + intNeeded >= rSteps`.

A sound color-aware relaxation can count reachable fresh cells separately as `fresh[0]` / `fresh[1]` and give the full remaining intersection budget to *each* color independently:

`capacity[c] = fresh[c] + intNeeded`.

Giving every future intersection to either color simultaneously is deliberately over-generous. Therefore

`capacity[c] < requiredArrivals[c]`

for either color proves failure.

This can detect a component with enough total volume but the wrong color composition. It should be especially relevant to corridor-rich / near-Hamiltonian states, exactly where the existing parity check is already considered worth paying for.

Portal details:
- a same-parity zero-cost jump can make an extra fresh cell reachable without consuming counted length; counting that cell in `fresh[c]` only inflates capacity and is safe;
- twist portals invalidate the fixed color schedule unless future twist phase is itself represented, so the first implementation should abstain on them or move to a layered phase/color formulation.

The bit-parallel connectivity implementation already computes a reached set. A shadow measurement can therefore add color counts without changing search decisions, and later implementation need not require another flood fill.

### C. Dynamic phase can be derived; it does not require another mutable state field

For the path prefix from its actual gate to current `pos`:

`pastTwistParity = parity(start) XOR parity(pos) XOR (realLen mod 2)`.

That follows directly from the same invariant: ordinary counted moves toggle cell color and twist jumps add the only zero-cost color toggles.

This is useful because:
- `state.portalJumps & 1` is **not** the same quantity: same-parity portal jumps also increment `portalJumps`;
- no new undo-sensitive search-state field is needed merely to know current checkerboard phase;
- soft guidance can stop using “has any twist terminal ever been visited?” as a proxy.

At a transient portal source immediately before its forced jump, callers still need the same care the August census discovered: the cell has been visited but the jump has not yet occurred. The algebra above remains about actual applied transitions, so using `realLen` + position is preferable to visited-terminal inference.

### D. Objective-distance parity alone is mostly a red herring

For a portal-free bipartite walk, the parity of segment lengths through a sequence of mandatory waypoint cells telescopes to the parity between the current cell and final goal. Therefore simply “parity-rounding” each must-pass/must-cross/MST lower bound is not automatically new information, and doing so independently can double-count incompatible slack.

A worthwhile obligation-level parity deduction needs an additional resource restriction, such as:
- which twist phases are available between objective regions;
- color-specific visit capacity;
- forced interfaces that constrain the parity layer a route must occupy.

This is an explicit guard against turning a true invariant into cargo-cult arithmetic.

## Search-family propagation matrix

| Surface | Existing parity knowledge | Audit result |
|---|---|---|
| DFS | shared hard prune + scoring | endpoint parity represented; stronger phase/capacity deductions absent |
| Beam | shared hard prune + scoring; consumed portal-pair identity retained where portal merge research applies | no state-identity parity loss found |
| Repair | shared hard prune + scoring; exact cache records path length/portal history | correctness covered; badness/residual landscape is parity-blind |
| Admissible-order DFS | hard prune after move; ordering bound omits parity | confirmed knowledge-propagation gap in ordering |
| Hint/variety admissible-slack mode | reuses `rankByAdmissibleSlack` and shared hard prune | inherits the same ordering gap |
| Production/static/legacy orchestration | `getActiveGates(..., prep)` | same-parity-portal gate filtering already propagated |
| False-goal classification | static endpoint parity; any twist portal => conservative “both” | sound but coarse on twist levels |
| Connectivity | total volume + reachability | prime location for color-split capacity and dynamic phase reachability |
| Lower-bound prep | portal-aware scalar 0-1 distances | loses route's required future twist parity by collapsing layers |
| Solution/referee acceptance | exact path already materialized | no separate parity check needed |

## Priority emerging from the audit

Current ordering by conceptual leverage, not yet by measured solve gain:

1. **Phase-conditioned 0-1 distance maps** — strongest clean new invariant; can serve pruning, ordering and guidance from one representation.
2. **Checkerboard-split connectivity capacity** — cheap, orthogonal to scalar volume, plausible dense/corridor leverage.
3. **Admissible-order parity propagation** — small but concrete mismatch; likely cheap to close once a shared parity-feasibility helper exists.
4. **Dynamic portal guidance** — obvious semantic improvement, but scoring changes are empirical and can reshuffle winners.
5. **Repair parity residual** — plausible plateau signal; should be observer-first because repair is sensitive to score/badness changes.
6. **Twist-aware false-goal tightening** — valid but peripheral to new solver solves.



## Negative-space pass: inference seams outside the main gauntlet

### Gate filter's all-infeasible fallback

`getActiveGates` currently returns the original gate set when parity filtering finds zero feasible gates:

`return feasible.length > 0 ? feasible : gateKeys`.

On a portal-free / no-twist level, “zero parity-feasible gates” is itself a proof that the level has no exact-length solution from any gate. The fallback therefore preserves a set of attempts that are all known dead.

This is probably low-cost today because `PRUNE_PARITY` kills their first counted moves, but it is still an example of exact knowledge being discarded at a layer boundary. Before changing it, verify callers' behavior for an empty active-gate set and decide whether the right contract is:
- `getActiveGates -> []` plus a clean no-feasible-gate solve result, or
- a separate solve-level unsatisfiable precheck that preserves `getActiveGates`'s historical non-empty contract.

Do not conflate the small likely runtime gain with the conceptual value: an impossible whole level should ideally be represented as such rather than converted back into speculative search.

### Complete/random hint enumeration deliberately bypasses most hard pruning

`hint-enumeration.ts` uses the full shared hard-prune gauntlet only in `orderBy: 'admissible-slack'` mode. Its default random/complete mode keeps only simple exact-length/intersection ceilings plus scalar goal distance.

That choice protects enumeration semantics from heuristic coupling, but sound parity is not heuristic. On portal-free/no-twist levels a cheap remaining-parity rejection could reduce the complete tree without changing completeness or which hints exist.

This is not a production-solve opportunity, so it ranks below the main-search items, but it is another concrete place where the invariant currently stops at an API boundary.

### Routing and attempt policy do not expose parity-phase features

The routing/attempt policy uses broad level features (length, intersections, portals, coverage and mechanics). It does not appear to expose:
- whether the chosen gate requires odd future twist phase;
- number / placement / conditioned distance of twist portals;
- whether the static relaxed route has only one feasible twist-parity class.

That absence is not automatically a defect. The scorer already has portal-parity guidance, and adding a policy selector without response evidence would be hand-tuning. The audit result is therefore **measurement opportunity, not recommendation**: if phase-conditioned distances predict sharply different participation or winners among existing portal profiles, they become a legal current-input selector candidate.

### Repair diagnostics already have the right seam for a parity residual

Repair's frozen-signature diagnostics record signed length and intersection residuals plus structural masks. They currently omit a checkerboard/twist-phase residual.

That makes observer-first work especially cheap: add a diagnostic-only field derived from

`requiredFutureTwistParity = parity(pos) XOR parity(goal) XOR (remainingLength mod 2)`

plus whether a phase-compatible relaxed route remains. If frozen near-miss plateaus concentrate disproportionately in phase-incompatible states, then parity deserves repair-specific treatment; if not, close the idea without perturbing repair scoring.

## Audit disposition by type

### Existing logic confirmed sound / appropriately scoped

- exact endpoint parity on portal-free levels;
- extension to same-parity-only portal levels;
- conservative deferral on twist portal levels;
- transient portal-cell caution in the old envelope;
- gate filtering on production/static/legacy solver entry points when `prep` is available;
- portal-pair identity retention in portal beam state work;
- repair exact-state signature contains enough information to distinguish counted length / portal history;
- exact solution acceptance needs no redundant parity check.

### Concrete propagation gaps

1. admissible-slack ranking omits parity deaths the subsequent gauntlet knows;
2. portal guidance uses “any twist terminal touched” rather than current required phase;
3. repair residual/badness surfaces do not expose parity phase;
4. random/complete hint enumeration omits a cheap sound parity rejection;
5. all-gates-parity-impossible is converted back to all gates rather than represented as whole-level impossibility.

### New invariant machinery worth testing

1. phase-conditioned two-layer 0-1 goal distance;
2. checkerboard-split reachable-volume capacity;
3. dynamic `(cell, twist phase)` connectivity as a stronger later descendant if static conditioned distance shows opportunity;
4. phase-aware portal guidance based on current algebraic phase rather than visited-terminal proxy.

### Ideas explicitly rejected or deferred by derivation

- naive parity rounding of every objective/MST lower bound;
- standalone turn parity;
- standalone intersection-count parity;
- treating flipping-filter used-count parity as checkerboard parity;
- repeating the already-closed “some twist portal remains / all consumed” envelope experiment unchanged;
- policy routing changes before a current-input phase feature predicts differentiated response.

## Recommended empirical order

1. **Shadow the two-layer conditioned distance** on existing search states. Count how often it proves a branch dead that scalar goal distance + current parity/envelope do not, split by solved/unsolved and portal family. This is the cheapest falsifier of the strongest new idea.
2. **Shadow color-split connectivity volume** inside the existing reached-set pass, with no pruning. Count incremental proofs over total volume and where in the search tree they occur.
3. If either has non-trivial opportunity, construct synthetic soundness witnesses and run known-solution prefix replay before any default-on prune A/B.
4. In parallel, instrument admissible ordering for “parity-dead candidate ranked before a live candidate” frequency. This is a narrower economics question, not a correctness question.
5. Add the repair phase residual only to existing debug/signature output and ask whether it explains plateaus before touching `computeBadness` or scoring.
6. Only after conditioned-distance opportunity exists, replace the portal scorer's first-twist proxy with current-phase guidance and compare at matched work.

This order tries to make one new representation — phase-conditioned distance — answer several audit questions before proliferating mechanisms.


## Routing closeout

This report is an audit/evidence artifact, not a live queue.

Surviving obligations have been routed as follows:

- **H1 phase-conditioned relaxed goal distance** and **H2 checkerboard-split connectivity capacity** are active cheap premise tests in `docs/solver-optimization-workstreams.md` Lane H, with their protocol in `docs/solver-parity-phase-capacity-preflight.md`.
- **Admissible-order propagation, repair residual observation, all-gates infeasibility and complete/random hint enumeration** are secondary/downstream seams in the same preflight. They do not outrank H1/H2.
- **Phase-aware portal scoring, dynamic phase connectivity, a color-capacity hard prune, parity-aware repair treatment, parity-derived routing, all-gates fast exit and hint-enumeration production changes** are contingent descendants in `docs/solver-future-work.md` with explicit reopen conditions.
- The parity-specific proof obligations and common category errors are now part of `docs/solver-correctness-hardening.md`.
- The stale ablation descriptions for ordinary parity prune/gate filtering were corrected to reflect current same-parity-portal coverage.

No production solver decision was changed by this audit. The next justified implementation is observational instrumentation for H1/H2, not a default-on prune or scoring change.
