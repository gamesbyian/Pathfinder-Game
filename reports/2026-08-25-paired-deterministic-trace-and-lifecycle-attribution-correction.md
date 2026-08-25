# Paired deterministic trace completion and lifecycle-attribution correction

> **Status:** concluded-negative
> **Last evidence:** 2026-08-25 — immutable capability run `32459711208`, historical orchestration at `e5034e8c433eb32ab6d1882d80271dc277b91b0f`, census-plan audit, and green PR CI run `32895709212`
> **Decision:** retire the former cross-stage admissible-order P0. The eight alleged production admissible-order wins were later diverse-beam retry wins misattributed by a stale lifecycle reducer, and the census had not measured the exact winning diverse-beam + retry-override cells. Keep the new bounded paired deterministic trace as a reusable forensic tool, but do not continue MP/MC memo archaeology or a broad operational-similarity sweep from this evidence.
> **Remaining gate:** none
> **Evidence role:** forensic
> **Selection:** observational; the original target was chosen because prior reverse-oracle analysis had already flagged the eight rows as anomalous

## Executive summary

This continuation began as an attempt to finish the most valuable missing part of the August 23 operational-similarity work: a **paired deterministic trace** capable of locating the first actual search divergence between two DFS/admissible runs rather than merely comparing counterfactual scores on states encountered by one traversal.

Current `main` had also acquired a much more urgent use for that tool. The live queue contained a P0 claim that eight historical admissible-order wins appeared only after preceding production stages had run. The strongest hypothesis was hidden cross-stage state, especially lower-bound memo state, because fresh isolated admissible attempts had not reproduced the historical solves.

That P0 does not survive source-of-truth reconstruction.

The immutable production artifact from Actions run `32459711208` shows that the relevant admissible-order attempts **failed**. The levels were solved later by diverse 5K beam retry stages. A stale `scripts/stress/lifecycle-failure-map.mjs` hard-coded only five older stage names, so its “last reached before solve” reduction literally could not see newer retry stages and attributed later wins to the last old stage it recognized. The T1 census then compounded the error by comparing nearby **plain** 5K beam retry-override cells, not the exact **diverse** 5K beam + retry-override configurations that had won in production.

The result was a synthetic anomaly created by two broken joins:

1. **wrong production stage attribution**; and
2. **non-matching census configuration identity**.

No predecessor-conditioned admissible-order success remains to explain. No MP/MC memo mechanism is required. The former P0 is closed.

At the same time, the missing research instrument was completed. `scripts/paired-deterministic-trace.mjs` now runs two fresh DFS/admissible configurations under matched bounds and reduces their retained multi-child decision streams to a bounded common-prefix / first-divergence / overlap record. It is deliberately narrow: beam and repair are rejected because their operational similarity is better measured through existing frontier/retention and restart-native instrumentation.

No production solver behavior changed.

## 1. Why this work was resumed

The August 23 operational-similarity branch had completed a useful substrate:

- a machine-readable source/configuration taxonomy;
- outcome-overlap joins and deterministic bounded cohorts;
- observation-only sibling-ranking comparisons;
- admissible slack/tie anatomy;
- bounded beam-frontier signature sampling;
- initial DFS, admissible-order, and beam-width pilots.

Its strongest unresolved causal limitation was explicit: the observer compared alternate rankings on candidate sets encountered by one active traversal. It could prove local ordering flips, but not answer the more important question:

> Where do two actual deterministic searches first cease to be the same search, and does that divergence persist or matter?

Since then, current `main` had changed substantially and the live queue no longer treated broad operational mapping as a standalone priority. The correct salvage decision was therefore **not** to mechanically finish every phase of the original large prompt. The highest-value continuation was:

1. build the small reusable paired deterministic trace/reducer;
2. apply forensic discipline to the current P0 predecessor-dependence claim;
3. use the same seam later on a genuinely decision-relevant operational pair if one exists;
4. leave broad repair fingerprints, beam diversity anatomy, and exhaustive pair mapping closed unless a ranked decision earns them.

## 2. Durable paired deterministic trace

The branch adds a bounded deterministic trace comparison to the existing operational-similarity substrate.

### 2.1 Runner

`scripts/paired-deterministic-trace.mjs`:

- prepares the same level independently for each arm;
- accepts two existing attempt/config keys;
- requires DFS/admissible deterministic search families;
- applies matched node/time/trace bounds;
- reuses the existing research ordering observer and ordinary `runAttempt` seam;
- records bounded retained multi-child decision events;
- emits outcomes/work plus a compact paired reduction;
- rejects beam and repair instead of pretending their state evolution has the same tree-trace semantics.

Canonical invocation is documented in `scripts/README.md` and `docs/tooling-catalog.md`.

### 2.2 Reducer

`scripts/operational-similarity-lib.mjs` now compares two retained deterministic decision traces and reports:

- common retained event prefix;
- whether no divergence was observed within the retained/censored bound;
- first divergence reason, including candidate-set, ordering, or traversal/event mismatch;
- the left and right event at the divergence;
- bounded event-signature intersection/union/Jaccard after divergence;
- explicit censoring status.

This closes an important semantic gap in the original substrate: a local counterfactual ranking flip is no longer the strongest available evidence for deterministic search divergence.

### 2.3 Interpretation limit

The observer records **multi-child decision events**. Therefore:

- a found divergence is a real divergence at the recorded seam;
- an identical retained trace is meaningful within that seam and bound;
- a censored/no-divergence result is **not** proof that every one-child transition, prune, bound update, or hidden internal state was identical.

If a future matched anomaly survives identical multi-child decision traces, the next instrumentation should be a narrower seam targeted at the suspected prune/bound transition rather than an indiscriminate full-tree dump.

## 3. Historical P0 reconstruction

The then-current queue described an unexplained deterministic cross-stage dependence in admissible-order search. Eight rows appeared to have historical production wins from non-default admissible ordering while isolated fresh probes failed.

The affected IDs were:

- `R02493`
- `R02088`
- `R02536`
- `R01356`
- `R03195`
- `R02690`
- `R03230`
- `R03238`

Because deterministic search should not become stronger merely because unrelated predecessor stages ran, this was correctly treated as potentially serious. Candidate explanations included:

- mismatched resource envelopes;
- stale or shared lower-bound memo state;
- other hidden cross-stage configuration/state;
- an attribution/join error.

The investigation therefore started by reconstructing the **actual historical execution contract**, rather than instrumenting current search immediately.

## 4. The historical execution contract was not a generic 100M-node solve

The frozen workflow at solver commit `e5034e8c433eb32ab6d1882d80271dc277b91b0f` used a compound level budget:

- **50M cumulative nodes**;
- **67M canonical `workSpent`**;
- internal stage/tier envelopes derived from those outer budgets;
- production retry ordering and retry-specific configuration overrides.

An early replay through a generic “100M node budget” solve was therefore not a matched reproduction. It consumed a different distribution of work and eventually solved elsewhere after more than 100M cumulative nodes.

That failed reproduction is still useful evidence. It establishes a durable rule for historical solver forensics:

> A headline node ceiling is not an action contract. Reproduction requires action identity, stage identity, behavior-changing flags, cumulative budget currencies, and local stage/tranche envelope.

This matches the current scheduler documentation's separation between stable search-action identity and execution context.

## 5. Immutable artifact overturns the admissible-order attribution

The decisive source is the immutable combined artifact from Actions run `32459711208`, not the downstream lifecycle summary.

For all eight flagged rows, the recorded admissible-order attempts failed before a later retry solved the level.

The actual winning family split is:

| Level | Historical winning configuration family |
|---|---|
| `R02493` | `beam:intersectionHarvest@beam5000(diverse)` in a later retry tier |
| `R02088` | `beam:intersectionHarvest@beam5000(diverse)` in `connectivity-axis-exhausted-retry` |
| `R02536` | `beam:intersectionHarvest@beam5000(diverse)` in a later retry tier |
| `R01356` | `beam:intersectionHarvest@beam5000(diverse)` in a later retry tier |
| `R03195` | `beam:intersectionHarvest@beam5000(diverse)` in a later retry tier |
| `R02690` | `beam:objectiveFirst@beam5000(diverse)` in a later retry tier |
| `R03230` | `beam:intersectionHarvest@beam5000(diverse)` in a later retry tier |
| `R03238` | `beam:intersectionHarvest@beam5000(diverse)` in a later retry tier |

