# Independent peer-map hostile completeness audit

Date: 2026-09-17  
Branch: `chatgpt/premise-map-independent-peer-map-2026-09-17`

This audit is part of the quarantined construction. It does not compare this map with any other premise map.

## Audit target

The checkpoint map at commit `83aa1c6ca8e5aa86f1bee40e302ce12c7c35bc00` was challenged specifically for categories that its own research-function spine might make easy to miss.

The audit asked whether the map was overfitting to algorithmic mechanisms and under-representing:

- runtime-only assumptions;
- worker/process boundaries;
- persistence and artifact separation;
- experimental identity and population sealing;
- observational-analysis assumptions;
- defaults and eligibility that behave like hidden premises;
- negative results whose apparent scope exceeds the experiment;
- decisions that exist primarily as infrastructure rather than prose.

## Hostile pass 1: runtime behavior without an explicit research document

### Finding: work-accounting scope is a conceptual premise

`search-state.ts` charges canonical work on state transitions and keeps per-solve work isolated through `prep._workMeter`; `work-meter.ts` retains a separate realm-global discovery counter. The distinction matters conceptually: a research session, a solve, and a JS process are different accounting scopes.

This supports a broader premise already present in the map: allocation semantics are part of solver capability, not mere benchmarking infrastructure.

### Finding: default representation can alter the experiment

`stage-budget.ts` explicitly normalizes null and sparse ablation configurations so default polarity cannot silently change budget planning. It also removes behavior-identical retries from the funded plan. These are infrastructure rules, but they encode two research commitments:

1. "default solver" must mean one stable effective configuration regardless of caller representation;
2. nominal stage identity is not sufficient evidence of search diversity.

No new parent region was required; these strengthened P011, P025, and P038.

## Hostile pass 2: worker/process and execution boundaries

Inspected:

- `scripts/solver-worker-pool.mjs`
- `scripts/level-blind-capability-worker.mjs`
- `scripts/level-blind-capability-sweep.mjs`

### New concepts admitted

The checkpoint map underweighted execution substrate. The hostile pass therefore admitted:

- **P041 — level blindness is an information-flow contract.** The capability worker does not merely promise not to use level identity. It is given a mechanics-only corpus and prepares the level without corpus identity.
- **P043 — parallel execution must preserve logical task identity.** Work is dispatched dynamically, while results are re-associated with original task indices. Completion order is throughput, not experiment identity.
- **P044 — process and solve scopes are different accounting scopes.** Separate processes provide isolation, while canonical solve cost is still owned by per-solve results rather than inferred from a global counter.

These are not implementation trivia. They determine what evidence a run can support.

## Hostile pass 3: persistence and information leakage

Inspected:

- `scripts/level-data-io.mjs`
- mechanics allowlist and corpus stripping in `scripts/level-blind-capability-sweep.mjs`

### New concept admitted

**P046 — research artifacts and puzzle inputs should remain separable.**

Hints and their provenance are stored as separate artifacts and can be reattached for tooling, while capability runs deliberately exclude hints, identity, historical solution information, provenance, and future research metadata. The representation therefore encodes a strong distinction between:

- facts that are part of the puzzle presented to a cold solver;
- facts known to the research system about that puzzle.

This distinction also explains why "memory" cannot be treated as one undifferentiated concept. Some memory is legal current-solve state; some is durable research evidence that must not enter a cold solve.

## Hostile pass 4: corpus and observational evidence assumptions

Inspected:

- `scripts/stress/feature-solvability-analysis.mjs`
- population hashing/configuration logic in `scripts/level-blind-capability-sweep.mjs`
- evidence rules in `docs/solver-budget-determinism.md`
- current research authority `docs/solver-optimization-workstreams.md`

### New concepts admitted

**P042 — population identity is part of experimental identity.**

A treatment name is insufficient to identify an experiment. Commit, corpus bytes, selected positions, configuration, and budget semantics are part of what was tested.

**P045 — failure prevalence is not difficulty causation.**

The feature-solvability analysis explicitly corrects unsolved-population counts for corpus base rates and required-path-coverage confounding, and states that the result is association rather than causation. This guards against a recurring research error: treating a structural feature that is common among failures as the causal reason those levels fail.

## Hostile pass 5: historical negatives and removed approaches

The independent lineage had already reconstructed several negative-result families from reports and preserved comments:

