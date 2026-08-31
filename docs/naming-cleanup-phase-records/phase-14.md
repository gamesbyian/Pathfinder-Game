# Phase 14 execution record

## 0. Execution identity

| Field | Value |
| --- | --- |
| Phase | 14 — application facade cleanup |
| Current batch | 14B LevelUtils facade removal |
| Status | 14B validated; merge pending |
| Base `main` SHA | `03a1298669df019d5cbef486890e044fc7f1f07e` |
| Branch | `chatgpt/phase14b-level-utils-removal-2026-08-31` |
| PR | #1625 |
| Selected ledger row IDs | NC-P14-004 |
| Phase batch order | 14A -> 14B -> 14C1 -> 14C2 -> 14D |
| Highest phase risk | high (NC-P14-006 in 14C2) |
| 14A risk | medium |
| Implementation agent/session | ChatGPT GitHub session, 2026-08-31 |

### Entry preflight

- [x] Phase 13 is structurally closed and `lastCompletedPhase` is 13.
- [x] `activeExecution` is idle on current main.
- [x] no open Phase-14 naming-cleanup PR was found.
- [x] no Phase-14 branch was found.
- [x] branch starts from current main `8432f175b26934606355b0f4150912fabd84085a`.
- [x] canonical retained terms NC-P14-009/010 remain out of implementation scope.

## 1. Phase partition and merge barriers

Phase 14 is explicitly serial. No batch may be stacked on an unmerged predecessor.

1. **14A core extraction:** NC-P14-001/002/003.
2. **14B level-utils facade removal:** NC-P14-004.
3. **14C1 local state/render names:** NC-P14-005/007/008.
4. **14C2 atomic mutable application state graph:** NC-P14-006.
5. **14D merged-tree closeout:** rowless consumer-inward architecture/browser/residue audit, including
   retained-term proof for NC-P14-009/010.

Rows not owned by the active batch remain pending.

## 2. 14A reconciliation and ownership

Current `modules/core.ts` still constructs a mixed dependency bag containing:

- DOM lookup `$`;
- axis/mode/logic/overlay constants;
- `DEV`;
- mutable audio adapter `SOUND_BUS`;
- generic `deepClone`.

Current `app.ts` still calls `createCore`, passes the bag to state/UI/debug/renderer/LevelUtils/
editor/engine/input/loader/boot, wires the mute provider through `core.SOUND_BUS`, passes
`core.deepClone` into data, exposes `Core` on the opt-in mutable debug facade, and uses
`core.deepClone` for read-only diagnostics.

The future-phase preparation ownership map remains correct:

| Core member group | 14A destination |
| --- | --- |
| axis/mode/logic/overlay constants | direct imports from a dedicated application constants module |
| `DEV` | direct composition/application constant |
| `SOUND_BUS` | `audioService` from `modules/audio-service.ts`, injected only where sound is needed |
| `deepClone` | direct pure helper import |
| `$` | no shared facade; browser/UI consumers own DOM lookup locally |
| `createCore` | removed after all consumers receive direct dependencies |
| `modules/core.ts` | deleted after consumer census reaches zero |

No current consumer found a persistence or externally versioned owner for `createCore` or
`SOUND_BUS`. The mutable `window.APP` facade is debug-only; 14A removes its `Core` member rather
than retaining an unowned compatibility facade.

## 3. 14A behavior invariants

- audio remains muted before synth construction/playback;
- audio unlock listeners remain one-shot pointer/keyboard/touch listeners;
- Tone start/context-resume and first-play-error reporting semantics remain unchanged;
- initial state constants and every mode/logic/overlay comparison keep the same values;
- data cloning and read-only diagnostics preserve current structuredClone-with-JSON-fallback behavior;
- no browser-free domain module gains DOM or Tone dependencies;
- no qualified ADR `*-core.ts` file or `state/actions/core-actions.ts` is renamed or removed.

## 4. 14A validation topology

- dedicated audio service unit tests replace `core.test.ts`;
- application composition tests prove only `audioService` and direct helpers/constants are wired;
- state/engine/input/UI unit suites execute current constant-driven behavior;
- source and test TypeScript checks catch stale constructor signatures;
- architecture/text residue guard must prove `modules/core.ts`, `createCore`, and `SOUND_BUS`
  are gone from maintained current code after 14A;
- full CI and Chromium gate are required on the exact final 14A head.

## 5. 14A implementation log

Initial implementation removes the mixed `core` dependency bag from composition, state, UI,
renderer, editor, engine, input and their controller subgraphs.

New owners:
- `app-constants.ts` for immutable axis/mode/logic/overlay vocabulary and `DEV`;
- `audio-service.ts` for the former sound bus behavior;
- `deep-clone.ts` for the existing structuredClone/JSON fallback helper.

Audio is injected only into engine/input paths that actually play sound. Constants are imported
directly by their consumers. `app.ts` no longer constructs or returns a core facade, and
`createAppFacade` no longer exposes `Core`.

`modules/core.ts` and `modules/core.test.ts` are deleted. The extracted audio behavior has a
dedicated unit test, and `check:naming-cleanup-phase14-core-closeout` is enrolled permanently in
the validator graph. The first exact-head CI pass is expected to identify any remaining stale test
fixtures or indirect consumers; those will be repaired rather than allowlisted.

## 6. 14A validation

The first exact-head CI run `33430106823` was intentionally useful. Build, lint, Node tests,
deep proofs, deep verification, and Chromium all passed, while the validator lane found three
classes of 14A fallout:

1. `pointer-input-controller.ts` inherited narrower literal types from direct constant imports, so
   two `.includes(...)` checks rejected the existing string-typed state fields. The receivers were
   widened to `readonly string[]` without changing membership or runtime behavior.
