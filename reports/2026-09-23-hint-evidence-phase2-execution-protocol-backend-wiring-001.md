# Hint evidence consolidation — Phase 2 backend/reproducibility wiring into execution-protocol identity — 001

> **Status:** concluded-positive
>
> **Date:** 2026-09-23
>
> **Batch:** second sub-piece of "integrate raced-backend/reproducibility semantics into the
> execution-protocol layer", following
> [`2026-09-23-hint-evidence-phase2-reproducibility-mode-classification-001.md`](2026-09-23-hint-evidence-phase2-reproducibility-mode-classification-001.md).
>
> **Base commit:** `280e70b`.

## 1. Correcting the prior batch's own scoping assumption

The previous batch's report treated wiring `reproducibilityMode` into `hashExecutionProtocol()` as
requiring a `docs/solver-experiment-result.schema.json` migration, since that schema's `execution`
object has `additionalProperties: false`. Re-examining `hashExecutionProtocol()`'s actual
implementation before starting this batch found that assumption wrong: the function's hash input is a
**freshly constructed object literal** derived from `contract.execution`'s fields, not a pass-through of
`contract.execution` itself. A caller-supplied parameter (exactly like the existing `arm` option) can
therefore participate in the hash without ever being added to, or persisted in, the schema-validated
`contract.execution`/`manifest.execution` shape. No schema change is needed for this step at all — the
JSON schema governs what gets **written**, not what `hashExecutionProtocol` internally **hashes**.

This correction is recorded here explicitly so it isn't re-derived (or, worse, the wrong original
assumption re-applied) by a future continuation.

## 2. Implementation

- `hashExecutionProtocol(contract, { arm, backend })`: new optional `backend` parameter
  (`modules/solver/reproducibility-mode.mjs`'s `EXECUTION_BACKENDS` vocabulary). Folds
  `classifyReproducibilityMode({ schedulerMode, backend })`'s result into the hash input alongside the
  raw `backend` value itself — both are kept, since "which SolveOpts scheduler mode was configured" and
  "what reproducibility class does this promise" are both real, independently meaningful facts (a
  raced-vs-direct execution of the identical `schedulerMode` correctly still produces different
  protocol hashes, because the raw `schedulerMode` field is unchanged but `backend`/`reproducibilityMode`
  differ).
- Bumped the function's internal `schemaVersion` from `1` to `2`, since this changes what a v1 hash
  input meant. Confirmed safe: `hashExecutionProtocol` was introduced this same implementation phase
  (never in a real merged/production GHA run), and every existing test recomputes its expected value
  dynamically via the function itself rather than hardcoding a literal hash string, so nothing needed
  updating for the bump itself.
- `sourceRunBindingFromContract(contract, { runId, runAttempt, contractRef, arm, backend })`: new
  optional `backend` parameter, forwarded to its internal `hashExecutionProtocol()` call. Without this,
  a caller could pass `backend` all the way to `hashExecutionProtocol` directly but never through the
  binding — exactly the kind of "value exists at the definition but doesn't survive the next hop"
  failure mode plan section 14.3.F is written to catch.

## 3. Verification

Added to `scripts/solver-experiment-contract-node-test.mjs` (this module's own owning test file, which
previously had zero direct coverage of either function — only incidental coverage via consumer tests):

- determinism sanity check (identical input hashes identically);
- omitted `backend` and explicit `backend: null` produce the same identity (no accidental
  distinction between "not passed" and "explicitly null");
- `direct` and `raced` backends produce different protocol hashes under otherwise identical
  configuration/execution fields;
- no declared backend (`unknown`) is provably distinct from an explicit `direct` declaration — absence
  must never collapse into an assumed-deterministic default;
- `sourceRunBindingFromContract` with different `backend` values produces different `protocolHash`
  values, and its `protocolHash` matches a direct `hashExecutionProtocol(contract, { backend })` call
  with the same backend — proving the parameter is actually threaded through, not silently dropped.

One test I initially wrote was itself wrong and caught during authoring: it asserted that a raced
backend's protocol hash should be identical regardless of the declared `schedulerMode` label, reasoning
that `reproducibilityMode` classifies both as `first-success-race`. That's true of the *derived*
`reproducibilityMode` value, but the hash intentionally also includes the *raw* `schedulerMode` field
alongside it (both are real, independently meaningful facts), so the overall hash correctly still
differs. Removed that incorrect assertion rather than "fixing" working code to match a wrong test.

All 5 existing consumers of `hashExecutionProtocol` (`hint-discovery-process-cli-node-test.mjs`,
`hint-discovery-process-evidence-lib-node-test.mjs` x2, `sweep-publish-node-test.mjs` x2, plus
`sweep-publish.mjs`'s own real call) pass unmodified — none pass `backend` yet, so all default to
`unknown`/`null`, unchanged from before this batch's semantic addition.

`npm run check:types`/`check:types:tests`, full `npx vitest run` (146/1557), and full `npm run test:node`
(180 packages) all green.

## 4. What this does not do

- Does not thread a real `backend` value from any producer yet. `publish-solver-sweep-result.mjs`,
  `hint-discovery-process.mjs`, and `sweep-publish.mjs` all still call these functions without
  `backend`, so their `reproducibilityMode` remains honestly `unknown` until a producer actually knows
  and declares its dispatch backend.
- Does not touch `docs/solver-experiment-result.schema.json` (see section 1 — not needed for this step).
- Does not give `portfolio-solve-sweep.mjs` (the only file that can actually race) a `backend`-aware
  execution-protocol emission — it still only emits the bare `solverRequestProjection`/
  `solverRequestIdentity` pair from an earlier batch, with no full experiment-contract concept to attach
  a protocol hash to at all. Deciding whether it should gain one is real design work reserved for a
  future batch, not a mechanical wiring step.

## 5. Next work

The remaining piece of "integrate raced-backend semantics into the execution-protocol layer" is
deciding, per real producer, whether and how to supply a real `backend` value:
`publish-solver-sweep-result.mjs`/`hint-discovery-process.mjs` most likely declare `'direct'` today
(neither currently supports raced execution); `portfolio-solve-sweep.mjs` would need either its own
lightweight execution-protocol emission or an argument for continuing to omit one. This is genuine
per-producer design work, not mechanical plumbing, and is the natural close of this plan's Phase 2 scope
as currently understood.
