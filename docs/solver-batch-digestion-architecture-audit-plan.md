<!-- agent-context-budget: warn=9000 max=12000 -->
# Solver batch digestion and computation architecture audit

> **Status:** active audit and opportunity-sizing program.
> **Started:** 2026-09-20.
> **Branch:** `chatgpt/solver-batch-digestion-architecture-audit-2026-09-20`.
> **Primary goal:** reduce wall-clock latency and compute cost of large solver/research batches without sacrificing the project's solve-acquisition goal.
> **Priority owner:** this document owns the audit only. Any promoted solver experiment must enter the canonical queue in [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) rather than creating a competing queue.

## 1. Trigger

The motivating question is broader than "can level parsing be faster?":

> When a Pathfinder level is handed to the solver, is the current level-shaped, one-level-at-a-time, compile-then-search execution model itself leaving substantial batch speed on the table?

The negative-space version is equally important:

- can the system **solve less** by avoiding equivalent/redundant work?
- can it **search less** by moving more inference into presolve, propagation, decomposition, or proof?
- can it **reuse more** across attempts, solves, variants, families, processes, and historical runs?
- can it **wait less** by optimizing time-to-decision rather than insisting that every research batch finish?
- is **level** the wrong unit of computation?

This audit treats "digestion" as everything between source level data and useful research/solve output, including work that can happen before the batch exists.

## 2. Scope boundaries

This is not a license to revive every historical speed idea.

Existing exact-form evidence remains binding:

- naive repeated `denseIndex()` densification lost;
- same-policy residual continuation produced no coverage gain in its tested scheduler form;
- broad exact beam duplicate/transposition opportunity was tiny in the measured form;
- broad DFS transposition was historically low-value / stale;
- several local scorer/fusion/object-reuse treatments lost or were too small.

Those results constrain those forms. They do **not** directly test:

- a solver-native dense representation with no hot-path conversion;
- immutable compiled-level reuse across independent solves;
- incremental compilation across controlled variants;
- exact symmetry/isomorphism quotienting;
- cross-level or family-level reuse;
- presolve that changes the amount of search performed;
- shared proof/knowledge artifacts across techniques;
- multi-query or multi-instance computation;
- adaptive experiment stopping;
- long-lived batch workers and cache residency;
- historical solution/residual indexing.

See [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md) for current performance dispositions and [`solver-residual-state-representation.md`](solver-residual-state-representation.md) for proof requirements on residual equivalence/caching.

## 3. Optimization objective

Do not collapse all candidates into "milliseconds per solve."

Measure the relevant denominator for each lane:

1. **pure ingestion/runtime overhead**
   - wall/CPU per solve and per batch;
   - startup, validation, normalization, `prepLevel`, serialization/clone, worker/process launch, teardown;
   - search/work parity required.

2. **compile/reuse economics**
   - one-time compile cost;
   - reuse count needed to break even;
   - bytes retained;
   - invalidation/recompile cost;
   - batch wall/CPU saved at realistic reuse counts.

3. **search reduction**
   - canonical `workSpent`, nodes, wall/CPU;
   - solve gains/losses;
   - proof/soundness boundary;
   - presolve cost versus downstream work removed.

4. **population/research latency**
   - time to first decision-changing evidence;
   - time to stable decision under a preregistered rule;
   - fraction of planned population actually required;
   - compute avoided after a decision is already robust;
   - whether early stopping changes the final decision.

5. **amortized historical value**
   - future solves avoided or shortened per stored artifact;
   - hit rate on exact-equivalent / transformable / repairable prior work;
   - storage/index/query cost.

The director-level objective remains new solves at acceptable budgets. Batch-latency improvements are valuable when they buy more experimentation, larger independent populations, faster iteration, or more solve-acquisition compute.

## 4. Core model

Audit the current implicit pipeline:

```
raw level
  -> schema validation
  -> normalization
  -> per-solve prepLevel()
  -> attempt ladder
  -> DFS / beam / repair
  -> result + telemetry
  -> most execution state discarded
```

Against possible alternatives:

```
source level(s)
  -> canonical problem identity
  -> persistent/static compilation
  -> optional family/shared compilation
  -> presolve / propagation / decomposition
  -> solve-local execution context
  -> search only residual uncertainty
  -> reusable proofs / learned exact facts / solution transforms
  -> adaptive research decision
```

The audit must determine which arrows are economically real, not assume this target architecture is desirable.

## 5. Audit questions

### A. Where does batch wall time actually go?

Measure current HEAD on representative workloads.

Partition at least:

- process/runtime/module startup where relevant;
- level file/data parsing;
- raw validation;
- normalization;
- structured clone / IPC;
- `prepLevel`;
- attempt configuration/orchestration outside search;
- DFS/beam/repair work;
- result serialization and artifact writing;
- workflow/shard fixed overhead.

Answer separately for:
- many cheap solves;
- mixed realistic batch;
- hard-tail solves.

A 5 ms fixed tax is irrelevant to a 60 s solve and enormous across 100k cheap queries.

### B. Is `PrepLevel` really two objects hiding in one?

Current `PrepLevel` mixes level-determined immutable data with solve-local mutable state such as work meters, pools, observers, caps, and metrics.

Inventory every field and classify:

- immutable function of normalized level + compile options;
- immutable function of a narrower structural signature;
- solve-local mutable;
- attempt-local mutable;
- observer/research-only;
- policy-dependent.

Test whether an explicit split is possible:

```
CompiledLevel = immutable reusable problem data
SolveContext  = fresh mutable execution/session data
```

No implementation is earned until field ownership, aliasing, memory, and option sensitivity are understood.

### C. Can same-level compilation be reused?

Opportunity-size repeated `prepLevel()` across real research scripts/workflows.

Questions:
- how often is the same normalized level solved more than once in one process?
- across treatment/control passes?
- across budgets/configs?
- across independent scripts or processes?
- what fraction of prep is option-invariant?

Test in-memory reuse before persistence. Persistence adds schema/versioning/invalidation costs and is not implied by an in-memory win.

### D. Can related levels share compilation?

For existing family/variant assets, classify compiled fields by dependency:

- grid geometry only;
- obstacle topology;
- mechanic placement;
- gate/goal identity;
- exact challenge metrics;
- objective placement;
- full level.

Then ask whether a child delta can reuse or incrementally update parent structures.

Required outputs:
- field-level dependency matrix;
- invalidation graph;
- family reuse hit-rate estimate;
- break-even model.

### E. Are equivalent mathematical problems being solved repeatedly?

Audit exact, semantics-preserving transformations:

- board symmetry;
- coordinate/orientation canonicalization;
- gate permutations where semantically interchangeable;
- mechanic-label transforms only where rules prove equivalence;
- family generator symmetries already represented in manifests.

Distinguish:
- exact equivalence => solve can be transformed/reused;
- weaker dominance => may support proof/reuse but needs separate soundness;
- predictive similarity => never enough to skip a solve.

Count duplicate/equivalent burden in extant corpora before building canonicalization machinery.

### F. Can the level be made *larger* so the search is smaller?

Audit "compiled enrichment" whose representation size increases while uncertainty decreases:

- separator/articulation structure;
- region graph;
- obligation precedence;
- parity/resource capacities;
- forced/forbidden edge or region facts;
- mechanic finite-state products;
- exact or safe-relaxed residual signatures;
- useful precomputed lower-bound families.

For each candidate:
- compute cost;
- memory;
- coverage;
- downstream work removed;
- false-negative/soundness status.

This lane is algorithmic, not pure implementation speed.

### G. How much Pathfinder can be solved before search?

Treat presolve as a first-class phase.

Candidate operations:
- propagation to fixed point;
- safe dead-cell/edge elimination;
- forced-chain contraction;
- component/separator feasibility;
- obligation-order impossibility;
- exact-resource parity/capacity checks;
- small-region exact solve;
- decomposition into independently solvable or narrow-interface residuals.

Measure search work removed, not only presolve speed.

### H. Is cell-level search the wrong resolution?

Opportunity-size hierarchical / quotient representations:

- cells -> corridors/regions -> separator interfaces;
- exact contracted forced chains;
- narrow-interface frontier DP;
- mechanic automata + resource state;
- adaptive representation choice by level structure.

