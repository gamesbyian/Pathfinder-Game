# Durable decision-bearing experiment evidence

This directory is the tracked closeout store for **decision-bearing v3 solver experiment evidence** whose original GitHub Actions artifacts may expire.

It is populated by `.github/workflows/harvest-solver-evidence.yml` through `scripts/persist-decision-bearing-experiment-evidence.mjs`.

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

- `manifest.json` — the exact published v3 result/contract manifest;
- `bundle.json` — retention index with experiment/run/config/population identity and per-file checksums;
- `evidence/...` — every non-missing file/directory named by the published manifest's evidence entries.

Files larger than 4 MiB are stored as deterministic gzip files. `bundle.json` records the original byte count, SHA-256 of the uncompressed source bytes, stored path, and compression mode. Smaller files remain directly readable.

The bundle is intended to retain enough primary evidence to recompute the decision after Actions retention expires. It does not replace the dated interpretation report, question state, capability memory, or experiment manifest/result schema.

## Automatic harvest

For solver workflows already watched by `harvest-solver-evidence.yml`, decision-bearing v3 bundles are retained during the same serialized semantic harvest that persists canonical hint/provenance evidence.

The harvester resets to current `main` and replays the immutable source artifacts on a push race, so re-harvesting the same source run is deterministic and does not merge evidence JSON line-by-line.

## Backfill without solver compute

While an existing source run's artifacts still exist, use the **Harvest solver hint evidence** workflow's manual dispatch and provide `source_run_id`.

The workflow downloads the existing artifacts and applies the same retention rule. No solver rerun is needed.

Historical experiments whose primary artifacts have already expired remain historically unreconstructable at the missing layer. Do not fabricate replacement rows from current defaults or rerun old science merely to make this directory look complete.

## Scientific boundary

Durable retention preserves reconstructability. It does not strengthen inferential scope.

A residual-conditioned experiment remains residual-conditioned. A tested-form negative remains scoped to the tested form. A promotion negative does not erase retained capability. Exact-action participation and comparable dose still require the appropriate row-level evidence.
