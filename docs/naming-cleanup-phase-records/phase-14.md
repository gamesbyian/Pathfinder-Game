# Phase 14 execution record

## 0. Execution identity

| Field | Value |
| --- | --- |
| Phase | 14 — application facade cleanup |
| Current batch | final immutable closure evidence |
| Status | post-closeout repair #1629 merged green; structured Phase-14 closure recorded; `lastCompletedPhase` advances to 14 in this evidence PR |
| Base `main` SHA | `4d31805cd6e1280a39ae3befefa5ed354b3d099b` (merge of audit repair #1629) |
| Branch | `chatgpt/phase14-final-evidence-after-audit-repair-2026-08-31` |
| PR | final-evidence PR pending; #1629 is the effective repaired merged-tree closeout; #1628 is superseded |
| Selected ledger row IDs | rowless repair; NC-P14-001–010 re-audited, with current-doc coverage added to the phase-wide guard |
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

Started from merged 14B main `a4139cefefb69706e70c1b4e6a637d6280802c6d`.

Authorized scope is deliberately small:

- NC-P14-005: `HinterState` -> `HintDisplayState`;
- NC-P14-007: renderer-local `publicDrawPath` -> `drawPathWithCurrentOrientation`; the renderer
  port remains named `drawPath`;
- NC-P14-008: runtime confirmation callback field `pendingAction` ->
  `pendingConfirmationAction` atomically across state/actions/controller/tests.

NC-P14-006 (`ENGINE` -> `engineState`) is high risk and explicitly excluded from this branch.
14C2 may start only after 14C1 merges.

### 8.1 14C1 validation and closeout

The first exact-head run on implementation head `2fd1e7e4e1035879319a7454eaf45cdecb62593c`
passed build, lint, Node tests, deep proofs, and Chromium but exposed one stale broad integration
test:

- `modules/state-actions.test.ts` still imported and called
  `setRuntimePendingAction` / `clearRuntimePendingAction`, even though the runtime action
  implementation and all production consumers had moved to
  `setRuntimePendingConfirmationAction` / `clearRuntimePendingConfirmationAction`.

That test surface was migrated rather than allowlisted. Repaired behavior head
`8d98ccc6990c55ba682883f09738a1bbd9f052d2` then passed:

- ordinary CI `33437133572`: checks, source/test TypeScript, Node tests, build, lint, deep proofs
  and full deep verification/coverage;
- Chromium orientation/browser gate `33437133574`: success;
- permanent `check:naming-cleanup-phase14c1-closeout`: no retired `HinterState`,
  `createHinterState`, renderer-local `publicDrawPath`, `pendingAction`, engine pending-action
  methods, or runtime pending-action state helpers remain in module/test surfaces;
- its negative-fixture Node test;
- engine facade behavior proving set/execute/clear retains exact callback identity and execute does
  not implicitly clear it;
- renderer tests retain the public `drawPath` port while its private implementation is
  `drawPathWithCurrentOrientation`.

Consumer-inward audit:

- `EngineState.hinter` remains the slice name, but its type/factory are
  `HintDisplayState` / `createHintDisplayState`;
- runtime state owns `pendingConfirmationAction`;
- runtime state actions, engine facade methods, navigation controller and tests all use the
  expanded confirmation terminology;
- `renderer.ts` keeps the external `drawPath` port and only renames the local orientation-aware
  implementation helper;
- NC-P14-006 `ENGINE` is untouched.

NC-P14-005, NC-P14-007 and NC-P14-008 are therefore row-complete. The evidence-only row-closure
head must pass fresh exact-head CI before #1626 merges.

After branch creation, `main` advanced once to
`96595c01d8bbc4b15359680c7d5c58701b99e4b6`. The delta from the recorded 14C1 base contains only
published hint refreshes, solver-workflow logs, and the hint-cost-drift report. No state slice,
renderer, runtime action, engine, navigation, test, package, or Phase-14 authority changed, so the
14C1 impact map is unchanged.

## 9. 14C2 atomic ENGINE graph

Started from merged 14C1 main `17e5668447e8779294c398791cab504114ea873c`.

NC-P14-006 is the high-risk top-level mutable-state root rename:

- `AppState.ENGINE` -> `AppState.engineState`;
- state-action wrapper unwrapping migrates to `engineState`;
- every controller/editor/render/input/runtime consumer migrates atomically;
- public/debug `window.APP.State.ENGINE` migrates to `window.APP.State.engineState`;
- browser tests and startup smoke migrate with the debug surface;
- the ESLint mutation-boundary rule changes its AST target and fixtures to `state.engineState`;
- no compatibility alias is retained.

### 9.1 Executable pre-switch census

PR #1627 first enrolled `check:naming-cleanup-phase14c2-closeout` while the old graph was still
intact. Initial CI `33437744022` deliberately failed only that future-state guard while source/test
TypeScript, Node tests, build, lint, deep proofs, and deep verification remained green.

The guard reported **53 live code/test/tool/config files** containing the exact `ENGINE` token,
covering:

- AppState construction and state-action wrapper unwrapping;
- app composition and debug facade;
- engine/controller/editor/input/renderer/runtime consumers;
- state/action tests and engine facade tests;
- Playwright a11y/editor/orientation/security/theme assertions;
- startup smoke;
- the ESLint mutation-boundary implementation and its unit fixtures.

This list became the atomic implementation graph. No source file was migrated before the census was
captured.

### 9.2 Atomic implementation

All 53 reported surfaces were transformed in a detached Git tree with an exact-token
`ENGINE` -> `engineState` switch. The tree was audited before its commit became the branch head.
The resulting atomic source commit is
`46a35b79339d927177060da7d7e16c802f636104`.

Consumer-inward checks at the architecture choke points confirmed:

- `AppState = { engineState: EngineState }` and `createState()` constructs that property;
- `StateOrEngine` and `unwrapEngineState` recognize `.engineState` rather than an alias;
- the mutable debug facade exposes exactly `State.engineState`;
- read-only diagnostics clone/read `app.state.engineState`;
- the local ESLint rule still has stable rule identity `engine-state-boundary` but its AST selector
  now protects `state.engineState.*`, including computed-access mutation;
- no compatibility getter/property named `ENGINE` was introduced.

### 9.3 Validation and parity

Atomic implementation head `46a35b79339d927177060da7d7e16c802f636104` passed:

- ordinary CI `33438809719`: validators, source/test TypeScript, Node tests, build, lint,
  deep proofs, and full deep verification/coverage;
- Chromium gate `33438809798`: success;
- `check:naming-cleanup-phase14c2-closeout`: **632 code/test/tool surfaces** scanned with zero
  retired `ENGINE` mutable-root spelling;
- app-facade unit tests for live mutable debug-state identity and read-only diagnostic copies;
- state/action and controller suites across the complete mutable graph;
- startup smoke and browser consumers using `window.APP.State.engineState`;
- ESLint rule fixtures proving direct and computed `state.engineState` mutation remains rejected.

No persistence, gameplay, solver, rendering, input, orientation, callback, or state-mutation behavior
change was introduced. The external/debug spelling changes because that surface is the rename target;
there is no stable serialized or published compatibility owner.

NC-P14-006 is therefore row-complete. This evidence-only closure head must pass fresh exact-head CI
before #1627 merges. Phase-wide closeout remains a separate 14D pass from merged main.


## 10. 14D merged-tree closeout

Started from merged 14C2 main `bd809ed8c3bb55a02757f29868eafe15fb91402d`.

14D is rowless implementation-wise. Its job is to prove the merged architecture, close the two
intentional retained-term rows, and prevent future agents from confusing those retained uses with
the deleted top-level facades.

Current retained architecture surfaces are:

- `modules/input/editor-toolbar-core.ts`
- `modules/input/false-goal-trigger-scan-core.ts`
- `modules/input/navigation-core.ts`
- `modules/input/pointer-input-core.ts`
- `modules/input/review-core.ts`
- `modules/input/solver-core.ts`
- `modules/input/submission-core.ts`
- `modules/state/actions/core-actions.ts`

The seven qualified input `*-core.ts` files are the pure transition/input cores described by ADR
0006. `core-actions.ts` is the action owner for the top-level/core engine-state slice. They are
intentional vocabulary, not residue from the deleted `modules/core.ts` dependency bag.

14D composes the permanent 14A, 14B, 14C1 and 14C2 guards, pins these retained files, and reruns
ordinary CI plus Chromium on the merged tree before Phase 14 is closed.

### 10.1 Closeout findings and validation

The first 14D CI run exposed two closeout-authority problems rather than runtime regressions:

1. the execution lock was active while every Phase-14 row was already either done or pending. The
   maintained ledger contract correctly rejected that state. NC-P14-009 and NC-P14-010 were made the
   explicit in-progress rows owned by 14D until their retained-term disposition was proven;
2. the future-phase preparation and naming plan documented both retained core terminology classes,
   but the **permanent** naming authority documented only qualified `*-core.ts` modules, not
   `state/actions/core-actions.ts`. The latter is now explicitly canonical there as the action owner
   for the top-level/core engine-state slice.

Corrected behavior/evidence head `efac451061e5a97488582ea25cf980f23ba43ad4` passed:

- ordinary CI `33439683295`: validators, source/test TypeScript, Node tests, build, lint,
  deep proofs, and full deep verification/coverage;
- Chromium gate `33439683284`: success;
- composed `check:naming-cleanup-phase14-closeout`: all four batch guards green;
- exact retained architecture inventory: seven ADR-qualified input `*-core.ts` modules plus
  `modules/state/actions/core-actions.ts`;
- permanent naming authority proof for both retained terminology classes;
- consumer-inward spot audit of app composition/debug facade, AppState, state slices, renderer,
  state actions, and browser characterization surfaces.

NC-P14-009 and NC-P14-010 are therefore `done`. Their implementation and behavioral-parity
dimensions are `not-applicable` because the intended result is deliberate retention, while
targeted validation, consumer audit, and closeout audit are complete.

All ten Phase-14 rows are now row-complete. `lastCompletedPhase` intentionally remains 13 until
PR #1628 itself passes fresh exact-head CI after this bookkeeping update, merges, and its immutable
merge evidence is recorded.

### 10.2 Row-closure checkpoint

This row-closure commit changes only ledger/evidence state. It must pass fresh exact-head ordinary
CI and Chromium before #1628 may merge.

## 11. Original 14D closure checkpoint

PR #1628 subsequently merged and satisfied the original 14D merge barrier, with all
NC-P14-001 through NC-P14-010 row-complete. The later forensic finding in Section 12 supersedes
that attempted closure: Phase 14 remains incomplete until the post-closeout repair itself merges
green, structured final closure evidence is recorded from repaired main, and
`lastCompletedPhase` advances to 14.


## 12. Post-#1628 forensic audit repair

PR #1628 merged as `8022c79aa2241be9ed6c8f9aac9380f4896a0cd9`, but a later independent
Phases 8-14 audit found that the merged-tree closeout had missed current architecture documentation.
`docs/architecture.md` still described `SOUND_BUS`, the former `core` dependency bag,
`levelUtils`, and mutable `ENGINE`; `docs/typing.md` still described `LevelUtils` and
`ENGINE` writes. These are current authorities, not frozen history, so the phase-wide
consumer-inward audit was incomplete despite the code/browser checks being green.

This post-closeout repair updates those current authorities to the merged Phase-14 architecture and
extends the permanent Phase-14 closeout guard with negative fixtures for those exact stale concepts.
Because this is a real closeout defect discovered after #1628, Phase 14 remains incomplete and
`lastCompletedPhase` remains 13 until the repair merges green and immutable final closure evidence
is recorded from the repaired merged tree.


## 13. Final immutable closure after audit repair

The post-closeout repair PR #1629 passed exact-head ordinary CI run `33443261826` and the
Phase-11 orientation/Chromium gate `33443261860` on final head
`6ec2cd8dd838a6091c51f533d97e4f3fc5f00003`, then merged as
`4d31805cd6e1280a39ae3befefa5ed354b3d099b`.

That repaired merged tree includes the missing current architecture/typing migration, exact-target
Phase-8 hardening, the Phase-9 closure-evidence backfill, and the Phase-13 real-corpus CI coverage
hardening. The permanent Phase-14 closeout guard now rejects the stale current-doc concepts that
#1628 failed to detect.

Structured `phaseClosures["14"]` therefore uses #1629 as the effective merged-tree closeout and
records #1628 only as the superseded attempted closeout. All Phase-14 rows remain complete,
`activeExecution` is idle, and `lastCompletedPhase` advances from 13 to 14 only in this
post-merge evidence step.
