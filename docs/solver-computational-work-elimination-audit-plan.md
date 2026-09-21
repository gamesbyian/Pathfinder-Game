<!-- agent-context-budget: warn=9000 max=12000 -->
# Solver computational work elimination audit plan

> **Status:** ACTIVE SUCCESSOR AUDIT; production unchanged.
> **Created:** 2026-09-21.
> **Parent closeout:** [batch-digestion recovered-evidence closeout](../reports/2026-09-21-solver-batch-digestion-audit-recovered-evidence-closeout-001.md).
> **Priority authority:** [solver optimization workstreams](solver-optimization-workstreams.md).
> **Research-method authority:** [solver research operating model](solver-research-operating-model.md).
> **Exact-premise authority:** [small exact projections](solver-small-exact-projections-program.md).
> **Failure-evidence authority:** [failure-evidence integration plan](solver-failure-evidence-research-integration-plan.md).
> **Deferred/reopen authority:** [solver future work](solver-future-work.md).

## Question

> **What expensive mathematical reasoning is Pathfinder performing more than once, later than necessary, at the wrong computational resolution, or after the useful decision has already been obtained?**

The objective is to eliminate avoidable combinatorial reasoning, not to make level ingestion cheaper.

The completed batch-digestion audit supplies hard constraints:

- validation/normalization are negligible;
- `prepLevel()` is tiny relative to hard search;
- no current published/C1/C2 exact or strict-symmetry cross-level collapse exists;
- initial parity and initial BC1 presolve have zero current incidence;
- generic family incremental compilation is not earned;
- generic worker persistence is already present;
- retrospective decision-latency savings cannot be reconstructed honestly where completion order / frozen gate state were not retained.

Those forms stay closed unless this audit identifies a materially different computational unit and a live consumer.

## Current checkpoint — 2026-09-21

Architecture/source work is complete enough to support the first empirical probes:

- **W0 seam map:** complete in [reasoning-seam map 001](../reports/2026-09-21-computational-work-elimination-reasoning-seam-map-001.md).
- **W1 first candidate:** narrowed from generic reason recurrence to one proved portal-free connectivity cut implication. Source proof and gates: [connectivity certificate source audit 001](../reports/2026-09-21-connectivity-certificate-source-audit-001.md). A bounded production-inert scheduled-call shadow now exists; runtime opportunity sizing remains.
- **W2 preflight:** complete for current retained evidence in [multi-query preflight 001](../reports/2026-09-21-computational-work-elimination-multi-query-preflight-001.md). No shared-search architecture is earned; first enriched workload, if needed, is paired beam width with isolated searches plus offline proof-overlap accounting.
- **W3 BC1:** routed to the existing `WS2-CUT-BALANCE-PROJECTION` owner. Its next gate now requires construction cost, later-disposition overlap, and actual removable downstream work rather than incidence alone.
- **W5 wait less:** routed/closed as a new architecture project in [wait-less disposition 001](../reports/2026-09-21-computational-work-elimination-wait-less-disposition-001.md). Existing completion-order `stopAfter` plus the operating model's irreversible-lock rule are sufficient until a live expensive experiment earns bespoke wiring.
- **W4 reusable failed-search output:** remains open, but no storage/database work is authorized without recurrence and a proved consumer.

The next decision-bearing evidence is empirical, not another abstraction pass: run/validate the connectivity shadow on an independently chosen hard-search development population, then either close that certificate form or price a smallest behavioral consumer. In parallel, BC1 economics remains owned by its existing program.

## Scope

Four questions organize the audit.

### A. Solve less

Can an exact answer already owned by current provenance, exact/reference evidence, or a current-invocation proof legally eliminate another solve/query?

Keep operational reuse separate from blind-capability experiments. Constructive family witnesses may answer operational questions but must never leak into level-blind capability measurement.

### B. Search less

Which exact/safe dynamic facts can eliminate downstream search after they fire?

Candidates include:

- BC1 / cut-balance conflicts;
- connectivity/component impossibility;
- obligation/resource lower bounds;
- exact local/interface infeasibility;
- forced structure;
- certified repair futility;
- sound residual lower bounds or nogoods.

The metric is **downstream work dominated or avoidable**, not observer incidence alone.

### C. Reuse reasoning

Which expensive sound conclusions recur within:

1. one attempt;
2. one solve across attempts/stages;
3. different techniques on the same level;
4. related query configurations;
5. controlled family siblings?

Measure recurrence before designing caching.

