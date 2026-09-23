# Hint evidence consolidation — Phase 2 shared canonical serialization primitive — 001

> **Status:** concluded-positive
>
> **Date:** 2026-09-23
>
> **Batch:** 1 of Phase 2 ("identity and durable join-spine consolidation") in the dependency-ordered
> sequence from
> [`docs/hint-evidence-execution-identity-storage-consolidation-plan.md`](../hint-evidence-execution-identity-storage-consolidation-plan.md).
> Phase 1 closed in the prior batch
> ([`reports/2026-09-23-hint-evidence-phase1-shared-decoder-boundary-001.md`](2026-09-23-hint-evidence-phase1-shared-decoder-boundary-001.md)).
>
> **Base commit:** this branch's prior seven Phase-1 batches (head `34c64ac` at start of this batch).

## 1. Why this is the first Phase 2 batch, not the request capsule itself

Phase 2's own exit criterion and section 3.2 both call for a versioned **canonical solver-request
capsule** with a digest derived from "shared stable/canonical serialization instead of producer-local
`stableStringify()` implementations." Auditing the repository for existing `stableStringify()`
implementations before writing a seventh one (section 14.3.A: split into the smallest batch with one
compatibility owner) found six **byte-for-byte identical** copies of the same recursive
key-sorting algorithm, independently maintained in:

- `modules/domain/hint-runtime.mjs` (`provenanceEventIdentity()`'s serialization step);
- `scripts/check-effective-config-agreement.mjs`;
- `scripts/combine-solver-sweep-reports.mjs`;
- `scripts/hint-determinism-audit-lib.mjs`;
- `scripts/level-blind-capability-sweep.mjs`;
- `scripts/portfolio-solve-sweep.mjs`.

This is exactly the drift class section 3.2 warns about, already realized six times over, and it sits
directly upstream of the request-capsule digest this phase needs to build next. Consolidating it first
gives the capsule one existing, already-proven owner instead of introducing a seventh copy or coupling
the new capsule to one of the existing producer-local copies arbitrarily.

The already-existing `phaseMinus1Gate` validator (`scripts/solver-request-semantics-inventory-node-test.mjs`,
wired into `test:node` as `test:solver-request-semantics-inventory`) was checked and found already
implemented and green — it was built in an earlier session before this plan's dependency-ordered batch
sequence reached Phase 2. No further gate work was needed this batch.

## 2. Naming/vocabulary occupancy check (plan section 13.2)

Searched `docs/naming-and-vocabulary.md` for `stableStringify`, `canonical-json`, `canonicalJson`, and
`solver-request` — no occupancy. `stableStringify` is the name every one of the six existing
implementations already used; reusing it exactly is a zero-rename extraction, not a new name needing a
occupancy classification. No new durable type, schema key, or public identity name is introduced by
this batch (this is comment-worthy: the actual request-capsule/execution-protocol/source-run-binding
names Phase 2 still owes a full occupancy pass before they are introduced).

## 3. The fix

Added `modules/canonical-json.mjs`, a plain `.mjs` module (no `.ts` wrapper — no current consumer needs
typed import, and no consumer has been designed yet that would; adding one now would be premature) that
exports one function, `stableStringify(value)`, with the exact algorithm all six prior copies shared.

Placement rationale:

- Plain `.mjs`, not `.ts`, because two of the six consumers (`scripts/check-effective-config-agreement.mjs`,
  `scripts/combine-solver-sweep-reports.mjs`) are invoked directly via plain `node` (not `tsx`), and Node
  22 cannot import a `.ts` module without a type-stripping flag this repository does not enable. A `.mjs`
  module loads identically under plain `node`, `tsx`, and the browser bundle — this repo's real topology
  (plan section 14.3.D) for reaching this exact algorithm today.
- Directly under `modules/` (not `modules/domain/`), mirroring `modules/deep-clone.ts`: a small,
  domain-agnostic runtime utility, not a hint/level/solver semantic concept. `modules/domain/` is
  reserved for game-domain concepts (level, hint, geometry); generic serialization infrastructure does
  not belong there.
- `modules/` rather than `scripts/`, because `modules/domain/hint-runtime.mjs` is loaded by the browser
  bundle and must not depend on anything under `scripts/` (Node-only tooling, potentially pulling in
  `fs`/`child_process`). `scripts/*.mjs` already freely imports from `modules/` (confirmed via existing
  imports such as `../modules/solver/ablation-config.js`), so the dependency direction is safe only this
  way round.

All six call sites were migrated to `import { stableStringify } from '<relative path to>/canonical-json.mjs'`
and their local copies deleted. `scripts/check-effective-config-agreement-node-test.mjs` keeps its own
independent copy deliberately — it is a test fixture verifying the production implementation from
outside, not a producer, and collapsing it into the shared owner would remove the independent
cross-check.

The sha256-hex digest wrapper (`createHash('sha256').update(stableStringify(x)).digest('hex')`) used by
four of the six producers was **not** extracted into `canonical-json.mjs` in this batch: `node:crypto`
is not browser-safe, so a digest helper cannot live beside `stableStringify` in a browser-loaded module.
Each producer's own `createHash('sha256')...` call site is unchanged; only the `stableStringify` step
they all fed it moved to the shared owner. A Node-only digest helper is deferred to the batch that
actually builds the request-capsule digest, so it is designed for that one real consumer rather than
speculatively now.

## 4. Verification

This is a zero-behavior-change extraction (identical algorithm, confirmed identical by diffing all six
original bodies against each other and against the new shared copy before deleting them), so
verification is about proving nothing downstream silently changed:

- `node --check` on all seven touched/created files: clean.
- `npm run check:types`: clean.
- `npx vitest run`: **143 test files, 1536 tests, all pass** (covers `modules/domain/hint-types.test.ts`,
  `modules/domain/hint-runtime-semantic-dedupe.test.ts`, and every other consumer of
  `provenanceEventIdentity()`/`hintPathSignature`-adjacent identity behavior).
- `npm run test:node` (the full ~180-script aggregate, including every node-test that exercises one of
  the six touched producers): **all pass**, specifically:
  - `test:effective-config-agreement` (9/9) — recomputes and compares digests, so an algorithm change
    would have failed this immediately;
  - `test:combine-solver-sweep-reports` (20/20) — includes historical-provenance and cross-run
    reconciliation cases that depend on stable digest equality;
  - `test:hint-provenance-identity` (8/8) — exercises `provenanceEventIdentity()` directly, including a
    reversed-key-order case that specifically defeats a naive (non-key-sorting) implementation;
  - `test:level-blind-capability-sweep-cli` — runs the real CLI through `scripts/run-bundled.mjs` (the
    actual maintained bundler execution topology every workflow uses, not plain `node`; plan section
    14.3.D) against a real solvable fixture level and asserts on the produced report, proving the moved
    code executes correctly under the bundled transport, not only under direct `node`/`tsx` import;
  - `test:portfolio-solve-sweep-lib` (22/22).
- Two `test:node` entries (`test:research-query`, `test:research-system-query`) failed while this
  change was still uncommitted, both on the same cause: `research-query.mjs --compare-system-ref=HEAD`
  diffs the live working tree's derived `sharedFailureModes` dependency-fan-in index (a live-computed
  view of which files share which helper, not a hand-maintained document) against `HEAD`, and this
  batch's file changes are real, intentional changes to that dependency graph (six consumers of one
  duplicated algorithm collapsing to six consumers of one shared module). Confirmed this is not a
  regression by running the identical check against the pre-batch commit with `git stash` (returns zero
  diff, as expected) — the check is designed to run against a committed tree, not mid-edit against
  itself. Both pass again once this batch's changes are committed (HEAD now matches the working tree).

## 5. What this does not do

- Does not build the canonical solver-request capsule/projection/digest itself (plan section 3.2). This
  batch only removes the "six divergent stableStringify copies" obstacle that section 3.2 explicitly
  names as something the capsule must not add a seventh instance of.
- Does not touch `docs/solver-request-semantics-inventory.json` or its already-green
  `phaseMinus1Gate` membership-drift test — that classification work and its enforcement were already
  complete before this batch started.
- Does not introduce any new durable identity/schema/type name, so plan section 13.2's fuller
  occupancy-check discipline (naming disclaimer smell-test, change-recipes migration steps) is deferred
  to the batch that actually names the request capsule, execution protocol, and source-run binding.
- Does not extract a shared sha256-digest helper (see section 3 above) — deferred to the batch with a
  real consumer for it.

## 6. Next batch

Build the canonical, versioned solver-request capsule/projection over the already-classified 49-field
`SolveOpts` inventory (`docs/solver-request-semantics-inventory.json`), using `stableStringify()` from
this batch's shared owner for its digest, per plan section 3.2. That batch owes its own full
naming/vocabulary occupancy pass (section 13.2) before surfacing a capsule type/field name, since unlike
this batch it does introduce new durable identity vocabulary.
