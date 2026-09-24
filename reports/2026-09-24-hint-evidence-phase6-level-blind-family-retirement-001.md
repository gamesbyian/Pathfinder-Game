# Hint evidence consolidation — Phase 6 level-blind family real canary — 001

> **Status:** concluded-positive (parity proven; direct-route retirement decision deferred — see
> section 5)
>
> **Date:** 2026-09-24
>
> **Batch:** the plan's "choose the first ordinary solver family for Phase-6 parity (prefer a small
> artifact-sufficient level-blind family)" step, continuing the real dual-path canary discipline from
> [`2026-09-24-hint-evidence-phase5-6-dual-path-canaries-001.md`](2026-09-24-hint-evidence-phase5-6-dual-path-canaries-001.md).
> Also fixes a real bug found via this canary, following the same evidence-first standard.
>
> **Base commit:** `86e0cf6`.

## 1. Candidate family and why

`docs/hint-evidence-consolidation-inventory.json`'s workflow table shows `solver-stress-refresh.yml`
("Solver stress-corpus refresh (level-blind capability)") uses `scripts/level-blind-capability-sweep.mjs`
with `--save-hints` (a real direct-write route) AND already routes through the central harvest job
(`harvest-solver-evidence.yml`'s trigger list). The exact same producer script, run WITHOUT
`--save-hints`, already backs three fully artifact-only, already-centralized workflows
(`solver-level-blind-targeted-sweep.yml`, `solver-routing-regime-sample-ab.yml`, and the method-probe/
technique-census family), each reconstructed by `scripts/harvest-level-blind-report-hints.mjs` with no
direct writer at all. Since `level-blind-capability-sweep.mjs`'s report schema is identical regardless of
whether `--save-hints` was passed, and this session's own earlier Phase 2 work already added the
canonical execution capsule to every report this producer emits (`"artifactSufficientForFutureSemanticHint":
"yes after execution capsule is added"` in the inventory — a condition this session already met weeks
before this batch), `solver-stress-refresh.yml` is the natural first "ordinary" (non-specialist) family
to validate for retirement: it is a level-blind production sweep, its report is already sufficient, and
a working central reconstruction path already exists for the identical producer.

## 2. Real canary and a second real bug

Ran `scripts/level-blind-capability-sweep.mjs` locally (`--corpus=data/stress/stress-levels.json
--levels=pos:1-3 --budget-ms=10000 --save-hints`, no explicit `--work-budget`/`--node-budget` override —
the ordinary case), a real solve of 3 real stress-corpus levels (S00001, S00028, S00030; all `SOLVED
refereeValid=true`). Reverted the direct write, staged the resulting report, and ran
`scripts/harvest-level-blind-report-hints.mjs` against it. Path-level parity was exact (721/479/454
paths respectively, zero divergence), but comparing every `solver`/`search`/`context` field on the three
rediscovered (already-known-path) provenance entries found:

- **A real, systematic bug**: `harvest-level-blind-report-hints.mjs` built its synthetic result's
  `workBudget` from `summary.workBudget`, which only echoes an EXPLICIT `--work-budget`/`--node-budget`
  CLI override. When neither is passed (the ordinary case, exactly this canary's run), the solver still
  derives and uses a real, non-null work budget internally
  (`legacyMsToWork(timeBudgetMs, MIN_ATTEMPT_WORK)`), and the direct-write route's real `SolveResult`
  carries that real value (`33500000` in this run) — but `summary.workBudget` stays `null`, so the
  central adapter silently reconstructed `search.workBudget: null` on every ordinary run, confirmed on
  all three levels before the fix. **Fixed**: prefer
  `summary.solverRequestProjection?.resourceEnvelope?.baseWorkBudget` (this session's own earlier Phase 2
  canonical projection work), which always resolves the real effective value whether explicit or
  derived, falling back to the legacy `summary.workBudget` only if the projection is absent. This is a
  direct, concrete demonstration that the canonical projection work done weeks earlier in this program
  is not just a parallel identity field — it is the thing that makes correct central reconstruction
  possible in exactly the case (no explicit override) that is the ordinary, common path.
- Re-verified after the fix: zero mismatches across all three levels' full `solver`/`search`/`context`
  field sets, and reharvest idempotency (`0 new hint/provenance record change(s)` on a second run against
  the same staged report).

As with the prior canary, every fake run-id occurrence record used to prove reharvest idempotency was
discarded; the final committed state uses only the real direct-write route's own output for these three
levels (no fabricated run id reached the corpus).

## 3. A naming-policy defect found and fixed in the prior batch's own commit

Running `npm run check:audit-artifacts` in this batch (which only inspects already-**tracked** files via
`git ls-files`, unlike a pre-commit check against the working tree) caught that the prior batch's commit
(`86e0cf6`) had already committed `logs/solver-workflow/2026-09-24T00-59-46Z-local.json`... no —
specifically `2026-09-24T01-07-22Z-local.json`, whose `-local` suffix violates this repository's own
tracked-artifact naming policy (`YYYY-MM-DDTHH-MM-SSZ-<sha>.json`, hex-only suffix): `analyze-solver-
diagnostics.mjs`'s `getCommitSha()`-equivalent fallback writes `'local'` when no real `GITHUB_SHA`/
`AUDIT_GIT_SHA` is available, which is fine for the file's own JSON content but not for a name meant to
be committed. The check silently passed when originally run pre-commit (an untracked file isn't visible
to `git ls-files`), so this went unnoticed until this batch's post-commit re-run. Fixed by `git mv`-ing
the file to `2026-09-24T01-07-22Z-43f48be57920.json` (the real commit SHA the artifact's own `commitSha`
field already recorded, truncated to the same 12-hex-character convention the repo's existing snapshots
use). Noted for future local canaries: check `check:audit-artifacts` against the tracked (post-`git add`)
state, not just the working tree, before committing any `logs/solver-workflow/` artifact captured
outside real GHA.

## 4. New regression coverage

`scripts/harvest-level-blind-report-hints.mjs` had **zero** dedicated test file and no
`test:harvest-level-blind-report-hints` script entry at all — its only indirect coverage
(`harvest-level-blind-selection-manifest-node-test.mjs`) exercises exclusively unsolved rows (`ok:
false`), the same class of gap already found in the CP-SAT/diagnostics adapters' own pre-existing tests.
Added `scripts/harvest-level-blind-report-hints-node-test.mjs`: a real-row fixture using an
already-committed stress-corpus level and one of its real already-known winning paths, with no explicit
`workBudget`/`nodeBudget` override (the exact case that was broken) and a real `solverRequestProjection`
capsule, asserting the reconstructed provenance's `search.workBudget`/`nodesExpanded`/
`cumulativeNodesExpanded`/`workSpent` and `occurrences[0].runId` all land correctly. Verified the test
actually catches the original bug (temporarily reverted the fix, confirmed the test fails with the exact
`null` mismatch, restored the fix, confirmed it passes). Wired into `package.json`'s `test:node`
aggregate. This test snapshots and restores the real tracked hint file it mutates by file content, and
passes an explicit `--selection-manifest-out` into its own temp directory so the harvester's default
`reports/stress/hint-harvest-selection/run-<id>.json` side-output never leaks into the working tree.

## 5. Verification

- `npm run check:types` / `check:types:tests` — clean.
- `npx vitest run` — 146 files / 1,580 tests, all pass (unchanged; new test is a node-test).
- `npm run test:node` — 196 packages, all pass, including the new
  `test:harvest-level-blind-report-hints`. (Two packages —`test:research-query`/
  `test:research-system-query`— failed when run against the uncommitted working tree, comparing it
  against a stale `HEAD` via `--compare-ref=HEAD`; both pass once this batch is committed, the same
  false-failure pattern already documented in the PR #2011 reconciliation report.)
- `npm run check:workflow-actions` — passes.
- `npm run check:audit-artifacts` — passes after the naming fix in section 3.
- `node scripts/stress/hint-occurrence-acceptance-audit.mjs` — `"acceptance": "pass"`, zero violations.

## 6. What this batch does not do — the retirement decision itself is deferred

This batch proves the parity gate `solver-stress-refresh.yml` would need to retire its direct
`--save-hints` route, but **does not remove that flag or otherwise modify `.github/workflows/solver-
stress-refresh.yml`**. Reasons for deferring the actual retirement rather than completing it in this
batch:

- The plan's own gate requires reharvest idempotency AND parity, both now proven — but only against a
  3-level, 10-second-budget local slice, not the workflow's real shape (20 shards × the full stress
  corpus, hours of real budget). A single small local canary is strong evidence the reconstruction LOGIC
  is correct; it is not the same as observing the real, full-scale workflow's own shard/combine/commit
  choreography still converges correctly once `--save-hints` is removed from all 20 shards at once.
- Removing `--save-hints` from a real, currently-relied-upon production workflow is a change to live
  operational infrastructure with a blast radius beyond this branch (every future dispatch of that
  workflow), which this program's own discipline ("Do not count a direct-route deletion as progress
  unless the real parity evidence exists," "keep batches small with one compatibility owner") argues
  against bundling into the same batch as the bug-fix and parity proof that justifies it.
- The harvester bug just fixed in section 2 was found precisely because this batch tested for real
  rather than assuming the existing central-adapter code was already correct; the same caution argues
  for observing at least one real full-scale `solver-stress-refresh.yml` GHA run under the FIXED
  harvester (dual-path, `--save-hints` still present) before trusting it as the sole route.

## 7. Next work

1. Trigger (or wait for) one real, full-scale `solver-stress-refresh.yml` GHA run with the harvester fix
   from this batch in place; confirm the central harvester's shadow reconstruction matches the direct
   route across the whole run via `hint-ingestion-shadow-parity.mjs` (a `--family` value for level-blind
   families does not yet exist in that gate script and would need adding, or an equivalent ad hoc
   comparison).
2. Only after that real full-scale confirmation, remove `--save-hints` from
   `solver-stress-refresh.yml`'s shard invocations and rely on the central harvester alone, then repeat
   for `solver-production-replay-baseline.yml`/`solver-highbudget-unsolved-sweep.yml` (both still direct
   + report, per the same inventory table) once each has its own real-scale confirmation.
3. Continue the plan: Phase 7 (real historical enrichment execution), Phase 8 (v4 codec), Phase 10
   (level cleanup).
