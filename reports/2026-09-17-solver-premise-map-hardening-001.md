# Solver premise-map hardening audit

> **Status:** concluded-positive
> **Last evidence:** 2026-09-17 — canonical 142-proposition map reviewed together with completeness matrix, typed relation graph, independent reconciliation, and production-assumption notes.
> **Decision:** retain the canonical proposition inventory, add a non-destructive hardening overlay, executable structural validation, explicit contradiction/sibling/default inventories, and a frozen-snapshot mining protocol.
> **Remaining gate:** freeze the exact hardened commit and run the preregistered mining lenses without mutating the source snapshot.

## Scope

This pass deliberately did **not** mine the premise map for solver ideas. Its object was the map itself: whether the representation, provenance, relation structure, temporal semantics, and mining process are strong enough that later insights are more likely to reflect Pathfinder rather than quirks of the ontology.

## 1. Completeness and correctness are now separate questions

The existing map is strong on coverage. The hardening protocol adds a second axis: whether the conceptual boundaries are drawn correctly.

The main abstraction risks found are:

- mechanism forms can be mistaken for semantic parents;
- historical result vocabulary can become the vocabulary of the ontology;
- proposition status sometimes carries several dimensions at once (evidence, maturity, economics, population scope);
- a negative tested form can visually occupy the same conceptual space as an open parent;
- source-module boundaries can masquerade as information-lifetime boundaries.

The hardening protocol therefore treats compound claims, scope fusion, implementation leakage, and granularity mismatch as explicit audit failures rather than mere editorial concerns.

## 2. Contradictions should be mined as missing conditioning variables

Six initial tension candidates are now explicit in `docs/solver-premise-map-hardening-overlay.json`.

The important pattern is that the most useful apparent contradictions are not usually `A` versus `not-A`. They are claims whose compatibility depends on an omitted variable:

- treatment solve delta versus deployment maturity;
- historical portability versus architecture/residual epoch;
- state equivalence versus available future policy/work;
- rank value versus option value;
- participation proof versus observer effect;
- abandonment versus retained information/continuation value.

This is a useful structural result before mining: contradiction analysis should first search for the hidden quantifier or conditioning variable rather than choosing a winner.

## 3. Provenance is already partly proposition-level, but needed a lineage model

The CSV register already carries `source_paths` per proposition. That is useful documentary provenance but does not distinguish *how* a proposition entered the conceptual map.

The overlay therefore defines discovery lineages separately from documentary sources:

- runtime code assumption;
- historical documentation;
- historical experiment;
- negative-result archaeology;
- canonical mapping pass;
- hostile completeness pass;
- independent reconstruction;
- hardening inference.

This lets future tooling derive two different statements for every row:

1. **what evidence/source material supports or motivated it?** (`source_paths`)
2. **through which independent discovery process was the premise noticed?** (lineage)

The independent reconstruction is particularly valuable because convergence across quarantined lineages is evidence about conceptual salience rather than mere repetition within one ontology.

## 4. Falsifiability is now a required hardening property

The protocol requires active/governing premises to admit three kinds of discriminating observation:

- confidence-increasing;
- confidence-decreasing;
- proposition-splitting.

This matters because several important premises are architecture principles rather than simple binary hypotheses. A proposition can survive while being split by budget, policy, population, or stage context. The correct response to contrary evidence may therefore be refinement rather than binary rejection.

## 5. Temporal validity is a first-class source of false closure

The architecture-epoch issue is broader than commit age. Six temporal dimensions are now named:

- solver architecture epoch;
- work-budget contract;
- production participation boundary;
- residual population;
- corpus/generator version;
- instrumentation semantics.

A negative conclusion can remain historically correct while becoming non-decision-bearing for current production. Later mining should therefore search for **stale authority**, not merely old dates.

## 6. Semantic novelty now has an explicit admission test

Future additions must identify themselves as one of:

`NEW_PARENT`, `SPECIALIZATION`, `SCOPE_SPLIT`, `EVIDENCE_STATE_CHANGE`, `IMPLEMENTATION_FORM`, `RELATION_ONLY`, or `REWORDING_ONLY`.

The final class does not earn a new ID. Implementation forms must point to a semantic parent. This is intended to arrest proposition inflation as the map matures.

## 7. The relation graph is now part of the object being audited

The map is no longer treated as a list with decorative edges. Missing edges can represent missing research questions.

High-value edge failures include:

- derivation without transfer;
- generation without retention;
- retention without allocation;
- measurement without valid evidence inference;
- failure explanation without revision;
- lifecycle output without a handoff contract;
- capability evidence without a deployment/economics relation;
- historical conclusions without freshness/epoch conditioning.

The new structural auditor verifies premise IDs and relation references and computes simple graph-degree diagnostics. More sophisticated graph mining is intentionally deferred until after the freeze.

## 8. Semantic sibling sets expose over-broad negatives

Four initial sibling families are now explicit:

