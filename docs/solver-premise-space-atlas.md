# Pathfinder solver premise-space atlas

**Date:** 2026-09-16  
**Scope:** premises, open questions, speculations, implicit architectural assumptions, negative conclusions, and epistemic assumptions relevant to increasing solve count.  
**Inventory:** 92 normalized propositions across 14 conceptual domains.  
**Companion data:** `pathfinder-solver-premise-register.csv` and `pathfinder-solver-premise-graph.json`.

## What this map is for

The repository already has excellent local maps: the active workstream queue, a sparse question-relation graph, capability memory, technique taxonomy, archaeology, level-blindness doctrine, and the new reasoning-capability atlas in PR #1828. None of those is intended to answer the broader question here: **what assumptions have structured solver development, where has research attention accumulated, and what conceptual territory remains thin or invisible?**

This atlas therefore treats a premise as any proposition that constrains where new solves are expected to come from. It includes explicit hypotheses, deferred ideas, closed tested forms, design assumptions embedded in architecture, experimental assumptions about what counts as evidence, and assumptions implied by what the solver repeatedly chooses to measure.

“Unasked” below means **I found no explicit, adequately isolated version in the inspected authorities**, not that nobody ever thought the thought. A historical negative is not promoted to a universal negative unless its population, mechanism, work contract and architecture justify that scope.

## The main structural finding

The solver's idea-space is markedly lopsided.

The **densest** region is forward-prefix search: local legality, scalar necessary conditions, move ordering, beam retention, retries, staged budgets, and repair. This territory has many explicit hypotheses and many well-bounded negatives.

The **thinnest high-leverage** region is the machinery that would answer five questions before another scorer is invented:

1. **Where, exactly, is each unsolved level first lost?** Candidate absent, unreachable, pruned, merged, ranked out, budget-starved, repair-unreachable, validator-rejected, or evaluation-misclassified?
2. **Does the current state representation preserve every fact needed to choose correctly?** In particular, path-history topology, completion regimes, learned conflicts and future behavioral equivalence.
3. **Can the solver reason about several future obligations jointly rather than scoring them independently?**
4. **Can failure become reusable knowledge and targeted revision inside the same solve?**
5. **Can the solver change its search architecture or information-gathering behavior in response to what it learns about the current level?**

Those five form a conspicuous “missing middle” between exact local mechanics and broad heuristic search power. The latest capability atlas independently points at much of the same boundary, which is useful confirmation rather than a reason to stop there.

## Map 1: the causal pipeline of a solve

```text
CURRENT PUZZLE
    |
    v
[normalize / represent] -- information erased? ---------------------------- P010-P016
    |
    v
[candidate / relation source] -- target absent? --------------------------- P020-P024
    |
    v
[exact local inference / pruning] -- live branch killed? ------------------ P030-P037
    |
    v
[ordering / scoring] -- live branch consistently undervalued? ------------- P040-P045
    |
    v
[frontier retention / merge] -- live future extinguished or conflated? ---- P050-P053
    |
    v
[budget / routing / restart] -- right capability never gets enough work? -- P060-P067
    |
    v
[search object / architecture] -- wrong problem decomposition entirely? --- P070-P077
    |
    v
[failure / revision / communication] -- same contradiction rediscovered? - P080-P084
    |
    v
[global obligation composition] -- individually feasible, jointly dead? --- P090-P093
    |
    v
[repair / continuation] -- near-solution destroyed instead of edited? ----- P100-P102
    |
    v
[validator / benchmark] -- legitimate solve not counted? ------------------ P001-P006, P150
```

The most important missing instrument is a **witness-relative first-loss lineage** (P135). Without it, mechanism selection is partly guesswork: a ranker cannot help a source-absent target; more budget cannot repair an unsound merge; topology reasoning cannot help a validator mismatch. The repo has increasingly good fragments of this diagnosis, especially exact LIVE/DEAD sibling work, first-divergence studies and residual classes, but not one unified per-miss causal ledger.

## Map 2: three strata of premise

### Mechanism premises