### D. Wait less

Which research batches continue acquisition after a prospectively frozen monotone decision has become irreversible?

Use the existing completion-order cancellation mechanism and the operating model's narrow irreversible-lock rule. Do not create a general sequential-statistics framework without a concrete consumer.

## Unit-of-computation rule

Do not assume `level` is the relevant unit.

Candidate units include:

- exact residual state;
- residual connected component;
- separator-side problem;
- obligation subset;
- bridge/cut configuration;
- gate-to-region routing skeleton;
- solution prefix;
- exact local subproblem;
- certified reason/nogood;
- family delta;
- query bundle;
- residual interface;
- topology/mechanics substrate.

Evidence decides the useful unit.

## Semantic hierarchy

Every candidate relation must be classified before it can justify skipped work:

1. **IDENTITY** — the same mathematical problem/residual.
2. **EQUIVALENCE** — a proved transformation preserves the relevant problem/outcome.
3. **IMPLICATION** — one exact fact soundly constrains another problem without equivalence.
4. **GUIDANCE** — predictive relation only; may steer incomplete search but cannot justify skipping exact work.

A predictive signature is never silently promoted to a cache key.

## Existing negative that this audit must not accidentally rerun

[solve-local fact rediscovery](solver-solve-local-rediscovery-preflight.md) and its [2026-09-17 result](../reports/2026-09-17-lane-c-phase0-retained-evidence-rejoin-result-001.md) already closed the following tested forms:

- the then-current connectivity retained-evidence population did not justify a new compact reusable cause;
- mustPass/mustCross lower-bound memoization was already shipped and independently demonstrated as a valuable exact-dependency memo;
- cheap mechanic facts were correctly left unmemoized as negative controls;
- the already-paid-for exact/interface batches inspected at that time did not repeat the same dependency-key query.

This successor audit is **not** permission to rerun that Phase 0 unchanged.

The materially different question here is direct current-runtime opportunity sizing across major already-existing exact/safe reasoning seams, including:

- repeated typed conclusions even when the exact residual differs;
- cross-attempt/stage/technique recurrence;
- downstream work after a proof fires;
- multi-query shared reasoning before divergence;
- new dynamic exact facts, especially BC1, that did not exist as a consumer in the earlier Lane C evidence;
- existing failure-evidence seams that now preserve more runtime structure than the retained evidence available to Lane C.

If direct observation produces only the earlier negative shape, close quickly.

## Work packages

### W0 — current-system reasoning-seam map

Produce a map of:

- exact/safe producer;
- proof class;
- production/search seam;
- current consumer;
- lifetime;
- whether the result is discarded;
- available identity/signature;
- expected derivation cost;
- plausible recurrence scope;
- current telemetry/evidence owner.

This is source-of-truth work and must precede new instrumentation.

### W1 — redundant-reasoning observatory

Design the smallest production-inert observer capable of distinguishing:

> material repeated exact/safe reasoning with removable downstream work

from:

> numerous cheap/redundant-looking events with no economic reservoir.

Candidate first seams:

- existing `PruneId` hard-prune pipeline;
- connectivity rejection specialist observer;
- mustPass/mustCross exact lower bounds and their existing memo behavior as positive control;
- joint-obligation exact/necessary-condition observer;
- BC1 once its existing WS2 owner exposes the smallest safe consumer/observer point;
- selected repair futility / exact search-loss reasons only where a canonical exact reason already exists.

Do **not** create a new rejection taxonomy.

#### Minimum record contract

A reason occurrence should retain only what is necessary to test recurrence:

- solve invocation;
- attempt/stage/technique identity;
- monotone `workSpent` point;
- canonical reason family;
- proof class;
- exact-state fingerprint for comparison;
- reason/dependency signature if soundly available;
- derivation-cost proxy if already measurable;
- whether the same reason signature was seen earlier and in what scope.

Do not copy full paths/states by default.

#### Economics

For each repeated sound signature report:

- occurrence count;
- distinct exact states;
- same-attempt / cross-attempt / cross-stage / cross-technique recurrence;
- work distance between first proof and later occurrence;
- estimated derivation cost eligible to avoid;
- downstream work executed after the proof point where a stronger/earlier consumer could have acted;
- signature construction/matching cost.

Do not conflate "same reason ID" with "same proof." `PRUNE_CONNECTIVITY` repeated 100,000 times is not itself reusable identity.

### W2 — multi-query divergence preflight

