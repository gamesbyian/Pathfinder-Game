# Solver premise-map mining preregistration

> **Status:** preregistered; do not record mining results in this document.
> **Last evidence:** 2026-09-17 — hardening overlay and structural auditor added before mining begins.
> **Decision:** freeze methods before looking for research conclusions in the hardened map.
> **Remaining gate:** create the frozen snapshot manifest and run each lens against that snapshot independently.

## Separation rule

This document specifies *how* the hardened map will be mined. It must not be edited to accommodate an exciting result discovered during mining. New lenses may be proposed later, but they must be versioned as a new preregistration before their results are inspected.

Mining outputs belong under `reports/` and may propose map changes. They do not mutate the frozen source snapshot during the same run.

## M1 — contradiction clusters

Input: explicit contradiction/tension candidates plus graph neighborhoods.

Question: where do apparently incompatible propositions become compatible only after adding a missing conditioning variable?

Output must distinguish:
- hard contradiction;
- architecture/population/budget-conditioned tension;
- strategy tension where both claims can be true.

Do not infer priority from contradiction count alone.

## M2 — graph bottlenecks

Input: typed relation graph.

Measure descriptively:
- incoming relation count;
- outgoing relation count;
- number of distinct relation types;
- number of downstream open questions;
- whether a proposition is a prerequisite or semantic parent for multiple regions.

Question: which propositions are load-bearing assumptions for many otherwise separate research areas?

No single centrality score is authoritative.

## M3 — high-centrality weak evidence

Cross M2 with evidence/status.

Question: which load-bearing premises are still implicit, open, population-limited, participation-invalid, stale, or supported only indirectly?

This lens is intended to find epistemic leverage, not necessarily solver-feature ideas.

## M4 — empty semantic sibling space

Input: explicit semantic-parent/tested-form families.

Question: where has one concrete implementation been tested while obvious sibling operations remain unnamed or untested?

A sibling must differ semantically, not cosmetically.

## M5 — repeated failed forms beneath open parents

Question: where have several implementation forms failed without evidence closing the broader semantic operation?

Look for two opposite possibilities:
- the parent is genuinely robust and deserves new forms;
- repeated sibling failures suggest the parent itself may need a sharper formulation.

## M6 — missing cross-locus edges

Treat the pipeline as connected stages rather than independent boxes.

Search especially for missing relations between:
- derive -> transfer;
- generate -> retain;
- retain -> allocate;
- measure -> infer-from-evidence;
- failure explanation -> revision;
- stage output -> downstream handoff;
- production participation -> capability attribution.

Question: where can each local component look adequate while the composition still loses solves?

## M7 — asymmetry families

Use the preregistered asymmetries:
- reject / recover;
- negative / positive knowledge;
- choose-next / stop-current;
- node-local / invocation-persistent knowledge;
- solver behavior / solution-space measurement;
- ranking / option preservation;
- static descriptors / dynamic causal state.

Question: does the less-developed side contain genuinely different operations, or merely renamed versions of work already present elsewhere?

## M8 — stale and epoch-sensitive conclusions

Question: which negative or economic conclusions depend materially on an older architecture, production boundary, work contract, residual population, corpus, or instrumentation regime?

Do not reopen automatically. Classify instead:
- still portable;
- narrowed but usable;
- stale enough to require freshness evidence;
- no longer decision-bearing.

## M9 — independent convergence and divergence

Use discovery lineages, especially the quarantined independent reconstruction.

Question:
- which premises were independently rediscovered;
- which appear only in one lineage;
- where did independent investigators partition the same territory differently?

Convergence is evidence about conceptual salience, not proof that a premise is true.

## M10 — research-function interface loss

Use the function sequence:
`encode -> derive -> generate -> reject -> prefer -> retain -> remember -> allocate -> select -> transfer -> recognize -> measure -> infer-from-evidence`.

Question: where does useful output exist at one function but fail to become usable input to the next relevant function?

Examples include derived facts that cannot transfer, generated alternatives that never survive retention, or valid measurements that are overgeneralized during inference.

## M11 — premise-pressure vectors

For each important proposition/family collect, without collapsing:
- graph degree;
- unresolved descendants;
- contradiction/tension count;
- independent discovery count;
- evidence thinness;
- architecture centrality;
- freshness risk;
- failed tested forms beneath an open parent;
- affected loci/interfaces.

Question: which unusual vector shapes deserve human inspection?

No weighted aggregate ranking is permitted in the first pass.

## M12 — ontology escapees

Use the alien decompositions in `solver-premise-map-hardening-overlay.json`.

Question: what important question cannot be represented cleanly using the existing locus/claim/scope/evidence/relation machinery plus authority and maturity lenses?

For every escapee classify:
- schema genuinely missing a dimension;
- schema can represent it but vocabulary/documentation is weak;
- question is compound and should be decomposed;
- apparent escapee is merely a renamed existing premise.

## Cross-lens replication rule

A candidate insight becomes more interesting when independently exposed by different lenses. Mining reports should record the lenses that found it without combining those lens outputs into a numerical score.

## Stop rule

The first mining round stops after all twelve lenses have produced outputs from the same frozen snapshot. Do not recursively mine discoveries from those outputs until the round is closed and reviewed. This prevents a locally exciting theory from colonizing the map before competing explanations have had an equal pass.
