# Hint evidence consolidation — PR #2011 reconciliation — 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-24 — reconciled and validated PR #2011's Phase 4/5/6-plumbing/Phase-9 work into this branch by actually running it, not by trusting its own description.
> **Decision:** accept the incoming branch's work as-is on the strength of the passing automated floor plus a targeted correctness spot-check.
> **Remaining gate:** a real bounded CP-SAT workflow run, the published_levels PSC-029 half, durable solver-stage identity, and real Phase 7 execution.
>
> **Date:** 2026-09-24
>
> **Batch:** absorbs `chatgpt/hint-consolidation-phase4-6-table-setting-2026-09-23` (PR #2011) into
> this branch, per that PR's own explicit instruction ("Do not merge this into main independently.
> Absorb/reconcile it into the Claude branch, validate there, and continue the plan from that
> combined state"). Same posture as the earlier PR #2002 reconciliation this session: the authoring
> environment could not execute the repo, so every claim here is validated by actually running it,
> not by trusting the PR's own description.
>
> **Base commit (this branch):** `8af64ca`. **PR head:** `d87fdc5`. **Merge base:** `27f4ee7`.

## 1. Scope of the incoming branch

86 files changed, +5,794/-153, 151 commits. Per its own description, it advances Phase 0 (a
determinism-collision rescue amendment), Phase 4 (determinism-audit identity distinctions,
reconstructability execution/occurrence coverage, corpus-scale occurrence-acceptance audit), Phase 5
(a canonical versioned hint-ingestion receipt across all three import lanes), a new CP-SAT central
specialist adapter, Phase 6 plumbing (source-run-attempt threading, shared receipts across lanes),
Phase 9 (a Vite-time runtime hint projection that strips provenance-heavy trees from the shipped
bundle into path-only artifacts), and a read-only Phase 7 historical-enrichment dry-run planner. It
explicitly left Firestore/GHA bounded occurrence persistence, durable solver-stage identity, and
Phase 7/8 real implementation for this branch — matching exactly what the prior four batches this
session already did or scoped as open.

## 2. Merge conflict resolution

One real conflict, in `scripts/firestore-level-fingerprint-boundary-test.mjs`: both branches
independently fixed the same pre-existing latent bug (`assert.equal(saved, true)` comparing the
`{saved:true}` outcome OBJECT against the boolean `true`, which `Object.is` never satisfies) but
diverged on the entry-doc-ID computation — the incoming branch still used the single-hash
`hashPathSignature(signature)` scheme, since it branched before this session's own
[`2026-09-24-hint-evidence-phase3-local-hints-occurrence-lineage-001.md`](2026-09-24-hint-evidence-phase3-local-hints-occurrence-lineage-001.md)
batch introduced the composite (path, discovery-event) `entryIdFor()`/`localHintEntryId()` scheme.
Resolved by keeping this branch's composite-ID call (the current, correct contract) combined with the
incoming branch's stricter `assert.deepEqual(saved, { saved: true })` assertion (a small
improvement over this branch's own `assert.equal(saved.saved, true)`). Every other file merged
cleanly, including `scripts/run-solver-direct.mjs` (both branches independently extended this file —
this branch's `schedulerMode`/`baseWorkBudget` fix and canonical-identity dual-write; the incoming
branch's `levelId`/`levelRevision`/`discoveryObservedAt`/`solution`/`schemaVersion`/`kind`/`producer`
fields for its central-harvest ingestion lane — at non-overlapping line ranges) and
`docs/solver-protocol-schema-contraction.json` (this branch's PSC-015/PSC-029 progress notes and the
incoming branch's new PSC-030+ entries, non-overlapping).

## 3. Validation performed

Ran every check the PR's own description asked for, plus the standard floor this session already
established, all against the real merge commit (not the PR branch in isolation):

- `npm run check:types` / `check:types:tests` — clean.
- `npx vitest run` — 146 files / 1,580 tests, all pass (unchanged from before the merge — the
  incoming branch's new tests are all `.mjs` node-tests, not `.test.ts`).
- `npm run test:node` — **195 packages** (up from 181), all pass on a clean full run after the merge
  was committed. Two packages (`test:research-query`, `test:research-system-query`) legitimately
  failed when run *before* committing the merge — both compare the working tree against `HEAD` via
  `--compare-ref=HEAD`/`--compare-system-ref=HEAD`, so of course they saw a diff against the old,
  pre-merge `HEAD`. Not a bug: re-ran both individually after committing and both pass.
- `npm run build` — succeeds; confirms the Phase 9 runtime-hint-projection Vite plugin actually runs
  (`Runtime hint projection: 769,032,924 source bytes -> 150,198,857 path-only bytes (80.5%
  reduction)`), and spot-checked one generated `dist/data/hints/P00001.json` — a real path-only
  projection carrying `sourceContentSha256`/`sourceSemanticSha256` for validation, matching the
  described design.
- `npm run check:workflow-actions` — passes (validates the extended
  `.github/workflows/harvest-solver-evidence.yml` wiring for the two new central adapters and their
  ingestion-receipt uploads).
- `npm run check:audit-artifacts` — passes.
- `npm run hints:occurrence-acceptance-audit` — **`"acceptance": "pass"`, zero violations** across
  all three real corpora (1,962 levels, 267,845 hints, 811,155 provenance events). This is the first
  real confirmation of this session's own Phase 3 acceptance criteria against full corpus scale: the
  662 September-11 synthetic-`foundAt` migration events remain correctly, uniquely identified as
  semantically undated; zero duplicate semantic events within any path; zero duplicate occurrence
  keys within any event. `eventsWithExecution`/`eventsWithOccurrences` are correctly `0` everywhere
  — expected, since no producer has re-run against these levels since this session's producer-wiring
  batch landed.

Not run: a live bounded CP-SAT workflow to compare captured-artifact vs. specialist-report receipts
before retiring the old direct route (the PR's own suggested next step) — this requires a real GHA
run with an external CP-SAT binary, which is a live-infrastructure action outside this local
validation pass, and the PR itself frames it as a follow-on decision, not a merge blocker.

## 4. Targeted correctness review

Beyond running the automated floor, spot-checked the integration points most likely to silently
diverge from this session's own Phase 3 schema design, since a parallel continuation without this
session's full context is exactly where a subtle mismatch would hide:

- `scripts/harvest-cpsat-discovery-reports.mjs` — correctly reuses `makeProvenanceEntry`'s
  `occurrenceRunId`/`occurrenceRunAttempt`/`occurrenceObservedAt` options exactly as this session
  designed them, and measures before/after semantic deltas via `mergeHints` +
  `countHintStoreSemanticUnits` rather than hand-rolling a second merge path.
- `scripts/hint-discovery-ingestion-projection-lib.mjs` (`buildHintDiscoveryIngestionObservation`) —
  correctly reads `provenance.occurrences[].runId`/`runAttempt` in the exact shape
  `occurrenceFromOpts()` produces, and enforces a real invariant: a caller declaring a
  `sourceRunId` must have that run id actually present in the provenance's own occurrence lineage,
  not just asserted alongside it.
- `scripts/hint-ingestion-receipt-lib.mjs`'s `countHintStoreSemanticUnits` — walks
  `hint.provenance[].occurrences[]` correctly, consistent with this session's schema.

No defects found in this targeted pass. Given the automated floor (types, full vitest, full
test:node, build, workflow-actions, audit-artifacts, and the corpus-scale occurrence-acceptance
audit) is unanimously green and the highest-risk integration points check out, this reconciliation
is treated as substantively sound — unlike the PR #2002 reconciliation earlier this session, which
surfaced six real defects only through actual execution, no defect was found here that real
execution didn't already catch (the merge conflict) or that this session's own doc-comment additions
weren't already anticipating.

## 5. What this batch does not do

- Does not evaluate or act on the CP-SAT dual-path retirement decision, historical-enrichment
  execution (only its dry-run planner landed), stage-identity persistence, or Phase 8 v4
  codec/benchmark work — all explicitly deferred by the incoming PR itself and unaffected by this
  reconciliation.
- Does not re-litigate any judgment call the incoming branch made in areas this session had not
  previously touched (Phase 4 determinism-audit identity distinctions, Phase 5 ingestion receipts,
  Phase 9 runtime projection) beyond the targeted correctness spot-check in section 4 — those are
  accepted as-is on the strength of the passing automated floor plus the spot-check.

## 6. Next work

Per the incoming PR's own framing and this session's prior reports, the highest-value remaining
items are: a real bounded CP-SAT workflow run to compare captured-artifact vs. specialist-report
receipts before retiring the direct route; the `published_levels` backend's separate 5-hint
merge-cap truncation (the other half of PSC-029); durable solver-stage identity; and real Phase 7
historical enrichment execution against the rescued September-9 cohort now that a read-only planner
exists.
