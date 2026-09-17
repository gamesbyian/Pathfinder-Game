# Pass D — relation-grammar stress test

## D1 — the relation language is not one normalized ontology

The v2 relation file declares 16 relation types with definitions. The v3 delta introduces additional types not defined in the v2 vocabulary, including:

`SPECIALIZATION_OF`, `DEPENDS_ON`, `EPISTEMIC_PREREQUISITE_FOR`, `STRENGTHENS`, `ALTERNATIVE_EXPLANATION_FOR`, `MEASUREMENT_DEPENDS_ON`, `ASSUMES`, `EVIDENCE_AGAINST`, `CONFOUNDED_WITH`, `IMPLEMENTATION_OF`, `NEWLY_RELEVANT_AFTER`, and `DOES_NOT_FALSIFY_PARENT`.

This is not inherently wrong, but it means the frozen graph cannot safely be treated as one formally defined typed relation system without first preserving generation provenance and resolving semantics.

Representation consequence: graph analyses that count all typed edges as comparable semantic objects would overstate uniformity.

Classification: representation limitation; very high confidence.

## D2 — inverse-like edge pairs are semantically useful but graph-theoretically hazardous

Examples:

- **P177 SEMANTIC_PARENT→P178**, while **P178 TESTED_FORM_OF→P177**.
- **P177 SEMANTIC_PARENT→P193**, while **P193 IMPLEMENTATION_OF→P177**.

These are coherent descriptions of parent/child roles, not logical cycles. But any analysis that discards relation type and keeps only directed adjacency creates apparent two-node cycles and can misread ancestry.

A similar issue exists where one pair carries multiple edge meanings:

- P033→P032 is both `TESTED_FORM_OF` and `NARROWS`;
- P034→P032 likewise;
- P147→P082 is both `SEMANTIC_PARENT` and `PREREQUISITE`;
- P170→P076 is both `TESTED_FORM_OF` and `NARROWS`.

Therefore edge multiplicity is meaningful information, not duplicate noise.

Classification: representation/graph semantics; very high confidence.

## D3 — the graph's node universe is open

The v3 relation file contains relation endpoints that are prose concepts rather than canonical proposition IDs, including:

- “beam resumability equivalence”;
- “absolute future-state equivalence”;
- “residual prevalence claims”;
- “production promotion claims”;
- “trace budget and telemetry cost”;
- “winner/action attribution”;
- several F-numbered failure labels and prose targets.

This lets relations express useful ideas without forcing every concept into the proposition register, but it also means the relation graph is not a closed 142-node graph.

Consequence: node-degree, reachability, connected-component, and ancestry calculations over proposition IDs alone systematically drop part of the represented semantics.

Alternative interpretation: prose endpoints may intentionally function as annotations rather than first-class graph nodes.

Classification: representation limitation; high confidence.

## D4 — relation composition is tempting but rarely licensed

Several two-step chains invite stronger conclusions than the relation semantics support. Examples:

- P198 `STRENGTHENS` P151; P151 `PREREQUISITE` P152.
- P187 `STRENGTHENS` P175; P175 `CONSTRAINS` P065.
- P183 `SPECIALIZATION_OF` P135; P135 `OBSERVES` several failure loci.

It is reasonable to read these as research narratives, but none licenses simple transitivity. “Strengthens a prerequisite” is not automatically “is itself a prerequisite”; “specialization of an observer” is not automatically an observer of every target in the same way.

The map therefore supports **path interpretation**, but not generic relation algebra.

Classification: representation/epistemic; high confidence.

## D5 — v3 adds relation types that encode epistemic modality absent from v2

The new vocabulary contains `EVIDENCE_AGAINST`, `DOES_NOT_FALSIFY_PARENT`, `CONFOUNDED_WITH`, and `ALTERNATIVE_EXPLANATION_FOR`. These are qualitatively different from ancestry, prerequisite, complement, or support relations because they describe how evidence should update interpretation.

This is a meaningful expansion of what the graph can say: it begins to represent **epistemic transformations**, not merely conceptual architecture.

Representation implication: some later propositions may appear richer not because the underlying research space became richer, but because the graph gained verbs for evidential relationships.

Classification: representation-sensitive conceptual observation; medium-high confidence.

## Negative results

- No hard contradiction was found in the relation grammar itself.
- Apparent two-node cycles were explained by inverse-like relation semantics rather than contradictory parenthood.
- The pass found no basis for assuming missing edges indicate conceptual independence; the v2 file explicitly warns against that inference.

## Pass-D takeaway

The relation files are best treated as a **layered semantic annotation system**, not a single normalized graph ontology. Any mining result that depends on graph topology without relation-type and generation awareness is fragile.
