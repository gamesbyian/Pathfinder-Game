# Solver premise-space second pass

**Date:** 2026-09-17  
**Branch:** `chatgpt/solver-premise-space-atlas-2026-09-16`  
**Purpose:** hostile completeness pass over the premise-space atlas, deliberately searching by the atlas's own groupings and then by orthogonal groupings that the first pass did not use.

## Bottom line

The first-pass atlas is directionally useful but **not fully exhaustive by its own categories**. It normalized discovered material into mechanism / architecture / epistemic strata, but it did not search every causal stage symmetrically for every kind of claim. That creates a vocabulary-density bias: regions already richly named in the repo are better populated than regions whose assumptions are embedded in control flow, experiment delivery, mechanic coupling, or evidence infrastructure.

The correction is to stop treating `mechanism / architecture / epistemic` as the main partition. Those are useful labels, but they are not orthogonal. The second-pass map uses five axes:

1. **system locus** — where in the solve/research pipeline the proposition applies;
2. **claim type** — what kind of proposition it is;
3. **scope** — state, attempt, invocation, level, residual population, corpus, or architecture epoch;
4. **evidence state** — open, supported, tested-form closed, semantic closed, blocked, population-limited, participation-invalid, economics-closed, etc.;
5. **relation type** — how the proposition connects to others.

This makes empty cells visible without forcing every question into one topic bucket.

## 1. Refined claim-type ontology

For every system locus, ask each of these independently.

| Claim type | Core question |
|---|---|
| **CORRECTNESS / SOUNDNESS** | Can this stage eliminate a real solution or count an invalid one? |
| **SUFFICIENCY / EXPRESSIVITY** | Does this stage represent enough information/actions to make the needed distinction? |
| **CAUSALITY** | Does changing this thing actually change reachability of a solve, or merely correlate with it? |
| **PREVALENCE** | How much of the current residual is affected? |
| **OBSERVABILITY** | Can the failure/signal be measured without already solving the problem? |
| **ECONOMICS / MARGINAL VALUE** | Is the information/capability worth its work and displacement cost? |
| **GENERALIZATION / PORTABILITY** | Does the result survive new parents, residuals, budgets, architecture epochs, and protocol? |
| **COMPOSITION / INTERACTION** | Does the operation remain valid/useful when combined with neighboring mechanisms? |
| **PERSISTENCE / LIFETIME** | How long should the derived fact/frontier/commitment survive? |
| **REVISION / RECOVERY** | If the decision is wrong, can the solver identify and revise the cause rather than restart broadly? |

The first register heavily populated SUFFICIENCY, CAUSALITY and GENERALIZATION in some regions, but often omitted PREVALENCE, OBSERVABILITY, ECONOMICS or COMPOSITION for the same region.

## 2. Refined system-locus ontology

The first causal chain remains useful but needs two extra layers and finer boundaries:

```text
problem semantics / solution space
        ↓
input normalization + root preprocessing
        ↓
start/gate + candidate/action generation
        ↓
state representation + equivalence/dominance
        ↓
local legality + exact inference/propagation
        ↓
strategic/global feasibility
        ↓
ordering / ranking / exploration
        ↓
frontier retention / merge / diversity
        ↓
budget / scheduling / continuation
        ↓
failure explanation / memory / communication
        ↓
revision / repair / alternate search object
        ↓
validation / acceptance
        ↓
measurement / attribution / evidence / closure
```

The added **problem semantics / solution space** layer matters because search difficulty can depend on solution multiplicity, topology, regime count, and mechanic-resource coupling before any solver policy acts. The added **measurement / attribution** layer matters because Pathfinder has repeatedly found that a treatment can appear tested while not participating, receiving incomparable dose, or being attributed to the wrong lifecycle stage.

## 3. What the first pass under-searched

### A. Treatment-delivery and attribution premises

The archaeology method explicitly requires proving that intended treatment/configuration reached the final consumer and received work before assigning an algorithmic verdict. Historical blueprint planning, cross-attempt overlap telemetry, prefix-divergence guards, and several other lines suffered option-transport, allowlist, serialization, or attribution failures.

New explicit premises:

