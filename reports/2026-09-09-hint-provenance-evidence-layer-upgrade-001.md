# Hint/provenance evidence-layer upgrade

> **Status:** active
> **Last evidence:** 2026-09-11 — the query-dependent evidence audit measured all 1,962 levels / 266,923 hints, unified the profile classifier, and made representative selection dependency-aware.
> **Decision:** Treat the accumulated hint store as a solution-space atlas, a one-sided positive oracle, and a longitudinal discovery log; exhaust existing-data and bounded replay evidence before broad new solver compute.
> **Remaining gate:** Validate replay witness identity and execute the promoted basin/exposure/replay analyses; the all-corpus evidence/dedup and classifier-unification gates are complete.

**Date:** 2026-09-09  
**Scope:** persistence semantics and fuller exploitation of the accumulated hint/provenance store for solver research.

## Executive finding

The store should be treated as three research assets at once:

1. **solution-space atlas** - accepted paths, structural basins, shared/alternative decisions and geometry;
2. **sound positive oracle** - every referee-validated hint prefix is a known-live solver state, and its next path step is a known-viable continuation;
3. **longitudinal natural-experiment log** - provenance records which producer, technique/config, version, budget/work context and search modality found each path/basin and when.

Current solver research has used all three ideas in pieces, but not yet as one integrated evidence system. The highest-value next step is therefore not merely to invent more path metrics. It is to connect the existing path-aware replay/observer tools to the now-large provenance history and current failure cohorts.

## What changed directly

### Semantic dedup is now a persistence invariant

`provenanceEventIdentity` lives in `modules/domain/hint-runtime.mjs`, the canonical persistence runtime. `dedupeProvenanceEntries`, `mergeHints`, and `reconcileHints` therefore use the same semantic event identity. `scripts/hint-provenance-identity.mjs` is only a compatibility re-export for existing callers.

The identity deliberately ignores recording time and host/allocation measurements (`foundAt`, elapsed/cumulative wall-clock fields, cumulative nodes, and attempt `budgetMs`) while preserving solver version, configuration, forcing, seed, deterministic work/search result, termination, and other evidence-bearing fields. Repeated discoveries remain retained; only duplicate recording of the same discovery event collapses.

`modules/domain/hint-runtime-semantic-dedupe.test.ts` guards the distinction.

### Provenance is now modeled on orthogonal evidence axes

A single mutually-exclusive "source" bucket is insufficient because producer identity, run/search modality and capability admissibility can overlap. For example, a Pathfinder event can be isolated, randomized and hint-guided at once; a variant-parent replay can also carry hint-context fields. Making those properties compete for one label throws evidence away.

`scripts/stress/provenance-source-taxonomy.mjs` therefore separates:

- **origin**: witness, inherited witness, transformed witness, human, external constraint solver, variant-parent replay, Pathfinder solver, other;
- **facets**: complete enumeration, hint-guided, used-existing-hints, randomized, isolated-technique, production-retry-tier, with concrete retry-tier identity retained separately;
- **capability admissibility**: delegated to the existing canonical strict/narrow classifier in `scripts/stress/provenance-classes.mjs` rather than re-derived.

The telemetry reports origin overlap, facet overlap, strict/narrow admissibility, technique/config identity and retry-tier identity independently.

A related admissibility hole was also closed: external constraint-solver, variant-replay and other non-Pathfinder producers can no longer fall through as production `cold-capability` merely because their hint flags are clean. Inherited/transformed witness origins are likewise explicitly excluded. Only actual Pathfinder solver evidence can establish production cold capability.

### Corpus evidence audit CLI

`scripts/stress/hint-provenance-evidence-report.mjs` reads published, stress1, stress2, or all three corpora and reports:

- hint and provenance-entry totals;
- unattributed hint count;
- multi-origin rediscovery of the same path;
- origin event/path counts and overlap;
- overlapping search/run facet counts;
- strict and narrow capability-admissibility counts;
- technique/config and concrete retry-tier event counts;
- semantic duplicate event count and affected-hint count.

