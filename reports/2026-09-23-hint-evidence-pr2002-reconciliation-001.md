# Hint evidence consolidation — PR #2002 reconciliation and first real local validation — 001

> **Status:** active
> **Last evidence:** 2026-09-23 — Retained and reconciled as part of the active hint-evidence consolidation implementation.
> **Decision:** Preserve this report as durable implementation/audit evidence; current code and later reconciliation records remain authoritative where they supersede earlier details.
> **Remaining gate:** Apply the current phase-specific validation and closeout gates before treating this report as proof of whole-program completion.


> **Status:** concluded-positive
>
> **Date:** 2026-09-23
>
> **Scope:** reconcile the parallel `chatgpt/continue-hint-evidence-consolidation-2026-09-23` branch
> (draft PR #2002, itself absorbing reconciled Codex PRs #2003/#2004) into
> `claude/pathfinder-hint-evidence-consolidation-saeiuo`, run the first real local validation either
> branch had received, and fix everything that surfaced.

## 1. What arrived

PR #2002's branch was a strict linear descendant of this branch's tip at `1019851` (confirmed via
`git merge-base`), adding 60 commits of further Phase 2 work: a shared browser/Node hint-artifact
layout authority (closing PSC-025), the canonical run-wide solver-request projection
(`modules/solver/solver-request-projection.ts`) with its exact-field-parity test against the
identity-layer classification from this branch's own prior batch, a plain-Node digest owner plus a
legacy `effectiveConfig`-vs-canonical dual-read compatibility boundary, a distinct
`hashExecutionProtocol()` execution-protocol identity separated from experiment `configurationHash`,
a canonical bounded `sourceRunBindingFromContract()`, an identity-dialect migration map
(`docs/solver-evidence-identity-dialects.json`), an effective-input reconstructability query surface,
and a mechanical guard (`solver-evidence-identity-guard.mjs`) against reintroducing the
protocol/configuration conflation. Full detail is in that work's own reports, retained verbatim:
`2026-09-23-hint-evidence-artifact-layout-authority-001.md`,
`2026-09-23-hint-evidence-phase2-canonical-solver-request-projection-001.md`,
`2026-09-23-hint-evidence-phase2-identity-table-setting-001.md`,
`2026-09-23-hint-evidence-remaining-mechanical-migration-audit-001.md`,
`2026-09-23-hint-evidence-codex-mechanical-continuation-002.md`.

Every one of those reports was explicit and honest that its authoring environment (a GitHub-only
ChatGPT/Codex session) could not execute the repository locally, so none of this had ever been run
against real Vitest/Node/typecheck before reaching this session.

## 2. First real local run: six real defects found and fixed

Checked out the branch in an isolated worktree and ran the actual validation surfaces every one of
those reports asked a "repo-capable continuation" to run. Six real defects surfaced, none of them
scope changes to what the batch already intended — every fix brings the code into line with what its
own report already claimed was true:

1. **`modules/hint-artifact-layout.mjs`** — six TypeScript errors (`tsc --noEmit`): five implicit-`any`
   parameters and one `Array.prototype.pop()` `string | undefined` case the code assumed was always
   defined. Added JSDoc parameter/return types and a safe fallback.
2. **`modules/dev-corpus.test.ts`** — its `makeLevel()` fixture had no `id` field. The OLD
   `createDefaultHintsSource()` silently built a wrong `"undefined.json"` URL for this case (the test
   never noticed because its fake fetch ignores the URL); the NEW `hintArtifactFileName()` correctly
   throws instead of silently doing that. Same class of "stricter validation exposes a pre-existing
   fixture gap" as this branch's own Phase 1 batch 7 (`decodeHintArtifact`'s throw-on-malformed-input).
   Gave the fixture a realistic persistent id.
3. **`scripts/hint-discovery-process-evidence-lib.mjs`** — `buildHintDiscoveryProcessEvidence()`'s
   destructured options object never captured `runAttempt` at all, so the new `--run-attempt=<n>` CLI
   flag was silently dropped before reaching `sourceRunBindingFromContract()`, even though the CLI
   itself parsed the flag correctly and the report claimed it was wired through. Exactly the
   "prove value transport, not merely field existence" failure mode this whole plan is paranoid about
   (plan section 14.3.F). Threaded the parameter through.
4. **`scripts/hint-discovery-replayability-lib-node-test.mjs`** — asserted that
   `normalizeHistoricalSolverStageId('early-repair-search')` (already the CURRENT canonical stage name)
   rewrites to `'repair-shrink-recovery'`, confusing it with the unrelated `'repair-probe'` legacy
   alias. Fixed the test's input to the actual legacy spelling and corrected the expected output.
