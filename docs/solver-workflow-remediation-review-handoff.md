# Solver workflow remediation: implementation-tranche review handoff

> **Status:** ready for hostile review; the overall remediation plan remains active.
> **Audit authority:** [`../reports/stress/solver-evidence-integrity-index.json`](../reports/stress/solver-evidence-integrity-index.json), rebuilt by `npm run solver:evidence-integrity-audit`.

## Completed in this tranche

- Added the v3 experiment-result schema and one shared implementation for deterministic population/configuration hashing, row outcome classification, exact population integrity, and paired compatibility assertions.
- Repaired the generic combiner to preserve producer/source-run metadata, reject semantic disagreement, compute normalized outcomes, and stop manufacturing `failed`, `errors: 0`, legacy-engine, and witness-access claims.
- Repaired the publisher vocabulary: shard arrival is `artifactCoverage`; intended-population integrity and decision-bearing status are separate; summaries report solved/observed/expected/missing; paired deltas are non-decision-bearing without equal population hashes and complete integrity.
- Extended exact-ID integrity output with a reusable population hash and normalized outcome record.
- Retired the settled early-repair A/B, MITM one-off, and Firestore boundary workflow. The Firestore identity boundary now runs in ordinary PR CI through the emulator-backed package test. Consolidated the published CP-SAT corpus into the retained harvest workflow.
- Renamed the typical-budget workflow to `solver-production-replay-baseline.yml`, labeled it history-aware, and pinned high-budget/replay execution checkout to the dispatched immutable SHA.
- Removed caller-maintained method-probe cardinality; each shard derives the corpus length from the supplied corpus.
- Added a complete maintained-workflow lifecycle inventory with consumer/retirement fields and an executable drift check.

## Historical audit findings

The deterministic index covers nine high-value evidence units. Current C1 (102/102) and C2 (1700/1700) canonical compiled baselines have exact present-day corpus ID coverage and are `valid-after-normalization`; embedded original run/SHA provenance remains partial. The July high-budget aggregates preserve 3 and 165 positive solves, respectively, but are only observational for population claims: their intended frozen cohort is absent and their old combiner metadata conflated every non-solve while hardcoding zero errors. Historical routing A/B evidence is invalid as paired evidence because no shared sealed population hash survives. Warm production replay is explicitly observational rather than cold capability. Historical method-probe cardinality remains incomplete/unverifiable. Technique-census run 32240161854 is incomplete because one partial shard also produced 48 duplicated cell IDs; run 33717910218 has no missing, partial, or duplicate cells and is valid after terminology normalization.

No referee-valid solution was removed or rewritten. No broad solver run was launched.

## Intentionally incomplete / hostile-review queue

- Routing-regime still needs the planned one-dispatch, one-sealed-population, two-immutable-SHA redesign. Existing historical paired claims should not be reused meanwhile.
- Every specialized workflow has the standard publishing front door, but not every producer yet emits a native v3 contract or feeds an exact integrity file to it. Until then the publisher fails closed as non-decision-bearing.
- High-budget now seals and exact-validates both frozen cohorts before telemetry/report mutation and publishes normalized v3 execution, limit, configuration, and side-effect semantics; first-class missing-ID gap-fill dispatch remains to be added.
- Production replay now exact-validates C1/C2 IDs, prohibits partial continuity diffs/updates, and publishes normalized history-aware v3 semantics.
- Cross-run reconciliation now requires source manifests, equal immutable SHAs/configuration hashes, exact intended-population integrity, and separate source/reconciliation provenance. Historical wrong-ref, method-probe run-by-run cardinality, and report dependency audits still require artifacts or human review beyond committed evidence.
- Method-probe now derives and validates the supplied corpus population and publishes its isolated-technique limits/semantics; historical run-by-run cardinality remains unverifiable where artifacts expired. Technique census validates sealed plan cell IDs while preserving partial-cell publication, and static portfolio publishes exact matched-cell integrity before its explicit verdict. CP-SAT/reference outcome adapters remain to be normalized without flattening their domain-specific statuses.

## Smallest justified reruns

None are automatic. After hostile review, prefer missing-ID gap fills for important high-budget cohorts and a fresh coordinated routing paired run only if a current decision still depends on it. Do not refresh the full canonical corpus merely to normalize metadata.
