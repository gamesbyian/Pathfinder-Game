# Solver workflow remediation implementation handoff

> **Status:** implementation handoff for the active [`solver-workflow-evidence-remediation-plan.md`](solver-workflow-evidence-remediation-plan.md).
> **Created:** 2026-09-11.
> **Purpose:** lock pre-implementation decisions, reduce agent ambiguity, and define the boundary between mechanical repo remediation and later scientific reinterpretation.
> **Priority:** subordinate to the remediation plan. Ordinary solver-research priority remains owned by [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).

## 1. Settled workflow lifecycle decisions

These decisions were resolved by inspecting current `main` plus recent git history. Treat them as implementation instructions unless current source reveals a concrete contradiction.

| Workflow | Decision | Reason / implementation note |
|---|---|---|
| `solver-early-repair-search-adaptive-sample-ab.yml` | **RETIRE** | Hardcoded early-repair A/B plumbing has been superseded by the generalized routing-regime experimental path. Git and dated reports are the archive. Remove current-authority/tooling references with the workflow. |
| `mitm-frontier-sweep.yml` | **RETIRE** | The corrected MITM frontier-size question was explicitly closed by commit `ac51f423cf3ef99d458c2556c7343c7a043d41ca` on 2026-08-05. Do not keep a standing workflow for a settled one-off question. Preserve the probe/report history. |
| `firestore-level-fingerprint-boundary.yml` | **RETIRE AFTER DURABLE TEST MIGRATION** | This is a completed narrow migration/persistence proof. Before deletion, inspect whether any invariant exists only in the workflow; migrate uniquely valuable assertions into ordinary durable test/CI coverage first. |
| `cpsat-hint-harvest-sweep-published.yml` | **CONSOLIDATE THEN RETIRE** | Published-corpus variation belongs in `cpsat-hint-harvest-sweep.yml`. Preserve useful corpus/output semantics, migrate consumers/docs, then delete the duplicate wrapper. |
| `collect-prune-gap-labels.yml` | **KEEP** | Still has live research use, including September 11 joint-obligation work. It is not merely historical campaign debris. |
| `cpsat-explicit-prefix-reference.yml` | **KEEP** | Still-active exact/reference infrastructure; its schema/combiner were hardened around 2026-08-31. |

Do not create replacement workflows solely to preserve old filenames. Update current consumers in the same change.

## 2. Implementation tranche boundary

The large implementation tranche should include:

1. common experiment/population/provenance/limit/status contract;
2. shared combiner, publisher, integrity and hashing repair;
3. surviving workflow migration;
4. routing-regime paired-population redesign;
5. high-budget and warm production-replay hardening;
6. workflow retirements/consolidations above;
7. workflow lifecycle/discoverability checks;
8. historical committed-evidence audit tooling;
9. generation of the evidence-integrity index;
10. objective no-new-compute corrections to misleading metadata, terminology and report reliability labels.

The implementation tranche should **not** autonomously:

- revert promoted/default-on solver mechanisms because one supporting artifact is downgraded;
- reopen closed algorithmic research lanes where independent evidence may still support the disposition;
- launch expensive full-corpus, confirmation, transfer or historical-replication runs;
- declare ambiguous historical scientific conclusions false when the audit merely weakens their evidence;
- reprioritize the live solver workstreams on the basis of ambiguous fallout.

Instead, ambiguous consequences should be surfaced for the later hostile review with the smallest proposed resolving test.

## 3. Historical integrity-index contract

The rebuildable machine-readable authority should live at:

`reports/stress/solver-evidence-integrity-index.json`

The checked-in schema contract is [`solver-evidence-integrity-index.schema.json`](solver-evidence-integrity-index.schema.json).

The index is an integrity/reliability ledger, **not** a second solver queue and not a hand-maintained opportunity catalogue.

Each record should represent one materially decision-bearing or reusable historical evidence unit and, where reconstructable, capture:

- stable evidence identifier;
- source paths and source run IDs;
- intended ref and actual executed SHA;
- producer/entrypoint/workflow family;
- population kind, identity basis/hash, expected/observed/missing/duplicate/unexpected counts;
- cold/level-blind/history-aware execution semantics;
- normalized node/work/wall limit semantics;
- solved, valid-negative, node/work limited, deadline-truncated, error, malformed, missing and unknown counts as applicable;
- reliability class;
- replacement/superseding evidence;
- whether new compute is required;
- concise reason/notes.

