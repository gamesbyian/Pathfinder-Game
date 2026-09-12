# Solver workflow remediation: completed implementation handoff

> **Status:** completed by PR #1740; merged 2026-09-11. The remediation tranche is closed.
> **Audit authority:** [`../reports/stress/solver-evidence-integrity-index.json`](../reports/stress/solver-evidence-integrity-index.json), rebuilt by `npm run solver:evidence-integrity-audit`.

## Completed scope

- Added the v3 experiment-result contract with deterministic population/configuration hashing, normalized outcome classification, exact population integrity, provenance, limits, side-effect semantics, and paired compatibility checks.
- Repaired the shared combiner and publisher so transport coverage, intended-population integrity, outcome validity, producer/source provenance, and decision-bearing status remain distinct.
- Population identity now represents the **intended** population when one is declared; missing observations cannot mutate experiment identity.
- Population integrity distinguishes `coverageComplete` from `decisionValidComplete`. Deadline truncation, harness errors, malformed/missing rows, and unknown outcomes cannot silently become ordinary negatives or decision-bearing evidence.
- Legacy integrity records fail closed unless normalized outcome data establish decision validity.
- Single- and multi-population integrity, reconciliation, publication, schemas, contract checks, and regression tests share those semantics.
- Retired the settled early-repair A/B, MITM one-off, and Firestore boundary workflows; moved the Firestore identity proof into ordinary CI; consolidated the duplicate published CP-SAT harvest workflow.
- Renamed the typical-budget workflow to `solver-production-replay-baseline.yml`, made its history-aware semantics explicit, and propagated the rename through consumers/guardrails.
- Hardened high-budget, production replay, method-probe, static-portfolio, technique-census, targeted/broad/residual confirmation, CP-SAT/reference, reconciliation, and routing-regime experiment surfaces onto the common evidence contract where applicable.
- Redesigned routing-regime A/B as one coordinated dispatch with one sealed population and two immutable arm SHAs.
- Added maintained-workflow lifecycle inventory/checking and historical evidence-integrity audit tooling.
- Added/retained fail-closed behavior for partial, mismatched, wrong-ref, duplicate, unexpected, truncated, and otherwise scientifically indeterminate evidence.

## Hostile-review corrections incorporated

The hostile review during implementation found and corrected several issues before merge:

- intended populations were initially being hashed from observed rows rather than expected IDs;
- structural row coverage and scientifically interpretable completeness were initially conflated;
- legacy `complete: true` records could otherwise receive too much benefit of the doubt;
- multi-population combination initially risked collapsing the new completeness distinction;
- the historical high-budget audit initially overlooked the surviving frozen July 24 intended-population ID files;
- the workflow rename initially collided with the repository file-size ratchet until the inherited grandfathered entry was transferred correctly.

These corrections are encoded in tooling/tests rather than remaining reviewer convention.

## Historical audit conclusions

The integrity audit preserves referee-valid positive solutions even when surrounding experiment metadata is downgraded.

Current canonical C1/C2 compiled baselines have exact present-day population coverage. Historical evidence with incomplete provenance, ambiguous non-solve semantics, incompatible populations, expired artifacts, or unrecoverable protocol identity remains downgraded or observational rather than being normalized optimistically.

In particular:

- the July high-budget intended populations are reconstructable from the surviving frozen cohort files, while ambiguous legacy non-solve statuses remain non-authoritative;
- historical routing A/B evidence without a shared sealed population identity remains invalid as paired evidence;
- warm/history-aware production replay is not cold-capability evidence;
- missing historical cardinality/provenance remains unknown where artifacts cannot reconstruct it;
- no referee-valid solution was removed or rewritten merely because its enclosing experiment was downgraded.

## Validation and closeout

PR #1740 merged after its final head passed repository CI, including the ordinary fast gate, deep verification, contract/integrity tests, and the Firestore emulator boundary proof.

No broad solver rerun was required to complete this remediation. The program deliberately preferred metadata reconstruction, exact-population validation, selective normalization, and fail-closed historical classification over recomputing whole corpora.

Future workflow/evidence changes should preserve the contracts established here, but ordinary solver research priority remains owned by [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md). This document is now a completion record, not an active implementation queue.

## Rerun policy after closeout

No rerun is automatically owed by this remediation. If a current decision later depends on historically incomplete or invalid evidence, use the smallest decision-bearing rerun that answers that question, such as a missing-ID gap fill or a fresh coordinated paired run. Do not refresh the full canonical corpus merely to normalize historical metadata.
