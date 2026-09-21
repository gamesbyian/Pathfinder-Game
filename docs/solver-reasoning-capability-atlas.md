# Solver reasoning-capability atlas

> **Status:** current research map; descriptive, not a production queue.
> **Purpose:** map the solver's semantic/reasoning capabilities against the computational demands Pathfinder can impose, so capability-acquisition work starts from missing operations rather than named algorithms.
> **Priority owner:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md). Deferred descendants: [`solver-future-work.md`](solver-future-work.md).
> **Evidence companions:** [`solver-capability-evidence.md`](solver-capability-evidence.md), [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md), [`mechanic-state-contracts.md`](mechanic-state-contracts.md), [`solver-aware-game-architecture.md`](solver-aware-game-architecture.md).

## Why this exists

The repository already has several maps of solver capability, but each answers a different question:

- capability evidence records demonstrated/complementary outcome capability;
- the operational taxonomy distinguishes genuinely different search behavior from renamed weight/config variants;
- solver architecture documents implementation and active search machinery;
- mechanic-state contracts document history-sensitive game semantics;
- the workstream/future-work authorities track live and deferred research premises;
- dated moonshot/topology reports enumerate architectural alternatives and specific earned gaps.

This atlas fills the remaining layer: **what kinds of facts can the solver represent, what conclusions can it derive, how long do those conclusions survive, what decisions can it make/revise, and which problem demands have no adequate current operation?**

A missing named algorithm is not a capability gap. State the missing semantic operation first; only then consider algorithms that could supply it.

## Capability dimensions

Use these dimensions when describing a solver primitive.

1. **Representation** — what current-level/current-prefix facts exist in state or prep data?
2. **Inference** — what new fact can be derived, and is it exact/sound, conservative, heuristic, or deliberately lossy?
3. **Composition** — can individually available facts be related to each other, or only evaluated separately?
4. **Persistence** — does the fact survive a move, branch, frontier, attempt, stage, or whole invocation?
5. **Action** — can it prune, rank, retain, allocate, restart, repair, resume, or terminate from the fact?
6. **Revision** — can a prior structural commitment be selectively reconsidered, or only abandoned by backtracking/restart/splice?
7. **Communication** — can one search process expose a reusable fact to another process during the same solve?
8. **Reachability** — is the capability production-active, opt-in/research-only, offline-only, or merely conceptual?

## Current semantic primitive inventory

This inventory is intentionally semantic rather than one-row-per-function.

| Primitive family | What the solver can know/do | Strength | Persistence / reach |
|---|---|---|---|
| Exact path/mechanic state | current path, visit counts, per-cell axis use, exact intersections so far, pending/satisfied landmark masks, portal/flipper history and incoming-history-sensitive state | exact current-state representation | branch/frontier; production |
| Static graph/distance preprocessing | adjacency, obstacle/gate exclusions, goal/objective distance maps, mechanic indexes | exact static facts / relaxed distances | invocation; production |
| Immediate legality | enumerate legal successors under path history/mechanics | exact | move; production |
| Scalar resource bounds | remaining length/intersection budget; goal distance/parity; must-pass/must-cross/surround/adjacent-turn lower bounds | sound necessary conditions | node; production |
| Mechanic-specific propagation | must-cross ceiling/forced first step/forced neighbor/neighbor-budget/portal-neighbor consequences; must-turn deadlock; selected parity consequences | sound but narrow | node; production or opt-in by form |
| Residual connectivity/volume | whether the residual graph still connects/reaches enough usable space under current state | sound necessary condition within its model | node; production |
| Soft local progress vocabulary | goal/objective attraction, mechanic urgency, crossing setup, anti-dither/revisit, portal-parity guidance, geometric ordering biases | heuristic | child ranking; production |
| DFS/LDS commitment search | explore forward prefixes, broaden allowed departures from greedy ordering | incomplete under finite work; complete only in the limiting search | attempt; production |
| Beam retention | keep many forward prefixes, rank/cull by score, preserve selected mechanic diversity | heuristic/incomplete | frontier/attempt; production |
| Deliberately coarse state grouping | group frontier states by a lossy mechanic signature, with near-tie preservation | explicitly not semantic equivalence | beam phase; production, portal form policy-dependent |
| Admissible-order search | order forward choices by admissible slack before soft tie-breaking | sound ordering quantity, incomplete search | attempt/stage; production late tier |
| Repair / iterated local search | randomized forward reconstruction, elite/splice restart, near-miss tracking, limited targeted continuation | heuristic/incomplete and genuinely different search paradigm | repair attempt; production |
| Repair-local experience cache | remember exact-ish failed repair-state signatures and avoid repeating one previous failed continuation | experience, not UNSAT proof | one repair call only; production repair |
| Beam continuation | pause and resume a live beam frontier exactly under the same owner state/prep | exact execution continuation | same process/attempt identity; research primitive, not normal production scheduling |
| Portfolio/routing | choose/search attempts from static level features and staged fallback policy | heuristic orchestration | stage/invocation; production |
| Candidate validation | independently validate a completed candidate against canonical rules | exact arbiter | terminal; production |
| External exact/reference reasoning | prove/label selected prefixes or whole instances under supported mechanics | exact where model support/validation allows | offline research; not current production search knowledge |

