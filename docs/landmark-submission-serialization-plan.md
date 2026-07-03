# Landmark Submission Serialization Fix Plan

## Intent and context

Submitted levels currently lose landmark identity for the newer landmark mechanics. A level can be authored in Edit Mode with must-turn, surround, and adjacent-turn objects, but the submission payload is built by a hand-written serializer that emits only the generic derived fields (`mustPass` and `blocks`) and omits the canonical `landmarks` field. When Review mode later parses the submitted raw level, the parser can only reconstruct what is present in the payload: must-turn cells come back as ordinary must-pass points, while surround and adjacent-turn cells come back as ordinary blocks.

The fix is not just to add one missing property in one object literal. The full intent is to remove the serializer drift that allowed this data loss, make landmark mechanics part of the canonical persisted level shape everywhere a level is exported or submitted, and make duplicate detection aware that landmark mechanics are semantically different from their generic derived buckets.

Avoiding `undefined` fields is preferred. All new serialization helpers should omit fields intentionally rather than assigning `undefined` as a deletion/ignore signal.


## Handoff summary for a fresh AI coder

Start by reading these files in order:

1. `modules/domain/level-codec.ts` — contains `parseRawLevel`, `_denormLandmarks`, and `denormalizeLevel`; this is the existing canonical parser/denormalizer for raw level data.
2. `modules/input/submission-controller.ts` — contains the lossy inline `buildLevelData` closure used for duplicate checks and Firestore submission.
3. `modules/editor/editor-export.ts` — contains the separate compact export serializer that should stop maintaining its own field list.
4. `modules/domain/level-fingerprint.ts` — contains the fingerprint payload that currently ignores `landmarks`.
5. `modules/domain/landmark-rules.ts` — contains the authoritative role/turn normalization helpers and landmark mechanical effects.
6. `modules/domain/level-codec-roundtrip.test.ts`, `modules/domain/path-validator.test.ts`, and `modules/runtime/game-rules.test.ts` — contain the closest existing tests for landmark parsing, serialization, and mechanics.

Make the implementation in this order: canonical serializer helper first, submission usage second, editor export third, fingerprint fourth, tests last. Do not begin by changing Review mode; Review mode is exposing the loss but is not the root cause.


## Self-audit and corrected assumptions

A careful challenge to this plan found one important trap: **do not simply add raw `landmarks` to the existing fingerprint payload while leaving raw `blocks` and `mustPass` comparison unchanged.** Existing raw level data may express landmark mechanics with `landmarks` only, while `denormalizeLevel` may output both `landmarks` and the derived generic buckets (`blocks` for impassable landmarks, `mustPass` for must-turn landmarks). Those two wire shapes are mechanically equivalent after parsing, but a naive raw-array fingerprint would treat them as different.

Therefore, the fingerprint work must canonicalize by **mechanics**, not by the exact raw arrays as authored. Acceptable approaches:

1. Parse the raw level to normalized form and fingerprint the normalized mechanical structures; or
2. Canonicalize raw data by applying landmark mechanics before comparison and removing/ignoring generic entries that are duplicated solely because a landmark also contributes to `blocks` or `mustPass`.

The important invariant is this: a level whose raw data has `landmarks: [{ role: 'surround', ... }]` and no corresponding generic block must fingerprint the same as the same level after canonical export if that export includes both the landmark and its derived block. Conversely, a true plain block with no landmark at that coordinate must still fingerprint differently from a surround or adjacent-turn landmark.

This correction does not change the root diagnosis. The submission bug is still caused by omitting `landmarks` and preserving only derived generic buckets. It does refine the fingerprint phase: landmark-aware fingerprinting must be normalized/semantic, not just "append sorted landmarks to the old raw fingerprint payload."

## Current failure model

1. Editor placement applies landmark mechanics into both landmark-specific structures and generic traversal buckets:
   - `surround` goes into `surroundKeys` and `blockSet`.
   - `mustTurn` goes into `mustPassKeys` and `mustPassTurnDirs`.
   - `adjacentTurn` goes into `adjacentTurnKeys`, `adjacentTurnDirs`, and `blockSet`.
   - `landmarkMeta` records the displayed object type and base role.
