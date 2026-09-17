# Solver premise-map hardening

> **Status:** active hardening protocol before insight mining.
> **Last evidence:** 2026-09-17 — canonical premise map contains 142 propositions across the baseline and three extension files, plus typed relations and completeness lenses.
> **Decision:** harden the map as a dataset before using it as an idea generator.
> **Remaining gate:** complete structural audit, freeze a versioned snapshot, and mine only from the frozen snapshot.

## Purpose

The premise map has reached the point where omission is no longer the only serious risk. Structural artifacts can now manufacture apparent gaps or conceal real ones. The hardening phase therefore separates four questions that were previously easy to blur together:

1. **Coverage:** is the territory represented?
2. **Correctness:** are the conceptual boundaries drawn in the right places?
3. **Epistemic validity:** does the evidence support the scope and authority claimed?
4. **Mining validity:** can later pattern-finding distinguish a property of the research space from a property of the ontology used to draw it?

The existing register remains historical authority. Hardening adds an overlay and audit products rather than rewriting old rows in place.

## Hardening passes

### H1 — abstraction-quality audit

For every proposition or coherent family, check for:

- **compound claims**: one row asserts two independently falsifiable things;
- **scope fusion**: a local result is written as a population or architecture claim;
- **mechanism/semantic fusion**: a concrete treatment is mistaken for its semantic parent;
- **evidence/claim fusion**: a result description is written as if it were the premise itself;
- **implementation leakage**: source-module vocabulary defines the conceptual boundary;
- **granularity mismatch**: siblings are either fragmented into cosmetic variants or collapsed across causally distinct operations.

Hardening should split or relate propositions only when the semantic distinction is independently meaningful. Vocabulary novelty alone is not semantic novelty.

### H2 — contradiction and tension audit

Record three different objects:

- **hard contradiction** — two propositions cannot both hold in the same stated scope;
- **conditional tension** — they can both hold only after introducing a missing conditioning variable such as budget, architecture epoch, predecessor sequence, policy, or residual population;
- **strategy tension** — both can be true but imply competing allocations or architectural choices.

A contradiction is not automatically an error. It is often evidence that the ontology is missing a scope variable.

### H3 — proposition-level provenance and independent discovery

Every proposition should be traceable to one or more discovery lineages:

- `runtime-code-assumption`
- `historical-documentation`
- `historical-experiment`
- `negative-result-archaeology`
- `canonical-map-pass`
- `hostile-completeness-pass`
- `independent-reconstruction`
- `hardening-inference`

Independent rediscovery is retained explicitly because convergence is stronger evidence that a region is real than repetition within one ontology lineage.

### H4 — falsifiability / discriminating-observation audit

Each active or governing proposition should be able to name:

- evidence that would increase confidence;
- evidence that would decrease confidence;
- evidence that would split the proposition into scoped descendants;
- whether the observation is allowed only offline or can affect production behavior.

The purpose is not to prescribe a full experiment. It is to prevent unfalsifiable premises from becoming architectural wallpaper.

### H5 — temporal-validity audit

Every decision-bearing conclusion should identify the architecture interval in which its evidence was generated and the conditions that make it stale. At minimum consider:

- solver architecture / stage graph;
- work-budget semantics;
- production participation boundary;
- residual population;
- corpus/generator version;
- instrumentation semantics.

A historical negative remains evidence, but its current authority can shrink.

### H6 — semantic-novelty audit

Any proposed new premise must declare one of:

- `NEW_PARENT`
- `SPECIALIZATION`
- `SCOPE_SPLIT`
- `EVIDENCE_STATE_CHANGE`
- `IMPLEMENTATION_FORM`
- `RELATION_ONLY`
- `REWORDING_ONLY`

`REWORDING_ONLY` does not receive a new premise ID. `IMPLEMENTATION_FORM` must point to its semantic parent.

### H7 — missing-edge audit

The relation graph is treated as a research object. Search for:

