# Level-blindness overshoot architecture audit 001

> **Status:** concluded-positive
> **Date:** 2026-09-16
> **Scope:** hostile architecture-level audit of whether Pathfinder's level-blindness invariant has been interpreted more restrictively than necessary.
> **Invariant under audit:** production remains fully cold and level-blind. No prior exact-level knowledge, saved solutions/hints, historical outcomes, corpus identity/position, provenance, historical winner/config/seed replay, or identity/family lookup may steer the solve.
> **Decision:** the invariant itself is sound, but the repository still contains conceptual and architectural residue from a stricter interpretation. The most important correction is that **the procedure must generalize; the facts it derives during one cold solve do not have to recur across levels.**
> **Execution priority:** unchanged. `docs/solver-optimization-workstreams.md` remains authoritative. This audit changes interpretation/reopen boundaries, not the already-frozen immediate queue.

## 1. Bottom line

Yes: level-blindness has been materially over-shot in several places, though the current top-level authorities have already begun correcting the mistake.

The correct distinction is:

> **Specific to this level is legal. Known about this level from before is not.**

A cold production invocation may derive arbitrarily specific information from the current puzzle and current invocation. That information may be exact, unique to the level, expensive to derive, dynamically learned, shared between techniques, or strong enough to justify pruning. None of those properties violates level-blindness by itself.

The actual forbidden property is **historical/external provenance**: the information obtains its value because the solver recognizes the level, knows a prior outcome, sees stored research metadata, or consumes state surviving from an earlier solve invocation.

Four overshoots matter most:

1. **Solve-local exact-level memory is linguistically conflated with historical per-level memory.** Phrases such as `exact-level attempt caches` / `per-level caches` are correct only if they mean state surviving an earlier invocation. Current-invocation caches are legal in principle.
2. **Genericity is sometimes demanded of the derived relation rather than of the deriving procedure.** Requiring the same compact DEAD relation to recur across unrelated parents is appropriate for a fixed generic predicate, but not for a generic algorithm that derives a fresh proof/conflict/order/decomposition for each unseen level.
3. **Production routing still operationalizes level blindness as a shallow fixed feature vector and fixed attempt menu.** That is a policy architecture, not an invariant requirement.
4. **Exact reasoning is still culturally associated with offline/oracle work.** Current authorities now say exact computation is not intrinsically illegal in production, but code organization, queue gates, and historical language still make online exact current-state reasoning look exceptional.

The correction does **not** weaken level blindness. It enlarges the legal cold-solve design space while preserving the information boundary exactly.

## 2. Actual invariant boundary

For fixed shipped code/configuration, generic seed policy, and budget contract, a production cold solve may use:

- every gameplay mechanic and structural fact present in the current puzzle;
- arbitrary deterministic preprocessing of that puzzle;
- current search state and telemetry;
- partial paths, elites, frontiers, continuations, caches, proofs, conflicts, decompositions, canonical forms, and other artifacts created during this invocation;
- generic offline-learned policy whose runtime inputs are legal current-level/current-solve facts;
- bounded exact computation over the current level/current residual state;
- a per-level search plan compiled from current puzzle structure;
- solve-local information shared explicitly across attempts/techniques.

It may not use:

- prior solutions/hints/witnesses;
- previous winners/configurations/seeds/search actions;
- historical solve/failure/cost/badness/family outcomes;
- prior-invocation exact-level caches/checkpoints/continuations;
- corpus position/permanent ID;
- provenance/generator/stress/research metadata;
- capability-memory membership or historical gain/loss membership;
- fingerprints/canonical keys whose practical purpose is historical exact-level/family recognition and treatment replay.

A useful formalization is:

> **Level-blindness constrains provenance, not specificity.**

And the most important corollary is:

> **The unit that must generalize may be the derivation procedure rather than the derived fact.**

A conflict clause, separator contract, obligation order, exact suffix answer, or compiled plan may be completely unique to one unseen puzzle and still be legitimate production behavior if a generic algorithm derived it from that puzzle during the cold solve.

### Legality, soundness, and economics are separate gates

Every proposed current-instance mechanism should be evaluated under three independent questions:

1. **Legality:** is every input available from the current puzzle/current invocation without historical identity or external research metadata?
2. **Soundness:** is the derived result strong enough to justify the action taken (hard prune, lower bound, routing choice, soft guidance, etc.)?
3. **Economics:** does deriving/maintaining/consulting it save enough solver work or gain enough capability to justify its cost?

