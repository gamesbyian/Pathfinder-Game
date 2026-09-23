# Hint evidence consolidation — Phase 1 historical missingness repair — 001

> **Status:** active
> **Last evidence:** 2026-09-23 — Retained and reconciled as part of the active hint-evidence consolidation implementation.
> **Decision:** Preserve this report as durable implementation/audit evidence; current code and later reconciliation records remain authoritative where they supersede earlier details.
> **Remaining gate:** Apply the current phase-specific validation and closeout gates before treating this report as proof of whole-program completion.


> **Status:** concluded-positive (prospective fix only; see "What this does not do" below)
>
> **Date:** 2026-09-23
>
> **Batch:** 3 of the dependency-ordered sequence in
> [`docs/hint-evidence-execution-identity-storage-consolidation-plan.md`](../docs/hint-evidence-execution-identity-storage-consolidation-plan.md)
> — Phase 1's historical-missingness sub-item (section 13.1.B / "Investigation closure: Provenance
> missingness and historical truth").
>
> **Base commit:** this branch's prior two batches (Phase 0 rescue, I/O facade migration). No canonical
> hint corpus data was rewritten by this batch.

## 1. The defect

`modules/domain/hint-runtime.mjs::upgradeProvenanceEntry()` is the read-time adapter that normalizes
already-nested (but possibly legacy-shaped) provenance entries. Until this batch, its `context` branch
filled three capability booleans with a hardcoded default whenever they were absent from the stored
entry:

```js
usedExistingHints: raw.context?.usedExistingHints ?? false,
hintGuided: raw.context?.hintGuided ?? false,
isolatedTechnique: raw.context?.isolatedTechnique ?? false,
```

`docs/hint-evidence-consolidation-inventory.json`'s `historicalMissingnessComparison` finding already
measured the consequence precisely: the September 11 audit found 505,993 events with `isolatedTechnique`
absent; by 2026-09-22 the current corpus had only 32,254 still absent and 507,334 explicit `false` —
because a touched-file read-then-write cycle (any writer merging a new discovery into a level that also
has old provenance) reads the whole level's provenance through this adapter, and a later write serializes
the now-expanded `hintRecords`, permanently baking the laundered `false` into the physical file. A
read-time convenience had become a mutable historical authority.

This is also not merely cosmetic: two real consumers already exist specifically to detect "was this
capability context ever actually recorded" via `Object.hasOwn` + `typeof` checks —
`hasExplicitCapabilityContext()` (`scripts/stress/provenance-source-taxonomy.mjs`) and `hasOwnBoolean()`
(`scripts/hint-discovery-replayability-lib.mjs`, used by `classifyReplayability()` to mark an event
`historical-unverified`/`legacy-context-ambiguity`). The laundering silently defeated both: a genuinely
ambiguous historical event that had been touched by any writer would present as if it had explicit
capability context, and `classifyReplayability()` would over-classify it as more replayable/verified than
its actual recorded information supports.

## 2. The fix

Removed the three `?? false` defaults from `upgradeProvenanceEntry()`'s nested-entry branch. The
`context` object now only carries `usedExistingHints`/`hintGuided`/`isolatedTechnique` when the source
actually had them (via `...(raw.context || {})`); genuinely absent fields stay absent (`Object.hasOwn`
false) instead of becoming a fabricated `false`. `levelRevision`/`techniqueCensusCell` keep their `?? null`
default unchanged — `null` is their real canonical "no value" sentinel (also `makeProvenanceEntry()`'s own
fresh-construction default), not a laundered boolean, so it is not part of this defect.

This is a **prospective, ingress-only** fix, consistent with the plan's instruction not to bulk-rewrite
history. It changes what happens the *next* time an already-absent field is read and (if the level is
touched by a writer) re-serialized; it does not and cannot retroactively distinguish the 507,334 already
physically-`false` events from ones that were genuinely observed false, since that information is gone
once written. Those events remain exactly as ambiguous as the plan's audit already found them to be —
this fix only stops the ambiguous population from continuing to shrink via silent laundering.

## 3. Why this is safe for existing consumers

- `provenance-classes.mjs::classifyProvenanceClass()` (the canonical cold-capability-evidence
  classifier) only ever checks `=== true` for these three fields and falls through to
  `'cold-capability'` otherwise — it never checked `=== false`, so an absent field and a laundered-false
  field already produced identical output. Unaffected.