The relevant later retry vocabulary includes `dedup-near-tie-retry` and `connectivity-axis-exhausted-retry`. Where this report does not name the exact retry stage for an individual row, it intentionally stops at the family fact established by the frozen evidence rather than reconstructing a stage label from the stale reducer that caused the original error.

### 5.1 `R02088` is the clearest example

The historical attempt sequence shows:

1. ordinary `ida:default` failed;
2. the dedup-near-tie retry ladder ran;
3. `ida:none` failed in the non-default admissible retry;
4. `beam:intersectionHarvest@beam5000(diverse)` later solved in `connectivity-axis-exhausted-retry`.

There is no historical admissible-order solve on `R02088` to reproduce fresh-versus-preceded.

The old P0's strongest target was therefore a category error before any memo-state question arose.

## 6. Root cause: the lifecycle reducer had its own stale stage registry

`scripts/stress/lifecycle-failure-map.mjs` historically exported a hard-coded list:

- `repair-probe`
- `main-ladder`
- `repair-fallback`
- `attraction-diversity`
- `admissible-order`

Production orchestration subsequently added later retry stages, including:

- `dedup-near-tie-retry`;
- `admissible-order-non-default-retry`;
- `connectivity-axis-exhausted-retry`;
- additional later tiers.

The reducer did not evolve with orchestration.

Its solve-attribution logic selected the last **known** reached stage. A row that failed admissible search and then solved in a later beam retry could consequently be reported as an admissible-order solve because `admissible-order` was simply the last stage name the reducer knew.

This was not a solver correctness defect. It was an **evidence-reduction defect**.

## 7. Fix: lifecycle stage vocabulary now comes from telemetry

The lifecycle analyzer no longer owns a second stage registry.

It now:

- derives per-row stage order from `Object.keys(row.techniqueLifecycle)`;
- derives the aggregate report's stage order as a stable union of the stage names actually present in artifact telemetry;
- attributes a solve to the last reached stage in that row's emitted lifecycle order;
- aggregates newly introduced stages automatically;
- continues to refuse rows missing lifecycle telemetry.

This is the important architectural invariant:

> Adding a new production lifecycle stage must require **zero lifecycle-analyzer code changes** for the stage to appear in attribution and aggregate tables.

### 7.1 Regression protection

The existing lifecycle unit suite was updated so its fixture vocabulary is local test data rather than importing the production analyzer's stage list.

The regression deliberately creates stage names unknown to the old analyzer, including a future-style retry stage, and verifies that:

- the new stage appears in aggregate `techniqueOrder`;
- its work/reach is counted;
- a solved row can be attributed to the later stage rather than an older recognized stage.

CI initially caught that the old test fixture itself imported the removed `TECHNIQUES` registry. That failure was useful: the test had encoded the same coupling the production fix was intended to remove. The fixture was rewritten rather than restoring compatibility with the stale registry.

## 8. Second broken join: the census did not test the exact winning configurations

Correcting stage attribution is sufficient to eliminate the claimed admissible-order wins. A second audit explains why the production beam wins were also not validly contradicted by the isolated T1 census.

`build-technique-census-plan.mjs` promoted retry-related variants for **plain** 5K beams, including:

- plain `beam:intersectionHarvest@beam5000` with `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` disabled;
- plain `beam:objectiveFirst@beam5000` with that prune disabled;
- plain intersection/objective 5K beams with `STRATEGY_DEDUP_NEAR_TIE_RETENTION` disabled.

The historical winners were **diverse** 5K beams under retry-specific overrides.

Diversity/retention policy is part of search-action identity. Therefore:

`plain beam + retry override` ≠ `diverse beam + retry override`.

The compared census cells were adjacent configurations, not the exact production winners. Their failures cannot establish that the production winners required predecessor state.

The original inference chain was thus broken at both ends:

1. production success had the wrong stage/family attribution;
2. isolated comparison did not share the production winner's full behavior-changing configuration.

## 9. What this does and does not establish

### Established

