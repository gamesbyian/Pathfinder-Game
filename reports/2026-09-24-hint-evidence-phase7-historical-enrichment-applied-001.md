# Hint evidence consolidation — Phase 7 historical enrichment applied — 001

> **Status:** concluded-positive
>
> **Date:** 2026-09-24
>
> **Batch:** executes real Phase 7 historical enrichment against the rescued September-9
> determinism-collision authority, using the read-only planner (`scripts/stress/hint-historical-
> enrichment-plan.mjs`) already built as table-setting. Per the plan's own dependency ordering, this
> was explicitly gated on Phase 3 storage semantics being final — closed in
> [`2026-09-24-hint-evidence-phase3-closeout-001.md`](2026-09-24-hint-evidence-phase3-closeout-001.md).
>
> **Base commit:** `fa8c9fe`.

## 1. What the planner found

Ran `scripts/stress/hint-historical-enrichment-plan.mjs` against the real corpus. All **41** rescued
source observations from the September-9 determinism-collision cohort (6 runs, 15 affected levels)
classified as `exact-occurrence-enrichment-candidate` — an unambiguous, exact path-hash match to exactly
one currently-stored Hint, and an exact semantic-event match (immutable solver ref + winning
technique/config/gate/seed/nodes/cumulative work) to exactly one of that Hint's provenance entries, not
yet carrying this run's occurrence. Zero ambiguous matches, zero missing paths, zero already-enriched
(none of these 41 had been enriched before this batch).

## 2. The mutation

Built `scripts/stress/hint-historical-enrichment-apply.mjs`, a mutation companion to the existing
read-only planner. For each `exact-occurrence-enrichment-candidate`, it re-locates the exact same
unique hint/event the planner's classification already proved unique (reusing the exported
`provenanceMatchesRescuedObservation` predicate and the newly-exported `sha256Canonical` helper — no
re-derivation of the matching rule), constructs a real `HintOccurrence` record
(`{runId, runAttempt, contractRef: null, observedAt: run.resultContext.timestamp, sourceRuns: null}`),
and merges it into the matched entry via `dedupeProvenanceEntries()` — the exact same canonical merge
path every other occurrence-lineage addition in this program uses, rather than splicing the occurrences
array by hand.

Deliberate choices, following the planner's own doctrine of never fabricating what isn't proven:

- **`observedAt` uses the real historical timestamp** (`run.resultContext.timestamp`, e.g.
  `"2026-09-09T07:24:05.656Z"`), never today's date — these are physical acquisitions that happened on
  September 9, 2026, not now.
- **`contractRef` is `null`**, not a fabricated reference: these rescued runs (level-blind targeted
  sweeps) have no experiment-contract object, unlike the runs `sourceRunBindingFromContract()` handles
  in Phase 2. The rescue authority's own `runUrl` field remains the durable, complete record for anyone
  who needs it — duplicating it into a field meant for experiment-contract references would misrepresent
  what it is.
- **No `solverRequestIdentity`/`protocolHash`/`solverStagePersistence`** were added or inferred — exactly
  as the planner's own `deliberatelyUnresolved` block already declared. This batch only ever touches
  `occurrences`; every `solver`/`search`/`context`/`foundAt` field on the matched entries is untouched,
  verified explicitly (see section 3).

Ran as a dry run first (zero mutations, correct 41-candidate report), then applied for real: **41
occurrences added across 15 files** in `data/stress/hints-random/`, matching the rescue's own "15
affected levels" count exactly. Re-ran immediately after: all 41 correctly reported `already-enriched`,
zero further mutations — real reharvest idempotency, not just a design claim.

## 3. Verification

- **Field-level integrity, all 15 changed files**: programmatically compared every changed file's
  before/after state — zero path-set changes, zero provenance-array-length changes, zero changes to any
  `solver`/`search`/`context`/`foundAt` field on any entry. The only diff anywhere is the addition of
  `occurrences` arrays (30 entries gained one; 11 of those entries hold 2+ occurrences from independent
  rescue runs, correctly merged rather than duplicated).
- `npm run check:types` / `check:types:tests` — clean.
- `npx vitest run` — 146 files / 1,580 tests, all pass.
- `npm run test:node` — 197 packages, all pass (two — `test:research-query`/`test:research-system-
  query` — showed the same expected stale-`HEAD`-comparison false failure documented in prior batches;
  both pass once this batch is committed).
- `npm run check:workflow-actions` / `check:audit-artifacts` — pass.
- `node scripts/stress/hint-occurrence-acceptance-audit.mjs` — `"acceptance": "pass"`, zero violations.
  `occurrenceRecords: 41`, `eventsWithOccurrences: 30`, `eventsWithMultipleOccurrences: 11` — the
  corpus-scale audit's first-ever real occurrence-lineage population, from real historical evidence
  rather than a local canary's throwaway run ids.

## 4. New regression coverage and a design fix found along the way

Added `scripts/stress/hint-historical-enrichment-apply-node-test.mjs`, refactoring the apply script into
a pure `applyHistoricalEnrichment(rescue, corpusDocuments, {apply})` core (mirroring the planner's own
`buildHistoricalEnrichmentPlan()`/CLI split) plus a guarded CLI entrypoint, so the mutation logic is
unit-testable against in-memory fixtures without touching real files. Covers: dry-run mutates nothing;
apply adds exactly one real occurrence with the real historical `observedAt` and `contractRef: null`,
leaving every other field untouched; reapplying is idempotent (no duplicate); a rescued observation with
no matching path is reported, never fabricated.

While building this, found that `hint-historical-enrichment-plan.mjs`'s own CLI body ran **unguarded** —
merely importing its exported functions (`classifyRescuedObservation`, `provenanceMatchesRescuedObservation`,
`sha256Canonical`, `buildHistoricalEnrichmentPlan`) triggered a real file read of the default rescue
authority and dumped the entire real plan to stdout as an unwanted import side effect (already
observable, unnoticed, in the pre-existing `hint-historical-enrichment-plan-node-test.mjs`'s own test
output). Fixed by adding the same `import.meta.url === process.argv[1]`-style CLI guard now used in the
apply script's own entrypoint. Both files' CLI behavior is unchanged when run directly; both now import
cleanly with no side effects.

## 5. What this batch does not do

- Does not touch `data/levels.json`/`data/stress/stress-levels.json`'s hints — only `data/stress/hints-
  random/` (`data/stress/stress-levels-random.json`), the corpus every one of the 41 rescued
  observations actually belongs to, per the rescue authority's own `resultContext.corpus` field.
- Does not reconstruct or persist `solverRequestIdentity`/`protocolHash`/durable solver-stage identity
  for these entries — consistent with this session's own earlier decision
  ([`2026-09-24-hint-evidence-phase3-closeout-001.md`](2026-09-24-hint-evidence-phase3-closeout-001.md))
  that these remain external-join-only/genuinely unresolved rather than fabricated.
- Does not mark the September-9 rescue authority itself as "fully consumed" — the planner's own
  `deliberatelyUnresolved` fields remain a real, permanent gap for these 41 events unless a separate,
  independent exact authority someday proves them.

## 6. Next work

Phase 7's exact-link enrichment for the known rescued cohort is now applied and verified. Remaining
plan work: Phase 6's real full-scale `solver-stress-refresh.yml` confirmation (deferred per the prior
batch), Phase 8 (v4 codec/benchmark/migration), Phase 10 (bounded level cleanup).
