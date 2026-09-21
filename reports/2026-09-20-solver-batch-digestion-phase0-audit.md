# Solver batch digestion architecture audit — Phase 0 evidence map

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — Phase-0 execution/evidence mapping identified real repeated preparation and narrowed several speculative batch ideas.
> **Decision:** Continue with measured compile reuse, bounded presolve, equivalence, family reuse, and decision-latency lanes; do not rebuild already-amortized worker infrastructure.
> **Remaining gate:** Complete the bounded empirical censuses and use their measured ceilings to promote or close each implementation lane.
## Executive findings

The motivating premise survives contact with the current repository, but several brainstormed forms narrow immediately.

1. **Important batch runners already amortize process startup.** `portfolio-solve-sweep.mjs` uses a persistent fork pool when `--workers>1`; each fork handles many tasks. Its worker caches parsed corpus files, and nested raced-solver pools are created lazily once per fork and reused. The single-process raced path likewise keeps one race pool across levels. A generic persistent-worker rewrite is therefore not an unclaimed large idea for this path.

2. **Per-level preparation still repeats per solve.** Each sequential solve calls `solveLevel(level,...)`; `solveLevel` unconditionally creates a fresh `PrepLevel`. Forked portfolio workers normalize the requested raw row then call `solveLevel`, so every task repeats normalization plus preparation even though the worker and corpus remain resident.

3. **The main portfolio process already has a small prepared-level cache, but only for pre-pipeline feature/cache checks.** Its own comment explicitly says worker processes re-prepare independently. This is direct evidence that normalized/prepared reuse is already useful enough to exist locally but stops at a process/solver boundary.

4. **`PrepLevel` has two incompatible lifetimes fused into one type.** Most public fields are immutable functions of the level and compile options. The same object also owns per-solve work accounting, per-attempt caps/config, mutable metrics, observers, state-buffer pools, and lazy caches. This prevents safe whole-object reuse even when most underlying arrays/maps are static.

5. **Historical evidence says preparation overhead is real mainly for short/many-solve workloads.** The 2026-08-23 dense-`staticNeighborKeys` report measured `prepLevel` at about 3.3% of published-corpus self time on that historical profile, and a fixed-allocation reduction improved the published batch ~2.7% while hard Corpus-2 movement was near noise. Current magnitude is stale, but the shape strongly supports measuring batch fixed cost separately from hard-tail cost.

6. **The failed six-array dense conversion does not close a compiled dense-core architecture.** Its report explicitly attributes the hard-tail loss to repeated hot-path `denseIndex()` arithmetic and says dense level-local storage itself was not falsified. The audit should preserve that exact boundary.

7. **Existing residual/family substrate already covers the proof/provenance prerequisites for several ambitious reuse lanes.** Residual-state docs distinguish exact, safe-relaxed, restricted, and predictive interfaces; family integration already preserves parent/variant lineage and independence. The audit does not need a new evidence warehouse to begin opportunity sizing.

## Current execution topology

### Direct/published benchmark style

Typical shape:

```
load corpus once
for level:
  validate + normalize raw
  solveLevel(normalized)
    prepLevel()              # fresh every call
    run attempt ladder
```

Examples:
- `scripts/solver-bench.mjs`
- `scripts/run-solver-direct.mjs`
- `scripts/solver-speed-probe.mjs`

### Stress benchmark

`scripts/stress/benchmark.mjs` can run sequentially, across worker threads, or through an attempt-race pool.

Important distinctions:
- outer worker threads are long-lived over dynamically assigned levels;
- raced engine uses a persistent race pool within the process;
- each level still passes through its own normalization/solve preparation path;
- skip/reuse choices can change CPU contention, and the tool already guards against invalid timing comparisons caused by skipping only part of a parallel workload.

### Portfolio sweep

`scripts/portfolio-solve-sweep.mjs` is already architecturally more mature:

- persistent child-process pool via `solver-worker-pool.mjs`;
- worker script bundled once per parent process;
- tasks dynamically scheduled to resident forks;
- worker-side corpus JSON cached by corpus path;
- nested attempt-race pool persistent per fork;
- main-process `preparedCache` avoids repeated preparation only for pre-pipeline checks;
- result-level attempt-family cache can skip baseline-unsolved levels when all relevant code-family hashes are unchanged;
- resume/checkpoint avoids recomputing completed rows from the same exact run.

This means the audit must distinguish at least four reuse layers already present:

1. **runtime/process reuse** — substantially present;
2. **dataset parse reuse** — substantially present in portfolio workers;
3. **result reuse** — partially present through checkpoints and attempt-family cache;
4. **compiled problem reuse** — largely absent at the actual `solveLevel` boundary.

