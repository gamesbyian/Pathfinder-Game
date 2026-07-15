# Level ID Unification Plan

> **Status: shipped for all 3 corpora (stress 2026-07-12, published 2026-07-15).** Every step in
> "Proposed design" below is done. Step 5 (unified `--levels=` parsing) landed in a second pass on
> 2026-07-12, after step 3's own commit shipped without it: unifying `--levels=`/`--target-level=`
> parsing turned out to touch ~7 files, not the 3 originally named, once every corpus-capable copy
> of the parser was actually found (`solution-profile.mjs`, `solution-profile-compare.mjs`,
> `solution-profile-lib.mjs`, `hint-corpus-expand.mjs`, `hint-complete-enumeration-sharded.mjs`,
> `hint-workbench.mjs`, `hint-diversification.mjs`) — all now share `parseLevelSelector()` in
> `level-data-io.mjs`. `hint-candidate-search.mjs` has the same pre-unification duplicate but was
> left as-is (already a deprioritized/superseded probe tool).
>
> The published-corpus phase (steps 2, 4, 6, 7 — the one that touches live production data:
> Firestore ratings, local hints, the deployed game's hint-fetch URLs) shipped 2026-07-15, per the
> three decisions recorded under "Decided" below: published ids use a `P` prefix (`P00001`..
> `P00156`, backfilled via `scripts/backfill-level-ids.mjs`, verified via a before/after fingerprint
> diff over the full corpus — zero fingerprints changed); steps 2/4/6/7 shipped as one migration;
> `data.ts`'s `getHints()` signature became id-aware — specifically, it now takes the raw level
> object itself (not a position or an id string), since a level graduating from Firestore's
> `published_levels` staging (not yet pulled into the git corpus) has no `id` yet but always
> carries inline hints, so there's no call site that has an id/position but not the level object.
> Verified against a real production build (`npm run build` + `vite preview`, real Chromium via
> Playwright): the in-game hint button fetches `/data/hints/P00001.json`, not a position-keyed URL.
> Also fixed as a byproduct: `modules/dev-corpus.ts`'s stress-corpus hint wiring (via
> `createDefaultHintsSource`) had been building position-keyed fetch URLs against files the
> 2026-07-12 stress migration had already renamed to id-keyed names — identified by code
> inspection while making `createDefaultHintsSource` id-aware for this pass (no test exercised
> that path end-to-end, so it likely went unnoticed as a live 404 for any Dev-Mode stress-corpus
> hint request between the two migrations). `CLAUDE.md`'s "Level Stats"/"Provenance" sections are
> updated; `docs/architecture.md` needed no changes (it doesn't reference level identity/position
> addressing).
>
> **Supersedes an earlier, narrower idea in `future-work.md`'s "Data layout" section**
> ("fingerprint-keyed hints/heatmap store"), deferred by owner decision until the level corpus
> stabilized. That framing doesn't actually solve the problem — fingerprint is a content hash, not
> a persistent identity, so it changes the moment a level is edited and would silently orphan
> ratings/local hints under the old hash. This doc replaces that idea with a real, assigned-once
> `id`, but keeps the same governing invariant: no artifact may be keyed by array position.

## Goal

Give every level, in every corpus (published, Corpus 1, Corpus 2), a permanent, content-independent
identity — an `id` that survives reordering, editing, and regeneration — so "level `<id>`" always
refers to the same conceptual level, and every tool addresses levels the same way regardless of
which corpus it's pointed at. This closes a real gap: **array-position addressing is currently only
safe for published levels because of an *enforced constraint* ("never reorder"), not because
reordering is actually harmless** — the maintainer can and does reorder the published corpus
("on a whim, for any reason, at any time"), and today that would silently corrupt every local hint
file's join key.

## Current state (as of 2026-07-15, after both migration phases shipped)

