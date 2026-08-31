# Engine Flow Vocabulary Glossary

> **Status:** current-state reference mapping gameplay requests, emitted events/effects, state
> actions, pure cores, and controller flows to their **actual implementation locations**. Per ADR
> 0006, there is deliberately no central gameplay command dispatcher or app-wide reducer.
>
> Gameplay/navigation requests call engine/controller/state-action ports directly. The only runtime
> gameplay-event discriminators are `GameEventType.WIN` and
> `GameEventType.LOGIC_STATE_CHANGE`; side effects use `EffectType`.

Implementation-location key: **E** = emitted runtime `GameEventType`;
**FX** = emitted `EffectType`; **SA** = state-action helper
(`modules/state/actions/*.ts`); **core** = pure transition/decision core;
**ctrl** = controller/orchestration request path.

## Gameplay (engine)

| Request / outcome / event | Implementation | Kind |
|---|---|---|
| Move / add path step | input/tap flow -> `processStep` -> `computeStep` (`modules/runtime/step-processor.ts`); path mutation via `pushStep` (`modules/runtime/path-state.ts`) | ctrl + core + SA |
| Backtrack | `computeStep` returns the `backtrack` outcome after `truncateNavTo`; it is not a gameplay-event discriminator | core outcome |
| Portal traversal | `computeStep` returns the `portal` outcome after `resolvePortal`; it is not a gameplay-event discriminator | core outcome |
| Undo | `PathNavigator.applySnapshot` (`modules/engine/path-navigator.ts`) + `popNavigationUndoStack` (SA); snapshot built by `createSnapshot` (`modules/engine.ts`) | core + SA |
| Reset | `handleResetAction` (`modules/engine/level-flow.ts`) + pure `planResetCheat`; reloads via `_loadLevelByIndex` | ctrl + core + SA |
| Win event | `computeStep` emits `GameEventType.WIN`; `modules/engine/step-dispatcher.ts` invokes `onWin`, whose win controller produces effects | E + core |
| Goose trigger | `computeStep` returns the `goose` outcome and emits jump-scare/sound effects plus a logic-state event; there is no separate `GOOSE_TRIGGERED` gameplay event | core outcome + FX + E |
| False-goal detonation | `computeStep` returns the `detonate` outcome and emits `EffectType.SHOW_FALSE_GOAL_DETONATION`; there is no separate `FALSE_GOAL_DETONATED` gameplay event | core outcome + FX |
| Logic-state change event | `computeStep` emits `GameEventType.LOGIC_STATE_CHANGE`; `step-dispatcher.ts` applies it through `setLogicState` | E + ctrl |

The step dispatcher consumes the event/effect array in order. It handles the two `GameEventType`
values locally and sends remaining `EffectType` descriptors to `runEffects`.

## Level / mode (engine)

These are direct controller requests, not members of a gameplay command transport.

| Request / flow | Implementation | Kind |
|---|---|---|
| Load level | `loadLevel` / `_loadLevelByIndex` (`modules/engine/level-flow.ts`); state via `setLevel`/`setLevelIndex` (SA) + `resetRunState` | ctrl + SA |
| Advance / previous level | `engine.game.loadLevel(levelIdx ± 1)` from `modules/input/navigation-controller.ts` | ctrl |
| Restart level | `handleResetAction` -> `_loadLevelByIndex(levelIdx, true)` | ctrl |
| Switch mode | `switchMode` (`modules/engine/level-flow.ts`); `setMode` (SA) + shared `_initEditorWorkingCopy` | ctrl + SA |

## Editor

| Request / flow | Implementation | Kind |
|---|---|---|
| Edit snapshot (undo/redo) | `saveEditorSnapshot` / `restoreEditorSnapshot` (`modules/editor/editor-history.ts`) | core |
| Editor working-copy init | `_initEditorWorkingCopy` (`modules/engine/level-flow.ts`) | ctrl |

## Review

| Request / flow | Implementation | Kind |
|---|---|---|
| Approve / reject and advance | pure `planSubmissionAdvance` + `removeAndAdvance` (`modules/engine/review-mode.ts`); handlers in `modules/input/review-controller.ts` choose the message | core + ctrl |
| Load review level | `loadReviewLevel` (`modules/engine/review-mode.ts`) | ctrl |
| Set / remove submissions | `setReviewSubmissions` / `removeReviewSubmission` (SA via review-mode) | SA |

## Solver lifecycle

| Request / flow | Implementation | Kind |
|---|---|---|
| Solver started | `startSolverRun` (SA) via `modules/engine/solver-manager.ts` | SA |
| Solver completed | `endSolverRun` (SA) | SA |
| Solver cancelled | `cancelSolver` (`modules/engine/solver-manager.ts`) + `requestSolverAbort` (SA) | SA + ctrl |
| Set hint paths | `setHintPaths` (SA) | SA |

## Persistence

| Request / flow | Implementation | Kind |
|---|---|---|
| Submit level | `submitWorkingLevel` (`modules/input/submission-controller.ts`) | ctrl |
| Approve submission / hint addition | `persistence.approveSubmission` / `approveHintAddition` (`modules/persistence/review-repository.ts`) | ctrl |
| Reject submission | `persistence.rejectSubmission` | ctrl |
| Progress persistence | `persistSessionState` (`modules/persistence/progress-store.ts`) | ctrl |

## Testability

- Pure cores (`computeStep`, `computeWinEffects`,
  `compute{JumpScare,FalseGoalDetonation}Effects`, `planResetCheat`,
  `planSubmissionAdvance`, `PathNavigator.applySnapshot`) are unit-tested without the DOM.
- `modules/runtime/actions.test.ts` locks the runtime event vocabulary to the two live emitted
  gameplay events and rejects the superseded command/outcome constants.
- `modules/runtime/step-processor.test.ts` locks event/effect shapes and observable step behavior.
- `replayMoves(baseState, targetKeys, level)` (`modules/runtime/path-state.ts`) replays a move
  sequence through the real transition for declarative tests.
- Runtime/navigation behavior, including rebuild and replay paths, is covered by the Vitest unit
  suite (`npm run test:unit`).
