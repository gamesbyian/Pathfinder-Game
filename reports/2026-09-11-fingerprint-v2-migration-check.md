# Fingerprint v2 migration check — 2026-09-11

> **Status:** concluded-negative
> **Last evidence:** 2026-09-11 — inventory of `scripts/solver-fingerprint.mjs`, `scripts/compare-solver-fingerprints.mjs`, `package.json` entry points, GitHub Actions workflows, and the repository's retained `logs/` material.
> **Decision:** no live migration defect exists; close the post-closeout Audit 17 migration item with no code change.
> **Remaining gate:** none — reopen only if a future workflow or durable baseline begins consuming fingerprint JSON directly.
> **Audit area:** 17 — Fingerprint / capability classification
> **Question:** Did the schema-v2 fingerprint change strand any live consumer or retained baseline that would now fail unexpectedly or silently compare unlike schemas?

## Inventory

The active writer is `scripts/solver-fingerprint.mjs`. It emits `fingerprintSchemaVersion: 2` and records stage/action identity, repair seed salt, deterministic work, winning action key, and failed action keys in addition to the older config-family labels.

The active comparator is `scripts/compare-solver-fingerprints.mjs`. It resolves a missing version as legacy v1 and refuses a mixed-version comparison before looking at row-level differences. The error tells the operator to regenerate both sides under one schema.

`package.json` exposes only these two fingerprint-specific entry points:

- `solver:fingerprint`
- `solver:fingerprint:compare`

No GitHub Actions workflow on the current audit branch references the solver-fingerprint runner or comparator, so there is no unattended workflow consumer expecting the old schema.

The repository does not retain a committed `logs/solver-fingerprint/` baseline directory. The retained `logs/solver-determinism/` material consists of historical comparison/probe logs rather than JSON fingerprint baselines consumed by automation. Those logs are evidence records, not live comparator inputs.

## Result

No live migration defect was found. Schema v2 is deliberately incompatible with v1, and the one live comparison path fails loudly rather than silently treating the two schemas as comparable. There is therefore no baseline conversion to perform and no consumer to patch.

Historical v1 fingerprint JSON, if held outside the repository or recreated from old artifacts, should remain historical. Any new determinism comparison should regenerate both sides with the current v2 writer rather than translating v1 rows, because the missing action/stage/seed fields cannot be reconstructed faithfully from the old schema.

## Disposition

Close the post-closeout Audit 17 migration item with no code change. Reopen only if a future workflow or durable baseline begins consuming fingerprint JSON directly; that consumer must either pin a schema or use the comparator's explicit same-schema rule.