These ask whether a particular operation produces new solves: ordering, portal coarse merging, repair, joint-feasibility checks, exact micro-queries, candidate expansion, routing, etc. This is the best documented stratum. It contains most frozen A/Bs and most explicit reopen conditions.

### Architecture premises

These ask whether the *form of the solver* is adequate: forward prefix as dominant search object, scalar scores as decision objects, residual-state equality as future equivalence, backtracking as sufficient revision, static routing as sufficient adaptation, and independent mechanic bounds as sufficient global reasoning. Several of the largest remaining gaps live here because architecture premises are usually inherited rather than experimentally introduced.

### Epistemic premises

These ask whether research can actually know what it claims to know: whether a benchmark population is representative, work doses are comparable, a zero solve delta closes a signal, old negatives survive architecture changes, accepted witnesses are representative, and sparse solve count can expose mechanisms. This stratum has improved dramatically in the recent audit program, but it remains the easiest place for an apparently “closed” region to be closed too broadly.

## Research-density map

| Conceptual region | Historical/current attention | Evidence maturity | Remaining solve leverage | Character of empty space |
|---|---:|---:|---:|---|
| Local legality / scalar pruning | Very high | High | Medium | mechanic-specific exactification |
| Move ordering / scalar ranking | Very high | High/mixed | Medium | rank-to-solve conversion, trust estimation |
| Beam retention / coarse merge | High | High/mixed | Medium-high | behavioral equivalence, regime-aware retention |
| Generic budget / retries | High | High | Low-medium | only after power diagnosis |
| Repair | High | Medium-high | High | causal revision, complete-structure preservation |
| Candidate/source reachability | Medium | Mixed | High | per-miss source-absence census |
| Failure-locus diagnosis | Medium and fragmented | Medium | **Very high** | unified first-loss lineage |
| Path-history topology | Emerging | Medium | **Very high** | generic actionable per-instance relation |
| Joint future feasibility | Emerging | Medium-low | **Very high** | richer per-instance composition after H1 null |
| Failure explanation / conflict learning | Low-emerging | Low-medium | **Very high** | causal cores, reuse, backjumping |
| Alternative search objects | Low | Low | **Very high** | backward, relaxed complete path, plan hierarchy |
| Decomposition / interfaces | Emerging | Low-medium | **Very high** | separator contract size and composability |
| Adaptive online control | Low-medium | Low | High | failure-mode inference and mid-search rerouting |
| Cross-process knowledge sharing | Low | Low | High | typed solve-local handoff |
| Evaluation/oracle sensitivity | Medium | Medium | Medium-high | witness sensitivity, acceptance edge cases |
| Dataset / latent regimes | Medium-high | Medium | High | causal rather than descriptive stratification |

The shape matters more than the labels. Research has spent substantial effort **inside a fixed forward-search ontology** and much less effort asking whether that ontology exposes the right objects to score, merge, remember, revise, or route.

## Premise families and what the evidence currently says

### 1. “The answer is already there; search simply does not reach it.”

This family includes ordering, beam retention, retries, dose, mode routing and repair. It is demonstrably real on some populations. The promoted dead-last portal-coarse retry is strong evidence that **capability + placement** can produce large net gains even when a global version is unacceptable. The danger is overgeneralization: Class-5's zero reach from a bounded capability-memory union and the repeated ranking nulls say that some misses are not cheaply harvested by rearranging existing capability.

### 2. “The target or required relation is missing before search starts.”

Lexical expansion, normalization, external sources, LM proposal and graph construction live here. The key missing question is prevalence. These ideas should not be revisited generically until P024/P135 can identify a meaningful source-absent cohort.

### 3. “The solver cannot represent the distinction that matters.”

This is one of the largest open regions. Controlled topology forks establish that path history can matter beyond ordinary progress state. The atlas also exposes missing completion-regime objects, weak future-state equivalence and no solve-local epistemic state. If two prefixes look equivalent to the current controller but have different future solvability, no amount of tuning the existing scalar weights can fully repair the problem.

### 4. “The solver has the facts but does not compose them.”

