# Hint evidence consolidation — Phase 8 bulk v4 migration — 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-24 — applied the real one-time bulk v4 migration to all 1,962 tracked hint files, shrinking canonical hint storage from 732,304,443 to 571,890,961 bytes (21.9%) with zero semantic or cross-resource join-identity loss.
> **Decision:** execute the bulk migration now rather than leave the v4 upgrade lazy-on-write indefinitely, per the plan's own Phase 8 text ("migrate canonical stores in a data-focused change") and its exit criterion ("tracked hint storage is materially smaller").
> **Remaining gate:** none for Phase 8 — the plan's named phases 0-10 all have real, executed, verified work as of this batch.
>
> **Date:** 2026-09-24
>
> **Batch:** resolves the one open design question flagged in
> [`2026-09-24-hint-evidence-phase6-portfolio-family-retirement-001.md`](2026-09-24-hint-evidence-phase6-portfolio-family-retirement-001.md)
> and
> [`2026-09-24-hint-evidence-phase10-bounded-level-cleanup-001.md`](2026-09-24-hint-evidence-phase10-bounded-level-cleanup-001.md):
> whether Phase 8's lazy per-write v4 upgrade (landed via the folded-in PR #2042, merged to main in
> PR #2062) should become an explicit one-time bulk migration of the remaining v3 files. This batch
> executes that migration for real, using the dedicated migration tool
> (`scripts/hint-artifact-v4-migration.mjs`) that already existed but had only ever been run as a
> dry-run/benchmark.
>
> **Base commit:** `ea454fe1` (main, immediately after PR #2062 merged).

## 1. Why bulk migration, not indefinite lazy upgrade

The plan's own Phase 8 text is explicit: "produce the reversible migration manifest with before/after
hashes, counts and referee results; migrate canonical stores in a data-focused change; preserve v1-v3
readers." This names a real migration step distinct from landing the codec. The phase's own exit
criterion — "tracked hint storage is materially smaller, deterministically encoded, fully backward
readable and semantically/join equivalent" — cannot be satisfied by lazy-on-write alone: a file this
session never happens to touch again stays at whatever byte size it already has, so "tracked hint
storage" as a whole never actually becomes smaller under lazy-only adoption. Executing the migration is
therefore not an optional enhancement but the completion of Phase 8's own stated exit condition.

This is consistent with the plan's general research-system discipline (proven in every phase of this
program): a benchmark or dry-run tool is table-setting, not itself the deliverable: the deliverable is
the executed, verified change plus its dated evidence.

## 2. What already existed vs. what this batch did