- exact-state transposition recurrence is weak in DFS/beam under sound signatures;
- repair failed-state recurrence is high but epistemically weaker than logical deadness;
- cross-level connectivity-derived failure certificates closed negative in the tested representation;
- broad exposure mechanisms can regress by displacing already-protected work;
- restart complementarity does not establish restart superiority under equal aggregate work;
- a deterministic beam can be resumable without proving that resumability is scheduler-positive.

The hostile question was whether these should become separate top-level "failed ideas" regions. The answer from this reconstruction is mostly no. Their more stable conceptual parents are:

- state relatedness;
- failure authority;
- information transfer;
- continuation versus restart;
- exposure/allocation economics;
- measurement alignment.

Preserving the tested descendants and reopen conditions is still necessary, but using every experiment as a top-level map node would make history dictate ontology.

## Hostile pass 6: mechanism-rich regions with weak causal explanations

Two such regions remain visible.

### Search diversity

The repo contains many diversity mechanisms, but "more diversity" is not a well-formed parent hypothesis until the intervention is located: generation, ranking, retention, seed, family, stage order, or allocation. P010 remains a deliberate anti-lumping node.

### Routing / action selection

The repo has rich routing and stage machinery, but the causal object that should generalize may be a dynamic failure state rather than a static level feature. P029-P030 remain open because current machinery does not settle the right unit of conditioning.

## Hostile pass 7: what the map makes difficult to express

The current representation has four genuine limitations.

1. **One node can occupy several research functions.** A topology computation can be a derivation, a diagnostic, or a routing feature depending on use. The function spine is therefore not a mutually exclusive type system.
2. **Status is not scalar.** A proposition can be implemented, observer-only, unscheduled, starved, historically tested, or promoted simultaneously along different axes. P040 records this as a representation problem rather than forcing one status field to carry all meaning.
3. **Architecture-relative identity is awkward.** "The same idea" before and after work-budget, resumability, repair-operator, or stage-order changes may not be the same experimental proposition.
4. **Negative-result inheritance is inherently relational.** A closed tested descendant and its still-open semantic parent need an explicit "does-not-close" relation. Flat closed/open labels are inadequate.

These limitations are preserved rather than hidden.

## Source-region saturation observations

No-new-parent-concept saturation was reached in several strata:

- mechanic-specific prune and lower-bound implementations mostly instantiated already-recovered derive/reject/authority distinctions;
- additional ablation flags mostly instantiated exposure, placement, displacement, and promotion concepts already present;
- orchestration details mostly instantiated allocation/selection/eligibility rather than producing new parent regions.

The execution substrate did **not** saturate on the first pass and produced P041-P046. That was the principal correction from this hostile audit.

## Remaining blind spots

The following are documented rather than silently promoted to "complete":

- deleted-code archaeology is sampled through reports, comments, and preserved historical claims rather than a complete inventory of every removed implementation;
- generator implementation itself was not exhaustively reconstructed in this session;
- live search-state serialization across process boundaries remains mostly a conceptual absence rather than a mature tested lineage;
- mechanic-specific descendants are intentionally aggregated when they do not expose a new parent premise;
- repository history before the large consolidation/squash has known chronology limits for some files, so embedded report timestamps sometimes carry more historical information than git ancestry.

## Contamination audit

No recent canonical premise-map inventory, ontology, relation graph, mining report, synthesis, reconciliation, successor map, or downstream map conclusion was inspected.

One administrative search for an existing PR on this branch returned the coordination PR that created the quarantined tracks. Its body exposed only coordination metadata: the existence of two dependence tracks, branch names, and recent PR numbers. It did not expose canonical premise IDs, categories, map contents, mining findings, synthesis conclusions, or reconciliation results. This exposure is recorded here because the quarantine requires administrative leakage to be explicit rather than forgotten.

One older research report contained a cross-link to a then-current capability/map-style artifact. As already recorded in the independent lineage, the cross-linked ontology/conclusion was not followed or imported; only the underlying mechanism evidence was used.

## Audit conclusion

The map survived the hostile pass only after material extension into execution/evidence substrate. Its current central claim about the repository's conceptual structure is therefore broader than solver algorithms:

> Pathfinder solver research is a system for deciding what information exists, what authority it has, where it flows, what alternatives survive, how work is allocated, and what evidence is allowed to update those decisions.

That is a reconstruction result of this independent lineage, not a comparison claim.