- `scripts/stress/audit-class5-hint-capability-freshness.mjs` requires `isolatedTechnique === true`
  *and* `usedExistingHints === false && hintGuided === false`; every producer that sets
  `isolatedTechnique: true` does so via `makeProvenanceEntry()` at discovery time, which always sets all
  three fields explicitly (never absent to begin with). Unaffected.
- `hasExplicitCapabilityContext()`/`hasOwnBoolean()`-based classifiers (`classifyReplayability()`) are
  the intended positive case: they now see genuine absence again instead of a laundered false, which is
  the fix, not a regression — a fresh regression test proves this (see below).
- `provenanceEventIdentity()` (`stableStringify` over the entry minus `foundAt`/timing fields) *does*
  include `context` verbatim, so an absent key versus an explicit `false` key does produce a different
  identity hash (a missing key is excluded from `stableStringify`'s output exactly like an `undefined`
  value; an explicit `false` is kept). This is an accepted, understood consequence: a still-genuinely-
  ambiguous historical event will no longer silently hash-match a fresh, fully-specified modern
  rediscovery of the same path. Before this fix that could happen purely because both sides laundered to
  `false`; after this fix a rediscovery with real known context is correctly treated as an additional,
  more-informative provenance entry rather than being silently absorbed as "the same event". This is a
  bounded, well-understood, and net-positive change in historical honesty, not a data-loss bug — no path
  is lost or duplicated, only provenance-event identity for the ~32,254 still-absent-field events becomes
  more discriminating.

## 4. Verification

- Added a regression test to `modules/domain/hint-types.test.ts`
  (`upgradeProvenanceEntry preserves historical absence of capability booleans instead of laundering it
  to false`) asserting `Object.hasOwn(...) === false` for a genuinely absent nested entry, and that an
  already-explicit `false`/`true` entry passes through unchanged.
- `npx vitest run modules/domain/hint-types.test.ts` — 11/11 pass (including the new test).
- `npx vitest run modules/solver/hint-provenance.test.ts modules/domain/hint-runtime-semantic-dedupe.test.ts
  modules/persistence/local-level-hints-repository.test.ts modules/domain/hint-acceptance-pipeline.test.ts
  modules/domain/hint-selection.test.ts modules/domain/hint-novelty.test.ts
  modules/domain/level-provenance-types.test.ts scripts/stress/hint-provenance-relations.test.ts` —
  63/63 pass.
- `npx vitest run scripts/stress/provenance-source-taxonomy-unit-tests.mjs
  scripts/stress/provenance-classes-unit-tests.mjs` — 28/28 pass.
- `node scripts/hint-discovery-replayability-lib-node-test.mjs` — pass.
- `npm run check:types` — clean.
- `npm run test:hint-io-facade-guard` — still green (unrelated to this fix, re-checked for regression
  safety since it touches the same module).
- `git status`/`git diff` confirms only `modules/domain/hint-runtime.mjs` and
  `modules/domain/hint-types.test.ts` changed; no canonical hint/level data was rewritten.

## 5. What this does not do

- Does not touch the 507,334 already-laundered `isolatedTechnique:false` events (or the analogous
  `usedExistingHints`/`hintGuided` counts, which were already fully expanded by the September 11
  snapshot per the inventory). Those remain physically `false` and epistemically ambiguous; no bulk
  historical rewrite is in scope for this plan until Phase 7 (authoritative historical enrichment), and
  even then only with proved source linkage, not inference from current defaults.
- Does not add a distinct three-state (`unknown`/`false`/`true`) *type* to the `HintContextProvenance`
  shape. The plan's broader "unknown/default/not-applicable/not-observed" semantic table (section T) is
  a larger, still-open design question; this batch only stops the specific, concretely measured
  false-laundering mechanism the audit identified, using the consumer-side detection
  (`Object.hasOwn`/`hasOwnBoolean`) that already existed for exactly this purpose.
- Does not change `makeProvenanceEntry()`'s own fresh-construction defaults (still `?? false` for a
  *currently executing* producer that omits the option) — a modern producer is expected to know these
  facts about its own execution; that is a producer-completeness concern, not a historical-missingness
  one.

## 6. Next batch

Remaining Phase 1 items: the July-11 synthetic-`foundAt` cohort (662 events / 102 files must decode as
unknown discovery time rather than the migration timestamp), worker side-channel parity
(`beamFlowCounters`/`pruneDiagnostics`), Firestore evidence-loss containment (the five-hint `slice()`
cap and `local_level_hints` create-only/single-provenance limitation), and the shared v1-v3
browser/Node decoder boundary. Each has a distinct compatibility owner and validation graph and should
remain a separate batch.