Historical local densification/fusion negatives do not settle this lane.

### I. Can attempts share knowledge without sharing execution state?

Existing continuation work asks whether one search can resume its own frontier. This lane asks a different question.

Candidate reusable knowledge:
- exact dead residuals;
- sound lower bounds;
- proved impossible obligation orders;
- static structural facts;
- exact small-region results;
- transformed sibling solutions;
- certified nogoods whose identity contract is technique-independent.

Inventory what DFS/beam/repair redundantly rediscover and what can cross technique boundaries soundly.

### J. Can one computation answer multiple queries?

Audit common research query bundles:

- same level, control/treatment;
- same level, multiple budgets;
- same level, multiple scoring policies;
- sibling variants;
- required-length/intersection sweeps;
- parent + controlled family descendants.

Potential forms:
- shared immutable compilation;
- incremental solver assumptions;
- shared exact subproblem tables;
- prefix/search-tree branching across query masks;
- batched family execution.

Do not assume simultaneous search is worthwhile; first quantify shared work and divergence depth.

### K. Are workers/processes paying avoidable fixed tax?

Audit:
- process launch frequency;
- module startup;
- dataset parse/load repetition;
- raw normalization repetition;
- structured cloning of levels/prep-like data;
- worker lifecycle;
- artifact writer initialization;
- shard startup/teardown.

Candidate forms:
- long-lived worker pool;
- normalized/compiled problem cache per worker;
- task queues over resident corpora;
- transfer/shared buffers only if measured copy cost is material.

### L. Does memory locality justify a whole-representation experiment?

Current packed keys use a large sparse `KEY_SPACE`; historical repeated dense-index conversion lost.

Audit the distinct architecture:
- assign solver-native contiguous cell IDs at compile time;
- perform all hot solver operations in that ID space;
- keep wire/packed coordinates at boundaries;
- measure complete working-set size and cache behavior;
- no repeated hot-path coordinate conversion.

Only pursue after current profile/opportunity sizing shows memory/index traffic material enough.

### M. Can the corpus become an index of prior computation?

Audit existing stored solutions, family lineage, exact/reference assets, hints, failures, and residual evidence.

Before full search, could a query cheaply ask:

1. exact canonical duplicate already solved?
2. symmetry-equivalent solution transform available?
3. family sibling path valid directly?
4. sibling path cheaply repairable?
5. exact residual/subproblem artifact reusable?
6. historical failed-search certificate applicable?

Start with hit-rate measurement. No new warehouse is justified merely by the concept; reuse existing provenance/resource contracts where possible.

### N. Can research stop before the batch finishes?

This lane targets human wait time directly.

For historical completed A/B or sweep runs, replay rows in their original acquisition order and ask when the eventual decision became stable under candidate sequential rules.

Possible decision criteria:
- decisive gain/loss boundary already crossed;
- confidence/credible interval narrow enough for the stated decision;
- futility bound makes promotion impossible;
- prespecified independent-strata minimum satisfied;
- witness count/coverage target satisfied.

Guardrails:
- no peeking-derived retrospective rule may be promoted without fresh prospective validation;
- parent/family independence must be respected;
- stopping must preserve the experiment's actual question, not merely today's conclusion.

### O. Is "level" the wrong unit of scheduling and accounting?

Compare possible units:
- level;
- canonical equivalence class;
- topology;
- family parent;
- gate;
- residual interface;
- compiled substrate class;
- query bundle;
- research stratum.

The audit should identify where work naturally amortizes and where current one-level accounting hides it.

## 6. Execution phases

### Phase 0 - evidence reconciliation and terminology

- [x] establish audit scope and distinction from pure-speed campaign;
- [ ] map every lane to existing docs/reports/tests;
- [ ] record exact-form negatives and reopen boundaries;
- [ ] identify current batch entrypoints/workflows/scripts.

Deliverable: audit matrix with `known / measured / unmeasured / constrained`.

### Phase 1 - current batch cost anatomy

- [x] add bounded fixed-cost observability for validation/normalization/`prepLevel` (`solver:audit-batch-cost`); execution evidence still pending;
- [ ] measure cheap, mixed, hard-tail workloads;
- [x] inspect process/worker/workflow lifecycle costs;
- [ ] quantify repeated same-level and same-family solve frequency.