A legal idea may be unsound or uneconomic. An uneconomic implementation is not evidence that the invariant forbids the underlying idea.

## 3. Confirmed overshoots

### 3.1 Cache vocabulary is broader than the intended prohibition

`docs/solver-level-blindness.md` forbids `exact-level attempt caches`; `AGENTS.md` says cold policy cannot use `per-level caches`. In context, the intended target is historical/persistent exact-level state.

But every cache built while solving one level is, trivially, an exact-level cache.

Current code already demonstrates a legal form: `modules/solver/nogood-cache.ts` creates a repair-local cache from live state and never persists it. Its current semantics are deliberately weak: a hit means one prior randomized continuation from the same signature failed, not that the state is globally UNSAT.

The blindness invariant does not require that cache to be scoped to one `repairSearchFromGate` call. A solve-wide cache or proof store is legal if:

- it is created after the cold invocation begins;
- it is not loaded from prior runs;
- its semantics are explicit enough for the consuming action;
- its predecessor-stage effects are typed and reproducible.

**Documentation correction:** reserve `per-level cache` / `exact-level cache` prohibition for **persistent historical state surviving a previous invocation**. Explicitly allow arbitrary solve-local caches and derived facts.

### 3.2 Cross-parent recurrence is too strong as a universal production gate

`docs/solver-future-work.md` currently reopens learned conflicts/nogoods when H1/H3 or DEAD-core work finds **recurring compact DEAD relations across unrelated parents**. The frozen H1 prespec similarly advances toward a reusable runtime abstraction only when a compact categorical relation recurs across unrelated parents.

That is correct for one branch of research:

> discover a fixed generic relation/predicate that future production can evaluate cheaply.

It is not a necessary condition for another legal architecture:

> ship a generic algorithm that derives the relevant relation/proof freshly on each unseen level.

Examples:

- a SAT solver need not learn the same clause across unrelated SAT instances;
- a Pathfinder conflict extractor may derive a different nogood on every level;
- an exact event-feasibility query may produce `A before B`, `B before A`, `either`, or an unrelated obstruction depending on the puzzle;
- a separator/decomposition algorithm may produce different region contracts on every input;
- a per-level compiler may produce a unique search plan for every level.

The **procedure** can be general even when no semantic output recurs.

This changes how H1/DEAD-core nulls should be interpreted. Failure to find one recurring compact relation closes or weakens the **fixed-descriptor** route. It does not automatically close the **generic per-instance derivation** route.

### 3.3 Production attempt selection is legal but artificially coarse

`modules/solver/attempts.ts` correctly states that attempt-policy selection is a pure function of level features rather than level identity. But the feature interface is only a small set of coarse scalars/categories: routing regime, required path coverage, intersections, length, gate count, must-pass/must-cross count, portal count, flipper count, and must-turn count.

`docs/solver-architecture.md` reflects the same fixed five-regime / thresholded policy model.

Nothing about level-blindness requires this coarseness.

A generic production analyzer could legally inspect the exact current puzzle and derive:

- connected components, bridges, articulation points, block-cut structure, and small separators;
- corridor/forced-chain structure;
- portal connectivity and parity classes;
- obligation/interface incidence graphs;
- pairwise/joint obligation feasibility;
- matching/flow/cut constraints;
- exact or conditional parity systems;
- compulsory portal/flipper/order relations;
- symmetry/canonical forms;
- residual state-space or separator-width estimates;
- decomposition candidates and local interface contracts.

Two levels with identical scalar counts may receive radically different search plans because their structures differ. That is not identity steering; it is precisely what a strong level-blind solver should be allowed to do.

### 3.4 Exact/oracle language still blurs three different things

The repository has historically grouped exact work around oracle/reference tooling such as `scripts/stress/cpsat-reference-probe.py`. That file correctly treats its current outputs as research evidence, not hints or corpus solves.

However, three categories should remain distinct:

1. **Historical oracle data:** saved exact labels, known witnesses, exact-level outcomes. Forbidden runtime steering.
2. **Offline exact computation:** reference/research instrumentation used to diagnose or validate a premise.
3. **Online exact computation:** an exact algorithm invoked from the cold production solver on the current puzzle/current state. Legal in principle; soundness and economics decide whether it should ship.

