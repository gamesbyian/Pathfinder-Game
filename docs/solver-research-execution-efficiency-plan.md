# Solver research execution-efficiency plan

> **Status:** active / implementation started.
> **Created:** 2026-09-25.
> **Authority boundary:** `docs/solver-optimization-workstreams.md` remains the scientific priority/next-gate authority. This plan owns research-execution cost, reproducibility, input topology, and harness-economics work that supports those gates without changing scientific priority.

## Objective

Increase the rate and reliability of solver research by removing work that is neither the treatment under study nor necessary evidence, while preserving exact experiment identity, matched-work semantics, cold level-blind boundaries, and the existing evidence/provenance contract.

The immediate target is the **research machine around the solver**, not a new solver technique.

This plan was triggered by the 2026-09-23 through 2026-09-25 CI speed program. That program repeatedly found permanent wins by changing execution shape without weakening evidence: exact generation caches, sparse materialization, deterministic bookkeeping witnesses, callable semantic seams with retained executable smokes, hermetic real-data fixtures, bounded concurrency, and semantic impact routing. Failed optimization attempts also exposed architectural defects: hidden shared mutable Hint state, undeclared snapshot dependencies, incorrect cache-producer ownership, and CPU contention.

The solver program should deliberately reuse that method.

## Current repo starting facts

As of main `7d94df87fde1ab35f46900950188f402f3fe67dc`:

- the canonical solver queue was last reconciled 2026-09-22, before the completed Hint/provenance hostile audit and the latest CI architecture work;
- maintained solver/research batch workflows have strong scientific identity: immutable refs, corpus/sample hashes, effective configuration, solver-request identity, arm agreement, sealed populations, work accounting, and provenance;
- the maintained solver workflow inventory currently contains 11 `solver-*.yml` / `harvest-solver-evidence.yml` workflows;
- all 11 still specify floating `node-version: '20'` at their Node setup sites;
- none currently uses the exact `node_modules` generation restore proven in production CI;
- sparse checkout is now active in `solver-routing-regime-sample-ab.yml` and in the targeted-sweep short plan/canary boundary; the latter preserves arbitrary caller-selected corpus/ID blobs via immutable `git show` materialization;
- several matrix workflows repeat checkout + setup-node + `npm ci` independently in planner/generator, solve-shard, and combine/freeze jobs;
- `solver-highbudget-unsolved-sweep.yml` already has telemetry-weighted dynamic sharding and the workflow README explicitly treats worker/lane counts as throughput defaults rather than laws, so generic shard-count tuning is **not** an initial priority.

These are topology observations, not claims that bootstrap dominates long solver shards. Phase 1 measures that economics before activation.

## Operating principles

1. **Scientific semantics outrank speed.** WorkSpent/matched-work, treatment identity, population identity, safety/referee checks, and holdout independence do not change merely to save wall time.
2. **Measure at the right layer.** Separate queue/runner delay, bootstrap, invariant preparation, actual solver work, aggregation, and persistence.
3. **Exact reuse only.** Cached/reused material must have a generation identity strong enough that a stale hit is impossible by construction; misses retain a correctness-preserving regeneration path.
4. **Canonical producer ownership.** A derived resource is published by the process that creates the canonical generation, not by an adjacent consumer.
5. **Smallest witness for plumbing; real search for science.** Harness/config/provenance/aggregation assertions should not invoke expensive search unless search behavior is itself the claimed invariant.
6. **Shadow before authority.** Any mechanism that suppresses solver work is observational first, then counterexample/fault challenged, then allowed to become authoritative only after its safety/economics gate.
7. **Optimization attempts are architecture probes.** A negative speed result still closes the tested form and any exposed ownership, hidden-dependency, shared-state, or reproducibility defect is retained as a permanent correction.
8. **No duplicate execution queue.** Scientific ordering stays in `solver-optimization-workstreams.md`; this plan annotates/supports live gates and infrastructure only.

## Phase 0 — reconcile the live solver queue to current architecture

### Question