Missing provenance stays unknown. Do not fabricate an intended ref, SHA, population or status merely to populate a field.

## 4. Reliability vocabulary

Use exactly these top-level reliability classes unless the owning plan is amended:

- `valid` — no material integrity defect found for the claim the evidence is used to support;
- `valid-after-normalization` — underlying observations remain usable but derived metadata/aggregation/provenance needs correction;
- `observational-only` — rows/capability signatures remain useful but the original causal/population claim is not decision-bearing;
- `incomplete` — intended population/cells were not completely observed or interpretable;
- `superseded` — valid or historically useful, but a newer authoritative result should be used for current conclusions;
- `invalid` — the claimed decision cannot be supported because wrong code/population/protocol or another material invariant was violated.

A separate `reconstructability` field should distinguish `complete`, `partial`, and `unverifiable` provenance so `invalid` is not abused merely because artifacts expired.

## 5. Rerun disposition vocabulary

Every evidence item that is not simply `valid` should eventually have one of:

- `none-required`;
- `gap-fill-candidate`;
- `rerun-candidate`;
- `rerun-completed`;
- `superseded-no-rerun`;
- `invalid-no-longer-relevant`;
- `needs-human-review`.

The implementation tranche may assign obvious mechanical states. Ambiguous scientific rerun decisions should use `needs-human-review` rather than guessing.

## 6. Population identity rules

Use one canonical population-identity implementation rather than workflow-specific hashes.

Minimum rules:

- explicit level set: canonicalize stable level IDs, reject duplicates, hash the canonical vector;
- whole corpus: include corpus/content identity plus the exact population definition;
- generated cohort: hash the sealed cohort artifact/content identity;
- residual experiment: hash the frozen residual vector produced before treatment outcomes;
- static portfolio/technique census: hash the canonical ordered cell identities;
- stratified experiment: preserve whole-population hash plus named stratum hashes.

Same count is not same population. Paired decision-bearing evidence requires compatible hashes.

## 7. Status and denominator rules

The common layer must preserve the following distinctions:

- solved;
- valid protocol negative/exhaustion when the protocol supports that inference;
- node-limited;
- work-limited;
- deadline-truncated;
- harness/infrastructure error;
- malformed;
- missing;
- unknown/indeterminate.

Never define scientific failure as `!ok`.

`expectedCount` is the intended denominator. `observedCount` is not allowed to silently replace it. A transport-complete shard set may still be population-incomplete.

## 8. Historical audit order

After the new common semantics exist, audit in this order:

1. canonical stress-refresh history;
2. outputs produced by the shared combiner/publisher;
3. high-budget frozen cohorts and telemetry;
4. routing-regime paired-population identity;
5. warm/typical-budget replay family;
6. method-probe cardinality;
7. cross-run reconciliation provenance;
8. wrong-ref exposure for materially decision-bearing experiments;
9. current reports/docs/ledgers that depend on downgraded evidence.

This order protects current capability truth first and defers the most interpretive work until the mechanical audit substrate is trustworthy.

## 9. Report correction policy

Do not erase history.

For a dated report whose material claim changes:

- preserve the original report body;
- add a prominent correction/reliability note near the top;
- identify the affected claim;
- state what remains usable;
- link normalized/replacement evidence;
- state whether a rerun is required, unnecessary, or awaiting review.

Referee-valid paths remain positive-oracle evidence even when their producer experiment becomes observational or invalid for a broader claim.

## 10. Closeout handoff

The implementation tranche is ready for independent hostile review when:

- the surviving workflow surface has been migrated or explicitly accounted for;
- the settled retirements/consolidation are complete;
- shared result semantics no longer conflate transport completeness with scientific completeness;
- historical integrity tooling runs deterministically on committed evidence;
- the integrity index and ambiguous-fallout review queue are generated;
- no expensive scientific reruns were launched merely for cleanup ceremony;
- the final PR states which plan items remain unresolved and why.

The next reviewer should then audit the implementation against the full remediation plan, inspect the generated evidence classifications, make the final scientific reliability judgments, and approve only the smallest justified rerun set.