2. Submission builds raw `levelData` manually in `modules/input/submission-controller.ts`.
3. That manual payload includes `blocks` and `mustPass`, but not `landmarks`.
4. Firestore stores exactly that lossy payload.
5. Review mode reads `submission.levelData` and calls `processRawLevel`/`parseRawLevel`.
6. `parseRawLevel` reconstructs true landmark mechanics only from `raw.landmarks`.
7. Because `raw.landmarks` is missing, the solver and renderer only see ordinary blocks and ordinary must-pass points.

## Design principles

- **Single source of truth for wire serialization.** Normalized-engine-level-to-wire-level conversion should live in one canonical helper and be reused by submission and editor export/copy paths.
- **No lossy persisted shape.** If a normalized level contains landmark mechanics, every persisted/exported raw level must include enough data to reconstruct those mechanics exactly.
- **No `undefined` fields.** Helpers should use object rest/destructuring or explicit object construction to omit fields that do not belong in a given output.
- **Canonical raw levels remain parser-compatible.** Existing `parseRawLevel` behavior should continue to accept raw `blocks`/`mustPass` arrays that include landmark-derived coordinates, with `landmarks` providing the additional semantic overlay.
- **Duplicate detection compares mechanics, not just cells.** A plain block is not duplicate-equivalent to a surround or adjacent-turn landmark at the same coordinate. A plain must-pass is not duplicate-equivalent to a must-turn at the same coordinate.
- **Tests assert mechanics, not just symbols.** Regression tests must inspect the normalized fields used by the solver (`surroundKeys`, `mustPassTurnDirs`, `adjacentTurnKeys`, `adjacentTurnDirs`, `landmarkMeta`) and/or validate solver/runtime behavior after serialize-then-parse.


## Concrete implementation decisions

These decisions are part of the plan, not open questions:

- Put the reusable wire serializer in `modules/domain/level-codec.ts` unless doing so creates a circular import. If a circular import appears, create `modules/domain/level-wire-data.ts` and import `denormalizeLevel` there.
- Name the helper `buildWireLevelData`. Export it for use by submission, editor export, and tests.
- The helper's default output must omit `levelId`; include it only when an explicit `includeLevelId: true` option is passed.
- The helper must never set a property to `undefined`. Use destructuring to remove unwanted fields, and only assign optional overrides when the option key is actually present and its value is not `undefined`.
- Keep `denormalizeLevel` as the source of the field list. Do not copy its list of raw-level fields into submission or editor code.
- Keep legacy raw-level parsing behavior. Do not attempt to infer missing landmarks from `blocks` or `mustPass`.
- Import and reuse `baseLandmarkRole` and `resolveLandmarkTurn` from `modules/domain/landmark-rules.ts` when canonicalizing landmarks for fingerprints. Do not duplicate role suffix parsing in fingerprint code.
- Bump both the canonical fingerprint payload `version` and the persisted `fingerprintVersion` together.
- Fingerprints must compare normalized landmark mechanics, not accidental raw wire duplication. A canonical export that includes landmark-derived `blocks`/`mustPass` entries must match legacy/raw data that has the same `landmarks` without those derived generic entries.

## Target invariants

When this plan is fully realized, all of the following must hold:

1. **Submission invariant:** Every submitted level payload is a canonical raw level that includes `landmarks` whenever the normalized working level contains landmark metadata.
2. **Review invariant:** Loading a submitted level in Review mode reconstructs landmark mechanics into the same normalized structures that existed before submission: `surroundKeys`, `mustPassTurnDirs`, `adjacentTurnKeys`, `adjacentTurnDirs`, and `landmarkMeta`.
3. **Solver invariant:** The Review-mode solver treats must-turn, surround, and adjacent-turn objects according to their landmark rules after submission and reload, not according to their generic derived buckets.
4. **Export invariant:** The editor copy/export path preserves landmark data in the emitted raw level text just as the submission path does.
5. **No-undefined invariant:** Canonical submission/export payloads do not contain properties whose value is `undefined`; fields are either present with meaningful values or intentionally absent.
6. **Fingerprint invariant:** Level fingerprints include canonical landmark mechanics, so semantically different landmark/non-landmark layouts do not collide merely because their derived `blocks` or `mustPass` coordinates match.
7. **Canonicalization invariant:** Equivalent landmark spellings canonicalize together for fingerprints and round trips. For example, `mustTurnLeft` and `{ role: 'mustTurn', turn: 'left' }` should be treated as the same mechanic if the parser treats them as the same mechanic.
8. **Backward compatibility invariant:** Existing published or submitted levels without `landmarks` continue to parse as they do today: plain `blocks` remain blocks, plain `mustPass` remains must-pass, and no synthetic landmark identity is inferred.
9. **Round-trip invariant:** For a level using all landmark roles, normalized level -> canonical wire data -> normalized level preserves the same landmark mechanics and generic traversal constraints.
10. **Regression-test invariant:** At least one automated test fails against the current lossy submission/export behavior and passes only when landmark metadata survives serialization.

## Implementation plan

### Phase 1: Add a canonical normalized-to-wire helper

Create a small domain-level helper, either in `modules/domain/level-codec.ts` or a nearby module such as `modules/domain/level-wire-data.ts`.

Required API shape:

```ts
export interface WireLevelDataOptions {
    reqLen?: number;
    reqInt?: number;
    hints?: any[];
    includeLevelId?: boolean;
}

export function buildWireLevelData(level: any, options: WireLevelDataOptions = {}): any {
    const wire = denormalizeLevel(level);
    if (!wire) throw new Error('Cannot serialize invalid level');

    const { levelId, ...withoutLevelId } = wire;
    const out: any = options.includeLevelId ? { ...wire } : { ...withoutLevelId };

    if (options.reqLen !== undefined) out.reqLen = options.reqLen;
    if (options.reqInt !== undefined) out.reqInt = options.reqInt;
    if (options.hints !== undefined) out.hints = options.hints;

    return omitUndefinedFields(out);
}
```

`omitUndefinedFields` can be a tiny local helper that copies only entries whose value is not `undefined`. It only needs to remove top-level `undefined` values produced by optional fields such as `levelId`; it does not need to recursively walk hints or nested coordinate objects unless tests reveal nested `undefined` output.

The helper should throw rather than return `null` for invalid input because the submission flow validates the working level before serialization. A thrown error is easier to catch in tests and avoids accidentally submitting an empty/null payload.

### Phase 2: Replace submission payload construction

In `modules/input/submission-controller.ts`, replace the inline `buildLevelData` object literal with a call to the canonical helper:

```ts
const buildLevelData = (hints: any = []) => buildWireLevelData(l, { reqLen, reqInt, hints });
```

Ensure the call site handles the helper's null case only if the helper can return null. Since the working level should already be validated, a thrown error may be clearer than silently continuing.

This must affect both:

- duplicate checking with `buildLevelData([])`, and
- final Firestore submission with `buildLevelData(hints)`.

The same serialized shape should be used for duplicate-checking and persistence, differing only in `hints`.

### Phase 3: Replace editor export/copy serialization

Refactor `modules/editor/editor-export.ts` so `serializeLevel()` uses the same canonical helper or `denormalizeLevel`-based path. Preserve the existing compact JSON-like output format if that format is part of the UI contract, but feed it from the canonical raw object rather than a second hand-maintained list of fields.

The output should include `landmarks` when present. It should not include `levelId` unless that export path intentionally needs it.

### Phase 4: Make fingerprinting landmark-aware