Which assumptions in the 2026-09-22 queue are stale after Hint/provenance consolidation, research-system query changes, and the CI execution work?

### Work

- review every active/supporting queue row against current main;
- distinguish scientific state changes from execution/infrastructure changes;
- update only material queue facts: available retained evidence, canonical persistence routes, queryability, harness capabilities, execution cost assumptions, and prerequisites;
- do not reopen scientifically closed forms merely because infrastructure changed;
- link this plan from the queue as a supporting infrastructure program.

### Exit

- queue reflects current main;
- no live gate depends on a retired Hint writer/reader path or pre-consolidation persistence assumption;
- every execution-efficiency task that materially affects a live gate is linked rather than copied into a second queue.

## Phase 1 — build research execution topology + economics evidence

### Deliverable

A dependency-free audit, modeled on `scripts/ci-testability-topology-audit.mjs`, that inventories maintained solver/research workflows and emits machine-readable evidence.

Minimum fields per workflow/job class:

- checkout count and sparse/full materialization;
- setup-node count and requested Node version;
- `npm ci` count;
- exact dependency-tree restore presence;
- run-bundled/build boundaries where statically visible;
- matrix/max-parallel/worker inputs where statically visible;
- artifact download/upload boundaries;
- canonical persistence responsibility;
- whether the job is planner/generator, scientific solve, combine/analysis, persistence, or guard where inferable.

The first static audit does **not** pretend YAML occurrence counts equal runtime cost. A later hosted measurement joins actual job/step timing where useful.

### Questions

- which short-lived research jobs spend a material fraction of wall time in bootstrap?
- which high-fanout matrices repeat substantial setup across every shard?
- which jobs materialize repository surfaces they cannot scientifically consume?
- where is the same immutable preparation rebuilt by multiple arms/shards?
- where does process/bundle/serialization topology dominate a small pilot?

### Exit

- checked-in audit tool;
- reproducible report or documented command;
- ranked *measurement* queue, not a speculative rewrite queue;
- explicit low-value findings retained so later agents do not rediscover them.

## Phase 2 — exact execution-runtime identity

### Premise

The research system binds solver request, corpus/population and provenance identity tightly. The former major-only `node-version: '20'` gap is now closed: maintained workflows use exact runtimes, so runtime patch drift no longer contaminates repeated dispatches of the same solver commit.

### Work

1. record exact runtime identity in experiment/run metadata where not already captured. **Activated:** the level-blind capability and history-aware portfolio producers emit actual Node version, platform, and architecture in their report summaries; all maintained research workflows now pin exact Node versions, with diagnostics conservatively fixed at 20.20.2 pending its own cross-major parity.
2. rehearse a representative cross-section under an exact runtime:
   - planner/combine-only path;
   - level-blind solver path;
   - history-aware portfolio path;
   - treatment/control A/B path;
3. compare semantic outputs against the current Node-20-major workflow contract;
4. choose and document one exact research runtime generation. Prefer reusing CI-proven Node 22.23.2 if representative solver evidence remains semantically stable; otherwise pin an exact Node 20 patch and record why.

### Exit

- maintained research workflows no longer float a major-only Node version. Rehearsed scientific producer workflows and deterministic helper/harvest/integrity workflows use exact Node 22.23.2; solver diagnostics is the explicit exact-20.20.2 exception because it still executes real solver analysis without a cross-major parity rehearsal;
- runtime identity is inspectable in produced evidence;
- migration evidence demonstrates no unexplained solved-set/config/provenance drift.

## Phase 3 — bootstrap economics and exact dependency-tree reuse

### Premise

Production CI proved an exact dependency-tree generation keyed by runner OS + architecture + exact Node + exact npm + `package-lock.json` hash, with `npm ci` retained on miss.

### Work

- measure bootstrap/total-wall fraction by research job class;
- prioritize short pilots, planner/generator/combine jobs, and high-fanout matrices where repeated setup is economically material;
- transplant the exact-tree restore pattern only after exact runtime identity is settled;
- seed generations from an appropriate canonical/default-branch producer;
- preserve setup-node npm caching as miss acceleration;
- retain `npm ci` as the correctness fallback;
- do not optimize a two-hour shard's one-time install merely because the mechanism exists.

