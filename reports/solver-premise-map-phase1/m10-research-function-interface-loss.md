# M10 — research-function interface loss

Snapshot: `solver-premise-map-v1-2026-09-17` (`e9601ffb8fa304d5ea91d054a9de6cb1bf8ff28e`)
Method: preregistered M10 only. The frozen map was traversed through the research-function sequence `encode -> derive -> generate -> reject -> prefer -> retain -> remember -> allocate -> select -> transfer -> recognize -> measure -> infer-from-evidence`. At each boundary, M10 asks whether an output that is meaningful on the left is represented as a usable, provenance-bearing input on the right. Missing interface structure is not treated as proof that runtime information is actually lost.

## encode -> derive

Relevant premises: P010/P014/P157 for representations and relational structure; P093/P155/P163/P164 for derived constraints/facts.

The map has many local derivations, but the interface does not have a general contract for *what representation features license which derived facts*, with what soundness authority and invalidation conditions. P155 and P164 especially make derivation dynamic/cross-mechanic, while P189 later requires provenance for reusable facts.

Possible loss: a useful representation can exist without being exposed in the form needed by a derivation, or a derived relation can silently inherit stronger authority than its source warrants.

Alternative interpretation: this is properly mechanism-specific. A universal encode→derive interface could erase important semantic differences between proof rules, heuristics, and observers.

Classification: `RELATION_ONLY` / authority typing. Confidence: medium-high.

## derive -> generate

Relevant premises: P155/P164 derived relations; P020/P114/P190/P191 candidate-generation coverage.

Derived feasibility or forced-fact information can potentially change the successor source itself, yet the frozen graph more often routes derived facts into checks or local reasoning than into an explicit generator contract. D005/P195 make the revisability of the action grammar newly explicit.

Possible loss: derivation improves knowledge while generation continues to enumerate the same action family, so the information changes evaluation but not what can be proposed.

Alternative interpretation: the successor generator may already consume state containing the derived consequences implicitly. A missing typed edge can therefore be documentation debt rather than capability loss.

Classification: `RELATION_ONLY`. Confidence: medium.

## generate -> reject

Relevant premises: P020/P024/P114/P190/P191 generation; P030/P031/P156/P180 rejection/dominance.

Generation has provenance dimensions such as construction witness and action-family coverage. Rejection has soundness/equivalence requirements. The map does not consistently carry generator provenance, regime coverage, or witness class into rejection decisions.

Possible loss: a candidate family that is rare or uniquely generated can be eliminated by a locally safe-looking policy whose proof does not account for the generator's incomplete alternative coverage.

Alternative interpretation: truly sound pruning should not need generator provenance. If P031's semantic invariant is actually proven, generation context is irrelevant to correctness and matters only to heuristic rejection/dominance.

Classification: `SCOPE_SPLIT` between sound rejectors and heuristic filters. Confidence: high.

## reject -> prefer

Relevant premises: P030/P031/P081/P147 rejection/failure knowledge; P040/P043/P045/P142 preference/information value.

The frozen map distinguishes rejecting a continuation from explaining why it failed. What is less explicit is whether the reason for rejection becomes evidence for ranking surviving alternatives. Negative information may die at the rejection boundary instead of updating preference.

Possible loss: repeated rejected structures are rediscovered because the ranker sees only surviving candidate features, not the causal pattern that eliminated siblings.

Alternative interpretation: importing rejection reasons into preference can create circular self-confirmation if the rejection rule is heuristic or policy-conditioned rather than sound.

Classification: `CANDIDATE_NEW_PREMISE` as an interface question only, with strong authority caveat. Confidence: medium.

## prefer -> retain

Relevant premises: P040/P043/P045 ranking; P050/P053/P141/P184 retention and option preservation.

This is one of the clearest semantic interface tensions. Candidate-local scores are not automatically set-level marginal values. A poor-looking candidate may preserve a rare completion regime, while several high-ranked candidates may be mutually redundant.

Possible loss: preference output is consumed as if it fully determines retention, collapsing ranking value into option-set value.

Alternative interpretation: a set-aware ranker can emit marginal retention value directly. In that architecture the interface is repaired by changing the preference output rather than by adding a separate retention representation.

Classification: `SCOPE_SPLIT`. Confidence: high.

## retain -> remember

Relevant premises: P050/P053/P122/P141/P184 retention; P067/P162/P177/P178/P189/P200 persistence and knowledge.

The map represents retained candidates/frontiers and remembered facts, but their lifetimes are not unified. A candidate may be retained within one beam yet its frontier, explanation, uncertainty, or derived facts disappear at a budget/stage boundary.

Possible loss: set-level diversity is paid for and then discarded before later work can exploit it.

Alternative interpretation: deliberate forgetting can be economically correct when reconstruction is cheap or stale retained state biases later search.

Classification: `SCOPE_SPLIT` by artifact lifetime. Confidence: high.