- **delivery fidelity:** configuration/flag/plan membership implies actual runtime participation only after consumer-side verification;
- **dose fidelity:** reached/dispatch evidence is not comparable-work evidence;
- **lifecycle attribution fidelity:** the reported winning stage/action identity can be wrong even when the final solve is real;
- **aggregation fidelity:** reducers/manifests must preserve action/config identity and censoring state.

These are not merely infrastructure niceties. False negatives can close premise families; false positives can send the queue down the wrong causal branch.

### B. Natural exhaustion versus censoring

Scheduling policy makes this distinction foundational, but the first premise register represented it only indirectly through generic budget questions. A technique that naturally exhausts has no continuation value in that state; a technique stopped by budget has unknown residual value. Treating both as “failed at work W” contaminates continuation, scheduler, and capability claims.

### C. Static preprocessing versus dynamic/path-conditioned preprocessing

`prepLevel()` computes strong root-static adjacency/distance/index structures. Later topology evidence shows that path history can change completion-relevant accessibility even when endpoint and ordinary progress match. This creates an underasked architecture premise:

> Are root-static relaxed distances/connectivity summaries sufficient, or are some hard residuals only exposed by cheap state-conditioned graph facts maintained/derived as the path consumes cells, axes, portals, separators, and obligation options?

This does **not** imply recomputing everything per node. The semantic question precedes the implementation.

### D. State dominance between exact identity and lossy merge

Research has studied exact transposition identity and deliberately coarse beam merging, but there is a conceptual middle that is not clearly represented in the current atlas:

> Can one state be proved to dominate another because every completion available to the dominated state is also available to the dominating state with no worse remaining resources?

A sound **partial order** is different from equality and different from a heuristic merge. If such a relation exists for useful subdomains, it could safely remove states that exact dedup cannot compress and coarse merge risks conflating.

Candidate resource dimensions include remaining length/intersections, visited/axis capacity, obligation masks, portal/flipper usage, separator-side commitments, and proven future-regime supersets. The hard part is future-completion inclusion, not tuple comparison.

### E. Start/gate allocation and knowledge transfer

`solveLevel()` runs gates × attempt configs, but the first map treated candidate generation and routing mostly at technique level. Multiple gates create another decision boundary:

- whether start choice itself creates complementary basins;
- whether equal work across gates is sensible;
- whether a failed gate search derives facts transferable to another gate;
- whether solution topology/obligation order makes some gates structurally dominated or merely harder.

This is probably lower priority than current acquisition lanes, but it belongs in a comprehensive premise map.

### F. Solution-space multiplicity and regime volume

Target-relative diagnostics often use one accepted witness. The future-work authority already preserves representative-path sensitivity. The stronger parent premise is:

> Search difficulty and diagnostic meaning may depend on the number, diversity, and geometry of accepted completions, not merely the existence of one witness.

A level with one narrow completion regime is a different search problem from a level with thousands of interchangeable completions. Solution-space volume can affect beam extinction probability, usefulness of diversity, witness-relative first-loss interpretation, and whether a local perturbation should be expected to rescue a solve.

No production counting oracle is implied. Even coarse offline multiplicity/regime evidence can calibrate diagnostics.

### G. Mechanic-resource coupling rather than mechanic names

The mechanic-state contracts expose several shared consumable resources:

- **cell/visit capacity**;
- **edge-axis capacity**;
- **turn/chirality opportunities**;
- **global order/parity** for flipping filters;
- **portal one-use transport and counted-length consequences**;
- **path-length budget**;
- **separator/corridor capacity**;
- **future intersection opportunities**.

Many hard interactions are better described as two obligations competing for one scarce resource than as “MustCross + MustTurn” or “portal + intersection.” The first map's joint-feasibility region is correct but too abstract. A resource-coupling submap should ask:

1. which mechanics consume/share each resource;
2. whether current state represents remaining capacity exactly;
3. whether current inference reasons about competing future claims on that capacity;
4. whether a conflict/flow/cut/ordering relation can be derived cheaply;
5. whether the relation is local, separator-scoped, or global.

This is a promising source of **new semantic premises** without algorithm-name brainstorming.

### H. Operational-trace censoring and policy-conditioned observability

The operational taxonomy explicitly warns that frontier Jaccard, ranking agreement, and divergence measurements are conditioned on which states a policy reaches and on trace truncation. Therefore:

> “Policy A and B look operationally similar” is itself conditional on an encounter distribution generated by A/B and the observer budget.

This matters for premise mining. A missing divergence may be an observation failure, not genuine redundancy.

### I. Randomization as both capability and diagnostic

Broad retry/seed fan-out is closed in tested forms, but the premise-space map should still contain the parent questions:

- does stochasticity expose complementary basins that deterministic policies cannot cheaply reach?
- does seed sensitivity diagnose rugged local basins versus a representation/semantic capability gap?
- when repeated seeds return to the same deficit/fingerprint, is that evidence of structural stasis rather than insufficient randomization?

Historical progress-conditioned continuation and retry-fingerprint work belong here. This keeps “randomization closed” from becoming “landscape diagnostics irrelevant.”

### J. Partial-order commutativity and permutation waste

Archaeology shows residual-interface tooling counted potential commuting candidates but never performed the decision-bearing swap/replay test. The missing semantic question deserves its own row:

> When two obligation excursions are independent conditional on an interface, can the solver avoid searching both orders, or choose order later without losing capability?

This is adjacent to joint feasibility and decomposition but not identical. One proves incompatibility; the other proves interchangeable order.

### K. Forced-chain / certified macro traversal

Historical SolverV2 work did inline one-successor traversal. The first register omitted this premise entirely. The modern question is not “corridors are cheap” but:

> After full dynamic legality/pruning, how much current work occurs in states with exactly one legal successor, and can certified traversal compress control overhead without skipping any transition semantics?

This is mostly a speed/power premise, but under a finite envelope it can indirectly create solve headroom and belongs in the map.

### L. Historical dead tooling as evidence of unanswered questions

The archaeology contract correctly treats dead tooling as a record of an unanswered question until the question itself is shown answered. The premise atlas should encode this explicitly. Otherwise a removed flag/script silently collapses from “dirty/unresolved” to “never existed,” re-creating the historical blind spot the archaeology programme was built to prevent.

### M. Exact-model support as an epistemic selection effect

The mechanic-state contracts show heterogeneous external exact support. Static regular filters are unsupported in the maintained full CP-SAT probe; other mechanics have exact encodings with different validation depth. Therefore the exact-labelled populations used to generate new premises are not neutral samples of Pathfinder semantics.

Questions that are easiest to ask with the exact model can become overrepresented in the queue. Every exact-derived premise should track **model support coverage** and ask whether unsupported mechanic combinations form a systematically different hard residual.

### N. Adversarial counterexample generation as a premise-search tool

Future work already preserves adversarial counterexample generation. It deserves explicit placement in the epistemic layer:

> Given a frozen solver belief/descriptor/prune/equivalence claim, can levels/states be generated to maximize disagreement between that belief and exact reality?

This is distinct from generating broadly representative corpora. Its purpose is to break premises cheaply and reveal missing dimensions.

## 4. Relation ontology

The premise graph needs typed edges. Minimum useful relation types:

| Relation | Meaning |
|---|---|
| `SEMANTIC_PARENT` | broader question whose one tested descendant must not be conflated with it |
| `TESTED_FORM_OF` | concrete mechanism/descriptor/implementation testing a parent premise |
| `SUPPORTS` | evidence increases confidence without proving |
| `FALSIFIES_SCOPE` | closes the stated scope/form |
| `NARROWS` | negative evidence removes one formulation but leaves parent open |
| `PREREQUISITE` | question cannot be interpreted/acted on until another is answered |
| `ENABLES` | positive answer creates a new meaningful downstream question |
| `CONSUMES` | mechanism acts on a fact produced elsewhere |
| `SUBSTITUTES_FOR` | competing way to supply similar capability |
| `COMPLEMENTS` | conjunction can create capability absent from either alone |
| `CAUSAL_PREDECESSOR` | earlier loss in the solve pipeline blocks relevance of later repair |
| `OBSERVES` | measurement/probe diagnoses another premise but does not itself change search |
| `CONSTRAINS` | result bounds legal/safe/economic implementation space |
| `REOPENS_ON` | changed condition that makes a closed/deferred question live again |
| `SUPERSEDES` | newer evidence/definition replaces an older interpretation |
| `EVIDENCE_DEPENDS_ON` | verdict validity depends on delivery, dose, model support, population, etc. |