5. **`scripts/sweep-publish.mjs`** — the branch's own new `solver-evidence-identity-guard.mjs`
   (designed specifically to catch exactly this regression) correctly found this file still assigning
   `protocolHash` straight from `configurationHash`, the same conflation already fixed in
   `hint-discovery-process-evidence-lib.mjs` earlier in the same batch but missed here. Switched it to
   `hashExecutionProtocol()` and fixed its node test's two hardcoded sentinel-string assertions to
   compute the real expected hash from the same fixture object instead of hardcoding a stale literal.
6. **`docs/solver-research-data-assets.json`** — one asset's `authorities` array used a
   `"path::symbolName"` compound reference, a format no other entry in the entire registry uses and
   that `solver-research-data-assets-lib.mjs`'s validator cannot parse (it treats the whole string as a
   literal file path and fails when that exact path doesn't exist). This single formatting mismatch
   cascaded into three unrelated-looking test failures (`test:research-integration-audit`,
   `test:research-system-inventory`, `test:research-system-consolidation-closeout`) since the latter
   two compose the first. Collapsed to the bare file path, matching every other entry's convention.

After fixing all six: `npx vitest run` (145 files / 1550 tests), `npm run check:types`,
`npm run check:types:tests`, and the full `npm run test:node` aggregate (179 packages) are all green.

## 3. Manual correctness audit of the highest-risk new file

Before trusting `modules/solver/solver-request-projection.ts` on test-passing alone, manually
line-by-line audited its per-field default-resolution against the actual authority
(`modules/solver/stage-budget-core.ts`) for two specific hazards this plan explicitly warns about:

- **Which node-reserve-fraction fields clamp to `[0,1]` and which don't.** Ten of eleven
  `*NodeReserveFraction*Override` fields clamp via `Math.min(1, ...)`; `admissibleOrderNodeReserveFractionOverride`
  is the sole, real exception (no clamp) in the actual solver. Verified the projection's
  `unitFractionOr` (clamped) vs `nonNegativeOr` (unclamped) helper choice matches the real code
  exactly, field by field, including that one exception.
- **Which fields participate in the `disableExtraBudgetPasses` additive-zero cascade.** Exactly nine
  `*BudgetFractionOverride`/`repairLateProbeNodeBudgetOverride` fields use the
  `value ?? (disableExtraBudgetPasses ? 0 : undefined)` pattern in the real solver; every sibling
  `*NodeReserveFraction*Override` field deliberately does not (plan/SolveOpts's own doc comment:
  "does not zero independent reserve-fraction overrides"). Verified the projection's `additiveOr` vs
  plain resolver choice matches exactly, all nine fields.

No discrepancy found. This is a materially correct implementation, not merely one that happens to
pass its own test file's assertions.

## 4. Reconciliation against current `main`

`main` had advanced by 13 commits (`c88461a..23389ff`), entirely an unrelated CI-historical-value-audit
workstream (new workflow, new scripts, no shared files). Merged cleanly with zero conflicts; re-ran the
full verification suite after the merge to confirm the merge itself introduced nothing.

## 5. Outcome

`claude/pathfinder-hint-evidence-consolidation-saeiuo` now contains: this branch's original Phase
0/1/2 batches, PR #2002's 60 commits, this batch's 6-defect fix commit, and current `main` merged in.
Pushed as a fast-forward (the designated branch's tip was already the exact ancestor PR #2002 was
built from, so no rebase was needed).

Per PR #2002's own explicit framing ("the intended eventual destination is back to Claude for
remaining semantic-heavy completion after mechanical validation/cleanup"), that mechanical
validation/cleanup is what this batch performed. PR #2002, #2003, and #2004 are left as-is
(unmerged/closed per their own descriptions); no action was taken on them beyond reading their content.

## 6. Next work

Per the absorbed batches' own "next work" sections (canonical-solver-request-projection-001 and
identity-table-setting-001), the clean next steps are:

1. migrate a representative producer (e.g. `scripts/level-blind-capability-sweep.mjs`) to emit the
   canonical `solverRequestProjection`/`solverRequestIdentity` at its invocation boundary, dual-writing
   alongside its existing legacy `effectiveConfig`/`effectiveConfigDigest` rather than replacing it
   immediately;
2. define the per-level effective-input projection (level revision + forcing + attempt/action +
   actual resolved resource dimensions), building on `effectiveSolverInputIdentityStatus()`;
3. integrate raced-backend pool/wall/first-success semantics into the execution-protocol layer;
4. consolidate the remaining source-run envelope duplicates named in the mechanical-migration-audit's
   duplication table (publisher manifest + `pathfinder-gha-source-run` sidecar is the highest-priority
   one);
5. resolve the reserved TypeScript-runtime-vs-plain-Node bridge question explicitly (that audit's own
   recommendation: bundled producers import the projection directly; plain-Node consumers only
   hash/validate an already-emitted projection through the compatibility helper).
