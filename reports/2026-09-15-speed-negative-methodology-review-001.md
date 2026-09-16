# Speed-negative methodology review (2026-09-15)

## Purpose

Hostile review of historical decisions that rejected solver speedups, broadly including pure implementation speed, reduced search work, traversal/materialization, allocation/layout, routing, pruning cost, transposition/dedup, and native/WASM migration.

The main finding is not that the repo's performance experiments are generally bad. Most implemented, exact-form A/B negatives are credible. The weak layer is the later compression of narrow results into broader durable closure claims. Several entries currently mix four different dispositions: an actually falsified implementation, a profile-led decision not to spend implementation effort, an architectural deferment without a prototype, and a stale result whose applicability depends on runtime/representation.

## Required disposition vocabulary

Use these meanings for architectural-speed knowledge:

- **FALSIFIED_EXACT_FORM**: an actual treatment was implemented and lost under an adequate representative protocol. Do not retest unchanged absent a materially changed runtime/representation or a concrete reason the old protocol no longer answers the question.
- **DEFERRED_LOW_VALUE**: profiling/opportunity sizing says expected value does not justify implementation now. This is not evidence that the candidate would lose.
- **ARCHITECTURALLY_DEFERRED**: no compact/economical treatment boundary is currently apparent. This is not an empirical negative.
- **STALE_REPROFILE**: an older exact-form result may no longer transfer after a material runtime, bundler, object-shape, representation, search-core, or workload change. Reprofile before deciding whether to rerun.

Do not call a candidate "closed negative" merely because an adjacent or broader-looking optimization lost. Analogy may justify not spending engineering effort; it cannot manufacture experimental evidence.

## Findings by speed family

### Scoring specialization

The 2026-08-26 plain/default/no-template fast path is a credible negative for that exact branch-deletion specialization. Search/node parity held and representative end-to-end timing did not improve. Three timing repetitions are thin for sub-1% effects in a noisy environment, so the result does not support the broader theory that scorer work is exhausted or that V8 has already optimized every useful form. Disposition: **FALSIFIED_EXACT_FORM** for branch deletion; other scorer mechanisms require a fresh measured cost/removal mechanism.

Evidence: `reports/2026-08-26-current-head-specialized-scorer-pilot.md`.

### Fused mechanic-free apply/evaluate/undo

The bounded mechanic-free fused JS kernel is a strong exact-form negative. It preserved decisions and regressed/failed to improve end-to-end time, with narrow eligibility. It does not falsify candidate-loop restructuring in general.

Evidence: `reports/2026-08-27-fused-plain-candidate-kernel-pilot.md`.

### Fixed neighbor slots / `getNeighbors`

The September closeout overstates the evidence. The `getNeighbors` pilot measured a modest cost share and then relied partly on the fused candidate kernel as a "strict superset" negative. The cited fused-kernel experiment explicitly left neighbor generation untouched. Therefore the superset premise is false.

Correct disposition: **DEFERRED_LOW_VALUE**, not experimentally closed. The repo knows the measured opportunity looked modest at that time; it does not know that a cheap fixed-slot implementation would lose.

Evidence: `reports/2026-09-02-getneighbors-allocation-share-pilot.md`, `reports/2026-08-27-fused-plain-candidate-kernel-pilot.md`.

### Batched candidates / candidate-object allocation

The same lineage problem applies. The September report measured candidate-object construction/allocation share and used the negative fused kernel to support closure, but the fused pilot did not test batching/layout and explicitly left multi-candidate batching as a distinct untested mechanism.

Correct disposition: **DEFERRED_LOW_VALUE**. A future current-head profile may nominate it, but it is not an empirical negative today.

Evidence: `reports/2026-09-02-batched-candidates-allocation-share-pilot.md`, `reports/2026-08-27-fused-plain-candidate-kernel-pilot.md`.

### Dense level-local indexing