The original graph's 57 untyped edges are therefore best treated as a seed, not the finished conceptual map.

## 5. High-value newly explicit premises

These should be added to the register in the next schema revision.

| Proposed ID | Premise/question | Main locus | Claim type | Weight |
|---|---|---|---|---|
| P151 | Intended treatment participation must be verified at the final consumer before causal verdicts. | measurement | correctness | very high |
| P152 | Lifecycle/winner attribution must preserve the actual action/stage/config that produced the solve. | measurement | correctness | high |
| P153 | Natural exhaustion and budget censoring are causally different outcomes for continuation value. | scheduling | sufficiency/economics | high |
| P154 | Predecessor/execution context can change an action's value; isolated action identity is not enough. | scheduling | composition | high |
| P155 | Root-static preprocessing may be insufficient; state-conditioned graph facts may carry new capability. | preprocessing | expressivity | high |
| P156 | Sound state dominance may compress search where exact equality is rare and lossy merge is unsafe. | state retention | expressivity/correctness | high |
| P157 | Hardness may be driven by competition for shared future resources across mechanics. | global feasibility | causality | very high |
| P158 | Exact/reference-model support coverage conditions which premise populations can be labelled. | evidence | generalization | high |
| P159 | Exact-query tractability/value may be predictable from current residual structure. | exact micro-query | economics/selection | high |
| P160 | Multiple start gates may define complementary basins and deserve explicit allocation/transfer analysis. | source/routing | prevalence/economics | medium |
| P161 | Solution multiplicity/regime volume affects search difficulty and witness-relative diagnosis. | problem semantics | causality/observability | high |
| P162 | Positive solve-local facts (forced relations, contracts, exact answers) may be worth sharing, not only failures. | memory/communication | persistence | high |
| P163 | Future obligations may compete for spatial/axis/corridor capacity even when each scalar bound passes. | global feasibility | composition | very high |
| P164 | Individually correct mechanic state contracts may still omit useful cross-mechanic derived relations. | representation/inference | composition | high |
| P165 | Seed/restart sensitivity can distinguish rugged search basins from semantic/representation gaps. | diagnosis | observability | medium-high |
| P166 | Broad randomization may be closed as treatment while stochastic landscape diagnostics remain open. | research closure | generalization | medium |
| P167 | Operational-similarity measurements are policy-conditioned and trace-censored. | diagnosis | observability/generalization | high |
| P168 | Adversarial counterexample generation can search premise space by maximizing solver-belief/exact-reality disagreement. | research method | falsification | high |
| P169 | Partial-order commutativity can eliminate redundant obligation permutations without claiming full state equivalence. | composition/search | expressivity | high |
| P170 | Certified one-successor macro traversal may recover finite-envelope work without changing search choices. | execution/search | economics | medium |
| P171 | Dead/removed tooling can preserve an unresolved premise even when the implementation is gone. | archaeology | observability | high |
| P172 | Early-success/first-match execution censors evidence about later actions on already-solved levels. | evaluation | observability | medium-high |
| P173 | Hand-tuned routing thresholds are themselves hypotheses about structural regime boundaries. | routing | causality/generalization | high |
| P174 | Abrupt threshold boundaries may misroute structurally adjacent levels unless the regime transition is real. | routing | correctness/causality | medium-high |
| P175 | Counterfactual solved-set churn is evidence about hidden capability exchange even when net solve count rises. | evaluation | observability | high |
| P176 | A level's solution-space topology/volume may be a better notion of intrinsic difficulty than current surface descriptors. | problem semantics | causality | medium-high |

## 6. Important newly visible relationships

A few examples of why typed relations matter:

- `P151 delivery fidelity` **EVIDENCE_DEPENDS_ON** every mechanism verdict whose option/flag can silently fail to participate.
- `P153 censoring vs exhaustion` **PREREQUISITE** continuation-value and scheduler claims.
- `P155 dynamic preprocessing` **ENABLES** topology-aware bounds, separator contracts, and state-conditioned exact-query triggers.
- `P156 state dominance` is a **SUBSTITUTES_FOR** / middle ground between exact transposition and heuristic coarse merge.
- `P157/P163 shared-resource contention` are **SEMANTIC_PARENT** to future-intersection commitments, separator-interface capacity, and several mechanic-specific joint-feasibility descendants.
- `P161 solution multiplicity` **CONSTRAINS** witness-relative first-loss lineage because a single accepted witness may be atypically narrow.
- `P158 exact-model support` **EVIDENCE_DEPENDS_ON** every LIVE/DEAD premise mined from exact-labelled populations.
- `P167 trace censoring` **EVIDENCE_DEPENDS_ON** operational-redundancy conclusions.
- `P168 adversarial generation` **OBSERVES/FALSIFIES_SCOPE** representation, pruning, equivalence, routing and descriptor premises.
- `P169 commutativity` **COMPLEMENTS** decomposition and joint feasibility: one proves interchangeable order, another proves compatible existence.
- `P173 routing thresholds` **TESTED_FORM_OF** the broader premise that a small static feature partition can predict action value.

## 7. Mechanic-resource coupling map

This is more useful than an exhaustive pairwise mechanic matrix.

| Shared future resource | Mechanics/semantics touching it | Existing reasoning | Thin question |
|---|---|---|---|
| cell/visit capacity | intersections, must-pass, must-cross, surround, goal/path length | exact visits + local bounds | competing future claims on the same cells/regions |
| H/V axis capacity | edge usage, must-cross, filters, intersections | exact local legality, selected must-cross propagation | joint future axis allocation / dominance |
| turn/chirality opportunities | must-turn, adjacent-turn, filters, crossings | narrow deadlock/bounds | whether several future turn obligations compete for the same approach geometry |
| global order/parity | flipping filters, portal-mediated route order, obligation sequence | exact current flipper state | feasibility of future order classes / commutativity |
| path-length budget | all geometry, portals alter counted length | strong scalar distance/bounds | spatially constrained allocation of length among competing obligations |
| corridor/separator capacity | obstacles, used path, gates, portals, required regions | static/residual connectivity; separator census | path-conditioned interface contract and multi-obligation congestion |
| intersection opportunity capacity | required intersections, must-cross, revisit/axis use | exact count + local crossing guidance | assignment of remaining intersections to realizable sites/axes |
| completion regime/topology | whole path history | controlled topology forks | compact or per-instance relation preserving distinct futures |

This table should become a standing premise generator: when a hard cohort is found, ask **which future resource is overcommitted or poorly represented?** before inventing another score.

## 8. Revised interpretation of the negative space

The first pass said the repo had intensely searched one shelf. The second pass sharpens that statement.

The dense territory is not simply “forward search.” It is specifically:

> **individual-state, forward, progress-oriented, scalar/local evaluation under a mostly fixed action grammar.**

The thinnest territory is now better characterized as:

> **relations among alternative futures; resource competition among obligations; partial orders/dominance; causal explanations of failure; solution-space multiplicity; adaptive acquisition of information; and the evidence conditions required to know any of those things reliably.**

That is a more precise boundary than an algorithm list.

## 9. What should change in the durable atlas

1. Keep the original 92 propositions; do not renumber them.
2. Add P151-P176 above after source reconciliation.
3. Add orthogonal fields to the register: `claim_type`, `scope`, `system_locus`, `evidence_dependencies`, `mechanic_resources`.
4. Replace untyped graph edges with typed relation objects while preserving the original edge set as ancestry seed data.
5. Add a mechanic-resource coupling view.
6. Add a completeness matrix that marks each `system locus × claim type` cell as populated, thin, or empty.
7. Distinguish **unasked**, **asked only implicitly**, **asked under obsolete architecture**, **tested with invalid participation**, **tested on a narrow population**, and **semantic parent genuinely closed**.
8. Treat a premise map as versioned evidence. Production-boundary changes can change prevalence and economics without changing the semantic parent question.

## 10. Second-pass confidence statement

This pass materially expands the first one because it searched the *space implied by the categories*, not only the repository vocabulary that populated them. It also reconciled the current architecture, archaeology contract, capability-memory doctrine, operational taxonomy, mechanic-state contracts, scheduling policy, live workstream authority, and per-instance relational-feasibility preflight.

There will still be undocumented conversational ideas and obscure stale-report one-offs. The practical goal is now stronger than “find every sentence ever written”: the refined ontology should make a genuinely novel premise land in an identifiable empty/thin cell, making future omissions visible instead of silent.