The moonshot/reconciliation reports now make category 3 explicit, but older terminology and workstream habits still make it look like a special exception rather than a normal member of the legal design space.

### 3.5 Experimental controls can accidentally look like runtime restrictions

The H1 prespec freezes event vocabularies, accepted-path nomination, populations, and advancement bars to protect inferential validity. Those controls are correct **for that experiment**.

They should not be inherited as restrictions on a future runtime algorithm.

For example, H1 currently allows cross-mechanic `E-ORDER(A,B)` only where an accepted-path artifact nominates the pair, because enumerating every pair after labels are visible would be feature fishing. A future cold runtime algorithm could legally enumerate candidate pairs from the current obligation graph without any historical nomination.

Prespecification protects research inference. It does not define the solver's epistemic limits.

### 3.6 Mechanics-derived identity is not historical identity

The prohibition on fingerprinting is correctly aimed at practical historical recognition/replay. It should not cast a shadow over mechanics-derived keys that never consult history.

Legal examples include:

- transposition keys;
- canonicalized current-state signatures;
- symmetry classes;
- deterministic mechanics-derived seed material;
- substructure identities used to memoize current-invocation proofs;
- canonical forms used to detect equivalent regions/states inside the same solve.

The question is not whether a key is high-dimensional or uniquely identifies the current level. Any complete serialization of the puzzle does that. The question is what happens **after** the key is formed. Joining it to historical outcomes is forbidden; using it to reason about the current invocation is not.

## 4. Existing code already proves the broader interpretation is viable

The repo does not need to accept this boundary as a purely philosophical argument. Current production/editor code already contains pieces of it.

### 4.1 Proof-style deadlock predicates

`modules/solver/lower-bounds.ts` contains sound current-state reasoning such as:

- `mustTurnDeadlocked`;
- `mustCrossForcedNeighborDeadlocked`;
- `mustCrossNeighborBudgetDeadlocked`;
- admissible lower bounds.

These derive exact impossibility/lower-bound information from the current state and use it to prune. The must-cross neighbor-budget lineage is particularly instructive: it started as a bounded observer, was checked against exact/reference/stored-solution evidence, then became a production sound prune. Exact reasoning is already part of the shipped architecture when a theorem is available.

### 4.2 Exact false-goal trigger search

`modules/solver/false-goal-trigger-search.ts` performs exhaustive current-level DFS to enumerate cells that can satisfy exact path conditions. It distinguishes complete/partial/aborted results and has proof-style parity rejection. It also compresses certified one-successor chains.

This is an existence proof for a generic bounded exact current-level service. It currently serves editor analysis rather than the main solver, but the epistemic boundary is already crossed safely: the routine knows nothing historical about the puzzle.

### 4.3 Exact facts are sometimes used only as guidance

`modules/solver/prep.ts` explicitly describes the gate/goal/required-length portal-parity relation as mathematical, not heuristic, but `modules/solver/scoring.ts` consumes the twist-portal consequence as guidance only.

That cautious choice may be correct for the current formulation. The audit lesson is broader:

> for every heuristic/soft feature, ask whether a sound theorem exists on an identifiable subdomain.

A feature need not be globally exact to have a production-valuable exact regime.

### 4.4 Solve-lifetime shared state already exists

`solveLevel()` creates one `PrepLevel` for the cold solve and shares it across stages. Work accounting/configuration/telemetry already live there. Resumable beam research also established explicit in-memory continuation ownership and safe detachment rules.

So a typed solve-local knowledge store would not require inventing persistence or historical state. The architectural lifetime already exists; only semantics and economics need to be earned.

## 5. Architectural opportunities created by the correction

### 5.1 Solve-local proof memory

A future typed invocation-local knowledge store could retain facts such as:

- residual signature proven UNSAT;
- event/order relation impossible;
- portal pair mandatory/impossible;
- interface unreachable;
- exact/admissible lower bound;
- separator contract with no compatible completion;
- dominance relation between two states;
- symmetry/equivalence certificate;
- conflict core explaining why a set of commitments cannot coexist.

This is distinct from the current repair nogood cache, whose entries are experience, not proof.

The correct research question is not “can we share any cache?” but:

> Which sound or sufficiently typed current-invocation facts are being expensively rediscovered by multiple attempts/techniques?

Instrument rediscovery before building a general blackboard.