## remember -> allocate

Relevant premises: P162/P189/P200 memory/provenance; P065/P123/P153/P185/P186/P194 work allocation and stopping.

Persistent knowledge can change the expected value of more work, yet the map lacks a general contract translating remembered information into scheduler quantities. P185 makes information gain a value dimension, and P194 makes failed-work history part of action value, but neither supplies a calibrated allocation interface.

Possible loss: knowledge is successfully retained but cannot affect dose, abandonment, or technique choice.

Alternative interpretation: the scheduler can inspect the full decision state directly, making an explicit memory→allocation API unnecessary. The conceptual requirement is influence, not necessarily a serialized handoff object.

Classification: `RELATION_ONLY`. Confidence: medium-high.

## allocate -> select

Relevant premises: P060/P065/P123/P153/P154/P186 allocation; P061/P063/P142/P185 selection/control.

This interface is comparatively well represented: budget and predecessor context already constrain routing/control. The remaining ambiguity is whether allocation is an input to selection or selection jointly chooses action plus dose/stopping policy. P063/P186 suggest the latter may be more faithful for adaptive control.

Possible loss: fixed dose is chosen outside the controller and silently limits an otherwise appropriate selected action.

Alternative interpretation: decoupled allocation can simplify comparability and avoid controller overfitting. This is an architectural trade rather than an obvious missing edge.

Classification: `DESCRIPTIVE` / architecture-scope split. Confidence: medium.

## select -> transfer

Relevant premises: P061/P063/P154/P185/P186 selection; P177/P193/P200 transfer/handoff.

The map names generic handoff preservation but does not enumerate the output contract of each selected action. A controller can choose an action without specifying which frontier, proof, failed-state experience, uncertainty, or causal evidence survives its completion or interruption.

Possible loss: a correct action decision still produces a locally stranded artifact.

Alternative interpretation: stage-specific contracts should be introduced only after concrete loss is measured, to avoid freezing current architecture into the ontology.

Classification: `RELATION_ONLY`. Confidence: high structural, medium causal.

## transfer -> recognize

Relevant premises: P177/P193/P200 transfer; P167/P179/P189/P194/P197 recognition, equivalence, provenance, authority.

Receiving an artifact is not equivalent to recognizing when it applies. The consumer needs identity/generalization semantics, provenance, continuation context, and authority. The frozen map contains each ingredient but no single consumer-side recognition contract.

Possible loss: transferred knowledge is either ignored because it cannot be matched to current state, or over-applied because applicability is inferred from superficial similarity.

Alternative interpretation: this boundary is simply the combination of P189 provenance and P199 generalization-unit choice, and needs no additional premise beyond their eventual specialization.

Classification: `SCOPE_SPLIT` / `RELATION_ONLY`. Confidence: high.

## recognize -> measure

Relevant premises: P167/P189/P194/P199 recognition/generalization; P135/P151/P158/P161/P175/P188 measurement.

Measurements require a declared population and unit. If recognition groups states, traces, witnesses, or regimes incorrectly, the metric can be internally correct but answer the wrong question. P188 adds instrumentation semantics; P161 adds solution multiplicity.

Possible loss: evidence is aggregated over an operationally invalid equivalence class, hiding regime-specific effects or inventing transferability.

Alternative interpretation: this is a study-design problem rather than a runtime interface. That distinction matters because fixing it may change evidence authority without changing solver behavior.

Classification: `ONTOLOGY_ISSUE` / evidence-scope split. Confidence: high.

## measure -> infer-from-evidence

Relevant premises: P003/P005/P137/P151/P175/P181/P187/P188/P197/P198.

This boundary has the richest frozen safeguards but remains the easiest place to overclaim. Valid measurements do not automatically license conclusions about usefulness, portability, causal attribution, production economics, or parent-premise closure. P197/P198 supply explicit authority and maturity distinctions that the older relation graph only encodes piecemeal.

Possible loss: the information itself is not lost; *qualifiers are lost*. A measurement can cross the interface stripped of population, maturity, participation, architecture epoch, or authority metadata.

Alternative interpretation: this is fully a governance/documentation concern if every consumer already enforces preregistered interpretation rules. The frozen map does not establish such universal enforcement.

Classification: `ONTOLOGY_ISSUE` / authority metadata. Confidence: high.

## M10 bounded conclusion

The sequence does not reveal one universal handoff failure. It reveals several distinct interface-loss modes: semantic-type loss, provenance/authority loss, set-value loss, lifetime loss, scheduler-value loss, applicability/generalization loss, and measurement-qualifier loss. Some boundaries are already substantially modeled, especially allocate→select and failure/measurement safeguards; others remain mostly implicit.

M10 does not assert that every conceptual interface should become a runtime module boundary. It records where the frozen premise map cannot yet show, without extra interpretation, that useful output on one research function remains usable and correctly authorized at the next.