| | Published (`data/levels.json`) | Corpus 1 (`stress-levels.json`) | Corpus 2 (`stress-levels-random.json`) |
|---|---|---|---|
| Has an `id` field on the level object? | **Yes** (`P00001`, ...) — backfilled 2026-07-15 | Yes (`S00001`, ...) | Yes (`R00001`, ...) |
| `id` assigned how? | One-time backfill preserving array order (`scripts/backfill-level-ids.mjs`); new levels get one at `levels:import-published` time (`makeLevelIdMinter`), same idCounter pattern as the stress generators | Monotonic counter at generation time, zero-padded 5 digits, never reused even across deletions (`generate.mjs`/`generate-random.mjs`'s `idCounter`) | Same |
| `id` aligned with array position? | Yes at backfill time only (`P00001` = position 1, ...) — will drift the moment the corpus is reordered or a level is deleted, same as the stress corpora already do | **No** — non-contiguous after migrations/cleanup (`S00001, S00028, S00030, ...`) | **No** — same reason (`R00001, R00039, ...`) |
| Local hint-file join key (`data/hints/<id>.json` / `data/stress/hints{,-random}/<id>.json`) | **Fixed 2026-07-15**: the level's own `id`, verbatim (`hintKeyForLevel()` in `level-data-io.mjs`) | **Fixed 2026-07-12**: same | **Fixed 2026-07-12**: same |
| Runtime hint fetch (`data-asset-loaders.ts`) | **Fixed 2026-07-15**: `createDefaultHintsSource` fetches `<id>.json`; `data.ts`'s `getHints(level)` takes the raw level object and reads `level.id` | n/a (never shipped to the app) — but `dev-corpus.ts`'s Dev-Mode wiring uses the same fixed code path now, see the status banner | n/a |
| `--levels=` CLI convention | 1-based array position (`run-solverv2-direct.mjs` and other published-only tools) — unaffected, no id to unify with (published levels having ids now doesn't change this: those tools were never corpus-capable in the first place) | **Fixed 2026-07-12**: `solution-profile.mjs`, `solution-profile-compare.mjs`, `hint-corpus-expand.mjs`, `hint-complete-enumeration-sharded.mjs`, `hint-workbench.mjs`, `hint-diversification.mjs` all resolve via the shared `parseLevelSelector()`, accepting bare position/range, full id strings, or a bare number matched against every id prefix+width in the corpus | Same |
| Firestore identity | `published_levels/{levelId}` — an **opaque Firestore auto-generated doc id**, staging area between review-approval and the periodic `levels:import-published` pull into the git corpus — **unchanged by design** (step 8), a level only gets its permanent `id` at import time | n/a | n/a |
| Content fingerprint (`domain/level-fingerprint.ts`) | Yes — structural hash (grid/objects/geometry only, excludes hints/provenance/metadata). Used for submission dedup, `level_ratings/{fingerprint}`, `local_level_hints/{fingerprint}/...`, and `levels:import-published`'s matching | n/a for stress corpora | n/a |

**The key finding that changes the picture from "corpus 2 is the odd one out"**: it isn't. Corpus 1
has the identical `id`-exists-but-unused-for-storage pattern as Corpus 2. The actual split is
published (no id at all) vs. both stress corpora (an id that only analysis tooling uses). And
**none of the three corpora's local hint storage is actually protected against reordering today** —
including the two that already have an `id` field.

**Fingerprint is not a substitute for a persistent id.** It's "same shape" identity — edit one
block and the fingerprint changes, silently orphaning that level's Firestore ratings and local
hints under the old hash. A real `id`, assigned once and never recomputed, is a different and
complementary guarantee.

## Why this is worth doing (not just theoretical)

This session's own square-grid cleanup is the concrete precedent: 1,372 Corpus 2 levels and part of
Corpus 1 were deleted and replaced, and multiple downstream artifacts (baselines, batch analysis,
a witness-divergence spot-check referencing since-deleted ids) went stale or silently wrong as a
result — see `data/stress/README.md`'s "Second corpus" section and `logs/README.md`'s notes on
`verify-sample-parallel2.json`. That was corpus regeneration, a known, expected event for stress
corpora. **Reordering the published corpus is not expected or tracked as an event at all today** —
if it happened, nothing would flag it, and every local hint file's join key would silently point at
the wrong level.

## Proposed design

1. **New field `id: string`** on the raw wire-format level schema, uniform across all 3 corpora.
   Stress corpora keep their existing `S`/`R` prefix and existing values (no reassignment needed —
   just start actually *using* them, see step 3). Published levels use a `P` prefix (decided, see
   "Decided" above) and get a one-time backfill (step 2).
2. **Backfill published levels' ids** (one-time script, same shape as `backfill-level-provenance.mjs`
   / `migrate-hint-schema-v2.mjs`): assign ids to the 156 existing levels preserving *current* array
   order as initial id order (level 1 → id `P00001`, etc.), so the migration itself doesn't reshuffle
   anything. Going forward, new published levels get the next unused id, following the exact
   `idCounter` pattern `generate-random.mjs` already uses (`resume from max(existing) + 1`,
   never reused).
3. **Migrate the hint-storage join key, all 3 corpora, from array position to `id`.** This is the
   actual structural fix. `hintFilePathFor` (`level-data-io.mjs`) keys off `level.id` instead of
   `i+1`; existing hint files get renamed accordingly (one-time migration script — free for the
   stress corpora since ids already exist, contingent on step 2 for published).
4. **Runtime fetch path** (`modules/data-asset-loaders.ts`): must change in lockstep with step 3 —
   it currently builds the hint-file URL directly from the numeric `levelNumber`
   (`${String(levelNumber).padStart(5,'0')}.json`). This needs to become id-based, which means
   `data.ts`'s `getHints(levelNumber)` needs the level's `id` available before it can construct the
   right fetch — not just its array position. **This is the single highest-risk step**: get it
   wrong and the deployed game 404s on every hint fetch.
5. **Unify `--levels=` parsing** across every corpus-capable tool to accept id strings the same way
   `benchmark.mjs`'s `selectLevels()` already does, instead of assuming array position. One shared
   helper, not one-per-tool. **Done 2026-07-12**: `parseLevelSelector()` in `level-data-io.mjs`,
   adopted by `solution-profile.mjs`, `solution-profile-compare.mjs`, `solution-profile-lib.mjs`,
   `hint-corpus-expand.mjs`, `hint-complete-enumeration-sharded.mjs`, `hint-workbench.mjs`, and
   `hint-diversification.mjs` — turned out to be ~7 files, not the handful originally guessed here.
   `run-solverv2-direct.mjs` is published-only (no id field to unify with) and stayed as position-
   only by design; `hint-candidate-search.mjs` still has its own pre-unification copy (deprioritized
   probe tool, left as a known gap).
6. **Codec passthrough**: `normalizeMetadata`/`denormalizeLevel` (`level-codec.ts`) whitelist
   metadata fields one-by-one (`designerName`/`description`/`difficulty`) rather than spreading
   unknown fields through generically — `id` must be added explicitly here, or it silently drops on
   the first normalize→denormalize round trip. **This is exactly the bug class CLAUDE.md already
   documents for `provenance`** ("not covered by any implicit spread... a new serialization
   boundary must add it by name or it silently drops" — this previously hit `hints` before the
   dual-field pattern existed). Audit every serialization boundary `provenance` was audited against
   (`buildWireLevelData`, `submission-controller.ts`, `review-controller.ts`) the same way.
7. **Fingerprint must exclude `id` from its comparison fields**, the same way it already excludes
   `hints`/`provenance`. This is non-negotiable: if backfilling ids onto the 156 existing published
   levels changed their fingerprints even slightly, every existing Firestore `level_ratings`/
   `local_level_hints` entry would be silently orphaned — the exact failure mode CLAUDE.md's
   fingerprint-version-bump history warns about (the v1→v2 bump "silently orphans every
   previously-saved rating unless the reader falls back to a frozen legacy fingerprint").
8. **Firestore `published_levels` staging collection**: recommend leaving it alone. It's transient
   (pre-git-import), already has a working identity (Firestore's own auto-doc-id + the
   `levelFingerprint` field for dedup), and doesn't need the permanent `id` until a level actually
   graduates into the git-committed corpus via `levels:import-published` — that's the same point
   stress-corpus ids get assigned (at generation/corpus-membership time, not at draft time).

## Sequencing recommendation

**Stress corpora first, published last.** Corpus 1/Corpus 2 already have the `id` field — step 1 is
free for them, and they're not live/production/Firestore-connected, so steps 3 and 5 can be built
and proven there with zero player-facing risk. Only attempt the published corpus (steps 2, 4, 6, 7)
once the pattern has shipped and been exercised on the stress corpora, and only with the runtime
fetch-path change (step 4) tested against a real deployed-mode build before merging — this is a
live-game-breaking risk class if rushed, not a "just try it and see" one.

## Definition of done

- [x] All 3 corpora's raw levels carry a persistent `id`, assigned once, never reused or recomputed
      — published backfilled 2026-07-15 (`scripts/backfill-level-ids.mjs`); both stress corpora
      already had theirs.
- [x] `data/hints/<id>.json` and both stress corpora's hint directories are keyed by `id`, not
      array position — published migrated 2026-07-15 (`scripts/migrate-hint-files-to-id-keys.mjs`,
      extended to cover `data/levels.json`; verified lossless, 9909 hints before = after).
- [x] The app's hint fetch resolves by `id` and has been verified against a **local** production
      build (`npm run build` + `vite preview`, real Chromium via Playwright: the in-game hint
      button's network request was `/data/hints/P00001.json`). **Not yet verified against the
      actual live GitHub Pages deployment** — that requires this branch to merge and deploy first,
      outside what a pre-merge session can confirm; flagging per CLAUDE.md's "communicate precisely
      about uncertainty" rather than claiming full live-deploy confirmation prematurely.
- [x] Every corpus-capable CLI tool's `--levels=` accepts id strings uniformly via one shared parser
      (`parseLevelSelector()`, `level-data-io.mjs`) — done 2026-07-12 for all stress-corpus-capable
      tools; `hint-candidate-search.mjs` is a known remaining gap (deprioritized probe tool).
- [x] `domain/level-fingerprint.ts` excludes `id` from its comparison fields; a before/after
      fingerprint diff over the full published corpus confirms zero fingerprints changed as a
      result of the backfill (verified empirically at backfill time, all 156).
- [x] `level-codec.ts`'s normalize/denormalize round trip preserves `id` (unit-tested in
      `level-codec-roundtrip.test.ts`, matching its existing coverage style — the field is named
      `persistentId` on `EngineLevel` to avoid colliding with the pre-existing numeric `id`, wire
      field name stays `id`).
- [x] Every published level can be freely reordered in `data/levels.json` (a maintainer edit,
      regenerated heatmaps, or anything else that reshuffles the array) without any hint file,
      rating, or local-hint entry becoming misattributed — covered by an actual test that reorders
      the array and asserts hint identity survives (`scripts/level-data-io-unit-tests.mjs`).

## Decided (2026-07-15)

- **Published-level id prefix: `P`** (`P00001`, ..., `P00156`). Matches the stress corpora's
  letter-prefix shape (`S`/`R`) so all three corpora's ids are visually consistent and
  distinguishable in mixed contexts (this doc's own tables, mixed-corpus tooling output, etc.).
- **One migration, not staged.** Steps 2, 4, 6, and 7 ship together as a single pass — no
  intermediate state where published levels have ids but the runtime fetch path or fingerprint
  exclusion lags behind. (Stress-corpus steps 1/3/5 already shipped separately and earlier, per
  the sequencing recommendation above — that staging is done; this decision is about the
  remaining published-only work, which is not further split.)
- **`data.ts`'s public `getHints()` signature changes to be id-aware.** The more architecturally
  honest option: the position-translation-internally alternative would have re-introduced a
  position dependency at the API boundary — exactly the kind of implicit-position-addressing this
  whole plan exists to remove. Every caller across `engine/`/`input/` must be audited and updated
  in the same pass (not deferred), since `getHints` is the seam `data-asset-loaders.ts`'s live
  hint-fetch depends on.