1. joint future feasibility;
2. future-state relation/equivalence/dominance;
3. first-loss diagnosis;
4. solve-local knowledge sharing.

Each family separates tested descendants from still-open sibling operations. This converts a recurring prose warning — “one failed form does not close the parent” — into a machine-readable structure.

## 9. Seven asymmetries survived hardening as genuine map-shape observations

The initial asymmetry inventory records:

- reject > recover;
- negative knowledge > positive knowledge;
- choose-next > stop-current;
- node-local inference > invocation-persistent knowledge;
- solver-behavior measurement > solution-space measurement;
- ranking > option preservation;
- static descriptors > dynamic causal state.

These are not conclusions that the weaker side will add solves. They are descriptive evidence that the research program has invested unevenly in operations that are not obviously equivalent.

## 10. Reverse archaeology found several premise-bearing defaults

The hardening overlay records seven production defaults whose conceptual status deserves visibility:

- stage order fixed before invocation;
- first accepted solve stops portfolio work;
- beam frontier normally dies at a work boundary;
- root preprocessing is largely static;
- action grammar is mostly treated as fixed downstream context;
- candidate-path progress dominates the representation of search value;
- decision state primarily describes puzzle/path state rather than solve-local epistemic/work history.

The important distinction is between **documented design theorem** and **long-lived implementation default**. Later mining should not silently grant the latter theorem status.

## 11. Ontology stress tests reveal where the current matrix could still be self-sealing

Six deliberately alien decompositions are preregistered:

- information flow;
- decision rights;
- irreversibility;
- causal intervention;
- resource conservation;
- role separation among solver/observer/oracle/referee/generator/scheduler/analyst.

These are designed to ask questions that cut across the existing locus × claim-type matrix. If a materially important question repeatedly cannot be represented without awkwardly scattering it across cells, that is evidence for a missing ontology dimension rather than another missing premise.

## 12. Dimensionality-reduction concern

The map calls its axes independent search axes, but complete statistical independence is neither expected nor desirable. Several dependencies are visible already:

- local legality strongly correlates with correctness/soundness;
- scheduling naturally carries economics and causality questions;
- measurement loci naturally carry observability/generalization questions;
- persistence and transfer questions cluster at lifecycle boundaries.

This does not invalidate the axes. It changes the audit question from “are they independent?” to “does one axis add distinctions not recoverable from the others?”

The structural auditor intentionally does not collapse axes. The first mining round should instead look for near-degenerate dimensions and for cells that exist only because the vocabulary duplicated another axis.

## 13. Premise pressure is retained as a vector, not a score

A single priority score would smuggle research preferences into what is supposed to remain a descriptive map. Hardening therefore defines a vector:

- graph dependents;
- unresolved descendants;
- contradiction count;
- independent discovery lineages;
- evidence thinness;
- architecture centrality;
- freshness risk;
- failed tested forms under an open parent;
- affected loci/interfaces.

The auditor computes the first structural components now. Remaining components can be joined during mining. No weights have been chosen.

## 14. The mining process is now preregistered

Twelve mining lenses are defined in `docs/solver-premise-map-mining-preregistration.md` before their outputs are examined:

1. contradiction clusters;
2. graph bottlenecks;
3. high-centrality weak evidence;
4. empty semantic sibling spaces;
5. repeated failed forms beneath open parents;
6. missing cross-locus edges;
7. asymmetry families;
8. stale/epoch-sensitive conclusions;
9. independent convergence/divergence;
10. research-function interface loss;
11. premise-pressure vector outliers;
12. ontology escapees.

The first round has a stop rule: all lenses operate on the same frozen snapshot before discoveries are recursively mined.

## 15. Automation added

`scripts/audit-solver-premise-map.mjs` now performs a structural audit over all four canonical premise CSVs, all three relation graphs, and the hardening overlay. It checks:

- premise ID uniqueness and syntax;
- required proposition/status content;
- documentary provenance presence;
- exact normalized-text duplicate candidates;
- relation references;
- overlay reference integrity;
- contradiction/sibling/default integrity;
- closure-like claims for scope/evidence warning signs;
- simple relation-degree and high-centrality/open-status diagnostics.

`.github/workflows/premise-map-hardening.yml` runs this auditor whenever the premise-map/hardening inputs change.

The automation is deliberately conservative. It rejects structural corruption and reports suspicious epistemic patterns, but does not decide whether two semantically similar propositions are truly duplicates or whether a historical negative is stale. Those remain review questions.

## Outcome

The map is materially safer to mine than it was at the start of this pass. Its remaining risks are now explicit objects:

- bad abstraction boundaries;
- hidden conditioning variables;
- proposition provenance versus discovery lineage;
- stale decision authority;
- semantic sibling omission;
- missing graph edges;
- implicit defaults;
- ontology self-sealing;
- circular mutation during mining.

The final pre-mining action is therefore mechanical: freeze an exact commit-level snapshot, then prohibit the first mining round from editing that frozen source while it is being analyzed.
