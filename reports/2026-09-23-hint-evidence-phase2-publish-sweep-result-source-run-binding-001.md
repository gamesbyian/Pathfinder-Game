# Hint evidence consolidation — Phase 2 canonical source-run binding in the sweep publisher — 001

> **Status:** concluded-positive
>
> **Date:** 2026-09-23
>
> **Batch:** source-run envelope consolidation, following
> [`2026-09-23-hint-evidence-phase2-combine-sweep-reports-canonical-identity-001.md`](2026-09-23-hint-evidence-phase2-combine-sweep-reports-canonical-identity-001.md).
>
> **Base commit:** `dd8373f`.

## 1. Scope

`scripts/publish-solver-sweep-result.mjs` now emits a canonical `sourceRunBinding`
(`sourceRunBindingFromContract()`, `scripts/solver-experiment-contract.mjs`) in both `manifest.json`
and the optional `pathfinder-gha-source-run` sidecar (`--provenance-out`), additive alongside every
existing ad-hoc field. This is the mechanical-migration-audit's own named "highest-priority mechanical
migration": its duplication table calls this file's manifest+sidecar pair an "exact semantic duplicate
of much of the future bounded binding."

## 2. Why additive, and why safe by construction

This publisher is a real, actively-used GHA artifact producer with a checked schema
(`docs/solver-experiment-result.schema.json`, top-level `additionalProperties: true`, confirmed before
touching anything) and its own contract test (`check-solver-sweep-result-contract.mjs`). The audit's own
guidance is explicit: "Preserve manifest and sidecar schemas as projections." So this batch only adds
one new field; nothing existing changed shape.

`sourceRunBindingFromContract()` throws when its input contract is not decision-grade, or when `runId`
is empty, or when the resolved solver ref is not a genuine immutable commit SHA — all of which are
**common, legitimate states** for this general-purpose publisher (a local invocation with no
`GITHUB_RUN_ID`, an undeclared contract, a contract missing `resolvedSha`). Wrapping the call in a
try/catch and omitting the field entirely on any of these makes the addition impossible to regress a
prior successful publish: every existing decision-bearing/non-decision-bearing test in the file's
41-assertion suite still passes unmodified, and the new field simply does not appear when the inputs
that would produce it aren't present — the same pattern every other optional projection in this file
(`researchOutcome`, `failureEvidence`, `richCapturePresent`) already uses.

## 3. Implementation

- Imported `sourceRunBindingFromContract` from `solver-experiment-contract.mjs`.
- Computed `sourceRunBinding` once (try/catch, `null` on any failure) using `process.env.GITHUB_RUN_ID`/
  `GITHUB_RUN_ATTEMPT` and `contractRef: 'manifest.json#experimentContract'` — matching the exact
  `--contract-ref` convention `hint-discovery-process.mjs` already established for the same concept.
- Spread `...(sourceRunBinding ? { sourceRunBinding } : {})` into both `manifest` and the
  `pathfinder-gha-source-run` sidecar object, so both projections carry the **identical** binding
  object rather than two independently-constructed copies that could drift.

## 4. Verification

- Confirmed the top-level JSON schema explicitly allows unknown properties
  (`docs/solver-experiment-result.schema.json`'s final `"additionalProperties": true`) before adding
  the field, rather than assuming it.
- Extended the existing decision-bearing fixture test with an assertion that `sourceRunBinding` is
  **absent** when no `GITHUB_RUN_ID` is set (the common case in the existing suite) — proving the
  addition never fabricates a binding from a missing run identity.
- Added a new dedicated test that sets `GITHUB_RUN_ID`/`GITHUB_RUN_ATTEMPT` and `--provenance-out`,
  reusing the same decision-grade contract fixture, asserting: the binding's `kind`, `runId`,
  `runAttempt`, `solverRef` (matches the contract's declared immutable SHA), `configurationHash`
  (matches the manifest's own), and that `protocolHash` is provably distinct from `configurationHash`
  (execution-protocol identity, not a re-copy of configuration identity — this publisher was never one
  of the files with the protocolHash-from-configurationHash conflation, but the assertion still proves
  the binding composes the real distinct identity rather than any placeholder). Also asserts the
  sidecar's `sourceRunBinding` is `deepEqual` to the manifest's — one shared object, not two.
- `node --check`, `npm run check:types`/`check:types:tests` — clean.
- `npm run check:solver-sweep-results` (the static workflow/publisher contract check) — still passes
  for all 16 maintained workflows.
- `node scripts/experiment-result-contract-audit-node-test.mjs` — passes.
- Full `npx vitest run` (145/1550) and full `npm run test:node` (180 packages) — all green.

## 5. What this does not do

- Does not touch `scripts/validate-reconciliation-sources.mjs`'s specialist recombination
  `sourceProtocolHash`/`sourceSetHash` protocol — the audit is explicit that this is a distinct concept
  from the shared binding and must not be replaced by it.
- Does not migrate any of the other source-run-envelope duplicates the audit's table names (hint-
  discovery-process's `run` object already uses the shared binding, from an earlier chatgpt/Codex
  batch; search-loss capture's `run` envelope and failure-response documents remain untouched, both
  explicitly flagged in the audit as needing a Claude/Phase-3 decision before mechanical migration).
- Does not remove or rename any existing manifest/sidecar field.

## 6. Next work

Remaining Phase 2 items per the reconciliation report: integrate raced-backend pool/first-success
semantics into the execution-protocol layer (plan section K); resolve the TypeScript-runtime-vs-
plain-Node bridge question for producers that are not already bundled. Both are larger, more
architecturally-consequential batches than the mechanical, additive migrations this and the prior three
batches performed.