### 5.2 Opportunistic exactification

Production need not choose globally between heuristic and exact solving.

A generic cold solver can switch to an exact/complete residual method when current-state tractability is favorable, for example when:

- remaining reachable volume is small;
- remaining path length is small;
- branch factor collapses;
- unresolved obligation count is small;
- separator/interface width is small;
- the residual state-count bound is low;
- a local matching/flow/order subproblem is tiny.

Possible exact engines include bounded DFS, memoized dynamic programming, meet-in-the-middle, SAT/CSP, branch-and-bound, matching/flow, exhaustive obligation-order search, or region-contract composition.

The API contract should allow three outcomes:

- exact SAT/witness or certified fact;
- exact UNSAT/proof fact;
- UNKNOWN/budget exhausted, after which heuristic search continues.

The relevant promotion metric is exact-query cost versus heuristic work avoided / solves gained, not whether exactness feels “oracle-like.”

### 5.3 Heuristic-to-theorem subdomain audit

Run a systematic analytical audit over existing soft mechanisms:

- portal parity;
- flipper order/parity;
- must-cross approach/interface logic;
- intersection-budget reasoning;
- must-turn geometry;
- component/reachability volume;
- landmark approach constraints;
- finish/closure conditions.

For each, ask:

1. what is currently heuristic?
2. under which current-state conditions does it become mathematically necessary/sufficient?
3. can that exact subdomain support a safe prune, forced move, lower bound, decomposition, or exact mode switch?

The success of must-cross neighbor-budget propagation shows this route can produce large capability gains from narrow theorems.

### 5.4 Structural graph preprocessing

Extend the existing topology/reachability perspective toward exact structural facts:

- dynamic articulation points/bridges;
- mandatory separators;
- stranded obligation regions;
- component capacity versus remaining length;
- interface direction/order constraints;
- independent region decomposition;
- small cut/matching feasibility.

The existing separator/decomposition census remains the right cheap gate. The corrected invariant simply removes any concern that such analysis is “too level-specific.”

### 5.5 Per-level search-plan compilation

The moonshot report already states the strong form: perform deterministic cold static analysis and compile a bespoke search algorithm for this invocation.

A first implementation need not be grand. It could choose between two genuinely different architectures based on current structure. Longer term, a compiler could decide:

- monolithic vs decomposed search;
- forward vs backward/bidirectional reasoning;
- beam/DFS/repair roles;
- exact-query budget;
- region order;
- state representation;
- proof systems to maintain;
- continuation/handoff strategy;
- retry structure and budget allocation.

The shipped compiler generalizes. The generated plan may be unique.

### 5.6 Online conflict learning without cross-level clause recurrence

Split the current learned-conflict question into two distinct hypotheses:

A. **Reusable descriptor learning:** do compact DEAD relations recur across unrelated levels? This requires recurrence and independent validation.

B. **Generic online conflict derivation:** can a generic solver derive useful sound conflicts from the current level and reuse them within the same invocation? Individual conflicts may be unique.

Do not require hypothesis B to satisfy hypothesis A's cross-parent semantic-recurrence gate.

### 5.7 Current-instance canonicalization and symmetry

Mechanics-derived canonical forms can support:

- exact transposition/deduplication;
- symmetry breaking;
- equivalent-region/state reuse;
- deterministic diversification;
- solve-local memoization.

These are legal if they never perform historical lookup. Any future doc/check should distinguish “canonicalization for current reasoning” from “fingerprinting for historical replay.”

## 6. Apparent overshoots that are actually justified

The following restrictions should remain.

### 6.1 Mechanics-only capability worker and anonymous normalization

Correct. The solver should not receive corpus position/ID, hints, provenance, difficulty, generator metadata, or research fields. `scripts/level-blind-capability-sweep.mjs` and `scripts/level-blind-capability-worker.mjs` implement the right cold boundary.

### 6.2 Refusal of winner priming, historical attempt caches, and resume artifacts

Correct for capability measurement because those inputs originate before the invocation. The correction is wording: solve-local caches/continuations created after invocation start are a different class.

### 6.3 Predecessor-stage causal discipline

`docs/solver-research-operating-model.md` correctly rejects unexplained predecessor-stage dependence. Cross-stage knowledge is allowed only when it is an explicit typed handoff with measured semantics/cost. Keep this rule. It prevents hidden cache warmth/randomness/lifetime bugs without banning deliberate cooperation.