### Exit

- activation only where hosted evidence shows useful wall or runner-minute savings;
- exact miss/hit identity documented;
- no scientific output difference between hit and miss paths;
- low-value workflow classes explicitly closed/no-action.

## Phase 4 — input materialization and level-blind filesystem boundary

### Premise

CI's sparse Git-ref work cut large snapshot costs but also exposed an undeclared `/modules/` dependency through a real parity assertion. Sparse materialization is therefore both an optimization and a dependency audit.

### Work

- derive, do not hand-wave, the read surfaces of candidate workflow jobs;
- start with level-blind workflows because `level-blind-capability-sweep.mjs` already has a mechanical gameplay-field allowlist and refuses history/hint/baseline inputs;
- construct sparse candidate checkouts;
- run full-tree vs sparse-tree semantic parity on representative jobs;
- fail closed when an undeclared input is observed;
- preserve full checkout fallback until parity is established.

### Exit

- sparse activation only for jobs with an explicit input contract and parity evidence;
- any hidden dependency discovered becomes a declared dependency or an architectural correction;
- cold level-blind jobs do not carry research/history assets they cannot consume unless a concrete build/runtime dependency requires them.

## Phase 5 — harness/search separation on live gates

### Current scope

Audit the harnesses serving the *current* queue rather than historical tests indiscriminately. The scope was refreshed after the September-25 queue reconciliation so closed experiments do not keep consuming optimization attention.

Current live surfaces:

- WS2 repair-deadline **production-scale matched-work confirmation**, using the generic level-blind targeted-sweep path unless the promotion design earns a different harness;
- WS2 capability-invention **promotion decision / any explicitly justified broader safety sample** for CID-0027 and CID-0028; do not manufacture another acquisition round merely to exercise this phase;
- WS2 BC1 later-disposition shadow, still production-inert and bounded-compute;
- WS1 **single-stage N=160 late-continuation confirmation**, replacing the closed underpowered 24/96-parent two-stage structure;
- WS6 independent-parent replication/speed profiling when it becomes the immediate queue gate.

Removed from the Phase-5 optimization scope because their scientific forms are closed: admissible-order reserve 0.35, forced-work capture economics, and the WS1A remaining-length bridge. Historical harnesses remain reproducible, but they are not current optimization targets.

Initial live-harness audit: [search/plumbing audit](../reports/2026-09-25-live-solver-harness-search-plumbing-audit-001.md). The generic targeted sweep does not currently reproduce CI's strongest fixture-generation defect: real search is confined to the execution-family canary and scientific solve/recovery shards, while combine/integrity/contract/publication and WS1 frozen-model scoring are deterministic. Continue auditing BC1/WS6 only when they become immediate gates.

For each live surface, classify work as:

- scientific search that must remain real;
- harness/config/plumbing proof;
- invariant preprocessing;
- attribution/provenance/serialization;
- aggregation/reporting.

### Rule

**Plumbing gets the cheapest deterministic witness that proves the contract; scientific claims buy real search.**

Use the same successful CI pattern where appropriate:

- pure callable seam for semantic cases;
- retain a real CLI/process smoke;
- private one/few-record real-data fixture instead of whole corpus;
- deterministic dispatch for lifecycle/accounting checks;
- reuse one fresh real result for multiple assertions when independence is not part of the claim.

### Exit

No reduction is accepted unless the same invariant is explicitly identified and preserved. Real solver integrations stay real when search behavior is the contract.

## Phase 6 — gate-cost telemetry, not a second priority score

Extend existing research metadata/queryability with factual execution cost where available:

- solver `workSpent`;
- runner wall / bootstrap wall;
- population units consumed;
- exact/reference queries;
- new instrumentation required;
- whether the result changed a live gate;
- durable reuse/consumption links already recorded by the research system.