Decision: which reuse/ingestion lanes have enough ceiling to merit prototypes?

### Phase 2 - compiled-level ownership audit

- [x] classify `PrepLevel` fields;
- [x] derive `CompiledLevel` / `SolveContext` conceptual boundary;
- [x] identify option-sensitive compile fields;
- [ ] estimate memory and cache residency;
- [ ] prototype same-process reuse only if earned.

Decision: retain conceptual split only, or implement reusable immutable compilation seam.

### Phase 3 - solve-less opportunity census

- [ ] corpus exact-symmetry/equivalence duplicate census;
- [ ] prior-solution transform/direct-validation hit rate;
- [ ] family shared-structure/incremental-compile opportunity sizing;
- [ ] multi-query overlap/divergence sizing;
- [ ] historical-computation index hit-rate pilot.

Decision: nominate at most the best-supported reuse/elimination treatments.

### Phase 4 - search-less opportunity census

- [ ] map existing parity/separator/residual/algebraic assets to presolve;
- [ ] measure static propagation/decomposition opportunities on real levels;
- [ ] identify compact proof-producing candidates;
- [ ] estimate work removable before implementation.

Decision: promote concrete presolve/decomposition experiments through canonical queue.

### Phase 5 - wait-less research audit

- [ ] replay historical batches for decision-time curves;
- [ ] separate compute completion time from decision time;
- [ ] design candidate prospective stopping contract;
- [ ] validate on untouched/fresh experiment if earned.

Decision: integrate sequential stopping into research operating model only with prospective support.

### Phase 6 - architecture synthesis

- [ ] rank opportunities by expected project-level value, uncertainty, implementation cost, and soundness risk;
- [ ] update architectural speed/current queue/future-work docs;
- [ ] create implementation preflights for promoted candidates;
- [ ] explicitly close or defer low-ceiling lanes;
- [ ] leave no research question stranded only in this document.

## 7. Audit matrix schema

Every lane/candidate should eventually record:

| Field | Meaning |
|---|---|
| id | stable audit identifier |
| question | falsifiable opportunity question |
| computational unit | level/family/residual/query/etc. |
| reuse scope | none/same solve/same process/cross process/cross run |
| correctness class | pure-equivalent / exact proof / safe relaxation / behavior-changing / research-only |
| current evidence | source reports/code/tests |
| historical constraints | exact-form negatives that apply |
| opportunity ceiling | measured removable work/time or hit rate |
| prototype cost | rough engineering/research cost |
| decision gate | evidence required to continue |
| disposition | open / promoted / deferred / closed |
| canonical destination | queue/workstream/future-work/architecture doc |

## 8. Method rules

1. **Measure ceilings before machinery.** Do not build persistent caches, canonicalizers, databases, or multi-instance engines before showing enough repeated work exists.
2. **Keep exact-form negatives exact.** An adjacent historical failure reduces prior probability; it does not falsify a different computational boundary.
3. **Separate pure speed from less work.** Search-reducing treatments need capability/economics evaluation, not strict node parity.
4. **Separate exact reuse from predictive reuse.** Only proved equivalence or a sound implication can authorize skipping work.
5. **Count independent support correctly.** Family siblings do not become independent evidence because they run faster.
6. **Include memory and invalidation.** A cache that saves CPU by exploding resident memory or stale-artifact risk may be a loss.
7. **Optimize the human loop as well as CPU.** Time-to-decision is a first-class metric for research batches.
8. **Prefer existing substrate.** Family manifests, provenance/resource contracts, exact/reference tools, solution stores, and research joins should be reused before new stores are invented.
9. **Do not make the runtime solver carry research-only complexity without an earned production use.**
10. **Commit evidence, not vibes.** Each promoted idea needs an opportunity-sizing report or equivalent durable evidence.

## 9. Immediate next actions

1. complete Phase 0 evidence map from current HEAD;
2. inventory solver/research batch entrypoints and locate where validation/normalization/`prepLevel` occur;
3. classify `PrepLevel` fields by mutability and dependency;
4. choose a minimal representative workload for fixed-overhead measurement;
5. inspect existing logs for historical timing data that can answer Phase 1 without a new large run;
6. inspect completed experiment artifacts for a cheap retrospective time-to-decision pilot;
7. update this plan and the PR after each material finding.

