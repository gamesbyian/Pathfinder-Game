# Solver first-loss causal taxonomy

> **Status:** premise-space diagnostic instrument; not an execution queue.
> **Purpose:** classify the earliest event at which all referee-valid completions become inaccessible to the production search state, while distinguishing causal loss from harmless divergence from one accepted witness.

## Governing question

For a current unsolved level, **what is the earliest causal event at which no referee-valid completion remains accessible to the actual production search process under its remaining legal actions, retained state, and work envelope?**

This is stricter than “where did production first differ from a known witness?” A witness-relative divergence is only causal if the divergence destroys every still-accessible accepted continuation, or if a minimal counterfactual change at that decision restores at least one accepted continuation.

## Why the distinction matters

Pathfinder has exact LIVE/DEAD state work, first-divergence studies, accepted-path sensitivity, topology forks, residual classes, capability censuses, beam-cull evidence, and repair-side diagnostics. Those answer pieces of first-loss under different names. None alone identifies a universal first irreversible causal event.

A level with many completion regimes can diverge from one witness almost immediately while remaining richly LIVE. Conversely, a branch can remain locally legal and highly ranked long after an earlier commitment has made every valid completion impossible. The causal event can therefore precede the first observed DEAD state.

## First-loss classes

The classes are ordered causally, not by implementation ownership. A later class should not be assigned until earlier classes are excluded for the same miss.

| Class | First irreversible event | Core question | Typical evidence | Parent premise families |
|---|---|---|---|---|
| F0 semantic/input mismatch | valid completion is excluded by normalization, mechanic semantics, or acceptance model before search | does production solve the same problem the referee defines? | canonical validation, mechanic contracts, normalization audit | correctness / acceptance |
| F1 representation absence | distinction needed to preserve a valid future is not represented | do two production-equivalent states have different completion sets? | controlled LIVE/DEAD siblings, topology forks, quotient counterexamples | state sufficiency, topology, knowledge state |
| F2 source/action absence | needed successor, start, relation, or search object is never generated | was a valid future reachable under the action grammar? | source census, replay, alternate-object probe | candidate reachability, gates, search objects |
| F3 unsound rejection | a still-LIVE future is pruned or rejected as impossible | did an exact/referee-valid continuation exist at rejection? | exact replay, prune-gap labels, witness checks | local/global inference correctness |
| F4 antecedent commitment | an earlier choice makes a later sound rejection inevitable | which earlier commitment minimally caused future infeasibility? | counterfactual replay, minimal relaxation/core, dependency analysis | causal revision, joint feasibility |
| F5 ranking suppression | useful futures are generated but systematically assigned too little priority | would adequate retention/work have preserved a LIVE regime? | rank traces, matched LIVE/DEAD siblings, counterfactual queue replay | scoring, partial orders |
| F6 retention/merge extinction | last accessible representative of a completion regime is dropped or conflated | did frontier policy extinguish the final LIVE representative? | beam-cull replay, merge counterexamples, regime census | diversity, dominance, coarse merge |
| F7 work starvation | a still-accessible LIVE future remains represented but receives insufficient work | was the needed continuation censored rather than naturally exhausted? | deterministic work replay, resumability, continuation curves | budgets, scheduling |
| F8 routing/deployment miss | capability exists but is not invoked, placed, or sequenced where needed | would a known capable action solve under legal current-instance routing? | capability memory, route replay, treatment participation | routing, placement, dose |
| F9 repeated-known-failure | search re-enters a failure relation already derivable within the invocation | could retained proof/fact have prevented rediscovery? | solve-local rediscovery audit, repeated conflict fingerprint | memory, communication |
| F10 explanation failure | failure occurs but produces no reusable causal account | can a compact cause/core/constraint be derived? | DEAD cores, exact micro-query, dependency sets | causal explanation |
| F11 revision mismatch | a cause is available but repair/backtracking changes the wrong locus or scale | does revising the causal commitment restore LIVE status more efficiently than geometric rollback? | selective counterfactual repair, rollback-window studies | repair, backjumping, LNS |
| F12 handoff loss | state, frontier, proof, budget context, or knowledge is dropped between stages | did the downstream stage lack context already available upstream? | pause/resume equivalence, stage-interface replay | lifecycle handoffs |
| F13 terminal/validation rejection | production constructs an acceptable completion but terminal mechanics fail to count/return it | is the candidate referee-valid and lost only at termination/return? | canonical validator replay, terminal trace | acceptance / terminal logic |
| F14 measurement misdiagnosis | the solve/loss occurs correctly but research assigns the wrong cause or verdict | did instrumentation, early exit, selection, or attribution distort the conclusion? | participation audit, action identity, censoring/provenance audit | epistemic / attribution |

## Causal versus observational first loss

Three timestamps should be recorded separately whenever possible:

1. **first observed divergence** from a reference continuation;
2. **first exact DEAD state** encountered on the production lineage;
3. **earliest minimal causal commitment** whose counterfactual revision restores at least one accepted continuation.

They need not coincide. Treating them as equivalent silently biases research toward the easiest event to instrument rather than the actual source of the miss.

## Counterfactual requirement

A strong first-loss claim should state a minimal intervention whenever practical:

- retain this frontier representative;
- do not perform this merge;
- allocate this additional tranche without resetting the frontier;
- choose this alternative obligation order;
- relax or revise this commitment;
- preserve this solve-local fact across the handoff;
- invoke this already-capable action here;
- or change this action grammar/search object.

The intervention need not be production-worthy. Its purpose is causal identification.

## Relation to current research

Existing research partially populates the taxonomy:

- exact LIVE/DEAD sibling work and topology forks primarily inform F1/F4;
- candidate/source and generator studies inform F2;
- prune-gap and correctness hardening inform F3;
- scorer/ranking/first-divergence work informs F5;
- beam coarse merge, mechanic buckets and Card-E style culls inform F6;
- scheduler, deterministic budgets and resumability inform F7;
- capability memory, placement, retry, and Class-3/4/5 work inform F8;
- solve-local rediscovery and future proof-store questions inform F9;
- DEAD cores and relational feasibility inform F10;
- repair rollback/dependency work informs F11;
- production frontier disposal plus cross-process capability gaps make F12 newly explicit;
- canonical validation and terminal audits cover F13;
- research operating-model, selection provenance, trace censoring, and treatment-delivery audits cover F14.

The important negative conclusion is that **no single existing line establishes the distribution of first-loss classes across the current residual**. Therefore mechanism prevalence remains open even where individual classes have strong examples.

## Required record for a first-loss sample

For each sampled miss, record as available:

- level and population provenance;
- accepted-witness multiplicity caveat or alternate-witness coverage;
- production gate/attempt/action sequence;
- earliest observed divergence;
- earliest exact LIVE→DEAD boundary if labelable;
- candidate/source presence before loss;
- prune/merge/retention event identities;
- work censoring versus natural exhaustion;
- route/deployment participation;
- repair accessibility;
- terminal/referee outcome;
- minimal counterfactual intervention, if established;
- unresolved earlier classes that prevent a stronger causal assignment.

A row may remain `UNRESOLVED_EARLIER_CLASS`; forcing a later label would be worse than leaving causality unknown.

## Premise generator

Each first-loss class yields two distinct questions:

1. **prevalence:** how much of the residual reaches this class as its earliest causal failure?
2. **exploitability:** what is the cheapest legal change that preserves or restores at least one valid completion after this loss?

This prevents a familiar category error: demonstrating that a mechanism can matter on one state does not establish that it explains enough current misses to deserve production work.