Current production is strong at individual necessary conditions and narrow propagators. It is weak at proving that several individually feasible obligations cannot coexist. H1 closed one compact event vocabulary, not the broader premise. This region now deserves per-instance procedures and exact/relaxed composition tests rather than another universal low-dimensional descriptor.

### 5. “The solver learns too little from failure.”

Repair remembers exact-ish failed signatures locally. DFS and beam mostly respond to failure by backtracking, dropping a state or restarting. The missing capability is causal: identify the commitment or relation that caused impossibility, preserve that knowledge, communicate it, and revise selectively. This is the conceptual parent of conflict/core learning, causal backjumping and targeted path surgery.

### 6. “The dominant search object is wrong for some misses.”

Forward valid prefixes dominate. Repair is the main distinct production paradigm. Backward contracts, abstract completion plans, region interfaces and relaxed complete paths remain thinly explored. These are expensive architectural regions, so the right move is not to build all of them. The right move is to seek cheap falsifiers that prove one changes the geometry of a current hard residual.

### 7. “The correct capability exists but the controller deploys it badly.”

This family is now strongly grounded by the portal-coarse story and by dose/placement audits. The next conceptual step is dynamic control: infer the likely failure locus or uncertainty state *during* the solve and buy the appropriate reasoning/search primitive only then.

### 8. “The research apparatus is asking the wrong question.”

The repo has already corrected several forms of this: capability versus economics, stale evidence, comparable dose, and closed form versus closed parent premise. Remaining risks are aggregate populations, witness dependence, sparse solve-count objectives, selection bias from solved traces, and an ontology biased toward mechanisms that fit the existing pipeline.

## The most important underasked questions

These are the gaps that appear both high-leverage and relatively under-occupied after reconciling current authorities:

| ID | Question | Why it changes the map |
|---|---|---|
| P135 | For each miss, what is the first irreversible loss event relative to an exact accepted continuation? | Partitions the residual by causal mechanism rather than descriptive feature. |
| P148 | Is search-process knowledge part of the decision state? | Makes learned conflicts, uncertainty and previous failed evidence first-class rather than external bookkeeping. |
| P043 | Is a scalar score the wrong representation for strategically incomparable futures? | Explains why endless scorer work can move ranks without protecting the only viable regime. |
| P053/P141 | Should retention reason about a *set* of futures and their regime coverage, not top-k individual scores? | Reframes beam diversity from buckets to coverage of possible completions. |
| P063 | Can the solver infer its failure mode online and re-plan its own search? | Bridges diagnosis to capability deployment. |
| P082/P147 | Can failure identify and revise the causal commitment rather than merely backtrack? | Converts contradiction into focused progress. |
| P037/P142 | Can search buy information, not just progress? | Gives exact micro-queries and exploratory branches a principled role. |
| P070/P143 | Are valid forward prefixes sometimes the wrong intermediate object? | Opens relaxed planning and whole-solution repair without assuming a specific algorithm. |
| P090/P091 | Can individually feasible obligations be jointly impossible in a computable per-instance way? | Targets a major semantic gap left open by H1's frozen-vocabulary null. |
| P113 | Are residual classes better defined by causal failure locus than by surface structure? | Makes routing and experiment populations directly relevant to solve acquisition. |

## Premises worth deliberately inverting

A useful way to expose unseen territory is to negate an inherited assumption and ask whether the inverse could explain current misses.

| Inherited tendency | Inversion to test |
|---|---|
| Choose the best-looking next prefix. | Preserve or query the future whose *viability is most uncertain*. |
| State means puzzle configuration. | State also includes knowledge learned during this solve. |
| Failure means backtrack/restart. | Failure is evidence that can name a causal commitment and constrain future search. |
| Diversity means different local progress features. | Diversity means coverage of mutually exclusive completion regimes. |
| More context should become a better scalar score. | Some context should become categorical constraints, partial orders, or plans. |
| Exact methods are offline referees. | Exact reasoning can be a bounded purchasable subroutine. |
| Routing chooses a solver for a puzzle. | Routing can change repeatedly as the puzzle's inferred failure mode changes. |
| A solved trace is positive training data. | The most informative data may be counterfactual LIVE/DEAD siblings the production solver discarded. |
| Search traverses the candidate graph it is given. | Search may need to change the graph, abstraction, or search object itself. |
| Negative treatment result closes an idea. | It closes only the exact mechanism/population/work contract actually tested. |

