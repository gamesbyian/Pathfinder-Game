# Hint evidence consolidation — Phase 2 identity-layer taxonomy — 001

> **Status:** active
> **Last evidence:** 2026-09-23 — Retained and reconciled as part of the active hint-evidence consolidation implementation.
> **Decision:** Preserve this report as durable implementation/audit evidence; current code and later reconciliation records remain authoritative where they supersede earlier details.
> **Remaining gate:** Apply the current phase-specific validation and closeout gates before treating this report as proof of whole-program completion.


> **Status:** concluded-positive
>
> **Date:** 2026-09-23
>
> **Batch:** 2 of Phase 2 ("identity and durable join-spine consolidation"). Follows
> [`reports/2026-09-23-hint-evidence-phase2-shared-canonical-serialization-001.md`](2026-09-23-hint-evidence-phase2-shared-canonical-serialization-001.md).
>
> **Base commit:** `d9beb32` (this branch's prior Phase 2 batch 1).

## 1. The gap

Plan section 13.2.J is explicit:

> Every canonical SolveOpts field must be classified by one owner as one of: solver-semantic /
> observation-semantic / transport/execution / level-specific/history-derived / non-semantic output/
> control plumbing.

`docs/solver-request-semantics-inventory.json`'s `enforcementStatus.identityClassification` already
*claimed* "all 49 SolveOpts fields now have a source-owned default-semantics statement, identity
layer, and direct/worker/raced support classification" — but no row in the file actually carried an
`identityLayer` field, and no test enforced one. This is exactly the failure mode plan section 14.3.J
warns about: prose asserting a semantic closeout that the mechanical artifact does not back up.
`enforcementStatus.membership` had the same problem in the other direction: it said "verified but not
yet CI-enforced" even though `scripts/solver-request-semantics-inventory-node-test.mjs` (wired into
`test:node` as `test:solver-request-semantics-inventory`) already enforces membership drift — that gate
was built in an earlier session before this plan's batch sequence reached Phase 2, and the status text
was never updated to say so.

## 2. The fix

Added `identityLayer` to every row of `commonSolveOpts` (49 fields) and to both of
`backendRequests.raced.backendSpecificFields` (`overallBudgetMs`, `poolSize`), using the exact
five-value enum from plan section 13.2.J. The mapping is mechanically derived from each row's
pre-existing `semanticClass` through one small lookup table (script discarded after use; the durable
artifact is the resulting per-row `identityLayer` values plus the test that now enforces them), not
hand-classified per field, so it stays traceable and auditable:

| `semanticClass` | `identityLayer` | reasoning |
|---|---|---|
| `execution-budget`, `solver-policy`, `deterministic-budget`, `budget-semantics`, `scheduler-policy`, `solver-budget-policy`, `solver-search-policy` | `solver-semantic` | can affect allocation, ordering, eligibility or result per the bucket's own definition |
| `observer` | `observation-semantic` | every one of these 11 fields is documented at its own definition site as research-only and unable to affect search |
| `execution-control` (`yieldFn`), `test-implementation-substitution` (`attemptSearchForTesting`) | `transport-execution` | these swap *how* execution is dispatched (a cancellation bridge; a whole-function dispatch override), not a search-tuning parameter — `attemptSearchForTesting` is flagged specially below |
| `level-specific-forcing`, `history-derived-level-specific-policy` | `level-specific-history-derived` | matches the bucket's own worked example (a prime attempt) exactly |

One field needed a documented judgment call: `attemptSearchForTesting` (dispatch-substitution, "outcome-
affecting/test-only") could textually fit `solver-semantic` (it can determine the result) or
`transport-execution` (it swaps the entire search mechanism rather than tuning a policy parameter
within it). Classified as `transport-execution` because the inventory's own existing
`identityParticipation` prose ("canonical research evidence must not silently use it") already treats it
as something a solver-semantic default-inclusion rule must not accidentally pick up; filing it under
`solver-semantic` would put it in the default-include set the plan's `defaultRule` describes for the
future request-capsule builder, defeating that existing warning. This choice is recorded here rather
than left implicit so a future reader does not have to re-derive it.

Extended `scripts/solver-request-semantics-inventory-node-test.mjs` to assert every row's
`identityLayer` is a member of the five-value set, for both `commonSolveOpts` and the raced
`backendSpecificFields`. Added two negative-path assertions (`assert.throws`) proving the guard
actually rejects a row with no `identityLayer` and a row with a value outside the taxonomy, rather than
merely happening to pass on today's data (plan section 14.3.H's construction-time-contract discipline:
prove the validator can fail, not only that it currently doesn't).

Corrected the two stale `enforcementStatus` prose fields (`membership`, `phaseMinus1Gate`) to say the
gate is implemented and name the actual test file, and rewrote `identityParticipation` /
`identityClassification` to describe what now actually exists versus what is still outstanding
(the runtime projection/digest builder itself — still not built).

## 3. Naming/vocabulary occupancy check

Searched `docs/naming-and-vocabulary.md` for `identityLayer`, `identity layer`, `identity-layer` — no
occupancy. `identityLayer` is an internal classification field inside an existing docs/ audit JSON, not
a new surfaced type/schema/API name, so this batch does not trigger the fuller change-recipes migration
discipline (no producer/consumer/transport to migrate — nothing currently reads this field besides its
own new test).

## 4. Verification

- `node -e "JSON.parse(...)"` — the edited JSON remains valid.
- `git diff --stat` / manual diff review — confirms the change is exactly one `identityLayer` line
  added per row (49 + 2) plus the `enforcementStatus` prose correction; no reformatting, no accidental
  content loss.
- `node scripts/solver-request-semantics-inventory-node-test.mjs` — passes, including the two new
  negative-path assertions.
- `npm run check:types` — clean.
- `npx vitest run` — 143 files / 1536 tests, all pass (unaffected by this batch; run to confirm no
  cross-contamination from the shared-serialization batch immediately before it).

## 5. What this does not do

- Does not build the canonical request-projection/digest function itself. This batch only makes the
  *input classification* that function must consume mechanically trustworthy (CI-enforced, not prose).
- Does not decide `canonicalDefaultSemantics` resolution as executable code — those 49 default
  descriptions remain prose statements about what the solver's own internal normalization does; turning
  them into an actual effective-value resolver (calling `normalizeAblationConfig`, `legacyMsToWork`, the
  `disableExtraBudgetPasses` override cascade, etc.) is real, separate, larger work belonging to the next
  batch, not this one.
- Does not touch `identityParticipation`'s free-text per-field descriptions — those remain useful
  narrower context alongside the new discrete `identityLayer`, not replaced by it.

## 6. Next batch

Build the actual canonical solver-request projection: for every field classified `solver-semantic`,
resolve its effective value from a real `SolveOpts` object (reusing the solver's own existing
normalization functions rather than reimplementing them), assemble the result into one canonical
projection object, and digest it with `stableStringify()` (this branch's prior batch) plus a Node-only
sha256 wrapper. This is where plan section 13.2's naming-occupancy pass actually matters (the capsule's
own surfaced name), unlike this batch and the one before it.