## `PrepLevel` lifetime classification

### Clearly level-derived / compile-like

The following are created by `prepLevel()` from level geometry/object placement and compile options and are not normally mutated by orchestration:

- grid width;
- gate/static blocker arrays and row masks;
- dead-flipper set;
- must-pass / must-cross / flipper / must-turn index arrays;
- static neighbor table;
- forced first-step map;
- goal/objective/must-pass/must-cross distance maps and dense arrays;
- pairwise objective distances;
- flipper approach arrays;
- portal parity maps;
- optional parity-phase goal arrays;
- landmark neighbor/index/distance structures;
- initial obligation masks;
- invalid false-goal set;
- objective key list;
- level-static mechanic flags.

These are the natural first candidates for an immutable `CompiledLevel`.

### Compile-option-sensitive

At least these current prep outputs can vary with preparation options:

- false-goal neighbor allowance changes distance/passability assumptions used by the false-goal trigger search;
- parity-phase goal distance arrays are optional and currently built only when the observer requests them.

A reusable compile object therefore needs an explicit compile-key/options contract rather than assuming one universal artifact.

### Clearly solve-/attempt-local mutable

Current orchestration mutates:

- `_workMeter`;
- `_workCap`;
- `_strictWorkCap`;
- `_metrics`;
- `_cfg` (including temporary replacement in additive retry tiers);
- `_forcedFirstStepKey`;
- `_forcedPortalExitKey`;
- attempt-budget telemetry flags;
- beam/prune/failure/connectivity/parity/joint-obligation observers and attempt contexts;
- beam research attempt ordinal.

These belong in a fresh solve/execution context if a compiled boundary is ever introduced.

### Mutable storage whose *allocation* can be solve-local while ownership changes

- `_stateBufs` is deliberately scoped per `PrepLevel` after a proven concurrency bug with module-global buffers. Reusable compilation must not reintroduce shared mutable state.
- beam continuation currently asserts exact `level` and `prep` object identity because it carries live mutable execution state. A compiled-level refactor must keep continuation ownership tied to the solve context, not merely the immutable compiled problem.

### Lazy caches requiring separate analysis

- `_mpLowerBoundCache`;
- `_mcLowerBoundCache`;
- `_jointObligationClusters`.

The lower-bound comments explicitly state their values are pure enough to share across attempts/gates within one solve, but current lifetime is intentionally bounded by fresh `PrepLevel` creation. This raises a distinct question:

> are these caches semantically safe and economically useful across separate solves of the exact same compiled problem?

That is not established by current code comments. Before broadening lifetime, key completeness, option/config dependencies, memory growth, and concurrent access must be audited explicitly.

## Existing result reuse already present

The audit initially framed "historical computation as an index" as radical, but the repo already contains a narrow precedent: `solver-attempt-family-cache.mjs`.

Its semantics are conservative:
- reuse applies only to baseline-unsolved outcomes;
- relevant attempt families are selected from the normalized level;
- family code hashes detect whether code that the level's solve could touch changed;
- unchanged relevant families allow the level to be skipped.

This is code-identity/result reuse, not mathematical problem equivalence, but it proves the batch tooling already accepts the principle that a solve need not run merely because a row exists.

The broader audit should therefore ask how far this idea can safely extend:
- exact canonical level identity;
- exact symmetry identity;
- solution transform/direct validation;
- family-sibling path validation/repair;
- exact reusable subproblem facts.

## Historical performance constraints

### Preparation fixed cost

The historical dense-`staticNeighborKeys` report provides a useful prior:

- `prepLevel` was ~3.3% of published-corpus profile self time in that historical environment;
- shrinking one 16.8 MB per-level allocation produced a reproducible ~2.7% published-corpus speedup;
- the hard C2 effect was ~1% / noisy because search dominated.

Implication: **same-level compiled reuse is unlikely to transform individual 60-second hard solves by itself**, but could matter in:
- many-short-solve workloads;
- repeated control/treatment queries;
- parameter sweeps;
- generated variant/family workloads;
- research pipelines that solve the same instance repeatedly.

Current HEAD must be remeasured.

### Dense-core boundary

The later six-array conversion:
- improved short/published sample ~5.83%;
- regressed hard C2 ~2.82%;
- preserved search decisions.

Its own interpretation says repeated `denseIndex()` arithmetic plausibly moved cost into hot loops and explicitly states dense level-local storage itself was not falsified.

