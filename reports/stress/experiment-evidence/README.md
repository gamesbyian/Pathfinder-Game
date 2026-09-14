# Durable decision-bearing experiment evidence

This directory is the tracked closeout store for **decision-bearing v3 solver experiment evidence** whose original GitHub Actions artifacts may expire.

It is populated through `scripts/persist-decision-bearing-experiment-evidence.mjs` by the repository's serialized evidence harvesters.

## Admission rule

A source artifact is retained here only when its `manifest.json` has all of:

- `kind: pathfinder-solver-experiment-result`;
- `schemaVersion: 3`; and
- `decisionBearing: true`.

The retention layer does not decide whether evidence is scientific. It preserves evidence only after the existing experiment contract, population-integrity, research-outcome, and decision-bearing gates have already accepted it.

Non-decision-bearing benchmark artifacts are ignored.

## Bundle identity

Each retained directory is named:

`<experimentId>__run-<workflowRunId>__attempt-<workflowRunAttempt>/`

and contains:

- `manifest.json` — the exact published v3 result/contract manifest, always retained uncompressed and readable;
- `bundle.json` — retention index with experiment/run/config/population identity and per-file checksums;
- `evidence/...` — every non-missing file/directory named by the published manifest's evidence entries.

Files larger than 4 MiB are stored as deterministic gzip files. `bundle.json` records the original byte count, SHA-256 of the uncompressed source bytes, stored path, and compression mode. Smaller files remain directly readable.

The bundle is intended to retain enough primary evidence to recompute the decision after Actions retention expires. It does not replace the dated interpretation report, question state, capability memory, or experiment manifest/result schema.

## Automatic harvest

Two workflow surfaces share the same repository-wide evidence-writer lock:

- `.github/workflows/harvest-solver-evidence.yml` retains decision-bearing v3 bundles encountered in the canonical solver/hint workflows it already harvests; and
- `.github/workflows/harvest-decision-bearing-experiment-evidence.yml` retains bundles from fresh broad/residual confirmation, static-portfolio confirmation, and cross-run reconciliation workflows without sending those generated populations through canonical hint importers.

Both reset to current `main` and replay immutable source artifacts on a push race, so re-harvesting the same source run is deterministic and does not merge generated evidence JSON line-by-line.

## Backfill without solver compute

While an existing source run's artifacts still exist, manually dispatch **Harvest decision-bearing experiment evidence** with `source_run_id`. It downloads the existing artifacts and applies the same admission rule. No solver rerun is needed.

The older **Harvest solver hint evidence** manual dispatch also retains a decision-bearing v3 bundle when the source run is one of the canonical hint/provenance workflow families.

Historical experiments whose primary artifacts have already expired remain historically unreconstructable at the missing layer. Do not fabricate replacement rows from current defaults or rerun old science merely to make this directory look complete.

## Scientific boundary

Durable retention preserves reconstructability. It does not strengthen inferential scope.

A residual-conditioned experiment remains residual-conditioned. A tested-form negative remains scoped to the tested form. A promotion negative does not erase retained capability. Exact-action participation and comparable dose still require the appropriate row-level evidence.
