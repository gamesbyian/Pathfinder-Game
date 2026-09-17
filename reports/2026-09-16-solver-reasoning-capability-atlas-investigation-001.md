# Solver reasoning-capability atlas investigation 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-17 — current `main`, including the since-merged separator census (PR #1827) and fresh sibling harvest (PR #1829) results.
> **Decision:** add a durable reasoning-capability atlas; do not create a new workstream or promote a production treatment from the atlas itself.
> **Remaining gate:** use the atlas to classify future premises and reconcile newly exposed semantic gaps against current evidence before spending compute.

## Question

Can the repository build a useful map of what the solver **can reason about and do**, not merely which named configurations solve which levels, and can that map expose missing capabilities that generate new solve-acquisition premises?

## Method

The investigation deliberately separated two passes.

### Pass A: architecture and puzzle semantics

Read current solver architecture/state/pruning/search/repair contracts and mechanic-state semantics without using the current residual as the ontology. The unit of analysis was a **semantic primitive** rather than a function, flag, profile, or experiment name.

For each primitive, ask:

- what information exists;
- what fact is derived;
- whether the fact is exact/sound/heuristic/lossy;
- how facts compose;
- how long knowledge survives;
- what decisions it can trigger;
- whether commitments can be selectively revised;
- whether one search process can communicate the fact to another.

Separately derive a problem-side demand model from Pathfinder's history-sensitive path semantics and obligations.

### Pass B: repository-evidence overlay

Only after the architecture/problem map was formed, reconcile it with:

- solver capability memory;
- technique operational taxonomy;
- old heuristic capability-gap analysis lineage from PR #1333 and descendants;
- current workstream/future-work authorities;
- controlled topology result;
- H1, DEAD-core, H2/H3 and behavioral-quotient outcomes;
- moonshot architecture harvest;
- current separator/decomposition census work (PR #1827, unmerged at investigation time).

This ordering avoided letting the active queue define the capability ontology.

## Existing repo answers that must not be duplicated

The investigation confirms that several apparent deliverables already exist.

1. **Outcome capability is already mapped.** `solver-capability-memory.md` distinguishes production disposition from capability signature, preserves complementary gains/losses, and treats displaced/historical basins as premise sources.
2. **Operational diversity is already mapped.** `solver-technique-operational-taxonomy.md` prevents profile/config names from masquerading as distinct algorithms.
3. **Mechanic state semantics are already mapped.** `mechanic-state-contracts.md` records the dynamic state shape, history dependence, connectivity/win effects, and exact-model support for mechanics.
4. **Architecture alternatives are already harvested.** the moonshot report names conflict learning, CEGAR, exact micro-solving, complete-path LNS, backward abstraction, decomposition, behavioral quotients, optionality, blackboards and per-level compilation.
5. **An earlier capability-gap pass exists.** PR #1333's August analysis already identified the broad asymmetry that local progress was much richer than future opportunity-cost reasoning. Several descendants were then tested/promoted/closed.

A new document therefore had to operate one layer deeper: **reasoning primitives and missing semantic operations**.

## Implementation-grounded findings

### Rich current territory

The solver has strong representation and machinery for:

- exact current prefix/path history needed by native mechanics: visit counts, per-cell axis usage, exact intersection count, pending/satisfied masks, flipper and portal state;
- exact local move legality;
- static adjacency and distance preprocessing;
- scalar necessary conditions: remaining length/intersections, goal distance/parity, per-family lower bounds;
- residual connectivity and several mechanic-specific irreversible-deadlock deductions;
- local move ranking with a broad scoring vocabulary;
- multiple forward-prefix search controls: DFS/LDS, beam width/retention/coarse grouping, admissible-order;
- a genuinely different randomized repair/elite/splice search mode;
- staged attempt/routing policy;
- exact terminal validation.

This confirms that another scalar scorer/profile is a poor generic explanation for the unsolved frontier.

### Important correction: solve-local memory is not absent

The initial methodology risked overstating a "memory gap". `repair-search.ts` already maintains elites/plateau state and uses `nogood-cache.ts`.

The cache is intentionally weak epistemically: it stores a detailed repair-state signature only after one prior randomized continuation failed, is scoped to one repair call, is not an UNSAT proof, and does not claim future-state equivalence. Therefore the surviving gap is **generalized causal failure knowledge**, not memory in the abstract.

### Persistence topology

Useful information mostly remains near the process that produced it:

`move -> branch -> frontier -> attempt -> stage -> invocation`

DFS backtracking changes branch but does not retain a causal explanation. Beam retains alternative prefixes but not reusable proof objects. Repair retains local experience within one call. Research beam continuation can preserve a live frontier exactly, but normal production stages do not use a general shared continuation/proof substrate. Offline capability memory is researcher evidence, not solve-local knowledge.

### Decision/revision topology

The architecture can:

- choose a child;
- retain several prefixes;
- broaden discrepancy;
- backtrack;
- restart;
- splice from an elite prefix;
- switch to later attempts/stages.

It does not have a first-class representation of an earlier **causal commitment** plus an operation that says "this commitment caused the contradiction; revise that one while preserving unrelated structure." This distinction survives the presence of repair.

## Problem-demand coverage result

The strongest coverage is local/state-exact and scalar/necessary-condition reasoning. The weakest coverage is relational and compositional.

### Strong / substantially covered

- local path/mechanic legality;
- exact length/intersection accounting;
- geometric reachability and residual connectivity necessary conditions;
- individual obligation travel-cost lower bounds;
- several mechanic-specific hard consequences;
- local choice ordering and forward-search diversification;
- escape from some deterministic commitment through beam/LDS/repair.

### Weak / missing semantic operations

1. **Joint future realizability:** prove that individually feasible obligations cannot coexist under any remaining order/interface assignment.
2. **Completion-regime representation:** hold multiple abstract ways of finishing before committing geometry.
3. **Actionable path-history topology:** derive generic completion-relevant relations from full path history beyond existing local mechanic/connectivity facts.
4. **Generalized causal failure knowledge:** extract a conflict/core/reason that applies across syntactically different states, not only an exact-ish repair signature.
5. **Selective commitment revision:** target the commitment responsible for failure rather than generic backtracking/restart/splice.
6. **Region/interface decomposition:** summarize local possibilities in contracts and compose them without replaying full monolithic history.
7. **Alternative search objects:** backward completion contracts, abstract plans, or relaxed complete paths are not production search objects.
8. **Cold exact micro-knowledge:** exact/reference machinery is mostly offline, not a bounded current-invocation service.
9. **Cross-process knowledge communication:** DFS/beam/repair do not exchange general typed facts/proofs/conflicts during a solve.
10. **Architecture compilation:** routing selects among a mostly fixed library rather than deriving a bespoke reasoning plan from current-level structure.

## Reconciliation with recent experiments

### H1 negative does not close joint-feasibility reasoning

The frozen H1 experiment closed one compact recurring event vocabulary as a universal descriptor. It does not establish that per-instance joint future feasibility is unhelpful, especially when exact/current-input procedures may derive board-unique relations.

The atlas therefore retains **joint future realizability** as an inference/composition gap while recording the tested H1 form as closed.

### Topology evidence is unusually direct

The same-board/same-endpoint controlled topology fork produced exact LIVE/DEAD siblings differing by a full topological turn under matched ordinary mechanic-progress controls. This is direct evidence that current path history contains completion-relevant information that the ordinary decision vocabulary does not fully express.

The gap should therefore be framed as "derive a sound actionable topological consequence" rather than "invent another topology feature."

### DEAD-core remains conceptually distinct from existing repair nogoods

The current repair cache remembers one failed continuation from a detailed signature. A minimal causal DEAD core, if it exists, would generalize over many syntactically different prefixes and could support pruning/backjumping/communication. The first DEAD-core population was too small and is explicitly population-limited rather than a closure of that semantic premise.

### Decomposition is now an evidence-bearing gap

The architecture inventory independently identifies missing region/interface composition. PR #1827's pending separator census reports 121/390 Class-5 rows with a non-trivial balanced width<=4 static/mechanic-aware separator, while deferring path-history-conditioned interfaces and contract-size questions. Because the PR was unmerged at investigation time, this report treats those counts as pending rather than current authority. If merged, they strengthen the prevalence premise but still do not establish tractable interface contracts.

### Complete-path LNS remains an independent search-object test

The atlas reaches the same semantic absence as the moonshot report without starting from that report: current search overwhelmingly manipulates valid prefixes/reconstructed prefixes, not globally complete relaxed candidates. This independent convergence strengthens the rationale for the already-planned **cheap structural-distance falsifier**, not for immediate LNS implementation.

## Gap taxonomy adopted

The durable atlas uses nine categories:

- REPRESENTATION
- INFERENCE
- COMPOSITION
- PERSISTENCE
- ACTION
- REVISION
- EXPOSURE
- POWER
- ARCHITECTURAL

Communication is tracked as a capability dimension and can be recorded alongside the primary gap labels. This avoids treating every failure as "needs a new heuristic."

Examples:

- Class-3 exact-action dose ambiguity -> **EXPOSURE**, not semantic incapacity.
- inadequate work for a sound existing method -> **POWER**.
- topology fact not represented/derived -> **REPRESENTATION + INFERENCE**.
- independently reachable obligations not jointly reasoned about -> **COMPOSITION + INFERENCE**.
- no complete-path/abstract-plan search -> **ARCHITECTURAL**.

## Priority interpretation

This atlas is deliberately **not** a new queue and does not reorder current earned gates by itself.

The most interesting premise generators are the places where independent architecture analysis and empirical evidence intersect:

1. path-history topology -> already directly evidenced;
2. decomposition/interface composition -> census-gated, with pending positive static/mechanic prevalence evidence;
3. causal failure/core learning -> population-limited, fresh sibling asset is the right next evidence source;
4. joint future realizability -> conceptually strong, but the first compact H1 language failed;
5. selective commitment revision / alternative search objects -> high-upside architecture nursery, cheapest falsifier first;
6. cold exact micro-reasoning -> legal under level-blindness but must earn economics.

## Decision

Create `docs/solver-reasoning-capability-atlas.md` as a stable descriptive map and use it when generating/reviewing future solve-acquisition premises.

Do not create another workstream. Do not reinterpret the atlas's empty cells as permission to implement moonshots. The operational rule is:

> **Name the missing semantic operation first, classify the gap, reconcile prior evidence, then run the cheapest falsifier of that premise.**

The investigation's substantive conclusion is that Pathfinder's current solver is not short of local heuristics. Its most plausible conceptual frontier is the set of operations that reason about **relations among futures, causal failure, topology, decomposition and revision**.