2. `state/actions/rating-actions.test.ts` still passed the retired `core` fixture to
   `createEngineState`, whose 14A signature no longer accepts it. The stale fixture was removed.
3. the first Phase-14A residue guard used `core\\s*\\.` broadly enough to mistake qualified
   retained imports such as `navigation-core.js`, `review-core.js`, and
   `editor-toolbar-core.js` for the deleted top-level dependency bag. The matcher now excludes
   hyphen-qualified core filenames. A dedicated Node negative-fixture test pins both sides: real
   `createCore`, `SOUND_BUS`, `core.*`, and `./core.js` residue fail, while ADR-qualified
   `*-core.js` imports pass.

A behavior-preservation review also removed a gratuitous `Object.freeze()` introduced on the new
constant objects. The old `core.ts` objects were ordinary objects; the extracted module now changes
ownership only, not runtime mutability semantics.

Final behavior/evidence head `49449c295c3ba95d9548366e554992ba7ceb33c7` passed:

- ordinary CI `33431471911`: checks, Node tests, build, lint, deep proofs and deep verification;
- Chromium gate `33431472195`: success;
- source and test TypeScript checks;
- dedicated audio service tests preserving mute-before-synth and one-shot unlock behavior;
- application composition tests proving direct `audioService`/helper wiring;
- `check:naming-cleanup-phase14-core-closeout`: deleted top-level facade and retired API residue
  absent while retained qualified core modules remain legal;
- the negative-fixture test for the residue guard itself.

### 6.1 Consumer-inward 14A audit

The closeout pass worked from consumers back toward the deleted facade:

- `app.ts` creates `audioService` directly, injects it only into engine/input paths that need
  sound, supplies the standalone `deepClone` helper to data/diagnostics, and exposes no debug
  `Core` member;
- state/UI/debug/renderer/engine/input/editor consumers import only their needed application
  constants or explicit dependencies;
- audio-producing engine/input controllers receive `audioService` rather than a generic bag;
- `modules/core.ts` and `modules/core.test.ts` are absent;
- no maintained module imports `./core.js`, names `createCore`, or uses `SOUND_BUS`;
- retained ADR-qualified `*-core.ts` modules and `state/actions/core-actions.ts` are untouched.

NC-P14-001, NC-P14-002, and NC-P14-003 therefore have complete implementation, validation,
consumer-audit, behavioral-parity, and batch closeout evidence. Phase-wide merged-tree closeout is
still required in 14D, but these row-level verification dimensions are complete.

## 7. 14B LevelUtils facade removal

Started from merged 14A main `03a1298669df019d5cbef486890e044fc7f1f07e`.

The facade was decomposed by ownership, not replaced with another bag:

- pure cell-key, portal, move-rule, geometry, and codec consumers import their domain owners directly;
- `normalizeLevel` moved to `modules/level-data.ts` as
  `normalizeLevelFromData(data, index, reportError)`, preserving diagnostic validation,
  parsing, and shallow-freeze behavior;
- `getGridCoord` moved to `modules/input/grid-coordinates.ts`, taking live engine state and
  canvas explicitly rather than closing over app/renderer state; `createInput` exposes only this
  input-owned adapter for debug/browser characterization;
- `shiftLevelCoords` and `applyCoordMapToLevel` moved to
  `modules/editor/level-coordinate-transforms.ts`, keeping coordinate mutation editor-owned;
- state, controller, engine, and input dependency types no longer expose a `LevelUtils` port;
- application composition no longer constructs, returns, or exposes `levelUtils`;
- the old facade module and its superseded test are deleted.

The first CI pass exposed incomplete migration fallout rather than behavior changes: the old file
still existed with a removed port type, app tests retained a dead `receivedLevelUtils` assertion,
one reset test fed an invalid raw level into the new real normalization path, a submission test
kept an unused facade-era import, and the browser characterization still read
`window.APP.LevelUtils`. Those were repaired at their new owners rather than by restoring a
compatibility bag.

The second validator pass then found deeper residue:
- `modules/domain/domain.test.ts` still bootstrapped `createLevelUtils`; it now imports the
  cell-key, codec, move-rule, and level-data owners directly;
- the Phase-11 orientation workflow/closeout inventory still named the deleted file; both now follow
  `input/grid-coordinates` and editor coordinate transforms;
- a stale diversification comment named the old facade;
- the Phase-13 metric ownership ratchet was reconciled for the new raw-fixture test owners;
- current hardening prose was updated to describe the deleted facade rather than link a dead source.

Final behavior/evidence head `8b1dc88e65e96a869fce12381c20289974e49eeb` passed ordinary CI
`33435268380` and Chromium gate `33435268353`. The permanent
`check:naming-cleanup-phase14-level-utils-closeout` scans maintained module surfaces and rejects
the old import, constructor, type, dependency name, or physical facade reintroduction.

NC-P14-004 therefore has implementation, targeted validation, consumer audit, behavioral parity,
and row-level closeout evidence complete. Phase-wide merged-tree closeout remains 14D.

## 8. 14C1 local state/render names

Not started. Must branch from merged 14B main.

## 9. 14C2 atomic ENGINE graph

Not started. Must branch from merged 14C1 main. Public/debug `State.ENGINE` migrates atomically with
the state property; no compatibility alias is authorized.

## 10. 14D merged-tree closeout

Not started. Must branch from merged 14C2 main.

## 11. Final closure

Phase 14 remains incomplete until 14D is merged, NC-P14-001 through NC-P14-010 have complete
verification/disposition evidence, structured closure evidence is recorded, and
`lastCompletedPhase` advances to 14.
