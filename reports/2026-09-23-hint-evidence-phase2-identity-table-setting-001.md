# Hint evidence consolidation — Phase 2 identity table-setting and reconstructability — 001

> **Status:** active
> **Last evidence:** 2026-09-23 — Retained and reconciled as part of the active hint-evidence consolidation implementation.
> **Decision:** Preserve this report as durable implementation/audit evidence; current code and later reconciliation records remain authoritative where they supersede earlier details.
> **Remaining gate:** Apply the current phase-specific validation and closeout gates before treating this report as proof of whole-program completion.


> **Status:** implementation-complete, execution-validation pending
>
> **Date:** 2026-09-23
>
> **Branch:** `chatgpt/continue-hint-evidence-consolidation-2026-09-23`
>
> **Ancestry:** exact descendant of `claude/pathfinder-hint-evidence-consolidation-saeiuo`.

## Scope

This batch advances Phase 2 around work that does not depend on running the repository or deciding the
yet-unsettled producer migration bridge. It deliberately avoids broad workflow migration, physical
provenance schema changes, Firestore occurrence layout, or historical backfill.

## Canonical source-run binding

Added `sourceRunBindingFromContract()` to `scripts/solver-experiment-contract.mjs`.

The binding is intentionally bounded identity glue rather than a telemetry envelope. It carries:

- source run id and optional run attempt;
- owning contract reference;
- workflow family / producer / entrypoint;
- immutable solver ref;
- experiment configuration hash;
- execution-protocol hash;
- population and corpus identity;
- experiment arm;
- constituent source-run lineage for reconciled/recombined evidence.

`scripts/hint-discovery-process-evidence-lib.mjs` now consumes this shared binding instead of
reconstructing the overlapping run/config/protocol/solver/population tuple itself.

## Protocol/configuration separation

The prior Phase-2 batch introduced `hashExecutionProtocol()` after confirming that
hint-discovery-process evidence historically wrote both `protocolHash` and `configurationHash`
from `experiment.configurationHash`.

The resource catalogue and new identity-dialect map now explicitly record that pre-fix
hint-discovery-process schema-v1 documents cannot use their stored `protocolHash` alone as proof of
execution-protocol equality. Where the owning experiment contract survives, the protocol identity can
be recomputed exactly.

## Identity dialect migration map

Added `docs/solver-evidence-identity-dialects.json`.

It maps existing spellings to their semantic layers and migration treatment, including:

- `summary.effectiveConfig` / `effectiveConfigDigest`;
- experiment/artifact `configurationHash`;
- canonicalized `protocolHash`;
- lineage-only `sourceProtocolHash`;
- `resolvedSha`, arm-specific resolved SHA and artifact `solverRef`;
- mixed-era `commitSha` / `summary.commit` / `commit`;
- workflow `manifest.sha` / `GITHUB_SHA`;
- run id / run attempt spellings;
- source-run lineage;
- population/corpus identity.

The map explicitly warns that workflow SHA and solver SHA are different concepts under custom
checkouts.

## Canonical solver-request digest boundary

Added:

- `scripts/solver-request-identity-lib.mjs`
- `scripts/solver-request-identity-compat.mjs`

The first is the plain-Node digest owner for an already-canonical
`pathfinder-solver-request-projection`. It deliberately does not construct the projection, avoiding
a second copy of runtime default-resolution logic.

The compatibility boundary dual-reads:

- new `summary.solverRequestProjection` / `summary.solverRequestIdentity`; and
- historical/transitional `summary.effectiveConfig` / `summary.effectiveConfigDigest`.

A valid legacy effective-config digest is reported as `legacy-only`; it is **not** silently promoted
to canonical solver-request identity because semantic equivalence has not been proved.

## Effective-input reconstructability query

Extended `scripts/hint-discovery-replayability-lib.mjs` with
`effectiveSolverInputIdentityStatus()`.

It returns:

- `reconstructable: true|false`;
- structured `identity` only when all required dimensions are present;
- exact `missingDimensions` otherwise.

The derived identity currently requires:

- Pathfinder producer contract;
- level structural revision;
- immutable solver version;
- canonical attempt-config identity;
- canonical solver stage;
- gate identity;
- canonical solver-request identity;
- a relevant stored search/resource envelope;
- replay seed for randomized techniques;
- explicit capability context.

The caller may supply exact solver-request and solver-stage identity from sibling evidence. The helper
does not infer them from filenames, timestamps, technique strings or current defaults. Historical
stage spellings are normalized through the repo's existing stage-identity authority.

Added `scripts/stress/hint-reconstructability-report.mjs`, which reads the three canonical hint
corpora and reports, by corpus and in aggregate:

- hint/event counts;
- older replayability-basis counts;
- effective-input reconstructable vs not reconstructable;
- missing-dimension frequencies.

This is an availability report, not an evidence-quality score.

## Resource-contract integration

Updated:

- `docs/solver-research-data-assets.json`
- `docs/solver-research-resource-contract-audits.json`
- `docs/solver-protocol-schema-contraction.json`

The hint-provenance resource now exposes the reconstructability report as a normal query entry point
and explicitly records solver-request/stage/source-run gaps.

The hint-discovery-process resource now names the shared protocol and source-run-binding authorities,
distinguishes configuration identity from protocol identity, and records the pre-fix protocol-hash
historical caveat.

PSC-026 now reflects the implemented identity layers and the still-open producer/provenance/backend
work.

## Validation guards

Added/updated focused checks for:

- source-run binding reuse;
- distinct protocol/configuration identity;
- solver-request projection digest stability;
- dual-read canonical vs legacy request identity;
- effective-input missing-dimension reporting;
- canonical/historical solver-stage normalization;
- corpus-wide reconstructability report aggregation.

These lightweight checks are now wired into the ordinary `test:node` validation floor.

## Deliberately deferred

A runnable checkout should validate this branch before the following work proceeds:

1. producer emission of canonical `solverRequestProjection` / `solverRequestIdentity`;
2. exact request-projection bridge for plain-Node producers without duplicating TypeScript runtime logic;
3. provenance/occurrence schema additions carrying canonical solver-request/stage/source-run references;
4. raced-backend pool/first-success/wall semantics in the execution/reproducibility layer;
5. broad migration of specialist evidence families to the shared source-run binding;
6. historical authoritative enrichment.

The TypeScript/plain-Node boundary is especially worth resolving deliberately. The canonical request
projection currently lives beside the solver runtime; research scripts should not copy its
default-resolution logic just to gain a plain-Node import.

## Minimum validation on continuation

Run at least:

- `npm run test:node`
- `npx vitest run modules/solver/solver-request-projection.test.ts modules/hint-artifact-layout.test.ts modules/dev-corpus.test.ts`
- `npm run check:types`
- `npm run check:types:tests`
- `node scripts/check-corpus-level-formatting.mjs`

Then reconcile against current `main` before merging or continuing producer migration.


## Follow-up mechanical hardening

A later pass found one existing regression test still asserting the repaired defect:
`hint-discovery-process-cli-node-test.mjs` expected `protocolHash === configurationHash`.
That assertion now verifies the canonical execution-protocol hash, verifies it differs from
configuration identity for the fixture, and exercises physical `runAttempt` propagation.

`scripts/hint-discovery-process.mjs` now accepts `--run-attempt=<n>` and carries it into the shared
source-run binding.

Added `scripts/solver-evidence-identity-guard.mjs`, a deliberately narrow source guard that fails if
maintained `scripts/` or `modules/` code directly assigns `protocolHash` from a
`configurationHash`. It is wired into `test:node`. Historical reports/docs remain untouched and
may continue to describe the old defect truthfully.
