# Hint evidence consolidation — Phase 1 shared browser/Node hint-artifact decoder — 001

> **Status:** active
> **Last evidence:** 2026-09-23 — Retained and reconciled as part of the active hint-evidence consolidation implementation.
> **Decision:** Preserve this report as durable implementation/audit evidence; current code and later reconciliation records remain authoritative where they supersede earlier details.
> **Remaining gate:** Apply the current phase-specific validation and closeout gates before treating this report as proof of whole-program completion.


> **Status:** concluded-positive
>
> **Date:** 2026-09-23
>
> **Batch:** 7 of the dependency-ordered sequence — Phase 1's last remaining item: "introduce the
> shared browser/Node v1-v3 semantic decoder boundary now, without v4 encoding" (plan section 6.1,
> "Shared codec"). This closes Phase 1.
>
> **Base commit:** this branch's prior six batches.

## 1. The defect

`scripts/level-data-io.mjs` (Node) and `modules/data-asset-loaders.ts` (browser) each implemented
their own hint-artifact decode logic instead of sharing one. They had actually drifted:

- Node's `parseHintFileContents()` handled four shapes: bare path array; `{hints: paths[]}`;
  `{hints: paths[], hintMetadata: [...]}` (the transitional sibling-array shape, reconstructing
  provenance from `hintMetadata[i]`); and canonical `{schemaVersion, hints: Hint[]}` (via
  `upgradeLegacyHints`).