Update `modules/domain/level-fingerprint.ts` so `canonicalLevelFingerprintPayload()` includes canonical landmark mechanics and does not confuse mechanical equivalence with raw field duplication. Do **not** implement this as only "add sorted raw `landmarks` beside the existing raw `blocks` and `mustPass` arrays"; that would make mechanically equivalent pre-export and post-export landmark levels fingerprint differently if one shape includes landmark-derived generic bucket entries and the other does not.

Add a helper similar to:

```ts
function sortFingerprintLandmarks(items: any): any[] {
    return (Array.isArray(items) ? items : [])
        .map(normalizeFingerprintLandmark)
        .filter(Boolean)
        .sort((a, b) =>
            (a.y - b.y) ||
            (a.x - b.x) ||
            String(a.objectType).localeCompare(String(b.objectType)) ||
            String(a.role).localeCompare(String(b.role)) ||
            String(a.turn || '').localeCompare(String(b.turn || ''))
        );
}
```

Canonical landmark normalization should:

- normalize coordinates to positive numeric `x`/`y`, consistent with existing coordinate fingerprint helpers;
- preserve `objectType`, because visual object identity is part of authored level data;
- normalize suffixed roles to base roles (`mustTurnLeft` -> `mustTurn`, `adjacentTurnRight` -> `adjacentTurn`);
- normalize turn direction using the same semantics as `resolveLandmarkTurn`;
- include `turn` only for turn-bearing roles, and only with a meaningful canonical value;
- omit fields rather than setting them to `undefined`.

Bump the fingerprint payload version, because the fingerprint source has changed. Also update the stored `fingerprintVersion` written by the persistence layer if the app uses that value for diagnostics or future compatibility.

### Phase 5: Add focused serialization tests

Add or extend tests around the new canonical helper.

Minimum cases:

1. **Canonical helper emits landmarks.**
   - Input: normalized level with `surround`, `mustTurn`, `mustTurnLeft` or explicit left turn, `adjacentTurn`, and decorative landmarks.
   - Assert: output has the expected `landmarks` entries with coordinates, `objectType`, base `role`, and `turn` where applicable.
   - Assert: output has no properties whose value is `undefined`.

2. **Submission-shape round trip preserves mechanics.**
   - Input: normalized landmark level.
   - Action: `buildWireLevelData(level, { reqLen, reqInt, hints })`, then `parseRawLevel(output)`.
   - Assert: reparsed level has the expected `surroundKeys`, `mustPassTurnDirs`, `adjacentTurnKeys`, `adjacentTurnDirs`, and `landmarkMeta`.

3. **Generic buckets remain present and parser-compatible.**
   - Assert: output still contains landmark-derived block/must-pass coordinates if `denormalizeLevel` continues to expose those fields.
   - Assert: reparsing does not duplicate must-pass coordinates for must-turn cells beyond current expected behavior.

### Phase 6: Add behavioral regression tests

Add at least one test that verifies solver/runtime semantics survive serialization.

Preferred coverage:

1. **Must-turn regression.**
   - Serialize and reparse a level with a must-turn landmark.
   - Validate a path that only passes through the cell without turning fails.
   - Validate a path that turns at the cell succeeds if all other requirements are met.

2. **Surround regression.**
   - Serialize and reparse a level with a surround landmark.
   - Validate that a path cannot win without visiting the required reachable neighbors.

3. **Adjacent-turn regression.**
   - Serialize and reparse a level with an adjacent-turn landmark.
   - Validate that a path must include a qualifying turn adjacent to the object.

If full solver tests are costly or brittle, use the existing domain/runtime path validation and win-metric helpers where possible so the tests stay fast and deterministic.

### Phase 7: Add fingerprint tests

Add tests proving landmarks participate in identity:

1. Plain block at a coordinate and surround landmark at the same coordinate have different fingerprint sources/hashes.
2. Plain block at a coordinate and adjacent-turn landmark at the same coordinate have different fingerprint sources/hashes.
3. Plain must-pass at a coordinate and must-turn landmark at the same coordinate have different fingerprint sources/hashes.
4. Equivalent role spellings canonicalize to the same fingerprint payload:
   - `mustTurnLeft` vs `{ role: 'mustTurn', turn: 'left' }`.
   - `adjacentTurnRight` vs `{ role: 'adjacentTurn', turn: 'right' }`.
