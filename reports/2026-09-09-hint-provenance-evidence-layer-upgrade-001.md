# Hint/provenance evidence-layer upgrade

**Date:** 2026-09-09  
**Scope:** persistence semantics, provenance-source resolution, and exploitation of the accumulated hint/provenance store for solver research.

## What changed directly

### Semantic dedup is now a persistence invariant

`provenanceEventIdentity` now lives in `modules/domain/hint-runtime.mjs`, the canonical persistence runtime. `dedupeProvenanceEntries`, `mergeHints`, and `reconcileHints` therefore all use the same semantic event identity. `scripts/hint-provenance-identity.mjs` is only a compatibility re-export for existing callers.

The identity deliberately ignores recording time and host/allocation measurements (`foundAt`, elapsed/cumulative wall-clock fields, cumulative nodes, and attempt `budgetMs`) while preserving solver version, configuration, forcing, seed, deterministic work/search result, termination, and other evidence-bearing fields. Repeated discoveries remain retained; only duplicate recording of the same discovery event collapses.

`modules/domain/hint-runtime-semantic-dedupe.test.ts` guards the distinction.

### Provenance source taxonomy is more granular

`scripts/stress/provenance-source-taxonomy.mjs` defines a reusable source taxonomy:

- witness
- inherited witness
- transformed witness
- human solved
- external constraint solver
- variant-parent replay
- complete enumeration
- prefix-anchored completion
- randomized enumeration
- isolated technique
- production retry tier
- ordinary production solver
- other

This prevents several now-large evidence populations from disappearing into `other` or generic production. In particular, variant-parent replay, external exact solves, and force-enabled production retry wins are explicitly distinguishable.

The taxonomy also exposes compact telemetry for event counts, hint counts, source overlap on the same path, and technique/config event counts. Unit coverage is in `scripts/stress/provenance-source-taxonomy-unit-tests.mjs`.

### Corpus evidence audit CLI

`scripts/stress/hint-provenance-evidence-report.mjs` reads published, stress1, stress2, or all three corpora and reports:

- hint and provenance-entry totals;
- unattributed hint count;
- hints independently discovered by multiple source classes;
- per-source event and path counts;
- cross-source overlap pairs;
- technique/config event counts;
- semantic duplicate event count and affected-hint count.

Run through the repository bundler because it imports TypeScript-backed domain modules:

```bash
node scripts/run-bundled.mjs scripts/stress/hint-provenance-evidence-report.mjs -- --corpus=all
```

Add `--out=<json>` to persist the report and `--fail-on-duplicates` when using it as an integrity gate.

## Why this matters now

The hint store is no longer merely a solution cache. It contains longitudinal evidence from ordinary production runs, isolated-technique census work, retries, exact/external solving, enumeration, hint-guided search, humans/witnesses, and variant-family transfer. The path itself plus its independent discovery histories can answer research questions without new solver compute.

The September 5 local-data mining pass already demonstrated the value of this approach, including 22 findings from previously underused hint-provenance/census data. The next exploitation layer should treat actual solution geometry and source overlap as first-class evidence rather than using provenance only as a historical technique label.

## Highest-value analyses now enabled

1. **Corpus-2 solution-space profiles by evidence source.** Extend the existing solution-profile library to consume the granular taxonomy, then generate a stress2 profile library. Compare source-clean production/isolated/external/variant-replay solution populations rather than a mixed `combined` pool.
2. **Technique/config solution-basin complementarity.** On levels with multiple independent source/technique wins, compare within-technique and between-technique path distances. This asks whether overlapping techniques actually reach different solution basins, which is more scheduler-relevant than solved-set overlap alone.
3. **Portal-prefix representation audit.** Every valid solution supplies known-live prefixes. Index those prefixes under proposed beam coarse-state keys and measure real collisions where consumed portal-pair identity or other future-relevant state differs. Use this to strengthen the active portal beam-state preflight.
4. **Forced-decision/backdoor depth.** Measure how rapidly known valid solutions converge on portal/order/turn choices, stratified by source and saturation/completeness. This can help separate allocation/guidance failures from broad combinatorial search.
5. **Variant-transfer diagnosis.** Join parent-valid replay paths to variant relation/provenance and production outcomes. Distinguish parents whose valid solution basins are exposed by tiny family perturbations from genuinely robust-hard neighborhoods.
6. **Independent-source agreement.** Path features that recur across production, isolated, external exact, human/witness, enumeration, and variant replay are stronger candidates for level-forced structure than features seen only within one generator/search family.

All of these remain offline research labels. No saved hint/path/profile may become a direct production routing oracle for the same level.

## What still requires repository execution

This connector session cannot execute the repository or regenerate large checked-in profile artifacts. A full checkout should therefore:

- run the new provenance evidence report on all corpora and inspect any reported semantic duplicates before applying `scripts/dedupe-hint-provenance.mjs`;
- integrate the granular taxonomy into `solution-profile-lib.mjs` so its source buckets match this report rather than maintaining a second classifier;
- regenerate/build a Corpus-2 solution-profile library and summary, with artifact-size discipline;
- perform the bounded existing-data joins above and write dated reports for decision-bearing findings;
- update/remove future-work questions as they are answered or promoted.

No new GHA solver campaign is justified before exhausting these local-data joins.