### 6.4 H1 prespecification / accepted-path nomination

Correct as experimental methodology. The frozen rules prevent feature fishing. They should remain frozen for the current experiment. What changes is the interpretation of results: a failure of cross-parent relation recurrence does not itself rule out a generic per-instance exact-query service.

### 6.5 Exact-query production remains evidence-gated

Legality is not promotion. An online exact service still must demonstrate:

- soundness/validated approximation direction;
- bounded runtime/work;
- participation on an earned population;
- end-to-end solve/work value;
- proportional confirmation after selection.

### 6.6 Closed continuation/handoff experiments stay closed

Same-policy resumable tranche salvage was tested and closed null; the simplest beam-to-DFS handoff was negative. A solve-local proof store or per-instance exact service is a distinct mechanism and should not be used to rhetorically reopen those tested forms.

## 7. Historical ideas worth reinterpreting

### Arbitrary-target constrained feasibility

March's `findConstrainedPath` lineage was merged then quickly reverted without a decision-grade behavioral verdict. Archaeology already classifies the sequence as a dirty revert, not a negative premise result.

Reinterpret it as a possible **small current-state query service**:

> can this state still complete through event/interface/region X?

Do not restore the broad historical architecture first.

### Future-intersection commitments / blueprint planning

Historical production implementations were contaminated by transport/participation and additive-cost problems. The live premise remains legitimate:

> states with the same scalar intersection deficit may differ in which future crossing plans remain realizable.

H1 is the correct current microscope. A future runtime descendant may derive per-instance crossing constraints instead of shipping one fixed blueprint heuristic.

### DEAD cores / conflict learning

Retain recurring-core research for reusable abstractions, but add the separate per-instance conflict-learning route described above.

### Partial-order / commutativity

The historical observer counted candidates but never completed the decision-bearing swap/replay test. If H1 or exact diagnosis revives the premise, production may eventually solve small local precedence questions anew per level; it does not need one universal obligation order rule.

### Cross-attempt basin overlap

Historical observer plumbing was broken in important ways, so the general question remains open. A modern observer should additionally measure repeated derivation of the same expensive structural facts/failures across attempts, not only trajectory overlap.

### Forced-chain traversal

The specialized false-goal exact search already compresses certified one-successor chains. Core production search does not generally do so. The existing census-first reopen gate is correct and unaffected by this audit.

## 8. Current queue coverage

The repo already preserves most of the legal design space. The main issue is interpretation and a few missing explicit descendants.

| Opportunity | Current coverage | Audit conclusion |
|---|---|---|
| Relational event feasibility | Strong: H1 | Keep frozen experiment; broaden downstream interpretation |
| DEAD-core diagnosis | Strong / near queue | Split reusable-core vs per-instance conflict routes |
| Exact current-state query | Present in future work | Wording/gate is narrower than full legal space |
| Learned conflicts/nogoods | Present | Current recurrence gate fits fixed descriptors, not all online conflict learning |
| Separator/decomposition | Present | Good cheap gate |
| Behavioral-state quotient | Present | Good cheap gate |
| Per-level search-plan compilation | Present | Legal significance should be made explicit |
| Cooperative blackboard | Present | Keep downstream of measured reusable information |
| Backward/bidirectional abstraction | Present | No blindness barrier |
| Forced-chain traversal | Present | Correct census-first gate |
| Cross-attempt overlap | Present | Extend eventual observer to knowledge rediscovery |
| Opportunistic exact residual solving | Weakly represented | Add/clarify as a bounded exact-query descendant |
| Solve-wide proof-bearing cache | Weak / effectively absent | Add only after rediscovery evidence |
| Heuristic-to-theorem subdomain audit | Absent | Add as cheap analytical/research task |
| Mechanics-derived canonicalization/symmetry | Mostly absent | Preserve as legal design space; gate on concrete use |
| Online conflict learning with unique per-level clauses | Not cleanly represented | Add distinction to future-work semantics |

No new top-level workstream is warranted.

## 9. Recommended documentation corrections

### `docs/solver-level-blindness.md`

Add explicit principles:

> **Level-blindness constrains provenance, not specificity.** A fact derived solely from the current puzzle/current invocation may be arbitrarily specific to that puzzle, including an exact proof, learned conflict, decomposition, canonical form, search plan, or exhaustive subproblem result.