## Persistence topology

The solver does possess memory, but its useful knowledge mostly stays close to the process that produced it.

`move -> branch -> frontier -> attempt -> stage -> invocation`

- exact mechanic state follows a branch/frontier;
- DFS backtracking forgets causal explanations and merely changes branch;
- beam retains competing states but does not accumulate general proofs about why removed/dead states failed;
- repair keeps elites, plateau information and a per-call failed-state experience cache;
- beam resumability can preserve an execution frontier, but ordinary production scheduling still discards live frontier state at tranche end;
- production attempts/stages do not share a general proof/conflict/interface blackboard;
- offline capability evidence survives across experiments, but is evidence for researchers, not solve-local reasoning.

Therefore the live memory gap is narrower than "no learning from failure": **the solver has little sound or reusable abstraction of failure that generalizes across syntactically different branches or across search processes inside one invocation.**

## Problem-side demand model

The following demands are derived from Pathfinder semantics/search, not from the current residual taxonomy.

| Pathfinder demand | Current coverage | Atlas assessment |
|---|---|---|
| local move legality under path/mechanic history | exact transition/state machinery | **strong** |
| simple geometric reachability / remaining distance | distance maps + connectivity | **strong necessary-condition coverage** |
| exact length/intersection accounting | exact state + limits/deficit checks | **strong** |
| single-family obligation travel cost | mechanic lower bounds/MST-like bounds | **moderate/strong relaxed coverage** |
| mechanic-specific irreversible local deadlocks | several targeted propagators | **moderate, uneven by mechanic** |
| choose among locally plausible next moves | scoring profiles, structural ordering, DFS/LDS/beam | **very strong machinery; heavily researched** |
| preserve diverse partial futures | beam width, mechanic buckets, coarse merge, retries | **moderate but representation-specific** |
| escape deterministic forward commitment | LDS, beam, repair, retries | **moderate/strong composition capability** |
| relation among several future obligations | mostly separate bounds plus a few narrow joint propagators | **weak** |
| prove that individually feasible obligations are jointly unrealizable | no general online procedure | **major inference/composition gap** |
| represent alternate completion regimes/options before geometry commits | no first-class completion-regime object | **major representation/planning gap** |
| reason from goal/backward completion requirements | no production backward abstraction | **architectural gap** |
| topology/path-history facts beyond current mechanic masks | full path exists, but only narrow topology consequences are derived; controlled topology fork proves completion relevance | **representation/inference gap** |
| separator/region interface contracts and composition | static connectivity exists; decomposition contracts not production machinery | **architectural/composition gap** |
| explain a failed branch in reusable causal terms | repair exact-signature experience only; no general proof/core learning | **memory/inference gap** |
| selectively revise the commitment that caused failure | DFS backtracks, repair splices/restarts, but no explicit causal backjump/commitment edit | **revision gap** |
| preserve useful complete global structure while repairing a local defect | current repair remains prefix/reconstruction-centric | **search-object gap** |
| purchase bounded exact knowledge during a cold solve | exact/reference machinery is offline; no first-class production micro-query | **reachability/architectural gap** |
| share discovered facts among DFS/beam/repair/other reasoning processes | no general within-invocation typed handoff/blackboard | **communication gap** |
| compile a search procedure from current-level structure | coarse static attempt routing exists; architecture itself is mostly fixed | **weak/high-level planning gap** |
| recognize future-state equivalence/canonical form | exact identity is expensive/rare; coarse merge is deliberately lossy | **open representation gap, with strong negative evidence against naive forms** |

## Gap taxonomy