- The eight rows are **not** evidence of admissible-order production wins.
- They are **not** evidence that `ida:none` or another admissible profile needs predecessor stages to solve.
- They are **not** evidence of MP/MC lower-bound memo teaching.
- They are **not** matched evidence of any hidden deterministic cross-stage semantic carryover.
- The lifecycle attribution reducer was stale and could silently mislabel future-stage wins.
- The compared census cells omitted the exact diverse-beam + retry-override configurations that won historically.
- The former P0 should be retired.

### Not established

- This does **not** prove that cross-stage state can never matter anywhere in the solver.
- This does **not** prove lower-bound memo sharing is harmless under every possible sequence.
- This does **not** establish that every later retry is economically valuable.
- This does **not** promote the unmeasured diverse-beam compound cells into the census or scheduler.
- This does **not** justify a broad recensus merely to fill the historical matrix hole.

If a future same-action, same-config, same-resource fresh-versus-preceded discrepancy appears, it is a new matched anomaly and should be investigated on its own evidence.

## 10. Reusable stop tree for a genuine future deterministic sequence anomaly

For a claimed fresh-versus-preceded difference, record the exact execution contract first:

- solver revision;
- level/corpus identity;
- gate/stage;
- stable attempt/action key;
- complete behavior-changing config;
- node budget and local node ceiling;
- canonical `workSpent` budget/ceiling;
- strict-total-work setting where applicable;
- cumulative nodes/work before the action;
- forced-step/preparation state;
- seed/restart identity.

Then use this stop tree:

1. **Execution contract differs.** Stop. Fix the comparison. Unequal resources/context are not semantic carryover.
2. **Contract matches but initial admissible child order differs.** Inspect the inputs that can affect ranking/bounds, including lower-bound memo values, before instrumenting the whole tree.
3. **Initial order matches.** Run the bounded paired deterministic trace and locate the first later retained multi-child divergence.
4. **No multi-child divergence within the bound but outcomes still differ.** Add the narrowest seam capable of observing the suspected one-child/prune/bound transition.
5. **A first divergence is found.** Follow only far enough to classify reconvergence, persistent subtree separation, or winning-lineage consequence.

Do not begin with an unbounded trace or a full state dump.

## 11. Relationship to the original operational-similarity program

The original broad prompt remains only **partially** completed in the literal sense. The branch now contains the missing deterministic paired-trace capability, but it does not mechanically execute every previously proposed operational fingerprint.

Still-unperformed broad items include, among others:

- exhaustive repair-native fingerprints across seeds/restarts/splice/badness/stagnation modes;
- richer beam plain/diverse and dedup near-tie anatomy with bucket occupancy, churn, collisions, and winning-lineage survival;
- full causal conditioning of `ida:none` census inversions on equal-slack frequency;
- broad template intervention cohorts;
- exhaustive CW/CCW and other controlled-pair tracing;
- a universal measured operational-similarity matrix with every pilot metric folded into every taxonomy pair;
- strongest-global-pair claims across the entire portfolio.

Those omissions are now deliberate, not forgotten work.

Current documentation explicitly treats operational similarity as a **bounded decision tool**, not a mandate for another expensive census. The live queue has higher-value scheduler, automatic-configuration, restart/learning, repair, and speed gates. Broad fingerprints should be purchased only when one of those decisions needs a mechanism distinction that current evidence cannot provide.

The paired deterministic trace therefore finishes the most reusable missing microscope without reviving the old research program wholesale.

## 12. Scheduler implications

The special sequence-ambiguity quarantine for these eight historical rows should be removed.

Do not infer scheduler value for the exact diverse retry configurations from neighboring plain-beam census cells. If one of those compound configs becomes decision-relevant, measure it explicitly under current action identity and canonical `workSpent`.

More generally, this episode reinforces three scheduler/evidence rules already present in current docs:

1. **Action identity must include every behavior-changing field.** Search family/profile alone is not enough when width, diversity, pruning, retry flags, seed, or restart mode changes behavior.
2. **Execution context is not action identity.** Stage, predecessor contract, tranche, and accounting context must be recorded separately so matched-action comparisons remain possible.
3. **Derived lifecycle labels are not stronger than attempt rows.** When stage attribution and raw attempt evidence disagree, reconstruct from immutable attempt/lifecycle telemetry before inferring a causal mechanism.

The live queue therefore returns to the static fixed-work repricing A/B as its top execution gate rather than spending additional work on the false admissible-order anomaly.

