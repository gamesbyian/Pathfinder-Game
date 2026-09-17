# M2 — graph bottlenecks

Snapshot: `solver-premise-map-v1-2026-09-17` (`e9601ffb8fa304d5ea91d054a9de6cb1bf8ff28e`)
Method: preregistered M2 only. Inputs were all three frozen graph layers plus proposition records. The snapshot hardening auditor's degree diagnostics were used as a reproducible structural measurement, not as a priority score.

## Structural baseline

The frozen hardening run reports 166 relations, 20 isolated propositions, and this high-centrality/open-status set: `P032(10)`, `P024(6)`, `P063(6)`, `P081(6)`, `P177(6)`, `P082(5)`, `P013(4)`, `P065(4)`.

The counts are graph-degree diagnostics from the repository auditor. M2 does not assume degree equals importance, causal leverage, or expected solve value.

## Findings

### M2.1 — P032 is a semantic funnel for joint-feasibility work

P032 has the largest reported degree (10). Its neighborhood spans closed tested forms P033/P034, the challenged independence premise P090, relational planning P091, shared-resource reasoning P163, commutativity P169, and the sibling inventory in S001.

This makes P032 structurally distinctive: negative forms, supporting mechanisms, and broader architectural relations all converge on one semantic parent. It is a bottleneck in *interpretation*: a careless closure of P032 would incorrectly dispose several distinct descendants, while an overbroad reading of every descendant as support would inflate the parent.

Alternative interpretation: the high degree partly reflects deliberate hardening effort around this already-known family. Degree may therefore measure documentation attention as well as conceptual dependency.

Confidence: high structural, medium causal. Classification: `DESCRIPTIVE`.

### M2.2 — P024 and P135 form a diagnostic gateway across failure loci

P024 partitions source absence, unreached candidates, and later loss. The v1 graph connects it to candidate generation P020, ordering P040, pruning P030, budget P060, and validation P001; P135 points into P024 and several later loci, while relations v2 explicitly make P135 an observer of P020/P030/P040/P050/P060/P001.

The bottleneck is epistemic rather than runtime: downstream mechanism conclusions can be uninterpretable when the first causal loss has not been localized. P135 is also constrained by P161 and P150, so the diagnostic gateway itself depends on solution multiplicity and witness sensitivity.

Alternative interpretation: this centrality is partly constructed because the ontology intentionally uses first-loss diagnosis as a cross-cutting organizer. It should not be mistaken for evidence that implementing universal lineage instrumentation would itself add solves.

Confidence: high. Classification: `DESCRIPTIVE`.

### M2.3 — P063 is a control-loop convergence point

P063's reported degree is 6. In the frozen graph, P061 and P062 feed it; relations v2 add constraints from P154 and an enablement from P146, while relations v3 specialize it through P186 and connect P185 to it. These span whole-puzzle routing, frontier-state control, predecessor-conditioned value, heuristic trust, information-valued actions, and stopping decisions.

The structural observation is that adaptive control is not represented as one selector premise. It is a meeting point for diagnosis, context, information acquisition, and abandonment. This increases the risk that a “controller” experiment tests only one incoming relation while being interpreted as evidence about the whole parent.

Alternative interpretation: the graph may be overloading P063 as a convenient umbrella. A future map version might split it, but Phase 1 does not mutate the ontology.

Confidence: high structural. Classification: `ONTOLOGY_ISSUE` candidate, not admitted.

### M2.4 — P081/P082 create a failure-explanation-to-revision chain

P081 has reported degree 6 and P082 degree 5. P035 tests one compact failure-core form under P081; P081 enables P082 and P083; P147 is parent/prerequisite for P082. The chain therefore couples explanation, causal attribution, revision, and communication.

The bottleneck is sequential: failure knowledge that cannot identify an earlier causal commitment does not reach selective revision, while causal attribution that is not retained/transferred cannot benefit other search processes.

Alternative interpretation: the high connectivity may reflect a conceptual pipeline whose individual steps can still be useful independently. M2 does not infer that all steps must be built together.

Confidence: high. Classification: `DESCRIPTIVE`.

### M2.5 — P177 is the principal explicit handoff node

P177 has reported degree 6. Relations v3 make it parent to P178 and P193; P193 implements the handoff-contract idea; P196 strengthens P177; P200 is a broader parent of P177 and strengthens P193. The completeness matrix independently identifies invocation lifetime as thin and research-function interfaces as a distinct audit surface.

P177's connectivity is unusual because it is about *edges between components* rather than a component. Its graph position supports treating interfaces as first-class research objects rather than assuming local adequacy composes automatically.

Alternative interpretation: recent hardening explicitly added relation structure around handoffs, inflating degree relative to older, less-modeled interfaces. This is a provenance effect on centrality.

Confidence: high structural. Classification: `DESCRIPTIVE`.

### M2.6 — P013 and P065 are small-degree but wide-semantic bottlenecks

P013 (degree 4) connects completion-regime representation to regime-aware retention P053 and planning P092, with P140 pointing toward optionality. Its degree is modest, but the outgoing concepts span representation, planning, and retention.

P065 (degree 4) is constrained/prerequisited by P123 and P175 and sits downstream of P060 in the v1 graph. It connects dose comparability, counterfactual churn, and marginal-value allocation. Thus graph degree alone understates semantic breadth for both nodes.

Alternative interpretation: this is exactly why M2 preregistration forbids a single authoritative centrality score. Relation-type and region diversity matter alongside count.

Confidence: high. Classification: `DESCRIPTIVE`.

### M2.7 — twenty isolates are not automatically low-value

The structural auditor reports 20 isolated propositions. Absence of an edge is explicitly documented as not implying independence. Therefore isolation is ambiguous among: genuinely local premise, missing relation, recently added proposition not yet related, or proposition whose relation is textual but not graph-encoded.

M2 does not convert isolation into neglect or priority. It flags the isolate population as a relation-coverage uncertainty that M6 is independently designed to inspect.

Confidence: high. Classification: `DESCRIPTIVE` / possible `RELATION_ONLY` candidates to be evaluated by M6 independently.

## M2 boundary note

No bottleneck was ranked. Degree, relation diversity, semantic-parent role, and cross-region reach were retained separately. No M2 finding is used as an input to M3 or later lenses.