Use these labels when a new premise emerges.

- **REPRESENTATION** — a completion-relevant fact/relation is not encoded or derivable in the useful form.
- **INFERENCE** — required inputs exist but the solver never derives the useful conclusion.
- **COMPOSITION** — useful facts are available individually but not related jointly.
- **PERSISTENCE** — a useful conclusion is produced but discarded before it could guide later work.
- **ACTION** — useful knowledge exists but no operation exploits it.
- **REVISION** — the solver can make a commitment but cannot selectively reconsider the causal commitment.
- **EXPOSURE** — machinery exists but is not routed/reached/dosed where needed.
- **POWER** — the relevant machinery is conceptually adequate but receives too little generic search/work.
- **ARCHITECTURAL** — the useful search object or reasoning mode does not exist in the current solver family.

A candidate can carry several labels. Prefer the smallest semantic gap that explains the evidence.

## Highest-value gaps after repository reconciliation

These are not automatic queue promotions. They are the strongest structural absences after accounting for previous work.

### 1. Joint future-feasibility reasoning

The production solver is strong at separate necessary conditions: distance, parity, remaining length/intersections, per-mechanic lower bounds, connectivity and narrow forced consequences. It is much weaker at proving that **a set of individually feasible future obligations cannot coexist under any ordering/interface assignment**.

Gap labels: **INFERENCE + COMPOSITION**.

This survives the negative H1 exact form: H1 falsified one compact recurring event vocabulary, not the broader per-instance ability to derive joint realizability/impossibility from current input.

Potential descendants only after a positive premise: bounded exact micro-query, CSP/DP over interfaces, conflict/core derivation, CEGAR-style plan refinement, separator contracts.

### 2. Path-history topology as an actionable state relation

The solver stores the path/edge state required to reconstruct topology, but ordinary decision vocabulary does not turn that history into general completion-relevant topological relations. Controlled same-board/same-endpoint LIVE/DEAD forks established that topology can matter beyond matched ordinary mechanic-progress state.

Gap labels: **REPRESENTATION + INFERENCE**.

The next question is not "find a universal phase feature". It is whether a generic current-input procedure can derive a sound actionable consequence: path-conditioned accessibility, separator-side commitment, topology-aware equivalence/impossibility, or another per-instance relation.

### 3. Failure knowledge that generalizes beyond exact repair-state experience

Repair's nogood cache is real solve-local memory, but a hit means only "one previous continuation from this matching detailed signature failed". It does not extract a causal conflict, apply across many syntactically different prefixes, or communicate broadly to other search processes.

Gap labels: **INFERENCE + PERSISTENCE + COMMUNICATION**.

The DEAD-core line is therefore still conceptually distinct from the existing nogood cache even though its first tiny population was inconclusive/population-limited.

### 4. Selective commitment revision

DFS/LDS can backtrack; beam can preserve alternatives; repair can restart/splice from elites. None has a first-class representation of *which earlier commitment caused the contradiction* and a targeted operation that revises that commitment while preserving unrelated useful structure.

Gap labels: **REVISION + ACTION**.

Conflict-directed backjumping and complete-path local surgery are different possible descendants of this same semantic gap. The gap should not be pre-labelled with either algorithm.

### 5. Decomposition and interface composition

Current connectivity reasoning sees the residual graph globally, but there is no production notion of region contracts whose local possibilities can be solved/composed independently. This is especially meaningful when narrow separators make cross-region history compressible.

Gap labels: **REPRESENTATION + COMPOSITION + ARCHITECTURAL**.

The separator census is the correct cheap gate. Do not infer a decomposition solver merely from separator existence; the contract-state size and path-history dependence are the load-bearing questions.

### 6. Search-object diversity beyond forward prefixes

Production diversity is substantial inside the forward-prefix family, with repair as the strongest distinct paradigm, but the natural object remains overwhelmingly a valid prefix or reconstructed prefix. There is no active search over abstract completion plans, backward completion contracts, or relaxed complete paths.

Gap label: **ARCHITECTURAL**.

This is where the complete-path LNS falsifier, backward abstraction and CEGAR ideas belong. They should remain cheap-gated because this category is high-upside and high-implementation-cost.

### 7. Cold exact reasoning as a purchasable primitive

The repo has increasingly capable exact/reference infrastructure and a level-blindness contract that permits sophisticated current-input derivation. Production search still treats exact reasoning mainly as an offline arbiter rather than a bounded service it can buy when uncertainty is expensive.