5. Landmark order does not affect the fingerprint payload.
6. A raw landmark-only shape and a canonical export shape with the same landmark plus derived `blocks`/`mustPass` entries produce the same fingerprint payload.
7. A true plain block/must-pass without a landmark still differs from the landmark mechanic at the same coordinate.
8. No fingerprint payload entries contain `undefined` fields.

### Phase 8: Update approval/review assumptions if needed

Review approval currently denormalizes the working review level before publishing. Confirm that this already uses the canonical path or switch it to the new helper if doing so improves consistency.

The goal is that pending submissions, approved published levels, and copied/exported level data all share the same raw-level semantics.

### Phase 9: Run verification

Run targeted tests first:

```sh
npx vitest run modules/domain/level-codec-roundtrip.test.ts
npx vitest run modules/domain/level-fingerprint.test.ts
npx vitest run modules/input/submission-core.test.ts
```

Then run any new tests added for submission serialization and runtime landmark behavior.

If the full suite is practical in the environment, run it before merging:

```sh
npx vitest run
```


## Required test files and assertions

The implementation should add or update these tests explicitly:

1. `modules/domain/level-codec-roundtrip.test.ts`
   - Add coverage for `buildWireLevelData`.
   - Assert that the helper emits `landmarks`, omits `levelId` by default, includes `levelId` only when requested, applies `reqLen`/`reqInt`/`hints` overrides, and has no top-level `undefined` values.
   - Assert that `parseRawLevel(buildWireLevelData(level))` preserves `surroundKeys`, `mustPassTurnDirs`, `adjacentTurnKeys`, `adjacentTurnDirs`, and `landmarkMeta`.

2. `modules/editor/editor-export.test.ts` or an existing editor export test if one already exists
   - Assert that `serializeLevel` output contains a `landmarks` field for a level with landmarks.
   - Parse the compact JSON-like output using the same approach existing tests use, or add a small local helper if no parser exists.

3. `modules/domain/level-fingerprint.test.ts`
   - Assert that plain block vs surround, plain block vs adjacent-turn, and plain must-pass vs must-turn produce different fingerprint sources.
   - Assert that equivalent suffixed-role and explicit-turn spellings produce the same canonical fingerprint payload.
   - Assert that landmark ordering does not affect the fingerprint payload.
   - Assert that no landmark fingerprint entry contains an `undefined` property.

4. Existing mechanics tests in `modules/domain/path-validator.test.ts` or `modules/runtime/game-rules.test.ts`
   - Add serialize-then-parse variants for must-turn, surround, and adjacent-turn.
   - The test must fail if `landmarks` is omitted from the serialized payload.

## Acceptance checklist

- [ ] Submission payloads include `landmarks` for authored landmarks.
- [ ] Editor export/copy output includes `landmarks` for authored landmarks.
- [ ] No canonical serializer returns `undefined` fields.
- [ ] Review mode reparses submitted landmark levels with landmark mechanics intact.
- [ ] The solver/runtime treats submitted-and-reloaded must-turn, surround, and adjacent-turn objects correctly.
- [ ] Fingerprints include canonical landmark mechanics and are stable across equivalent raw-vs-canonical landmark bucket duplication.
- [ ] Fingerprint versioning is updated consistently.
- [ ] Existing raw levels without `landmarks` remain backward compatible.
- [ ] Tests cover serialization shape, parse round trip, solver/runtime semantics, and fingerprint behavior.

## Non-goals

- Do not infer landmark identity from old lossy submissions that only contain generic `blocks` or `mustPass`; there is not enough information to distinguish a plain block from a surround/adjacent-turn object, or a plain must-pass from a must-turn object.
- Do not change landmark gameplay rules.
- Do not remove the generic derived bucket representation unless a broader level-format migration is intentionally designed. The immediate goal is preserving landmark metadata, not redesigning normalized level internals.