## 13. Documentation and repository changes

This continuation updates the durable surfaces rather than leaving the correction inside a PR conversation:

- `scripts/paired-deterministic-trace.mjs` — new bounded paired DFS/admissible trace runner;
- `scripts/operational-similarity-lib.mjs` — paired deterministic trace reducer;
- `scripts/operational-similarity-lib-node-test.mjs` — identical/divergent/censored reducer tests;
- `scripts/stress/lifecycle-failure-map.mjs` — telemetry-derived lifecycle vocabulary and solve attribution;
- `scripts/stress/lifecycle-failure-map-unit-tests.mjs` — dynamic-stage regression and decoupled fixtures;
- `scripts/README.md` — paired-trace discovery/usage surface;
- `docs/tooling-catalog.md` — canonical paired-trace entry point and evidence limits;
- `reports/2026-08-22-technique-census-reverse-oracle-diagnosis.md` — corrected forensic conclusion;
- `docs/solver-optimization-current-queue.md` — former P0 retired and scheduler repricing restored to the top gate;
- this report — end-to-end completion/provenance record.

One-shot historical forensic workflows/helpers used only to reconstruct the old run were deleted after the evidence was extracted. They are not retained as permanent repo surface.

## 14. Production behavior and safety boundary

There are **no production solver-policy changes** in this work.

The branch does not change:

- scoring weights;
- attempt ordering;
- beam width;
- diversity policy;
- pruning behavior;
- solver budgets;
- scheduler decisions;
- retry eligibility;
- seed/restart policy;
- level-specific routing.

Research observers remain opt-in. The lifecycle change affects only post-run analysis of emitted telemetry.

## 15. Validation

Final PR head before this write-up: `b11c04617f6b7934c2396cfd1bf67e65e7dd55b5`.

GitHub Actions CI run `32895709212` completed successfully on that head. All five jobs were green:

| CI job | Result |
|---|---|
| `build` / `npm run build` | pass |
| `checks` / `npm run check` | pass |
| `unit-tests-fast` / `npm run test:unit:fast` | pass |
| `node-tests-fast` / `npm run test:node:fast` | pass |
| `deep-verification` / full `npm run ci` | pass |

The finish-line checks caught two issues during development and both were corrected before the green run:

1. the Node reducer fixture used the unsupported global `structuredClone`; it was replaced with a compatible clone in test code;
2. the old lifecycle unit fixture imported the analyzer's deleted hard-coded stage registry; the fixture was made independent, which is itself part of the regression guarantee.

A documentation check also rejected a free-form report status value. The corrected reverse-oracle report now uses the repository's exact status/evidence-role convention.

## 16. Final disposition

The operational-similarity continuation produced two durable outcomes:

### A. The missing deterministic microscope now exists

A future genuinely matched DFS/admissible anomaly can be reduced to its first actual retained decision divergence without building another bespoke observer or dumping whole trees.

### B. The current P0 was not a solver-state mystery

It was an evidence-provenance failure:

- stale lifecycle-stage vocabulary misattributed the winner;
- incomplete configuration identity made the census comparison non-matching.

The correct response is therefore not a lower-bound memo fix. It is to keep the evidence pipeline truthful, close the false blocker, and spend the next solver-research budget on the currently ranked work.

In short: **the earlier operational-similarity work built the microscope; this continuation finished its paired lens, then discovered that the specimen labelled “cross-stage admissible dependence” had been put on the wrong slide.**

## Related records

- [`2026-08-22-technique-census-reverse-oracle-diagnosis.md`](2026-08-22-technique-census-reverse-oracle-diagnosis.md) — corrected original forensic thread
- [`2026-08-23-operational-similarity-substrate.md`](2026-08-23-operational-similarity-substrate.md) — original bounded operational-similarity substrate and pilots
- [`../docs/solver-technique-operational-taxonomy.md`](../docs/solver-technique-operational-taxonomy.md) — current operational-similarity purpose and stop rules
- [`../docs/solver-scheduling-policy.md`](../docs/solver-scheduling-policy.md) — current action-identity/execution-context contract
- [`../docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md) — live ranked work after retiring the false P0
- PR #1478 — `Add paired deterministic traces and fix lifecycle attribution`