Gap labels: **EXPOSURE + ARCHITECTURAL**.

The semantic premise is "a bounded exact answer can save more heuristic work or create capability than it costs", not "use CP-SAT".

## Cross-cutting acquisition method: small exact projections

Parity demonstrates a broader acquisition pattern: compress the residual problem into a small exact consequence that production does not currently derive. Keep four proof families distinct: **transition/conservation invariants**, **necessary-condition relaxations**, **partial orders/dominance**, and **exact quotients/equivalences**. They have different soundness burdens even when all reduce state.

The method spans joint feasibility, topology and decomposition rather than creating another architecture category. The first live successor is `WS2-CUT-BALANCE-PROJECTION`, now framed as cut/region-flow conservation; matching, dominance, planar/cycle-space consequences, commutativity, finite-state residues and exact symmetry stay candidate families until separately earned. See [small exact projections](solver-small-exact-projections-program.md).

## Areas that are not major missing-capability premises

The atlas deliberately demotes several tempting categories.

- **More scalar move-score terms / profiles:** the solver already has a large local scoring vocabulary and extensive evidence that many named profiles are operational variants of the same engine.
- **Unconditional wider beam / more generic budget:** this is search power, not new semantic capability, and broad forms have substantial negative history.
- **Naive exact transposition or full MITM identity:** sound exact identity has shown low duplicate compression/high state growth; reopen only from a cheaper, structurally justified equivalence.
- **Generic "solver memory":** repair already has elites, stagnation diagnostics and a per-call experience cache; new work must specify the missing generalization/persistence/communication property.
- **Generic "topology":** connectivity and several mechanic topology consequences already exist. New work must name a completion-relevant relation beyond them.
- **A giant production fallback portfolio:** capability evidence is evidence, not permission to append every historical winner.

## Overlay with current evidence

Only after deriving the architecture/problem map should residual evidence be overlaid.

Current evidence strengthens these intersections:

- Class-5/no-known-candidate concentration supports capability acquisition rather than further composition alone.
- controlled topology forks directly support the path-history-topology gap;
- the DEAD-core pilot keeps causal-conflict learning open but population-limited; the fresh 75-state/25-parent sibling harvest resolves the population limit but exposes a separate construction-method gap (no LIVE contrast yet reachable) -- see `solver-fresh-dead-sibling-harvest-preflight.md`;
- H1 closed one compact event-feasibility vocabulary, narrowing rather than erasing joint-feasibility reasoning;
- behavioral-state quotient work warns that low-dimensional state abstractions can mix LIVE/DEAD behavior while still leaving a weaker cross-parent Card-E signal;
- the separator/decomposition census landed a bounded positive (121/390 Class-5 levels, width<=4 interfaces) -- the decomposition gap's next question is interface-contract state size, not prevalence, per `solver-separator-decomposition-census-preflight.md`;
- Class-3 dose ambiguity is an **EXPOSURE** question, concluded as an evidence gap (no cheap per-technique dose telemetry), not evidence of missing semantic capability;
- the promoted portal coarse-state dead-last retry is **composition/allocation of existing capability**, not acquisition of a new reasoning primitive.

## Premise-generation protocol

When this atlas exposes a gap:

1. state the missing semantic operation without naming an algorithm;
2. identify whether the gap is representation, inference, composition, persistence, action, revision, exposure, power, or architecture;
3. show concrete code/evidence that the current solver lacks or weakly realizes it;
4. reconcile historical experiments that could already test the same operation under another name;
5. ask for the cheapest falsifier of the *premise*, not the proposed implementation;
6. use current-input/offline exact evidence freely under the level-blindness contract, but do not route production from historical identity;
7. promote to implementation only when the falsifier establishes useful prevalence/causal value and an economical action is plausible;
8. after testing, record both production disposition and capability signature.

## Practical interpretation

The current solver's strongest conceptual territory is:

> **forward construction + exact local state + scalar necessary conditions + heuristic ranking/retention + staged diversification/repair.**

Its thinnest conceptual territory is:

> **joint future realizability, explicit causal explanations of failure, path-history topology as a derived relation, selective commitment revision, region/interface composition, cross-process knowledge sharing, and alternative search objects.**

That is the useful research boundary. Future premise acquisition should preferentially ask whether one of those missing operations is actually load-bearing on current misses, rather than generating another synonym for a scoring profile or retry.