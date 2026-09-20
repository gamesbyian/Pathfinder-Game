# Durable decision-bearing experiment evidence

This directory is the tracked closeout store for **decision-bearing v3 solver experiment evidence** whose original GitHub Actions artifacts may expire.

It is the durable retention surface of the existing `experiment-manifests` research asset, not a separate evidence family or truth store. Use `node scripts/research-asset-query.mjs --id=experiment-manifests` for the normal registry entry and [`docs/solver-research-data-assets.md`](../../../docs/solver-research-data-assets.md) for cross-asset interpretation.

It is populated by `scripts/persist-decision-bearing-experiment-evidence.mjs` through the repository's existing serialized `.github/workflows/harvest-solver-evidence.yml` writer.

## Admission rule

A source artifact is retained here only when its `manifest.json` has all of:

- `kind: pathfinder-solver-experiment-result`;
- `schemaVersion: 3`; and
- `decisionBearing: true`.

The retention layer does not invent scientific eligibility. It re-runs the shared decision-bearing result predicate before preservation, so a stale or hand-edited `decisionBearing: true` cannot bypass the experiment contract, population-integrity, research-outcome, published-primary, or identity-consistency gates.

Non-decision-bearing benchmark artifacts are ignored.

## Bundle identity

Each retained directory is named:

`<experimentId>__run-<workflowRunId>__attempt-<workflowRunAttempt>/`

and contains:

- `manifest.json` — the exact published v3 result/contract manifest, always retained uncompressed and readable;
- `bundle.json` — retention index with experiment/run/config/population identity and per-file checksums;
- `evidence/...` — every non-missing file/directory named by the published manifest's evidence entries.

Files larger than 4 MiB are stored as deterministic gzip files. `bundle.json` records the original byte count, SHA-256 of the uncompressed source bytes, stored path, and compression mode. Smaller files remain directly readable.

Bundle identity is append-only. Re-harvesting the same experiment/run/attempt is accepted only when the reconstructed bundle is byte-identical, in which case it is an idempotent no-op. If the same durable identity reconstructs to different bytes, retention fails instead of overwriting the previously retained evidence.

The bundle is intended to retain enough primary evidence to recompute the decision after Actions retention expires. It does not replace the dated interpretation report, question state, capability memory, or experiment manifest/result schema.

## Automatic harvest

`.github/workflows/harvest-solver-evidence.yml` watches both canonical hint/provenance solver workflows and maintained decision-bearing confirmation/reconciliation workflows.

For canonical hint-producing sources it runs the existing hint/provenance importers and then the durable experiment retention layer.

For broad/residual confirmation, static-portfolio confirmation, and cross-run reconciliation sources it deliberately skips the hint importers and runs only durable experiment retention. Fresh generated confirmation populations therefore cannot become canonical hint sources merely because they share the same serialized evidence writer.

The workflow resolves the source workflow name and head SHA directly from the Actions run ID before choosing its import path. Optional manual expectations must match that resolved identity. It then resets to current `main` and replays immutable source artifacts on a push race, so re-harvesting the same source run is deterministic and does not merge generated evidence JSON line-by-line.

## Backfill without solver compute

While an existing source run's artifacts still exist, manually dispatch **Harvest solver hint evidence** with `source_run_id`.

The workflow resolves the source workflow identity itself, downloads the existing artifacts, and applies the same admission/import rules. `source_workflow` and `source_sha` are optional assertions rather than routing inputs. No solver rerun is needed.

Historical experiments whose primary artifacts have already expired remain historically unreconstructable at the missing layer. Do not fabricate replacement rows from current defaults or rerun old science merely to make this directory look complete.

## Scientific boundary

Durable retention preserves reconstructability. It does not strengthen inferential scope.

A residual-conditioned experiment remains residual-conditioned. A tested-form negative remains scoped to the tested form. A promotion negative does not erase retained capability. Exact-action participation and comparable dose still require the appropriate row-level evidence.