The evidence is appropriately mechanism-specific. Removing the large `cellDenseIndex` indirection while retaining row-major static neighbors was positive/flat; naively converting six mechanic arrays to dense storage regressed the hard sample because repeated index arithmetic moved into hot readers. Disposition: **FALSIFIED_EXACT_FORM** for naive multi-array conversion with repeated hot `denseIndex()` calls. Dense local layouts remain live when they remove both storage and indirection.

Evidence: `reports/2026-08-26-dense-index-architecture-followup.md`.

### Beam materialization/replay

Historical profiling found replay/materialization cost material enough to be nontrivial, but no checkpoint/snapshot implementation was tested. "Not the largest hotspot" is not a profitability test. A 12-16% cost center can still be worth optimizing if most of it is removable cheaply.

Correct disposition: **DEFERRED_LOW_VALUE / REPROFILE**, not falsified. Reopen only if current-head replay is again material and a concrete snapshot/delta design has favorable expected overhead.

Evidence: `reports/2026-08-27-beam-cost-breakdown-candidate-generation-dominant.md` and subsequent replay profiling.

### `UndoToken` pooling

This is a strong exact-form negative: implemented reusable token, parity/tests passed, and runtime was about 4.6% slower. Disposition: **FALSIFIED_EXACT_FORM** under the current JS/V8/object-shape regime. A material runtime or representation change can make it stale.

Evidence: `reports/2026-07-30-solver-pure-speed-work.md`.

### Beam quickselect

Quickselect was not implemented because profiling showed per-phase sort tiny relative to replay on the investigated hard beam case. That was sensible triage, not falsification.

Correct disposition: **DEFERRED_LOW_VALUE**. Reprofile only if sort becomes material after other architecture changes.

Evidence: `reports/2026-07-30-solver-pure-speed-work.md`.

### Beam exact duplicate elimination / transposition

The final beam result is credible after correcting an initially invalid wall-capped experiment: true exact duplicates were negligible in the measured workload. The initial 2.5-second test incorrectly suggested no behavioral difference because both arms were censored; a non-binding 120-second cap produced 19/75 divergences. The correction is itself evidence for strict measurement discipline.

Disposition: **FALSIFIED_EXACT_FORM** for exact beam duplicate elimination as a major speed reservoir on the measured architecture/workload. Do not conflate this with coarse beam merge/survivor compression or other semantic-equivalence schemes.

Evidence: the beam dedup/transposition reports around 2026-08-06.

### DFS transposition

The DFS evidence is weaker: smaller selected probes and expensive exact signature construction contaminate economics. A materially cheaper incremental fingerprint would be a different treatment.

Correct disposition: **DEFERRED_LOW_VALUE / STALE_REPROFILE**, not a broad falsification of DFS transposition.

### Custom numeric hash arena vs native `Map`

The actual numeric-key implementation matched/lost to native numeric `Map`. Disposition: **FALSIFIED_EXACT_FORM** under the current Node/V8/runtime shape. Runtime/bundler/representation changes are explicit expiry triggers.

### Native/WASM

The current case is architectural, not empirical: mutable mechanic/path/search state makes a small boundary unattractive, so avoiding crossings becomes a search-core migration. That is a valid deferment but not a measured negative.

Disposition: **ARCHITECTURALLY_DEFERRED**. Reopen when a compact hot kernel with a small stable state boundary appears and a disposable end-to-end prototype is cheap.

Evidence: `reports/2026-08-24-speed-substrate-static-audit.md`.

### Stronger surround/adjacent-turn MST bounds

This is one of the strongest final negatives and one of the clearest historical methodology lessons. Initial targeted testing selected only unsolved levels, so regressions were impossible to observe by construction. Broader measurement then found lower node counts but sharply higher wall cost, and the relevant solved population produced more losses than gains. The final report correctly retained the structural premise while rejecting the unconditional treatment.