> **The procedure may generalize while its outputs remain instance-specific.** Production may derive different proofs, clauses, plans, abstractions, or exact answers on every unseen level.

Clarify cache wording:

> Forbidden: exact-level caches/checkpoints/continuations or learned state surviving from a previous solve invocation.
>
> Allowed: caches and derived facts created from legal inputs during the current cold invocation, including explicit cross-attempt/cross-technique handoffs.

Add exact-computation taxonomy:

- historical exact labels/witnesses: offline only;
- offline exact reference computation: research evidence;
- online exact current-input computation: legal in principle, promotion requires soundness + economics.

Clarify fingerprinting:

> mechanics-derived canonicalization/transposition/symmetry keys are legal when used only for current-invocation reasoning; forbidden when used to recover historical level/family treatment.

### `docs/solver-future-work.md`

Split `Learned conflicts / nogoods` into or clarify two descendants:

- recurring compact DEAD relation → reusable generic abstraction;
- generic online conflict derivation → per-instance solve-local proof reuse, even if individual clauses do not recur.

Broaden `Bounded exact current-state production query` to include opportunistic exact residual solving selected by current-state tractability, not only one small offline query becoming runtime.

Add a cheap `heuristic-to-theorem subdomain audit` descendant or boundary note.

### Agent/research guidance

Replace unqualified `per-level cache` language with `historical/persistent per-level cache from prior invocations` so future agents do not infer that solve-local exact-level memory is prohibited.

When a research report requires a relation to recur across unrelated parents, state whether that gate is proving a **reusable fixed descriptor** or a **generic derivation procedure**. Do not silently apply the former's recurrence requirement to the latter.

## 10. Ranked research agenda by expected information value

This audit does **not** justify leapfrogging already-frozen decision-bearing work. Keep the current immediate order: controlled topology contrast, then H1.

After/alongside those gates, the highest-information descendants are:

1. **Dual-interpret H1.** Preserve its fixed recurrence advancement bar, but additionally record whether exact per-instance query answers are decisive often enough to justify an online-query economics pilot even without recurring semantic relations.
2. **Heuristic-to-theorem audit.** Analyze existing parity/flipper/must-cross/intersection/topology/landmark guidance for exact subdomains. Cheap, high upside, little infrastructure.
3. **Knowledge-rediscovery observer.** Measure whether attempts/stages repeatedly derive the same connectivity failures, bounds, residual signatures, event impossibilities, or other expensive facts. This sizes a solve-local proof store before implementation.
4. **Bounded exact residual economics pilot.** On earned current states, compare exact-query cost with heuristic work avoided / solves gained. Use the cheapest exact mechanism that answers the question; do not default to CP-SAT by prestige.
5. **Minimal DEAD cores with two verdicts.** Separately measure cross-parent reusable core recurrence and per-instance conflict usefulness.
6. **Separator/decomposition census plus tractability estimates.** Use the existing queued census to identify where exactification/decomposition could be affordable.
7. **Typed solve-local proof cache.** Build only if rediscovery is material; start with sound facts, not weak repair experience.
8. **Per-level search-plan compiler.** Earn after at least two materially distinct reasoning architectures/services have predictable current-input niches.
9. **Full cooperative blackboard / CEGAR / bidirectional architecture.** High upside but implementation-heavy; remain downstream of compact evidence.

## 11. Interpretation rule for future experiments

Do not make this inference:

> “No one compact relation recurred across unrelated parents, therefore there is no production-usable exact information here.”

The valid conclusion is narrower:

> “This experiment did not earn that reusable fixed relation/descriptor.”

A separate possibility remains:

> “Different levels expose different exact obstructions, but one generic cold algorithm can cheaply derive and exploit the relevant obstruction on each level.”

That architecture is fully level-blind.

## 12. Core conclusion

Pathfinder's level-blindness invariant should remain strict at the invocation boundary and permissive inside it.

The cold solver should know **nothing historical** about the level and may learn **everything useful it can derive now**.

The repository has already accumulated the ingredients for that stronger interpretation: proof-style prunes, exhaustive current-level search services, solve-local experience, explicit continuations, exact reference machinery, topology analysis, H1 relational queries, DEAD-core plans, decomposition ideas, and per-level compilation hypotheses.

The next conceptual step is not to relax level blindness. It is to stop treating ignorance as part of it.