Run through the repository bundler because it imports TypeScript-backed domain modules:

```bash
node scripts/run-bundled.mjs scripts/stress/hint-provenance-evidence-report.mjs -- --corpus=all
```

Add `--out=<json>` to persist the report and `--fail-on-duplicates` when using it as an integrity gate.

### Origin- and facet-stratified solution profiles

`scripts/stress/source-stratified-solution-profile.mjs` can build per-level solution profiles separately by producer origin and by overlapping provenance facets. This avoids two opposite errors: hiding variant/external/human evidence in `other`, and pretending an isolated/randomized/retry event stops being a Pathfinder-produced path.

The older classifier embedded in `solution-profile-lib.mjs` remains to be unified in a full checkout; it should consume the shared axes rather than preserving a second definition.

## The underused research surface

### 1. Known-live prefix oracle

The repo already defines known-solution prefix survival as T2 evidence and has observer/replay machinery such as:

- `collect-known-solution-prefix-survival.mjs`;
- `collect-known-solution-prefix-branches.mjs`;
- `offline-replay-harness.mjs`;
- `cpsat-explicit-prefix-reference.mjs`.

The accumulated hint store can greatly expand the **positive** side of this evidence without new exact solving. Every prefix of every referee-validated path is known live; the next path move is a known viable successor.

This does **not** label unsupported alternatives dead, so it cannot replace CP-SAT negative labels. But it is enough to falsify unsound pruning, state abstraction/merging, parity/connectivity reasoning and representation changes. One candidate mechanism rejecting a stored known-live prefix is a decisive counterexample.

This is particularly relevant to the current portal tranche: portal coarse-state merging, portal parity, connectivity and must-cross propagation can all be screened against diverse known-live portal prefixes before broad matched-work testing.

### 2. All-known-basins first-loss autopsy

Current divergence/survival tools often follow one nominated witness/path. With many stored solutions this can misdiagnose search failure: losing one path is harmless if another valid basin remains alive.

For a failed solve, choose diverse representative solution basins across independent origins/techniques and replay/observe the actual search until **all known-live basins** are lost. Record the earliest all-basin extinction and classify it:

- hard-prune/false-reject;
- state-key alias/merge;
- score/rank/beam-width cull;
- gate/action exposure;
- budget/participation;
- other representation/reasoning failure.

This produces a much sharper allocation-vs-policy-vs-representation diagnosis than single-witness divergence.

### 3. Policy x solution-basin replay matrix

`hint-divergence.mjs` already replays a candidate path under real scoring profiles and can attribute rank/discrepancy to score terms. Generalize that from one path to representative basins and cross it with relevant techniques/configs.

For each policy/config and basin ask:

- did this policy ever discover the basin according to provenance?;
- when the basin path is replayed, does the policy locally/rank-wise support it?;
- does real beam survival preserve it?;
- where is its first loss?;

A policy that never discovered a basin but treats it favorably points toward exposure/budget/stochastic search. A policy that consistently ranks it badly points toward scoring/search policy. A policy that rejects a known-live state points toward reasoning/representation.

### 4. Exposure x basin capability matrix

Absence of provenance is censored evidence unless the technique/config actually ran. Join path/basin provenance to lifecycle/census telemetry so each level x technique x basin can distinguish:

- discovered this basin;
- discovered a different basin;
- exposed and failed;
- not exposed.

This is more informative for scheduler specialist retention than `solverCount` or solved-set overlap alone. Two techniques can solve the same levels but occupy different basins and therefore provide genuine complementary robustness.

### 5. Replace first-hint analysis with representative-path analysis

Some existing path-aware tools still select the first available hint as the path to analyze. `winning-path-analysis.mjs` and `offline-replay-harness.mjs` are concrete examples. That was reasonable when hint libraries were thin; it is now an information-losing default.

Create one shared representative-path selector that can sample/choose by:

- structural path basin/distance;
- provenance origin;
- technique/config;
- capability admissibility;
- temporal/version strata;
- family/variant dependence.

Use it wherever the research question is about solution-path behavior rather than a specifically named witness.

