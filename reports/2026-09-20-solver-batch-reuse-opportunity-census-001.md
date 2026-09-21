# Solver batch digestion reuse opportunity census

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — static census found run-ablation as the strongest exact same-level reuse customer and req-length sweep as a partial-invalidation case.
> **Decision:** If compile reuse is economical, prototype first at the ablation runner rather than as a generic global cache.
> **Remaining gate:** Confirm the preparation share relative to solve time before implementation.
## Question

Where does maintained tooling deliberately solve the same level, or a minimally changed sibling, repeatedly inside one process?

That determines whether compile-once / solve-many has a real consumer before any solver API refactor is attempted.

## 1. Strongest exact-reuse customer: ablation runner

`scripts/run-ablation.mjs` has this nesting:

```
for experiment:
    for level:
        prepareLevelForSolver(raw)
        solveLevel(level, { ablation: experiment.config })
```

Therefore, for a run with `E` experiments and `L` levels:

- normalization count is approximately `E * L`;
- `solveLevel()` creates a fresh `PrepLevel` approximately `E * L` times;
- only `L` distinct level semantics exist.

The same normalized level is reconstructed once per experiment even though the experiment changes solver configuration rather than level geometry.

### Why this is a particularly clean prototype target

The ordinary ablation config is installed after `prepLevel()`; current preparation does not receive the ablation config as a compile input.

Current `prepLevel(level, opts)` has only two explicit preparation options:
- `allowFalseGoalNeighbors`;
- `includeParityPhaseGoalDist`.

Ordinary ablation runs do not vary these compile options between experiments.

So, subject to a field-level ownership audit already recorded in `2026-09-20-compiled-level-solve-context-boundary-audit.md`, the static compiled data for one level should be identical across experiments.

This is stronger than family reuse because no equivalence proof, delta compiler, semantic hashing, persistence, or cross-process cache is required.

### Candidate first experiment

If fixed-cost timing earns implementation:

1. normalize each target level once before the experiment loop;
2. build immutable compiled static data once per normalized level;
3. create a fresh solve context per experiment/solve;
4. preserve search/work outcomes exactly;
5. compare end-to-end ablation wall time and retained memory against ordinary execution.

The experiment must include setup cost and realistic experiment counts.

No public/global cache is needed.


## 1A. Current ablation multiplicity and measured compile ceiling

Current `buildExperimentList('full')` expands to **153 experiments**:

- baseline: 1;
- single-feature experiments: 97;
- attempt-order experiments: 8;
- scoring-profile off/solo experiments: 24 (12 profiles x 2);
- ordering-bias experiments: 9 (8 individual + all-off);
- named pair experiments: 11;
- non-profile/non-ordering group ablations: 3.

The current-head fixed-cost measurement (`reports/2026-09-20-solver-batch-fixed-cost-measurement-001.md`) measured one full 160-level published pass at about **111.8 ms** of `prepLevel` work.

If all 153 full-ablation experiments target all 160 published levels, the existing nesting therefore contains approximately:

`153 * 111.8 ms ~= 17.1 seconds`

of preparation work before cache/context overhead.

On the measured 200-row Corpus-2 sample, one pass cost about **371.7 ms** of prep, implying approximately:

`153 * 371.7 ms ~= 56.9 seconds`

across an equivalent full-ablation experiment matrix on those 200 rows.

These are upper ceilings for perfect compile-once reuse, not promised savings.

Normalization is not worth coupling to the refactor for speed: its measured cost is only about 1.4 ms per full published pass and 2.85 ms per sampled 200-row Corpus-2 pass.

The outstanding question is percentage-of-total batch wall time. Search-relative measurement is required before implementation.

## 2. Repeated exact solves inside required-length points

`scripts/req-length-sweep.mjs` prepares each `reqLen` point once, then runs:

```
for repeat = 1..R:
    solveLevel(level)
```

For `R > 1`, the exact same normalized level is solved repeatedly and therefore gets a fresh `PrepLevel` on every repeat.

This supplies a second exact-reuse customer.

Unlike the ablation runner, however, repeated runs may intentionally measure runtime variability. A warm compiled cache changes the measured execution envelope, so any reuse experiment must distinguish:

- product/research throughput optimization;
- benchmark methodology that intentionally wants cold per-solve setup.

Compile reuse can be valid for the former without becoming the default for the latter.

