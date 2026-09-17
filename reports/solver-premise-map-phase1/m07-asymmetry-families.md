# M7 — asymmetry families

Snapshot: `solver-premise-map-v1-2026-09-17` (`e9601ffb8fa304d5ea91d054a9de6cb1bf8ff28e`)
Method: preregistered M7 only. Each of the seven frozen asymmetry families was checked for whether its less-developed side is a genuinely different operation, a scope/authority distinction, or merely a renaming of the better-developed side.

## A1 — reject vs recover

Rejecting a state or continuation (P030/P031) answers whether work should be excluded. Recovering after a bad earlier commitment (P080/P082/P100/P101/P147) requires identifying a repair target, restoring a viable decision point or structure, and choosing revised work. These are not inverse labels for one operation.

The underdeveloped side is therefore semantically real. A sound rejection rule does not imply a recovery operator, and knowing that a state is DEAD does not identify a reversible cause.

Alternative interpretation: ordinary backtracking is already a generic recovery operator. P080 weakens that equivalence by distinguishing restart/backtracking from causal selective revision, but the boundary depends on how much retained context the backtracker carries.

Confidence: high. Classification: `DESCRIPTIVE` semantic asymmetry.

## A2 — negative vs positive knowledge

Negative knowledge appears in P081/P147 as conflicts, failure causes, and commitments to avoid. Positive knowledge appears in P155/P162/P164/P189 as derived forced facts or reusable consequences. Their validity conditions differ: a conflict may be conditional on a decision context, while a positive fact may require provenance sufficient to establish semantic soundness across consumers.

This is a genuine distinction, not polarity-flipped naming. The frozen map is richer on negative causal explanation than on explicit positive-fact storage/consumption semantics.

Alternative interpretation: both are simply clauses/facts in one typed knowledge store. Even then, type and provenance remain semantically material, so the asymmetry moves into the store schema rather than disappearing.

Confidence: high. Classification: `SCOPE_SPLIT` around knowledge type and validity.

## A3 — choose-next vs stop-current

Selecting the next action (P061/P063/P065/P142/P185) and deciding when to abandon the current action (P153/P186/P200) are distinct decisions because abandonment depends on sunk work, censoring/exhaustion, artifact value, and information gained so far. A next-action ranker can exist without a calibrated stopping rule.

Alternative interpretation: a controller with an explicit “stop” action can unify them. That is an implementation unification, not evidence that the underlying value questions are identical.

Confidence: high. Classification: `DESCRIPTIVE`.

## A4 — node-local vs invocation-persistent knowledge

Node-local state can be valid only for a path prefix, while invocation-persistent state survives frontier changes or stage transitions (P067/P122/P162/P177/P193/P200). Persistence adds questions of lifetime, provenance, invalidation, transfer radius, and consumer rights.

This is a genuine lifetime distinction. Treating it as mere caching terminology would miss semantic invalidation and observer/work costs.

Alternative interpretation: persistent knowledge may be reconstructed cheaply enough that explicit persistence has no economic value. That would close an implementation/economics claim, not erase the semantic distinction.

Confidence: high. Classification: `SCOPE_SPLIT` by lifetime.

## A5 — solver behavior vs solution-space measurement

Runtime traces and outcome diagnostics (P135/P165/P167/P188) describe what the current policy encountered. Solution-space measurements (P158/P161/P168/P176) attempt to characterize alternatives that may never be visited. Trace censoring means the two populations are not interchangeable.

This is a genuine measurement-population asymmetry. The solution-space side can invalidate an inference drawn from behavior without being a deployable solver feature.

Alternative interpretation: sufficiently exploratory runtime instrumentation could approximate solution-space measurements. The distinction then becomes one of coverage and authority rather than data source.

Confidence: high. Classification: `DESCRIPTIVE` / authority split.

## A6 — ranking vs option preservation

Ranking (P040/P043/P045) orders candidates by estimated immediate or eventual value. Option preservation (P050/P053/P141/P184) values sets of futures and rare completion regimes that may rank poorly individually. The operations can be combined, but they optimize different objects.

This is not a mere request for a better ranker unless the ranking representation explicitly includes marginal contribution to a retained set. The frozen map does not establish that a scalar cannot encode such value, so M7 does not infer a required non-scalar architecture.

Alternative interpretation: set-aware marginal scoring collapses preservation into ranking at each insertion decision. That remains semantically different from candidate-local scoring and would need its own evidence.

Confidence: high. Classification: `SCOPE_SPLIT` by value object.

## A7 — static descriptors vs dynamic causal state

Static descriptors P033/P034 summarize a current state. Dynamic causal state P148/P183/P194/P195 includes how the state arose, failed work, uncertainty, commitments, and revisable decision history. Two puzzle-identical states can therefore call for different actions without differing in puzzle geometry.

The underdeveloped side is semantically distinct because history can affect action value even when it does not affect semantic feasibility. This is especially important for scheduler/controller state, not necessarily for referee truth.

Alternative interpretation: all relevant history can be compiled into an enlarged Markov state, making the distinction representational rather than fundamental. That still validates M7's point: the existing static descriptor space would be incomplete for the decision role.

Confidence: high. Classification: `SCOPE_SPLIT` by decision-state semantics.

## M7 bounded conclusion

All seven preregistered asymmetries survive a semantic-distinctness check, but several can be unified implementation-wise if the unifying representation preserves their different validity, lifetime, population, or value semantics. M7 therefore finds no family that should simply be deleted as a rename. It does not infer that the less-developed side should be prioritized or implemented.