- tested forms with no explicit semantic parent;
- parents with one failed child but no sibling enumeration;
- adjacent lifecycle loci with no handoff relation;
- propositions sharing a prerequisite but lacking a composition relation;
- apparent negative conclusions lacking an evidence-dependency edge;
- mechanisms with capability evidence but no deployment/economics relation;
- conclusions whose current validity depends on an architecture epoch but have no freshness relation.

### H8 — semantic-sibling audit

For important parent premises, enumerate known children and plausible-but-untested siblings. Negative conclusions apply to the child that was actually tested unless the evidence explicitly supports parent closure.

### H9 — asymmetry audit

Search for lopsided conceptual investment, including:

- reject vs recover;
- negative knowledge vs positive knowledge;
- choose-next vs stop-current;
- node-local inference vs invocation-persistent knowledge;
- solver-behavior measurement vs solution-space measurement;
- rank alternatives vs preserve option classes;
- generate alternatives vs explain why generation failed;
- static level descriptors vs dynamic causal state.

Asymmetry is descriptive evidence of a neglected region, not by itself a queue priority.

### H10 — implicit-default inventory

Long-lived defaults are premise candidates even when nobody argued for them. Audit at least:

- stage order;
- first-success stopping;
- retry/tranche counts;
- frontier lifetime;
- merge identity;
- action grammar;
- preprocessing lifetime;
- what is retained across stage boundaries;
- what state fields exist at all;
- what evidence can influence production;
- default scheduler eligibility and abandonment behavior.

### H11 — reverse architecture archaeology

For each major production behavior ask:

> What must be believed, intentionally or accidentally, for this design to make sense?

Then distinguish intentional documented premise, inherited default, historical optimization, and accidental implementation constraint.

### H12 — premise-pressure vectors

Do not collapse research pressure into one score. For each important proposition/family retain a vector such as:

- graph dependents;
- unresolved descendants;
- contradiction/tension count;
- independent discovery lineages;
- evidence thinness;
- architecture centrality;
- age/freshness risk;
- failed tested forms beneath an open parent;
- number of loci/interfaces affected.

The vector is for mining; it is not an automatic priority ranking.

### H13 — ontology stress tests

Run independent decomposition passes whose first task is not to invent premises but to find questions that the current schema cannot represent cleanly. Candidate alternative decompositions include:

- information flow;
- decision rights / authority;
- search-object transformations;
- causal intervention points;
- reversible vs irreversible commitments;
- conserved/scarce future resources;
- observation and missing-data processes;
- temporal ownership/lifetime;
- policy-conditioned equivalence;
- solver/observer/referee role separation.

A recurring inability to place a question cleanly is evidence of an ontology gap.

### H14 — map freeze and mining separation

After hardening, create a named frozen snapshot. Mining outputs must be separate artifacts. A mining agent may propose map changes, but those changes are not incorporated into the frozen source during that mining run.

This preserves the distinction between:

- a pattern discovered *in* the map;
- a pattern inserted *into* the map by the miner.

### H15 — preregistered mining lenses

Mining methods should be declared before reading their results. Initial lenses are:

- contradiction clusters;
- graph bottlenecks / high dependency centrality;
- high-centrality weak-evidence premises;
- empty semantic sibling spaces;
- repeated failed forms under open semantic parents;
- missing cross-locus edges;
- asymmetry families;
- stale/epoch-sensitive conclusions;
- independent convergence and divergence;
- interface losses across research functions;
- pressure-vector outliers;
- ontology escapees: important questions that remain difficult to represent.

## Hardening completion rule

The premise map is ready for insight mining when:

1. the canonical files and overlay validate structurally;
2. closure claims carry scoped evidence and freshness semantics;
3. contradiction/tension candidates are explicit rather than buried in prose;
4. important parents have sibling/tested-form structure;
5. implicit production defaults have been inventoried;
6. the current ontology has survived at least one deliberately alien stress test;
7. a frozen snapshot manifest names the exact files and commit;
8. mining lenses are preregistered separately from mining results.
