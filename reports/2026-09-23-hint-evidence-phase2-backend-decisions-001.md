# Hint evidence consolidation — Phase 2 per-producer backend decisions — 001

> **Status:** active
> **Last evidence:** 2026-09-23 — Retained and reconciled as part of the active hint-evidence consolidation implementation.
> **Decision:** Preserve this report as durable implementation/audit evidence; current code and later reconciliation records remain authoritative where they supersede earlier details.
> **Remaining gate:** Apply the current phase-specific validation and closeout gates before treating this report as proof of whole-program completion.


> **Status:** concluded-positive
>
> **Date:** 2026-09-23
>
> **Batch:** closes "decide, per real producer, whether and how to supply a real `backend` value" —
> the last open item from
> [`2026-09-23-hint-evidence-phase2-execution-protocol-backend-wiring-001.md`](2026-09-23-hint-evidence-phase2-execution-protocol-backend-wiring-001.md).
>
> **Base commit:** `936dd3c`.

## 1. The decision, per producer

Investigated every real call site that could supply `backend`
(`modules/solver/reproducibility-mode.mjs`) and split them into two groups by whether a *real,
verifiable* signal exists, rather than guessing uniformly:

### Producers with a real, certain signal — wired to a real value

- **`scripts/level-blind-capability-sweep.mjs`**: `backend: 'direct'`, always. This tool has no
  `--race-pool-size` flag and structurally cannot race — its `runWorkerPool` dispatch parallelizes
  *different levels* across Node `worker_threads` for throughput, never races *multiple attempts at the
  same level* for a first-success winner. Each individual level's `solveLevel()` call is exactly as
  deterministic as calling it directly on the main thread, so `'direct'` is a verified fact, not an
  assumption.
- **`scripts/portfolio-solve-sweep.mjs`**: `backend: racePoolSize > 0 ? 'raced' : 'direct'`. This is the
  one currently-maintained producer that can actually race, and it already has ground-truth
  `racePoolSize` at the exact point its canonical dual-write is computed — the same fact its legacy
  `effectiveConfig.engine`/`summary.engine` fields already record, now with a canonical counterpart
  (`backend` + `reproducibilityMode`) using the shared vocabulary.

### Producers with no real signal — deliberately left `unknown`, decision documented in place

- **`scripts/publish-solver-sweep-result.mjs`**: reads only `declaredContract` and `primaryDocument`,
  neither of which records a backend/engine concept. Also confirmed empirically: `grep -rn
  -- "--race-pool-size=" .github/workflows/*.yml` returns zero matches — no maintained workflow
  currently combines racing with this publish path. That absence of a counterexample is not proof for
  any *given* invocation, though, so guessing `'direct'` here would still be fabricating a fact this
  general-purpose publisher does not itself verify.
- **`scripts/hint-discovery-process-evidence-lib.mjs`** (`discoveryProcessEnvelopeFromContract`): joins
  already-produced solver reports to hint provenance; never runs the solver itself and has no backend
  signal available at all.
- **`scripts/sweep-publish.mjs`**: only reads a separately-declared `--contract-file`, which has no
  backend/engine field, and never inspects the primary solver report the failure evidence came from.

Per the plan's own historical-missingness doctrine (section 10.2: "do not infer... and persist it as
fact"), all three now carry an explicit code comment at their `hashExecutionProtocol`/
`sourceRunBindingFromContract` call site recording *why* `backend` is omitted, not just that it is —
so a future reader sees a documented decision, not an accidental gap to re-investigate.

## 2. Implementation

- `level-blind-capability-sweep.mjs` and `portfolio-solve-sweep.mjs`: compute `backend` and
  `reproducibilityMode = classifyReproducibilityMode({ schedulerMode, backend })`; add both to the
  written `summary`, additive alongside every existing field (same dual-write discipline as every prior
  batch in this program).
- `publish-solver-sweep-result.mjs`, `hint-discovery-process-evidence-lib.mjs`, `sweep-publish.mjs`:
  comment-only — no code behavior change, since `backend` already defaulted to `null`/`unknown` before
  this batch. The value was already correct; what was missing was the recorded reasoning.

## 3. Verification

- `level-blind-capability-sweep-cli-node-test.mjs`: new assertions that a real bundled run reports
  `backend: 'direct'` / `reproducibilityMode: 'deterministic-work'`.
- `portfolio-solve-sweep-cli-node-test.mjs`: extended with a **second real bundled invocation** using
  `--race-pool-size=2`, proving the canonical `backend`/`reproducibilityMode` fields actually flip to
  `'raced'`/`'first-success-race'` when racing is genuinely used — not merely that the sequential case
  reports `'direct'`. Cross-checked against the legacy `summary.engine === 'raced'` field as a sanity
  anchor.
- `node --check` and `npm run check:types`/`check:types:tests` — clean.
- Existing test suites for all 5 touched files (`sweep-publish-node-test.mjs`,
  `publish-solver-sweep-result-node-test.mjs`, `hint-discovery-process-evidence-lib-node-test.mjs`,
  `hint-discovery-process-cli-node-test.mjs`, plus the two CLI tests above) — all pass, the three
  comment-only files completely unmodified in behavior.
- Full `npx vitest run` (146 files / 1557 tests) and full `npm run test:node` (180 packages) — all
  green.

## 4. Phase 2 status

This closes every remaining item from the reconciliation report's "next work" list and every
follow-on item those batches themselves raised. Every producer that can supply a real backend fact now
does; every producer that cannot has a recorded reason rather than a silent gap. The plan's Phase 2
exit criterion ("producers, provenance, determinism tooling and sibling evidence resources can name the
same execution semantics through one versioned owner") is met for the execution-protocol/backend
dimension to the extent any current producer has the information to supply.

Remaining Phase 2-adjacent work is genuinely Phase 3 territory per the plan's own dependency ordering
(section 14, Phase 3: "provenance semantics and occurrence lineage... only after identity is stable") —
wiring hint provenance events themselves to carry `solverRequestIdentity`/`solverStageId` so
`effectiveSolverInputIdentityStatus()` can report real reconstructability instead of universal
`missingDimensions`, which requires the bounded-provenance-schema-extension discipline Phase 3 exists to
do carefully, not a mechanical Phase 2 wiring step.