Do **not** create an ROI score, winner ranking, or parallel queue. The purpose is to answer historical questions such as “which evidence families repeatedly buy expensive compute before the first discriminator?” and “which retained assets keep answering later gates cheaply?”

## Phase 7 — transport CI's shadow-authority pattern to WS1 if confirmation earns it

This phase is conditional on WS1 independent confirmation.

Activation ladder:

1. frozen selector runs observationally while production portfolio remains unchanged;
2. record exactly which work/actions it would suppress;
3. compare against eventual winners and work attribution prospectively;
4. adversarially exercise decision-boundary/counterexample cases;
5. uncertainty defaults to the existing action menu;
6. only earned regions gain authority to suppress work;
7. retain periodic broad backstop measurement.

This phase does not prejudge WS1's scientific result.

## Definition of done

This plan is complete only when:

- the canonical solver queue is reconciled to the post-consolidation execution architecture;
- workflow execution topology is mechanically auditable;
- maintained evidence workflows use an exact runtime generation or have a documented justified exception;
- bootstrap optimizations are activated only from measured economics with exact miss fallbacks;
- any sparse checkout activation has full-vs-sparse parity evidence and a declared input contract;
- live harnesses have been checked for accidental expensive search in non-search assertions;
- gate-cost facts can be queried without inventing a second priority system;
- WS1 shadow-authority guidance is integrated if/when the scientific confirmation earns that stage;
- negative experiments and exposed architecture defects are preserved in dated evidence;
- documentation, workflow lifecycle/README, package reachability, research queryability, and any new guards/tests in the plan's splash zone are updated together.

## Immediate implementation tranche

1. **DONE:** add a static research-workflow bootstrap/topology audit, now with per-job classification and measurement queues.
2. **DONE:** produce the current starting census and add hosted September-22 bootstrap timing evidence.
3. **DONE:** reconcile and compact the solver queue with this supporting program and post-September-22 architecture.
4. **ACTIVATED:** run 36190221008 proved byte-identical semantics for exact Node 20.20.2 vs 22.23.2 across the primary level-blind and history-aware producers. The seven maintained workflows whose scientific execution uses `level-blind-capability-sweep.mjs` or `portfolio-solve-sweep.mjs` now pin exact Node **22.23.2** at every setup site. Helper/harvest/integrity workflows outside those rehearsed producer families are deliberately not swept into this activation merely for uniformity.
5. **ACTIVATED:** run 36187498364 proved byte-identical full-tree vs sparse-tree semantics for the live targeted-sweep planner + one real level-blind canary. The production targeted planner now sparse-checks out package manifests, scripts, modules, the default Corpus-2 file, and runtime telemetry. Caller-selected `corpus` and `ids_file` remain authoritative: the planner materializes those exact blobs from the dispatched immutable commit with `git show`, so sparse activation does not narrow the workflow's input contract.
6. **ACTIVATED FOR ONE SHORT ORCHESTRATOR:** the targeted-sweep plan job now restores the exact CI-proven `node_modules` generation keyed by runner OS/arch + Node 22.23.2 + npm 10.9.8 + lockfile hash, skips npm-cache restore/`npm ci` on a hit, and preserves `npm ci` plus exact-cache save on a miss. Historical short-orchestration evidence showed roughly a minute of checkout/runtime/install before useful planner/canary work; the next real targeted dispatch supplies production hit/miss economics without changing solver semantics.
7. **DONE — runtime classification:** the remaining helper workflows are no longer major-only. Harvester, cross-run combine, and evidence-integrity guard pin 22.23.2 because their deterministic transforms are already covered by permanent CI contracts on that runtime; solver diagnostics pins exact 20.20.2 because it executes real solver analysis and has not earned the cross-major move.
8. **NEXT:** inspect the first real targeted-sweep hit/miss timing, then extend exact dependency-tree reuse only to other short planner/generator/combine jobs where bootstrap remains material. Long solve shards stay measurement-gated.
9. Do not bulk-optimize long solver shards before their own semantics/economics justify it.
