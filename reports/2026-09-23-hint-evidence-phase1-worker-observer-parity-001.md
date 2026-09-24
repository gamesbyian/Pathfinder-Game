# Hint evidence consolidation — Phase 1 worker beamFlowCounters/pruneDiagnostics parity — 001

> **Status:** active
> **Last evidence:** 2026-09-23 — Retained and reconciled as part of the active hint-evidence consolidation implementation.
> **Decision:** Preserve this report as durable implementation/audit evidence; current code and later reconciliation records remain authoritative where they supersede earlier details.
> **Remaining gate:** Apply the current phase-specific validation and closeout gates before treating this report as proof of whole-program completion.


> **Status:** concluded-positive
>
> **Date:** 2026-09-23
>
> **Batch:** 5 of the dependency-ordered sequence — Phase 1's worker side-channel parity sub-item
> (plan section "Request and execution identity": "A newly discovered worker seam must be fixed in
> Phase 1: `beamFlowCounters` and `pruneDiagnostics` are mutable plain objects, so the worker accepts
> and structured-clones them, the worker mutates only its private clone, and no updated object is
> returned. Either reject them as direct-only or return an explicit telemetry projection.").
>
> **Base commit:** this branch's prior four batches. No solver search policy/ordering/routing/budgets
> changed.

## 1. The defect

`SolveOpts.beamFlowCounters`/`SolveOpts.pruneDiagnostics` (`modules/solver/orchestration-contracts.ts`)
are caller-supplied mutable plain objects that `orchestration.ts` writes search-count telemetry into
during a solve, by reference, for direct/on-thread callers to read back afterward.

`modules/solver/solver-worker-client.ts::buildWorkerSolveOpts()` forwards every non-function `SolveOpts`
field verbatim into the `postMessage` transport to the browser Web Worker (`modules/solver/worker.js`).
Since these two fields are plain data (no function inside), they passed the existing function-value
rejection check and were silently included. `postMessage`'s structured clone gives the worker its own
**copy**; the worker's `solveLevel()` call mutates that copy, but
`worker-result-serialization.mjs::buildSolveWorkerResult()` only ever serializes the returned
`SolveResult`, never the input `solveOpts` — so the worker-mutated counters were never sent back. A
caller routing a solve through the Web Worker client would see the solve complete successfully with
these fields silently left in their initial (empty) state, with no error and no indication anything was
dropped. `docs/solver-request-semantics-inventory.json` already flagged this exact defect for both
fields (`webWorker: "currently transported as a structured-cloned mutable object, but worker mutations
are not returned to the caller; semantically not a usable side-channel observer"`) as part of Phase 2's
SolveOpts classification work, but had not yet been repaired.

## 2. Why "reject" rather than "return a projection"

Both options were plan-sanctioned. Tracing every current caller of these two fields found none that
route them through the actual broken transport:

- `scripts/search-loss-real-canary.mjs` and other direct research tools call `Solver.solveLevel()`
  on-thread — no worker boundary at all.
- `scripts/level-blind-capability-worker.mjs` runs inside a Node `worker_threads` worker, but creates
  `beamFlowCounters`/`pruneDiagnostics` **locally within that same thread**, passes them into its own
  in-thread `Solver.solveLevel()` call, and reads the **same object reference** back afterward before
  including it in its own return value. That return value crosses back to the parent via the worker
  pool's normal result-message serialization (which *does* include it, since it's part of the outgoing
  result payload, not a separate structured-clone-in/never-returned input side channel). This is
  functionally equivalent to direct execution for this concern and was never actually broken.

With no real caller depending on the broken path, and the plan's own preference for construction-time
contracts (fail loudly) over larger surface changes, rejection was the smaller, correctly-scoped fix.
Returning a projection would require the Web Worker's `RESULT` message to carry the mutated counters
back *and* the client to merge them onto the caller's original object references after the promise
resolves — a real API contract change with no current consumer to validate it against.

## 3. The fix

`buildWorkerSolveOpts()` now throws explicitly (same pattern as its existing function-value rejection)
when `beamFlowCounters` or `pruneDiagnostics` is present, naming the field and explaining why, before
any `postMessage` occurs. `docs/solver-request-semantics-inventory.json`'s `webWorker` entries for both
fields were updated from "currently transported... discarding" to "explicitly rejected... 2026-09-23
fix", since that document is the SolveOpts classification authority Phase 2 already established and
should not describe a state this batch just closed.

## 4. Verification

- Added a regression test (`modules/solver/solver-worker-client.test.ts`) proving both fields throw
  with a message naming the field, and that omitting them (the common/only-current case) is unaffected.
- `npx vitest run modules/solver/solver-worker-client.test.ts` — 6/6 pass.
- `npx vitest run modules/solver/` (the full solver test suite, to catch any indirect dependency on the
  old silent-pass-through behavior) — 667/667 pass across 72 files.
- `node scripts/level-blind-capability-sweep-cli-node-test.mjs` — pass (confirms the Node
  `worker_threads` usage, which is unaffected by this change, still works).
- `node scripts/solver-request-semantics-inventory-node-test.mjs` — still reports "49 SolveOpts fields
  classified" (the inventory's field-membership contract is unaffected; only the `webWorker` support
  description text for these two fields changed).
- `npm run check:types` — clean.
- `git diff docs/solver-request-semantics-inventory.json` — confirmed minimal (exactly the two
  `webWorker` value updates, no reordering/reformatting).

## 5. What this does not do

- Does not change solver search policy, ordering, routing, or budgets — this is a request-transport
  contract fix (fail loudly instead of silently dropping), not a behavior change to any production
  solve.
- Does not add a return-path projection for these fields through the Web Worker transport. If a future
  consumer genuinely needs beam-flow/prune telemetry from a browser-worker-driven solve, that is a new
  feature requiring its own design (worker RESULT schema change + client merge contract), not something
  this defect-repair batch should improvise.
- Does not touch the Node `worker_threads` path (`level-blind-capability-worker.mjs`,
  `scripts/solver-worker-pool.mjs`) or the raced backend (`scripts/solver-parallel/`), both already
  correctly classified/scoped in the inventory and unaffected by this fix.

## 6. Next batch

Remaining Phase 1 items: Firestore evidence-loss containment (the five-hint `slice()` cap in
`approveHintAddition()` and `local_level_hints`' create-only/single-provenance limitation) and the
shared v1-v3 browser/Node decoder boundary (`decodeHintArtifact`/`encodeHintArtifact`). Each remains a
separate batch with its own compatibility owner and validation graph.