- Browser's `createDefaultHintsSource()` only handled two: `upgradeLegacyHints(Array.isArray(parsed) ?
  parsed : parsed?.hints)` — meaning a hint file in the transitional `hintMetadata` shape would have
  its `hints` bare-path array picked up but its parallel `hintMetadata` array silently ignored, losing
  all provenance for every one of that file's hints.

This is exactly what the plan's section 2.5 ("Browser and Node readers currently differ") predicted
would become a real problem once any compact/interned storage work began: two independently-maintained
decoders cannot both single-source-of-truth what "a hint artifact" means. No currently-committed file
uses the `hintMetadata` shape today (verified: zero matches across `data/hints`, `data/stress/hints`,
`data/stress/hints-random`), so this was a real, provable, but presently-dormant divergence rather than
an active data-loss incident — precisely the kind of seam the plan wants closed *before* it can bite,
not after.

## 2. The fix

Added one shared function, `decodeHintArtifact(parsed) -> Hint[]`, to
`modules/domain/hint-runtime.mjs` (re-exported through `modules/domain/hint-types.ts`, the same
plain-JS-runtime/typed-wrapper pattern every other shared provenance helper in this codebase already
uses). It is the union of what both environments previously implemented separately: bare array,
`{hints}`, `{hints, hintMetadata}`, and canonical `{schemaVersion, hints}` — with a clear thrown error
for anything else, rather than a silent empty-array fallback.

- `scripts/level-data-io.mjs::parseHintFileContents()` now delegates to `decodeHintArtifact()`,
  catching and rethrowing with its file-path-specific error message (verified unchanged: still reports
  `<path> must contain a JSON array of hint paths or an object with a hints array`).
- `modules/data-asset-loaders.ts::createDefaultHintsSource()` now calls `decodeHintArtifact()` directly
  instead of its own narrower two-shape logic.

`encodeHintArtifact()` (the plan's paired write-side name) was **not** added in this batch: there is no
current browser write path for canonical hint artifacts to unify against, and the Node-side writer
(`stringifyHints`/`writeLevelCorpusDocumentWithHints`) is already single-owner and v3-only. Introducing
that name now, before physical schema v4 exists to actually need a shared encode boundary, would be
premature naming for no current consumer — deferred to Phase 8.

## 3. A deliberate behavior change: fail loud on genuinely malformed content

The old browser decoder never threw: an unrecognized shape silently resolved to `[]` (via
`upgradeLegacyHints(undefined)`'s existing `!Array.isArray(raw) -> []` guard). `decodeHintArtifact()`
throws instead. This is intentional, not incidental: a hint file that fetches successfully but doesn't
parse into any recognized shape is a genuine data-corruption/anomaly signal, and silently reporting "no
hints" for it hides that from every consumer. Traced every real call site of `data.getHints()`
(`modules/engine/level-flow.ts`, `modules/engine/win-controller.ts`, `modules/input/
submission-controller.ts`) and confirmed each already wraps its call in `try`/`catch` with
`reportError(...)` — this codebase's established pattern for exactly this kind of recoverable,
reported failure. No call site could crash the app; a genuinely malformed hint file now surfaces as a
reported error instead of a silently-empty hint list.

This surfaced one real test-fixture gap: `modules/dev-corpus.test.ts`'s `fakeFetch()` helper served
`{ levels }` for *every* fetch, including the per-level hints fetch, which the old decoder tolerated by
accident (no `.hints` key -> silent `[]`) and the new one correctly rejects. Fixed the fixture to serve
`{ levels, hints: [] }`, which is what a real "no hints for this level" response actually looks like
and keeps the test's actual intent (stress corpus must not merge Firestore local-level hints) valid.

## 4. Verification

- Added `decodeHintArtifact` regression tests to `modules/domain/hint-types.test.ts`: all four
  recognized shapes decode correctly (including the transitional `hintMetadata` shape actually
  reconstructing provenance, the specific divergence this batch fixes), and two malformed inputs
  (`{levels: []}`, `null`) throw the expected clear error instead of resolving silently.
- `npm run check:types` and `npm run check:types:tests` — both clean.
- **Full repository test suite**: `npx vitest run` — **143 test files, 1536 tests, all pass** (after
  fixing the one real fixture gap `dev-corpus.test.ts` exposed).
- `npm run test:hint-io-facade-guard` — still green.
- `node scripts/hint-provenance-identity-node-test.mjs` and a manual `parseHintFileContents()` smoke
  check confirmed the Node-side file-path error-message contract is unchanged for real callers
  (`scripts/migrate-hint-schema-v2.mjs`, `scripts/merge-hint-artifacts.mjs`).
- `git status`/`git diff` confirms no canonical hint/level data was touched — only the shared decoder,
  its two call sites, and two test files.

## 5. What this does not do

- Does not add physical schema v4 dispatch. `decodeHintArtifact()` is v1-v3 only, matching the plan's
  explicit Phase 1 scope ("without v4 encoding"); v4 dispatch is a Phase 8 item once the format exists.
- Does not add `encodeHintArtifact()` (see §2 above) — deferred until a real write-side consumer needs
  it.
- Does not change the corpus-to-hint-directory layout authority split (PSC-025, `hintsDirFor()` vs
  `modules/dev-corpus.ts`'s `basePath`/`hintsDirName`) that the plan's section D and the
  pre-implementation audit already flagged as architecturally closed-but-pending-implementation. That
  remains open for its own future batch.

## 6. Phase 1 status

This closes every Phase 1 sub-item this plan's continuation audit named as a current, concrete defect:
stale I/O facade migration (batch 2), historical missingness laundering (batch 3), the July-11
synthetic-`foundAt` cohort (batch 4), worker observer parity (batch 5), Firestore evidence-loss
containment (batch 6), and the shared decoder boundary (this batch). Per the plan's exit criteria for
Phase 1 ("all maintained current reads/writes pass through honest semantic ingress/mutation boundaries,
and existing storage paths fail explicitly rather than silently destroying evidence"), that condition
is now met for every concretely-identified seam.

## 7. Next phase

Phase 2 (identity and durable join-spine consolidation) is next in the dependency-ordered sequence: the
already-complete 49-field `SolveOpts` classification (`docs/solver-request-semantics-inventory.json`)
needs to become an actual canonical solver-request capsule/digest, plus the execution-protocol and
bounded source-run-binding identities the plan's section 3 describes. This is a substantially larger,
new-identity-introducing batch that needs its own naming/vocabulary-occupancy pass per the plan's
section 13.2 guard, and should not be started as a continuation of this report.