Disposition: **FALSIFIED_EXACT_FORM** for unconditional per-candidate MST tightening. Throttled, gated, or genuinely cheaper implementations remain different treatments.

Evidence: `reports/2026-07-30-mst-tightening-reverted-net-negative.md`.

### Connectivity-throttle reductions

Historical behavior-changing narrowing lost solves and was reverted. This rejects that treatment under that objective, not every adaptive connectivity schedule.

Disposition: **FALSIFIED_EXACT_FORM** historically; reopen only with a changed schedule/premise plus current cost signal.

### Automatic routing as a speed mechanism

Old routing treatments were rejected on solve/capability outcomes. That does not establish that routing cannot reduce total work while preserving a chosen solve set. Workstream 1 remains a valid speed-adjacent mechanism if future selector work explicitly optimizes retained capability plus total work.

Disposition: old selectors remain exact-form negatives where documented; routing as a class is not speed-falsified.

## Measurement weaknesses that must shape future speed work

### Observer effect inside nested hot-loop timing

As nested `hrtime` probes were added, the measured enclosing candidate-generation share itself moved noticeably. This is adequate for reconnaissance but not a precise opportunity ceiling for 5-8% sub-buckets. Prefer sampling/profile-first reconnaissance and use nested timers sparingly; when nested instrumentation is necessary, quantify instrumentation overhead.

### Wall caps can erase treatment differences

The August beam-dedup episode showed that a binding wall cap can make both arms look identical. Pure-speed comparisons need pinned deterministic work with non-binding deadlines. This is now the correct standard and should be applied when interpreting older results.

### Exact-form negative is not premise falsification

The MST episode, dense-layout experiments, routing history, and fused-kernel history all show the same rule: a failed treatment does not erase a measured hotspot or causal premise. Future summaries must preserve premise, treatment, result, and inference scope separately.

### Speed objective must include total compute, not only per-level geometric mean

When a future speed campaign becomes active, report both typical per-level speed and **total CPU/work-weighted runtime over the retained solve population**. Many tiny levels can dominate a geometric mean while a small set of hard levels dominate actual compute. Stratify by active search mechanism/cost center as well as corpus identity.

### Runtime/compiler results expire conditionally

Performance conclusions about object pooling, native `Map`, inlining/module boundaries, allocation, and object shapes are contingent on Node/V8/bundling and representation. The repo has already seen very large runtime differences from execution/bundling shape. Do not rerun on a calendar. Mark these results stale only after a material runtime/bundler/search-core/representation change **and** a profile shows the hotspot is still relevant.

## Canonical policy consequence

The architectural-speed authority should distinguish empirical falsification from prioritization and architecture decisions. Specifically:

1. Reclassify fixed neighbor slots and batched-candidate allocation from closed negative to **DEFERRED_LOW_VALUE**.
2. Treat beam materialization/replay and DFS transposition as profile-gated/deferred, not falsified families.
3. Treat native/WASM as **ARCHITECTURALLY_DEFERRED**, not experimentally negative.
4. Preserve strong exact-form negatives: scorer branch deletion, fused mechanic-free candidate kernel, naive six-array densification, `UndoToken` pooling, the tested numeric hash arena, exact beam duplicate elimination as a major reservoir, and unconditional MST tightening.
5. Do not close a speed family by analogy to a different failed implementation.
6. Add explicit conditional-expiry rules for runtime/compiler/representation-sensitive negatives.
7. Future speed promotion should optimize retained capability plus both representative latency and total compute/work over the retained population.

## Queue consequence

This review does **not** earn a new speed implementation and should not interrupt active WS2 gates. Workstreams 6/7 remain supporting. Their reopen gate becomes: a fresh current-head profile identifies a material end-to-end cost center, a concrete treatment differs materially from exact-form negatives, and the expected value justifies implementation. `getNeighbors`, batching, replay materialization, and DFS transposition are now legitimate profile-gated candidates rather than falsely closed forms.
