# Solver workflow remediation: implementation-tranche review handoff

> **Status:** hostile review in progress; the overall remediation plan remains active.
> **Audit authority:** [`../reports/stress/solver-evidence-integrity-index.json`](../reports/stress/solver-evidence-integrity-index.json), rebuilt by `npm run solver:evidence-integrity-audit`.

## Completed in this tranche

- Added the v3 experiment-result schema and one shared implementation for deterministic population/configuration hashing, row outcome classification, exact population integrity, and paired compatibility assertions.
- Repaired the generic combiner to preserve producer/source-run metadata, reject semantic disagreement, compute normalized outcomes, and stop manufacturing `failed`, `errors: 0`, legacy-engine, and witness-access claims.
- Repaired the publisher vocabulary: shard arrival is `artifactCoverage`; intended-population integrity and decision-bearing status are separate; summaries report solved/observed/expected/missing; paired deltas are non-decision-bearing without equal population hashes and valid integrity.
- Extended exact-ID integrity output with a reusable population hash and normalized outcome record.
- Retired the settled early-repair A/B, MITM one-off, and Firestore boundary workflow. The Firestore identity boundary now runs in ordinary PR CI through the emulator-backed package test. Consolidated the published CP-SAT corpus into the retained harvest workflow.
- Renamed the typical-budget workflow to `solver-production-replay-baseline.yml`, labeled it history-aware, and pinned high-budget/replay execution checkout to the dispatched immutable SHA.
- Removed caller-maintained method-probe cardinality; each shard derives the corpus length from the supplied corpus.
- Added a complete maintained-workflow lifecycle inventory with consumer/retirement fields and an executable drift check.
- Migrated method-probe, static-portfolio, technique-census, high-budget, production-replay, reconciliation, and consolidated CP-SAT surfaces far enough to publish explicit contract/integrity metadata rather than relying only on the generic front door.

## Hostile-review corrections already applied

- Population identity now represents the **intended** population when an expected-ID population exists. Missing observations no longer mutate the population hash and thereby masquerade as a different experiment.
- Population integrity now distinguishes `coverageComplete` from `decisionValidComplete`. Deadline truncation, harness errors, and unknown outcomes can coexist with full row coverage but cannot make an experiment decision-bearing. The legacy `complete` field remains only as a compatibility alias for coverage completeness.
- The generic publisher now gates decision-bearing output and paired comparisons on decision-valid integrity, and its summary explicitly reports population coverage separately from decision-valid observations.
- Legacy integrity records fail closed unless they carry enough normalized outcome information to prove decision-validity; `complete: true` by itself is never sufficient.
- Single- and multi-population integrity combiners now preserve both coverage and decision-valid completeness.
- The exact-ID validator now emits both completeness concepts so workflows do not need to reconstruct this distinction independently.
- The v3 schema, contract checker, and regression tests encode these semantics.
- The historical high-budget audit now uses the surviving frozen July 24 ID files. The intended cohorts were **not** lost: population identity and expected-vs-observed coverage are reconstructable. Old per-level non-solve statuses may still remain scientifically ambiguous, so the audit continues to fail closed where normalization cannot establish a valid terminal class.
- Retired/renamed workflow residue checks are clean for the settled early-repair, MITM, typical-budget, and published-CP-SAT workflow names.

## Historical audit findings

The audit covers nine high-value evidence units. Current C1 (102/102) and C2 (1700/1700) canonical compiled baselines have exact present-day corpus ID coverage and are `valid-after-normalization`; embedded original run/SHA provenance remains partial.

The July high-budget aggregates preserve 3 and 165 positive solves respectively. Their frozen intended populations survive in `logs/solver-stress-refresh/*-unsolved-highbudget-2026-07-24.txt`, so the audit now compares the reports to those exact cohorts and assigns a stable intended-population hash. Their legacy top-level `failed/errors/completed` metadata remains non-authoritative; any old non-solve rows that cannot be normalized to a trustworthy terminal class stay observational rather than being silently promoted to ordinary negatives.

Historical routing A/B evidence remains invalid as paired evidence because no shared sealed population hash survives. Warm production replay is explicitly observational rather than cold capability. Historical method-probe cardinality remains incomplete/unverifiable where the needed run artifacts are unavailable. Technique-census run 32240161854 is incomplete because one partial shard also produced duplicated cell IDs; run 33717910218 has no missing, partial, or duplicate cells and is valid after terminology normalization.

No referee-valid solution was removed or rewritten. No broad solver run was launched.

**Regeneration note:** `reports/stress/solver-evidence-integrity-index.json` still reflects the pre-hostile-review audit implementation. Run `npm run solver:evidence-integrity-audit` and commit the regenerated file after these corrections before this tranche is considered merge-ready; do not cite the stale checked-in high-budget classifications.

## Integration fix required before the branch can go green

PR CI on the hostile-review head passed deep verification, including ordinary tests, heavyweight proofs, and the Firestore emulator boundary proof. The fast gate failed only at the file-size ratchet introduced on `main` after this branch was created.

Bring current `main` into the branch, then update `scripts/check-file-size-ratchet.mjs` without weakening the ratchet:

- remove the stale grandfather entry for `.github/workflows/solver-typical-budget-baseline.yml`;
- add `.github/workflows/solver-production-replay-baseline.yml` at its actual post-remediation byte size as the inherited pre-existing workflow-size debt ceiling;
- do not raise unrelated ceilings or exempt new growth.

This should be done in a normal checkout/rebase or merge. The connector cannot safely manufacture this change on the pre-ratchet branch without creating an add/add conflict.

## Intentionally incomplete / remaining implementation queue

- **Routing-regime remains the largest unfinished implementation item.** It still needs the planned one-dispatch, one-sealed-population, two-immutable-SHA redesign. Existing historical paired claims should not be reused meanwhile.
- Every maintained evidence workflow still has the standard publishing front door, but not every specialized producer emits a native v3 contract or feeds an exact integrity file to it. These workflows fail closed as non-decision-bearing under the generic publisher, but targeted/broad/residual and CP-SAT/reference families should be brought onto native contract/integrity metadata for full closeout.
- High-budget now seals and exact-validates both frozen cohorts before telemetry/report mutation and publishes normalized v3 execution, limit, configuration, and side-effect semantics; first-class missing-ID gap-fill dispatch remains to be added.
- Production replay now exact-validates C1/C2 IDs, prohibits partial continuity diffs/updates, and publishes normalized history-aware v3 semantics.
- Cross-run reconciliation now requires source manifests, equal immutable SHAs/configuration hashes, exact intended-population integrity, and separate source/reconciliation provenance. Historical wrong-ref and report-dependency audits still require artifact/history review where committed evidence is insufficient.
- Method-probe now derives and validates the supplied corpus population and publishes its isolated-technique limits/semantics; historical run-by-run cardinality remains unverifiable where artifacts expired. Technique census validates sealed plan cell IDs while preserving partial-cell publication, and static portfolio publishes exact matched-cell integrity before its explicit verdict.
- CP-SAT/reference outcome adapters remain to be normalized without flattening domain-specific statuses.
- The generated historical integrity index and any docs quoting it must be refreshed after the hostile-review corrections before merge.

## Smallest justified reruns

None are automatic. After closeout, prefer missing-ID gap fills for important high-budget cohorts and a fresh coordinated routing paired run only if a current decision still depends on it. Do not refresh the full canonical corpus merely to normalize metadata.
