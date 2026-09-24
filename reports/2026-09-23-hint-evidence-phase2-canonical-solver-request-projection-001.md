# Hint evidence consolidation — Phase 2 canonical solver-request projection — 001

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
> **Base ancestry:** exact descendant of Claude's `claude/pathfinder-hint-evidence-consolidation-saeiuo`.

## Purpose

Phase 2 requires a versioned canonical solver-request identity without collapsing request semantics,
per-level derived inputs, backend execution behavior, reproducibility, source run, and experiment
population into one generic "config" hash.

Claude completed the 49-field SolveOpts identity-layer classification and the shared canonical JSON
serializer, but stopped immediately before building the request projection.

This batch implements that next layer.

## Canonical owner

Added `modules/solver/solver-request-projection.ts`.

It owns the **run-wide Pathfinder solver request projection** only.

The projection:

- is explicitly schema-versioned;
- consumes exactly the SolveOpts fields classified `solver-semantic` in
  `docs/solver-request-semantics-inventory.json`;
- normalizes time/work/node request semantics;
- expands sparse/null ablation input against the canonical feature registry/default polarity;
- preserves canonical scheduler mode;
- normalizes static-portfolio technique identities/caps;
- normalizes the historical latency-portfolio scheduler into deterministic set arrays;
- resolves the existing additive-budget convenience cascade;
- normalizes retry/reserve/search-policy defaults where those defaults are genuinely run-wide;
- emits a deterministic canonical string through the shared `stableStringify()` owner.

A focused test reads the machine inventory and requires
`SOLVER_REQUEST_SEMANTIC_FIELDS` to equal the current `solver-semantic` field set exactly. A new
SolveOpts field therefore cannot silently escape or enter request identity without updating the
classification authority and the projection together.

## Deliberate exclusions

This projection does **not** contain:

- observer-only fields;
- worker/test transport substitutions;
- `forcedFirstStepKey`;
- `forcedPortalExitKey`;
- `primeAttempt`;
- raced `poolSize` / `overallBudgetMs`;
- immutable solver revision;
- source run;
- population/corpus identity;
- per-level config counts, eligibility, derived node ceilings, or winning attempt identity.

Those belong to later layers:

- level/history-derived forcing and resolved per-level resource behavior -> effective-input/evidence identity;
- raced pool/wall/first-success semantics -> execution/reproducibility protocol;
- commit SHA -> immutable solver ref;
- workflow/run/artifact identity -> source-run binding.

This separation is intentional. A run-wide request hash must not pretend that a value whose meaning is
only known after level-specific routing/config construction has already been resolved.

## Default normalization

The implementation deliberately makes omitted and explicit canonical defaults compare equal where the
runtime owner establishes that equivalence. Examples include:

- default 30,000 ms wall request;
- legacy-ms-derived base work when explicit base work is absent;
- production scheduler mode;
- complete production-default ablation polarity;
- retry budget/reserve constants;
- `disableExtraBudgetPasses`'s effective additive-zero cascade;
- static-portfolio per-attempt wall-safety default;
- legacy-latency scheduler default definition;
- repair-late multi-seed default count.

The main-search late reserve config-count is represented at the **request** layer before per-level
`mainConfigsCount` clamping. The opt-in must-cross reserve widening flag changes that run-wide
requested default from 5 to 6; later effective-input identity must record the actual per-level clamp.

## Existing protocol/configuration identity defect found and fixed

While mapping the existing identity dialects, this batch confirmed that
`scripts/hint-discovery-process-evidence-lib.mjs` wrote:

- `protocolHash = experiment.configurationHash`; and
- `configurationHash = experiment.configurationHash`.

That collapsed protocol and configuration identity.

Added `hashExecutionProtocol()` to the experiment-contract authority. Its v1 projection includes:

- configuration identity;
- arm identity when applicable;
- level-blind/history-aware semantics;
- historical inputs;
- reproducibility expectation;
- producer family;
- scheduler mode;
- declared node/work/wall limits and binding semantics.

It deliberately excludes solver revision and source run because those are separate identity layers.

Hint-discovery-process evidence now uses the real protocol hash. Regression coverage proves that two
contracts with the same configuration hash but different execution semantics produce different
protocol hashes.

## Other cleanup

The SolveOpts inventory now records the request-projection implementation and marks Claude's worker
mutable-observer side-channel finding as resolved: browser worker ingress explicitly rejects those
unsupported mutable telemetry objects.

## Tests added/changed

- `modules/solver/solver-request-projection.test.ts`
  - exact field-set parity with the machine inventory;
  - omitted vs explicit production-default equality;
  - observer and level/history exclusions;
  - sparse ablation default preservation;
  - additive-disable cascade normalization;
  - explicit per-tier override precedence;
  - must-cross reserve-widen request semantics;
  - static-portfolio canonicalization;
  - deterministic legacy-latency set ordering;
  - fail-closed scheduler validation.
- `scripts/hint-discovery-process-evidence-lib-node-test.mjs`
  - protocol/configuration separation;
  - execution-semantic protocol sensitivity.

## Validation status

This GitHub-only session cannot execute the repository. The implementation is committed but **not
claimed green**.

A repo-capable continuation should run at minimum:

- `npx vitest run modules/solver/solver-request-projection.test.ts modules/hint-artifact-layout.test.ts modules/dev-corpus.test.ts`
- `node scripts/hint-discovery-process-evidence-lib-node-test.mjs`
- `node scripts/solver-request-semantics-inventory-node-test.mjs`
- `npm run check:types`
- `npm run check:types:tests`
- the ordinary Node/fast validation floor before integration.

Any failure revealing that a "run-wide" normalized field actually depends on per-level execution
state should move that field/result to the effective-input layer instead of being papered over in the
projection.

## Next work

The clean next Phase-2 sequence is:

1. validate/reconcile this branch against current `main`;
2. add a Node digest adapter and migrate representative producers from ad-hoc
   `effectiveConfigDigest` to the canonical request projection while retaining historical readers;
3. define the per-level effective-input projection using level revision + forcing + attempt/action +
   actual resolved resource dimensions;
4. integrate backend/reproducibility semantics into the execution-protocol layer;
5. consolidate source-run binding/extractors;
6. expose reconstructability/missing-dimension status through query surfaces before broad producer
   migration.
