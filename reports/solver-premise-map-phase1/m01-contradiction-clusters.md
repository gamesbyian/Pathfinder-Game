# M1 — contradiction clusters

Snapshot: `solver-premise-map-v1-2026-09-17` (`e9601ffb8fa304d5ea91d054a9de6cb1bf8ff28e`)
Method: preregistered M1 only. Inputs were the hardening overlay's six explicit tension candidates plus their frozen graph neighborhoods and premise records.

## Findings

### M1.1 — maturity-conditioned negative-result tension

Frozen objects: C001, P003, P198, with P151 also connected to P003 through `EVIDENCE_DEPENDS_ON` in relations v2.

P003 rejects the premise that zero unique-solve delta is sufficient to make a capability useless. P198 separates phenomenon, representation, soundness/fidelity, participation, useful-work effect, complementary matched-cost value, schedulability, and production promotion. These propositions are compatible only after the maturity gate is made explicit.

The useful conditioner is therefore not merely “more evidence.” It is *which claim is being made at which maturity gate*. A direct treatment can fail the production-value gate while retaining decision-bearing evidence at an earlier gate. P151 adds a logically prior participation condition: a null treatment result is not even a valid maturity observation if delivery to the final consumer was not established.

Alternative interpretation: this could be represented as ordinary evidence hygiene rather than a contradiction cluster. That reading is plausible, but it loses the specific reason nulls are over-interpreted: one observable is being asked to answer several different maturity questions.

Confidence: high. Classification: `SCOPE_SPLIT` (maturity-conditioned scope), not a new premise admission.

### M1.2 — historical portability versus endogenous residual

Frozen objects: C002, P005, P181; related P182, P187, P158, P167, P188.

P005 already weakens portability of historical negatives. P181 makes a stronger population statement: the unsolved residual is created by previous capabilities, budgets, and portfolio order. The hidden conditioning vector therefore has at least two changing components: architecture/work semantics and survivor-population formation.

A negative can remain historically correct yet cease to answer the current decision question because either the mechanism changed or the cases on which it mattered were preferentially removed. P182 sharpens the same issue within one portfolio by making later-action evidence predecessor-conditioned.

Alternative interpretation: residual drift might be negligible for a particular result. M1 does not infer staleness from age or from P181 alone; it identifies the variables that must be checked before portability is claimed.

Confidence: high. Classification: `SCOPE_SPLIT` / potential `STALE_AUTHORITY` depending on the historical conclusion being inspected.

### M1.3 — absolute state equivalence versus policy-relative equivalence

Frozen objects: C003, P011, P179; related P052, P156, P180, P148, P194.

P011 asks whether residual-state equality proxies future behavioral equivalence. P179 states that equivalence may depend on remaining policy and work envelope. The apparent contradiction disappears if equivalence is parameterized by continuation rights: two puzzle states can be indistinguishable under one available policy but distinguishable under a richer or differently budgeted policy.

P180 indicates the same conditioner may enter dominance, because work, continuation rights, and acquired knowledge can make a puzzle-resource superset strategically inferior.

Alternative interpretation: “equivalence” could be reserved by definition for policy-independent semantic equivalence, leaving P179 as a different relation. That would avoid the contradiction terminologically but would not remove the practical question about which relation duplicate detection or retention actually needs.

Confidence: high. Classification: `SCOPE_SPLIT` and `RELATION_ONLY` candidate around policy-relative state relations.

### M1.4 — immediate ranking value versus option value

Frozen objects: C004, P040, P184; related P043, P053, P013, P141.

P040 establishes the finite-work value of ordering. P184 says a low-scoring branch can be valuable because it preserves a rare completion regime. This is a strategy tension, not a hard contradiction. The missing variable is the decision objective at the retention boundary: estimated immediate completion value versus the value of preserving future choices.

The graph neighborhood matters because P043 questions scalar commensurability, P013 supplies a possible explicit regime object, P053 asks about regime-aware retention, and P141 generalizes from individual prefixes to sets of futures. Thus C004 is not simply “explore more”; it marks a mismatch between two kinds of value assigned to frontier members.

Alternative interpretation: a sufficiently expressive scalar ranker could encode option value. The frozen map does not falsify that possibility. It does, however, make explicit that ordinary ranking evidence cannot be assumed to have measured option value.

Confidence: high for the tension; medium for any claim that a non-scalar representation is required. Classification: `DESCRIPTIVE` plus possible `SCOPE_SPLIT` in value semantics.

### M1.5 — participation proof versus observer effect

Frozen objects: C005, P151, P188; related P167, P198.

P151 requires proving that the intended treatment reached its final consumer. P188 warns that instrumentation can censor or perturb what is observed. The cluster exposes a measurement fixed point: proving participation requires observation, but the observation channel may alter dose, encounter distribution, or work.

The missing conditioner is the observational regime: what telemetry was enabled, what work it consumed, which states it could observe, and whether the treatment's participation statement is invariant to that instrumentation.

Alternative interpretation: in many concrete experiments telemetry cost is demonstrably negligible. Then the tension collapses locally. M1 therefore treats this as an audit condition, not a presumption that all instrumentation is materially invasive.

Confidence: medium-high. Classification: `DESCRIPTIVE` / `SCOPE_SPLIT` by instrumentation regime.

### M1.6 — adaptive abandonment versus information/artifact half-life

Frozen objects: C006, P186, P200; related P153, P177, P178, P193, P194.

P186 asks when an active search line should be abandoned. P200 asks how long expensive information or search artifacts remain useful. These are compatible if “stop spending new work on this action” is separated from “discard everything the action produced.” The hidden variable is artifact-specific continuation value after action-level abandonment.

This distinction is concrete for frontiers (P178), cross-stage contracts (P193), and work-history state (P194). An action can have negative marginal continuation value while its frontier, proof, failed-experience evidence, or causal trace retains positive transfer value.

Alternative interpretation: carrying artifacts may cost enough that action and artifact abandonment should coincide. That is an economics question, not a logical consequence of stopping the action.

Confidence: high. Classification: `SCOPE_SPLIT` between action continuation and artifact persistence.

## Hard contradictions

No preregistered cluster supplied evidence of a hard contradiction at the frozen scope. All six are conditional or strategy tensions once missing variables are exposed. That is itself a bounded M1 result: the explicit tension inventory is dominated by omitted conditioning variables rather than incompatible factual claims.

## M1 boundary note

M1 generated no new premise IDs and did not expand the six clusters recursively. Candidate conditioners found here remain outputs for later review; they are not fed into M2–M12.