## 10. Progress log

### 2026-09-20 - branch reconciliation staging

- PR #1938 (`chatgpt/parity-response-signature-integration-2026-09-20`) was merged into this branch with both histories preserved in merge commit `2f2367575d35cd2408b8b6b7a3e206a0f3876bab`.
- The only overlapping path was `package.json`; reconciliation retained every #1938 script entry and this audit's `solver:audit-batch-cost` entry.
- Compare verification after the merge showed #1938 head `beca9c0` is fully contained (0 commits behind the integrated head).
- PR #1938 was then closed as superseded by this integration staging PR. PR #1936 was also closed because it was an empty-tree validation PR for an older integrated tree and carried no file content to preserve.
- PR #1937 was reconciled after its work completed. Merge commit `ca14a79508cb5e9855a8edfb9573e90e6ec02e86` preserves both histories. Seven overlapping paths were resolved explicitly: #1937 remains authoritative for retired protocol/schema aliases, while newer research helpers/tests from #1938/#1939 were retained on those canonical forms. Compare verification showed both pre-merge heads are fully contained (0 behind).

### 2026-09-20 - Phase 1/2 instrumentation and boundary design

- Added `scripts/solver-batch-cost-probe.mjs`, exposed as `npm run solver:audit-batch-cost -- ...`. It measures validation, normalization, and `prepLevel` without requiring search; optional `--solve` adds ordinary solve wall time under a fixed work/node budget.
- Added [`../reports/2026-09-20-compiled-level-solve-context-boundary-audit.md`](../reports/2026-09-20-compiled-level-solve-context-boundary-audit.md).
- The recommended first implementation, only if Phase 1 earns it, is a compatibility-preserving static-data builder plus fresh execution shell. Do not begin with persistence, a global cache, semantic hashing, or a dense-core rewrite.
- Required-length sweeps are a particularly clean reuse question because changing only `reqLen` conceptually invalidates less than a full `prepLevel` rebuild, but actual economics remain unmeasured.
- Cross-solve lower-bound memoization is separated from immutable compilation: it has independent key-completeness, memory, concurrency, and experiment-warmth questions.

### 2026-09-20 - Phase 0 evidence map completed

- Durable evidence map: [`../reports/2026-09-20-solver-batch-digestion-phase0-audit.md`](../reports/2026-09-20-solver-batch-digestion-phase0-audit.md).
- Major portfolio batch runners already reuse forked workers, parsed corpora, and nested race pools; generic process persistence is therefore narrowed rather than promoted.
- The portfolio main process has a local prepared-level cache for pre-pipeline checks, while worker solves explicitly re-normalize/re-prepare. Compiled-problem reuse stops at the actual solve boundary.
- `PrepLevel` has a strong immutable-compile versus mutable-execution lifetime split. Option-sensitive compile products and lazy lower-bound caches need explicit contracts before reuse.
- Historical `prepLevel` cost was material mainly on many-short-solve workloads; current magnitude still requires Phase 1 measurement.
- Conservative attempt-family result reuse already exists, providing an architectural precedent for "solve less" without implying mathematical equivalence reuse.
- Phase 0 matrix IDs BD-A1 through BD-I2 are recorded in the report.

### 2026-09-20 - audit opened

- Current `solveLevel()` creates a fresh `PrepLevel` once per solve and shares it across that solve's internal attempt ladder.
- Worker `SOLVE` accepts raw wire data, validates and normalizes inside the worker, then calls `solveLevel`; repeated worker solves therefore repeat validation/normalization and per-solve preparation.
- Existing beam continuation requires exact same live `level` and `prep` instances and is intentionally in-memory; this is execution continuation, not immutable compiled-problem reuse.
- Existing family/research integration already supplies lineage needed to opportunity-size cross-variant reuse without inventing a new evidence store.
- Existing residual-state theory supplies the proof boundary for exact cross-state memoization and quotienting.
- Existing architectural-speed negatives remain applicable only to their measured exact forms.