Use real query bundles already run by research:

- control/treatment;
- beam width 2K/5K;
- budget ladders;
- reqLen/reqInt sweeps;
- parent/local-mutant pairs;
- scoring/config variants.

First reuse existing artifacts/tools, including paired frontier tooling. Measure shared reasoning beyond literal path-prefix identity where a sound representation already exists:

- exact residual identities;
- typed exact/safe reason signatures;
- lower-bound dependency keys;
- connectivity/cut conclusions;
- obligation structure;
- exact local query identities;
- useful frontier regions where interpretation remains guidance-only.

If overlap is negligible, close shared multi-query architecture. If substantial, nominate one smallest shared-computation consumer.

### W3 — dynamic exact-proof economics

BC1 is first because its status is unusually clean:

- initial-state incidence: closed at zero;
- dynamic/frontier incidence: positive;
- canonical owner: `WS2-CUT-BALANCE-PROJECTION`;
- next gate already calls for a production-inert consumer with safety/economics accounting.

This audit must coordinate with that authority rather than create a second BC1 queue.

Question:

> When dynamic BC1 proves a conflict, what later search work would an actual safe consumer remove, and what is the construction/lookup cost?

Apply the same "incidence known, economics unknown" test to other existing exact observers only after mapping confirms a live seam.

### W4 — failed search as reusable output

Candidate artifacts:

- exact dead residual certificate;
- impossible obligation ordering;
- sound local lower bound;
- separator traversal requirement;
- exact region feasibility result;
- certified nogood;
- exact partial-interface result.

Before durable storage, require all four:

1. repeated consumer;
2. sound identity/equivalence/implication contract;
3. measurable work avoided;
4. acceptable construction/lookup/storage/invalidation cost.

No repeated consumer means no warehouse.

### W5 — irreversible decision-lock audit

Inventory expensive research workflows with frozen monotone gates and check prospectively whether the existing `stopAfter`/worker-pool cancellation primitive can stop required acquisition once the gate is locked.

Do not estimate historical wall savings without true completion-order + gate-state evidence.

## Candidate matrix fields

Every candidate row must include:

| Field | Meaning |
|---|---|
| reasoning fact | exact conclusion being derived |
| proof class | identity / equivalence / implication / guidance plus soundness subtype |
| seam | exact production/research producer |
| derivation cost | measured/proxy/unknown |
| recurrence scope | attempt / solve / technique / query / family |
| current telemetry | existing observer/artifact |
| signature | exact dependency key/certificate/correlated signature/none |
| dominated work | what later work could legally disappear |
| cheapest experiment | opportunity-sizing test |
| stop/reopen gate | exact closure boundary |

## First experiment decision rule

The first new runtime probe is earned only after W0 shows a seam where:

- conclusion derivation is plausibly non-trivial;
- canonical reason semantics already exist;
- a cheaper sound signature can be emitted or compared;
- existing retained evidence cannot answer recurrence;
- the observer can remain production-inert;
- downstream work can be associated with the occurrence.

Prefer extending existing `PruneDiagnostics` / specialist observers / failure-evidence plumbing over creating a new subsystem.

## Explicit non-goals

Do not build during opportunity sizing:

- general memoization framework;
- residual database;
- cross-run cache;
- new solution warehouse;
- generic incremental compiler;
- generic sequential-statistics engine;
- broad decomposition runtime;
- generic knowledge blackboard.

Also do not reopen unchanged:

- broad exact beam transposition;
- stale/broad DFS transposition;
- global symmetry canonicalization;
- raw ingestion optimization;
- initial parity presolve;
- initial BC1 presolve;
- naive densification;
- generic compiled-level caching.

## Advancement rule

A survivor must leave the audit and enter its real owner:

- exact projection -> small exact projections / relevant WS2 item;
- search allocation -> canonical workstreams;
- failure/search-loss evidence -> existing failure-evidence/search-loss authorities;
- deferred architecture -> future work with an exact reopen gate;
- research execution rule -> operating model.

The audit itself must not become a competing backlog.

## Close condition

The successor audit is complete when it has:

1. current-system reasoning seam map;
2. candidate matrix with prior-negative boundaries;
3. direct opportunity sizing for the strongest recurrence hypothesis;
4. real-workload multi-query divergence preflight;
5. dynamic BC1 economics route reconciled with its existing owner;
6. decision-lock inventory/disposition;
7. surviving candidates routed to canonical authorities and dead forms recorded with reopen conditions.
