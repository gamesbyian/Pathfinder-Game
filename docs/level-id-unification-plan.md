# Level ID Unification Plan

> **Status: proposed, nothing started.** This is a design record for a specific, real risk found
> during 2026-07-12 solver/tooling work — it has not been scoped into implementation phases yet
> because it touches live production data (Firestore ratings, local hints, the deployed game's
> hint-fetch URLs) and needs a maintainer decision on sequencing/format before any code changes.
> When work starts, pull the relevant section into its own dated implementation-plan doc (see
> `hint-workbench-implementation-plan.md` in `docs/archive/` for the shape) and fold what ships
> into `CLAUDE.md`'s "Level Stats"/"Provenance" sections and `docs/architecture.md`.
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

## Current state (as of 2026-07-12, verified against the actual code)

| | Published (`data/levels.json`) | Corpus 1 (`stress-levels.json`) | Corpus 2 (`stress-levels-random.json`) |
|---|---|---|---|
| Has an `id` field on the level object? | **No** | Yes (`S00001`, ...) | Yes (`R00001`, ...) |
| `id` assigned how? | n/a | Monotonic counter at generation time, zero-padded 5 digits, never reused even across deletions (`generate.mjs`/`generate-random.mjs`'s `idCounter`) | Same |
| `id` aligned with array position? | n/a (no id) | **No** — non-contiguous after migrations/cleanup (`S00001, S00028, S00030, ...`) | **No** — same reason (`R00001, R00039, ...`) |
| Local hint-file join key (`data/hints/<NNNNN>.json` / `data/stress/hints{,-random}/<NNNNN>.json`) | **Array position** (`i+1`) | **Array position** (`i+1`) — the `id` field is *not* used here | **Array position** (`i+1`) — same |
| Runtime hint fetch (`data-asset-loaders.ts`) | Constructs the fetch URL directly from the numeric position (`00047.json`) | n/a (never shipped to the app) | n/a |
| `--levels=` CLI convention | 1-based array position (`solution-profile.mjs`, `hint-corpus-expand.mjs`, `run-solverv2-direct.mjs`) | Same tools: position. `benchmark.mjs`-family tools (built specifically for the stress corpora): id string | Same split |
| Firestore identity | `published_levels/{levelId}` — an **opaque Firestore auto-generated doc id**, staging area between review-approval and the periodic `levels:import-published` pull into the git corpus | n/a | n/a |
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
   just start actually *using* them, see step 3). Published levels need a prefix decided (see Open
   Questions) and a one-time backfill (step 2).
2. **Backfill published levels' ids** (one-time script, same shape as `backfill-level-provenance.mjs`
   / `migrate-hint-schema-v2.mjs`): assign ids to the 156 existing levels preserving *current* array
   order as initial id order (level 1 → id `00001`, etc.), so the migration itself doesn't reshuffle
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
5. **Unify `--levels=` parsing** across every corpus-capable tool (`solution-profile.mjs`,
   `solution-profile-compare.mjs`, `hint-corpus-expand.mjs`, `run-solverv2-direct.mjs`) to accept id
   strings the same way `benchmark.mjs`'s `selectLevels()` already does, instead of assuming array
   position. One shared helper, not four separate parsers.
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

- [ ] All 3 corpora's raw levels carry a persistent `id`, assigned once, never reused or recomputed.
- [ ] `data/hints/<NNNNN>.json` and both stress corpora's hint directories are keyed by `id`, not
      array position.
- [ ] The deployed app's hint fetch resolves by `id` and has been verified against a production
      build (not just `npm run dev`), including the two live-only flows (`tests/csp.spec.mjs`-style
      real-deploy checks) this repo already treats as needing separate verification for other CSP-
      adjacent changes.
- [ ] Every corpus-capable CLI tool's `--levels=` accepts id strings uniformly via one shared parser.
- [ ] `domain/level-fingerprint.ts` excludes `id` from its comparison fields; a before/after
      fingerprint diff over the full published corpus confirms zero fingerprints changed as a
      result of the backfill.
- [ ] `level-codec.ts`'s normalize/denormalize round trip preserves `id` (unit-tested, matching the
      existing `level-codec-roundtrip.test.ts` coverage style).
- [ ] Every published level can be freely reordered in `data/levels.json` (a maintainer edit,
      regenerated heatmaps, or anything else that reshuffles the array) without any hint file,
      rating, or local-hint entry becoming misattributed — ideally covered by an actual test that
      reorders the array and asserts hint identity survives.

## Explicitly open — needs a maintainer decision before implementation starts

- **Published-level id prefix.** Stress corpora use `S`/`R`. Published needs its own — a plain
  5-digit number with no prefix (matching the existing hint-filename convention exactly) is the
  simplest option; a letter prefix (`P00001`) would make published/stress ids visually
  distinguishable in mixed contexts (e.g. this doc's own tables) at the cost of being a bigger
  departure from the current filename format.
- **Whether this is one migration or staged**, and if staged, whether corpus-1/corpus-2's rollout
  (lower risk) happens as a separate, sooner piece of work from published (higher risk, needs the
  live-fetch-path change) — the sequencing recommendation above assumes staged, but that's a
  proposal, not a decision.
- **Whether `data.ts`'s public `getHints()` signature should change** (from `levelNumber: number` to
  something id-aware) or whether a translation layer (position → id) should be kept internally so
  every *other* caller of `getHints` — there are several across `engine/`, `input/` — doesn't need
  auditing/updating in the same pass. Keeping position as the public API and translating internally
  is probably lower-risk short-term, but re-introduces a position dependency at the API boundary
  that a future caller could misuse the same way this whole problem started.