## 3. Partial-invalidation customer: required-length sweep across points

Across adjacent `reqLen` points, the source level changes only in required length.

Most current preparation is geometry/objective/mechanic derived:
- static adjacency;
- static occupancy/connectivity substrate;
- goal/objective BFS fields;
- must-pass/must-cross indexes and pair distances;
- flipper and landmark structures;
- portal-pair geometry.

Current-source inspection found explicit required-length sensitivity in preparation at least through:

- `getRequiredPathCoverageRatio(level)` -> `mustMaskForDFS`.

The portal-parity distance maps themselves are static geometry products; comments explain that required-length parity determines when scoring uses the twist-portal guidance, not which twist portal pairs or distance maps exist.

Therefore a required-length sweep currently rebuilds far more static data than the source-level delta obviously invalidates.

### Important boundary

Do **not** infer that every prep field is reqLen-invariant.

The correct next artifact is a field dependency matrix plus a differential proof/test for the proposed reusable subset.

This lane should follow exact same-level reuse, not precede it.

## 4. Portfolio sweep: normalization reuse exists outside execution, compilation reuse does not

`scripts/portfolio-solve-sweep.mjs` already has a main-process `preparedCache` for pre-pipeline feature/cache checks.

Its comments explicitly note that worker processes prepare independently for actual solves.

Thus the codebase already demonstrates two things:

1. retaining prepared normalized levels within a batch is operationally acceptable;
2. that reuse currently stops before the solve execution boundary.

Persistent workers and corpus caches already amortize runtime/dataset startup, so the missing reuse layer is specifically solver compilation/session separation rather than generic process persistence.

## 5. Stress benchmark and speed probe

The ordinary stress benchmark and speed probe predominantly solve each selected level once per invocation.

They are poor first consumers for same-process compiled reuse.

They remain important *measurement* populations because:
- hard-tail search determines whether representation changes hurt hot-path performance;
- speed probes need explicit cold/warm semantics.

Do not optimize their cold setup merely by contaminating a pure-speed benchmark with an implicit warm cache.

## 6. Cross-process and cross-run reuse

Ablation A/Bs, separate workflows, and independent research runs may ask the same level questions across processes.

That could eventually justify:
- persistent compiled artifacts;
- semantic compile keys;
- version/invalidation contracts.

But this is a separate escalation.

The exact same-process ablation opportunity can test whether static compilation reuse has enough economic value **without** paying any of those architectural costs.

If it fails there, persistence is almost certainly unjustified.

## 7. Reuse hierarchy

The audit should pursue reuse in this order:

### Tier 1 — same normalized object, same process
Examples:
- repeated req-length point runs.

Needs:
- immutable compiled/static data;
- fresh execution context.

### Tier 2 — same level semantics, same process
Primary example:
- ablation runner across experiments.

Needs:
- normalize once;
- compile once;
- fresh solve contexts.

### Tier 3 — controlled semantic delta
Primary example:
- reqLen sweep across points.

Needs:
- field dependency/invalidation proof.

### Tier 4 — family/topology sharing
Needs:
- generator/family delta census;
- dependency-class hit rates.

### Tier 5 — cross-process persisted compilation
Needs:
- semantic identity;
- solver/version invalidation;
- serialization schema;
- storage economics.

Do not skip tiers merely because Tier 5 sounds more architecturally elegant.

## 8. First prototype decision rule

Promote an ablation-runner compile-reuse prototype only if the fixed-cost evidence shows all of:

1. `prepLevel` is measurable and stable enough relative to many-short solve cost;
2. realistic ablation experiment multiplicity yields material aggregate removable wall time;
3. immutable compiled state can be separated without forcing broad hot-loop representation changes;
4. retained memory for `L` compiled levels is acceptable;
5. exact work/search/result parity can be maintained.

If prep cost is tiny on current HEAD, keep the conceptual `CompiledLevel / SolveContext` split documented but do not implement it for speed.

## 9. Immediate next questions

- What is current-head median/p90 `prepLevel` time on published, Corpus 1, and Corpus 2?
- What is the approximate retained byte footprint of one compiled level and a realistic ablation target set?
- How many experiments are typical for current ablation phases?
- Is normalization itself large enough to justify normalization-once independent of compile reuse?
- Can exact same-level reuse be introduced internally without changing benchmark cold-start semantics?

The one-shot workflow on PR #1940 is collecting the first timing evidence.