`scripts/hint-artifact-v4-migration.mjs` (landed via the folded-in PR #2042 / merged in PR #2062) was
already a real, safe apply-capable tool: read-only by default, an `--apply` flag, and per-file
enforcement — it throws before writing anything if a file's decode→encode→decode round trip changes
either its semantic content hash or its cross-resource join-identity hash (path signature +
provenance-event identity + solver-request identity + protocol hash + occurrence keys). It had only
ever been exercised as a dry-run/benchmark (per
[`2026-09-24-hint-evidence-phase10-bounded-level-cleanup-001.md`](2026-09-24-hint-evidence-phase10-bounded-level-cleanup-001.md)'s
own "Plan status" section: "no bulk data migration has been applied yet"). This batch is the first real
`--apply` run against the full tracked corpus (`data/hints/`, `data/stress/hints/`,
`data/stress/hints-random/`) — no new migration logic was written; the existing tool's own safety
enforcement is what this batch relies on and verifies.

## 3. The real migration

Ran a dry run first to confirm scope before touching anything: 1,962 files, 1,781 would change (181
were already byte-identical to their would-be v4 form, from lazy per-write upgrades already landed by
prior batches), 267,853 hints, 843,425 provenance events, `interned` representation chosen for every
file (the tool picks whichever of sparse-inline/interned encodes smaller per file; at this corpus's
density, interning consistently wins).

Applied for real (`node scripts/hint-artifact-v4-migration.mjs --apply --out=<manifest>`). Result,
saved as the accompanying
[`2026-09-24-hint-evidence-phase8-bulk-migration-001.json`](2026-09-24-hint-evidence-phase8-bulk-migration-001.json)
manifest (schemaVersion 1, `pathfinder-hint-v4-migration-report`, one row per file with source/target
content hashes, semantic hash, join-identity hash, and byte/gzip counts):

| Metric | Before | After | Change |
| --- | --- | --- | --- |
| Files | 1,962 | 1,962 | — |
| Changed files | — | 1,781 | 181 already at target form |
| Raw bytes | 732,304,443 | 571,890,961 | -21.9% |
| Gzip bytes | 22,161,632 | 20,311,383 | -8.3% |
| Hints | 267,853 | 267,853 | 0 |
| Provenance events | 843,425 | 843,425 | 0 |

`semanticRoundTrip: "pass"` and `crossResourceJoinIdentity: "pass"` in the manifest mean the tool's own
per-file assertion never fired across all 1,962 files — every file's decoded semantic content and every
cross-resource join key (path signature, provenance-event identity, solver-request identity, protocol
hash, occurrence keys) is byte-for-byte identical before and after, proven per file, not sampled.

Re-ran the same dry run immediately after applying: `changedFiles: 0` of 1,962 — real reharvest
idempotency, not just a design claim (matching the tool's own existing unit-test assertion, now
confirmed at full corpus scale).

## 4. Verification

- `npm run check:types` / `check:types:tests` — clean.
- `npx vitest run` — 146 files / 1,586 tests, all pass.
- `npm run test:node` — full suite, all pass, including `test:hint-artifact-v4-migration` (the tool's
  own unit tests, unaffected — they run against isolated temp-dir fixtures, not the real corpus).
- `npm run check:workflow-actions` / `check:audit-artifacts` — pass.
- `node scripts/stress/hint-occurrence-acceptance-audit.mjs` — `"acceptance": "pass"`, zero violations,
  identical counts to before this batch (`occurrenceRecords: 41`, `eventsWithOccurrences: 30`,
  `eventsWithMultipleOccurrences: 11`, `duplicateSemanticEventsWithinPath: 0`,
  `duplicateOccurrenceKeysWithinEvent: 0`) — the corpus-scale audit sees the exact same semantic content
  through the new physical encoding, confirming the per-file join-identity proof holds in aggregate too.
- `node scripts/check-corpus-level-formatting.mjs` — all 4 corpus files and 2,086 hint files remain
  canonically formatted.
- `npm run build` — succeeds; the Phase 9 runtime-hint-projection plugin reports
  `571,890,961 source bytes -> 150,201,586 path-only bytes (73.7% reduction)` — the projected path-only
  output byte count (`150,201,586`) is unchanged from before this batch, confirming the runtime
  projection is correctly indifferent to the canonical physical schema, exactly as Phase 9 was designed.
- A real solve (`solver-bench.mjs --check` against `pos:1,20,40,60,80,100,120,140,160`) — 9/9 solved, no
  regressions vs. the tracked baseline.

## 5. What this batch does not do

- Does not change any hint's semantic content, provenance, or occurrence lineage — only the physical
  byte encoding of files that already existed in v1-v3 form.
- Does not touch level-definition corpora (`data/levels.json`, `data/stress/stress-levels*.json`) —
  those were already handled by the unrelated Phase 10 batch.
- Does not change the migration tool itself — this batch is purely the first real `--apply` execution
  of already-existing, already-tested logic.

## 6. Plan status

With this batch, every phase the plan names through Phase 10 has real, executed, verified work, and the
one previously-open design question (lazy vs. bulk v4 migration) is resolved: bulk migration was
executed for real, closing Phase 8's exit criterion in full rather than leaving it partially satisfied
by lazy-only adoption.

## Hostile-audit correction, 2026-09-24

The original report's phrase **"full tracked corpus" was incorrect**. A later hostile closeout audit
found three tracked canonical stores absent from the migration tool's default directory list:
`data/stress/hints-envelope/` (124 artifacts), `data/families/hints/` (788), and
`data/families/phaseB/hints/` (477). All 1,389 omitted artifacts remained schema v3 after this
migration.

PR #2072 corrects the scope defect by mechanically discovering tracked Hint directories for
whole-store tooling and running the same schema-v4 semantic-hash / join-identity contract plus a
whole-store PLAY-referee proof over the omitted stores. The original 1,962-file measurements below
remain valid for the three stores actually processed by this run; they must not be interpreted as
corpus-wide totals.

## Six-store repair completion

The hostile correction above has now been executed, not merely planned. See
[`2026-09-24-hint-evidence-phase8-six-store-repair-001.md`](2026-09-24-hint-evidence-phase8-six-store-repair-001.md)
and its machine summary.

A full checkout contained **3,351 artifacts across six canonical Hint stores**. The repair changed
exactly the **1,389 previously omitted files** and preserved expanded semantic and cross-resource
join hashes; an immediate full rerun reported zero changes. The corrected all-store Phase-8
comparison is **734,618,282 → 574,394,797 raw bytes (-21.81%)** and
**23,131,040 → 21,364,458 gzip bytes (-7.64%)**.

The original figures in this report remain the correct measurements for the three stores processed
by the original run; the six-store repair report is the authority for corpus-wide completion.