### 6. Decision entropy / forced-choice depth

Instead of only a global prefix-diversity score, compute depth-wise known-live decision support across independent basins: how many distinct next decisions remain at each normalized depth, especially portal pair/order, must-cross order and turn decisions.

Early low entropy nominates a forced/backdoor-like structure; persistent high entropy indicates broad solution latitude. Cross this with all-basin extinction and workSpent. This is a bounded, actionable form of the deferred backdoor-depth question.

Stored hints are sampled unless provenance establishes exhaustive coverage, so low observed entropy is evidence of sampled rigidity, not proof of logical necessity.

### 7. Structural-basin longitudinal stability

Existing cost-drift analysis can compare repeated exact-path discoveries across versions. Exact path identity is often too brittle: harmless tie-breaking can move within the same structural solution family.

Track three nested persistence levels across versions/configs:

1. exact path persistence;
2. structural basin persistence;
3. key feature persistence.

This distinguishes robust capability from accidental exact-path recurrence and can supply better evidence for the deferred stability-aware portfolio question.

### 8. Marginal novelty yield by producer/config

Walk discovery history in time order and measure how often each producer/technique/config contributes:

- a new exact path;
- a new structural basin;
- a new portal signature/order;
- a new must-cross order;
- other new profile features.

This shows which hint-producing workflows add genuine solution-space information and which mostly add repeated confidence/cost history. It can guide future hint-harvest compute without treating rediscovery as useless.

### 9. Independence-aware agreement

Raw provenance-event count is not an independence count. Same-config reruns, same technique family, cross-technique Pathfinder runs, external solving, variant replay and human/witness sources have different dependency structures.

When using repeated discovery to infer that a path feature is likely level-forced or robust, report the dependency strata explicitly. Cross-origin/cross-family agreement is stronger hypothesis-generating evidence than many near-identical reruns, while still not proving necessity absent exhaustive evidence.

### 10. Historical "what was knowable when?" audits

`foundAt` plus solver version/config makes it possible to reconstruct the evidence frontier at earlier dates. For important research decisions, ask whether later-discovered patterns were already visible in the then-existing hint/provenance store. This is useful for improving research triage and identifying cases where new compute was launched before existing evidence was exhausted.

This is process-improvement evidence, not a direct solver mechanism, so it ranks below the live prefix/basin analyses above.

## Proposed standing research workflow for hinted misses

Before launching new solver compute on a hinted failure cohort:

1. characterize available solution-basin diversity and provenance independence;
2. locate the first point where the current search loses **all** known-live basins;
3. classify that loss as exposure/allocation, search policy, or reasoning/representation;
4. use policy x basin replay to test that diagnosis;
5. use the known-live prefix oracle to falsify candidate pruning/representation changes cheaply;
6. only then choose the smallest matched-work A/B or exact negative-label campaign still needed.

This does not make hints legal production features. It makes them a much better offline microscope.

## 2026-09-11 completion note

The all-corpus audit and consumer fixes are recorded in [`2026-09-11-hint-provenance-evidence-relevance-audit-001.md`](2026-09-11-hint-provenance-evidence-relevance-audit-001.md). The audit found zero semantic duplicate events, but large context/dependency effects: 348,784/675,233 events are variant-parent replay, and no historical event matches the current revision. The durable classifier now asks an explicit evidence purpose and the representative selector ranks admissible dependency strata rather than raw event clouds.

## What still requires repository execution

A full checkout should:

- generate a Corpus-2 origin/facet-stratified profile summary with artifact-size discipline;
- audit path-aware tools for first-hint/single-witness assumptions and add a shared representative-basin selector where useful;
- build a bounded known-live-prefix regression/observer corpus from diverse provenance/basins, starting with the active portal cohort;
- perform all-known-basins first-loss, policy x basin, exposure x basin, decision-entropy, basin-stability and producer-novelty analyses where existing data suffices;
- write dated reports for decision-bearing findings and update/remove future-work questions as they are answered or promoted.

No new broad GHA solver campaign is justified before exhausting these existing-data and bounded replay routes.