## Missing interaction map

Many past experiments are intentionally isolated, which is good science but creates a second-order blind spot: solve acquisition is conjunctive. A solution must be represented, generated, survive exact pruning/merging, remain retained, receive enough work, and validate. Therefore the most plausible interaction questions are **adjacent repairs in this causal chain**, not arbitrary combinatorial sweeps.

High-value interactions include:

- broader candidate generation × target-aware failure-locus diagnosis;
- topology relation × state equivalence/merge policy;
- joint-feasibility inference × regime-aware retention;
- conflict/core derivation × selective backjump/revision;
- exact residual query × uncertainty-triggered budget controller;
- alternative search object × typed handoff to forward search/repair;
- causal residual subclass × dynamic architecture routing;
- capability-memory mechanism × non-displacing placement/allocation.

This gives a principled rule for future combinations: only test A×B when evidence says A repairs an earlier loss and B repairs the next loss, or when one exposes the conditions under which the other is useful.

## A research order that maximizes new premise generation

The goal here is not to prescribe the production queue. It is to maximize information about where future solves can come from.

**First:** build/extend P135, a stratified first-loss lineage on a manageable exact-labelled sample of current misses. Record source presence, reachability, first LIVE/DEAD divergence, pruning/merge, rank/retention, work cutoff, repair accessibility and validation outcome.

**Second:** use that lineage to create *causal residual classes*. This should prevent candidate-generation, ordering, topology, budget and validation questions from contaminating one another.

**Third:** on the largest nontrivial classes, run bounded architectural falsifiers rather than broad implementations: topology consequence derivation, joint-obligation exact micro-query, separator contract census, backward-interface size, complete-path local-repair reachability, causal-core prevalence.

**Fourth:** only after one of those proves a recurrent load-bearing distinction, design the cheapest action that can exploit it: prune, retain, route, revise, query, decompose, hand off or allocate.

**Fifth:** treat every negative as scoped data in the premise graph. Record what parent premise survives, what interaction it constrains, what changed architecture would reopen it, and whether it yielded a useful capability signature even with zero direct solves.

That sequence is deliberately diagnostic-first. The repo is now mature enough that the limiting resource is increasingly **premise quality**, not the ability to implement another mechanism.

## What “exhaustive” means here

This pass inspected the live/deferred question authorities and the latest unmerged capability-atlas work, then normalized their propositions rather than preserving file vocabulary. The companion register contains 92 propositions and is designed to be extended mechanically.

Coverage includes:

- explicit workstream/research questions and frozen negative forms;
- archaeology and deferred ideas;
- capability-memory implications;
- state-representation and level-blindness assumptions;
- latest semantic capability gaps from PR #1828;
- implicit premises created by the dominant forward-prefix architecture;
- epistemic assumptions about populations, work dose, evidence portability and sparse objectives;
- deliberately generated premise inversions and interaction gaps.

It cannot prove the absence of an undocumented speculation that existed only in a conversation or an abandoned branch. More importantly, it should make such omissions *detectable*: a new idea can be placed by causal stage, premise stratum and gap type, and genuinely empty cells remain visible.

## Source authorities reconciled

Primary conceptual sources used in this pass:

- `docs/solver-optimization-workstreams.md`
- `docs/solver-future-work.md`
- `docs/solver-research-question-relations.json`
- `docs/solver-archaeology-register.md`
- `docs/solver-capability-memory.md`
- `docs/solver-technique-operational-taxonomy.md`
- `docs/solver-level-blindness.md`
- `docs/solver-residual-state-representation.md`
- `docs/solver-solution-profile.md`
- `docs/solver-ablation.md`
- `docs/solver-benchmarking.md`
- PR #1828 branch: `docs/solver-reasoning-capability-atlas.md`
- PR #1828 branch: `docs/solver-capability-gap-stop-condition-reconciliation.md`

The register should be treated as a conceptual overlay, not a replacement queue. Active execution authority remains the workstream document.