Therefore:
- **closed:** mechanically converting current packed-key arrays while recomputing dense indices at many read sites;
- **open but unearned:** a solver-native contiguous-ID architecture with conversion only at boundaries and no repeated hot-path packed-to-dense arithmetic.

### Local specialization/allocation work

Current performance authorities close or defer several local hot-loop rewrites. That lowers the value of another isolated "make objects smaller" pass.

It does not answer:
- less search via presolve;
- less duplicated search across queries;
- compile once / solve many;
- family/shared compilation;
- exact equivalence elimination;
- time-to-decision stopping.

## Phase 0 audit matrix

| ID | Lane | Current evidence | Status after Phase 0 |
|---|---|---|---|
| BD-A1 | raw validation/normalization cost | repeated per worker task/direct solve; no current timing | **OPEN — measure ceiling** |
| BD-A2 | `prepLevel` fixed cost | historical ~3.3% published profile; current stale | **OPEN — remeasure** |
| BD-B1 | immutable compiled-level split | strong source-level seam; mutability inventory above | **OPEN — high-value architecture candidate, no implementation yet** |
| BD-B2 | same-process same-level compile reuse | no treatment; repeated prep visible | **OPEN — quantify reuse frequency + break-even** |
| BD-B3 | persisted compiled artifacts | no evidence | **DEFER until B2 earns it** |
| BD-C1 | generic persistent worker pool | already present in major sweep path | **NARROWED — audit remaining fixed tax only** |
| BD-C2 | resident corpus/raw parse cache | present in portfolio workers | **NARROWED / largely satisfied there** |
| BD-D1 | exact symmetry/equivalence skip | family symmetry assets exist; no corpus burden census yet | **OPEN — census before machinery** |
| BD-D2 | historical solution direct-transform reuse | hints/family lineage exist; no hit-rate census yet | **OPEN — census** |
| BD-D3 | code-family result reuse | conservative attempt-family cache exists | **PRESENT — precedent / possible extension point** |
| BD-E1 | presolve/propagation | several existing algebraic/parity/separator assets | **OPEN — map opportunities** |
| BD-E2 | hierarchical/decomposition solve | residual/separator theory present; no production architecture | **OPEN — opportunity-size** |
| BD-F1 | solver-native contiguous representation | adjacent naive conversion lost; architecture not directly tested | **OPEN but profile-gated** |
| BD-G1 | cross-attempt exact knowledge | some within-solve LB caches; no technique-independent knowledge bus | **OPEN — correctness inventory first** |
| BD-H1 | multi-query execution | req-length/treatment/family batches repeat nearby questions | **OPEN — measure shared compilation/work and divergence** |
| BD-I1 | adaptive batch stopping | research system has explicit populations/independence; no time-to-decision replay yet | **OPEN — cheap retrospective pilot** |
| BD-I2 | unit other than level | family/residual/topology units already modeled in research system | **OPEN — synthesize after censuses** |

## Immediate conclusions

### Worth pursuing now

1. current-head fixed-overhead probe;
2. `CompiledLevel` / `SolveContext` boundary design and reuse-frequency census;
3. symmetry/prior-solution hit-rate census using existing family assets;
4. retrospective time-to-decision replay using already completed experiments;
5. mapping existing separator/parity/algebraic observers into presolve opportunity questions.

### Do not build yet

- persistent compiled artifact format;
- new cache database/warehouse;
- generic replacement worker pool;
- whole solver dense-ID rewrite;
- cross-level memoization engine;
- simultaneous multi-level search;
- universal structural-token library.

Each requires a measured ceiling or hit rate first.

## Sources consulted

- `modules/solver/prep.ts`
- `modules/solver/types.ts`
- `modules/solver/orchestration*.ts`
- `modules/solver/search-state.ts`
- `modules/solver/lower-bounds.ts`
- `scripts/solver-bench.mjs`
- `scripts/stress/benchmark.mjs`
- `scripts/portfolio-solve-sweep.mjs`
- `scripts/portfolio-solve-sweep-worker.mjs`
- `scripts/solver-worker-pool.mjs`
- `scripts/solver-attempt-family-cache.mjs`
- `scripts/req-length-sweep.mjs`
- `scripts/family-parent-hint-replay-batch.mjs`
- `docs/solver-architectural-speed-opportunities.md`
- `docs/solver-residual-state-representation.md`
- `docs/solver-research-population-family-integration-plan.md`
- `reports/2026-08-23-dense-static-neighbor-keys.md`
- `reports/2026-08-26-dense-index-architecture-followup.md`
- `reports/2026-08-24-speed-substrate-static-audit.md`
- `reports/2026-09-15-solver-performance-evidence-lineage-audit-001.md`
