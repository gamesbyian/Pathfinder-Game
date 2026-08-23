# Engine Flow Command Glossary

> **Status:** current-state reference: a canonical glossary of flow/command names mapped to
> their **actual implementation locations**. Per ADR 0006, this is a documentation/testability
> tool — there is deliberately
> **no** central dispatcher or app-wide reducer that these names route through. Each name is
> implemented as an existing runtime `ActionType`, a state-action helper, a controller method, a
> pure decision/effect core, or a small flow-local object.

Implementation-location key: **A** = runtime `ActionType` constant (`modules/runtime/actions.ts`);
**SA** = state-action helper (`modules/state/actions/*.ts`); **core** = pure transition/decision
core; **ctrl** = controller method (orchestration).

## Gameplay (engine)

| Command / flow | Implementation | Kind |
|---|---|---|
| `MOVE` / add path step | `computeStep` (`modules/runtime/step-processor.ts`) → effects via `effect-runner`; `pushStep` (`modules/runtime/path-state.ts`); dispatched by `modules/engine/step-dispatcher.ts` | A + core |
| `BACKTRACK` | `computeStep` backtrack branch (`truncateNavTo`) | A + core |
| `PORTAL_TRAVERSE` | `computeStep` portal branch (`resolvePortal`) | A + core |
| `UNDO` | `PathNavigator.applySnapshot` (`modules/engine/path-navigator.ts`) + `popNavigationUndoStack` (SA); snapshot built by `createSnapshot` (`modules/engine.ts`) | core + SA |
| `RESET` | `handleResetAction` (`modules/engine/level-flow.ts`) + pure `planResetCheat`; reloads via `_loadLevelByIndex` | A + core + ctrl |
| `WIN` | `computeWinEffects` (`modules/engine/win-controller.ts`) → `effect-runner`; metrics in `modules/runtime/game-rules.ts` | A + core |
| `GOOSE_TRIGGERED` | `computeStep` goose branch + `computeJumpScareEffects` (`modules/engine/hazard-controller.ts`) | A + core |
| `FALSE_GOAL_DETONATED` | `computeStep` detonate branch + `computeFalseGoalDetonationEffects` (`modules/engine/hazard-controller.ts`) | A + core |
| `LOGIC_STATE_CHANGE` | `setLogicState` (`modules/engine.ts`); legal transitions in `modules/runtime/state-machine.ts` | A + ctrl |

## Level / mode (engine)

| Command / flow | Implementation | Kind |
|---|---|---|
| `LEVEL_LOAD` | `loadLevel` / `_loadLevelByIndex` (`modules/engine/level-flow.ts`); state via `setLevel`/`setLevelIndex` (SA) + `resetRunState` (the single nav-reset primitive) | A + ctrl |
| `LEVEL_ADVANCE` / `LEVEL_PREV` | `engine.game.loadLevel(levelIdx ± 1)` from `modules/input/navigation-controller.ts` (no separate method — the `ActionType` names the intent) | A + ctrl |
| `LEVEL_RESTART` | `handleResetAction` → `_loadLevelByIndex(levelIdx, true)` | A + ctrl |
| `SWITCH_MODE` | `switchMode` (`modules/engine/level-flow.ts`); `setMode` (SA) + shared `_initEditorWorkingCopy` | ctrl |

## Editor

| Command / flow | Implementation | Kind |
|---|---|---|
| Edit snapshot (undo/redo) | `saveEditorSnapshot` / `restoreEditorSnapshot` (`modules/editor/editor-history.ts`) | core |
| Editor working-copy init | `_initEditorWorkingCopy` (`modules/engine/level-flow.ts`) | ctrl |

## Review

| Command / flow | Implementation | Kind |
|---|---|---|
| `REVIEW_APPROVE` / `REVIEW_REJECT` advance | pure `planSubmissionAdvance` + `removeAndAdvance` (`modules/engine/review-mode.ts`); handlers in `modules/input/review-controller.ts` choose the message | core + ctrl |
| Load review level | `loadReviewLevel` (`modules/engine/review-mode.ts`) | ctrl |
| Set / remove submissions | `setReviewSubmissions` / `removeReviewSubmission` (SA via review-mode) | SA |

## Solver lifecycle

| Command / flow | Implementation | Kind |
|---|---|---|
| `SOLVER_STARTED` | `startSolverRun` (SA) via `modules/engine/solver-manager.ts` | SA |
| `SOLVER_COMPLETED` | `endSolverRun` (SA) | SA |
| Solver cancelled | `cancelSolver` (`modules/engine/solver-manager.ts`) + `requestSolverAbort` (SA) | SA + ctrl |
| Set hint paths | `setHintPaths` (SA) | SA |

## Persistence

| Command / flow | Implementation | Kind |
|---|---|---|
| `SUBMIT_LEVEL_REQUESTED` | `submitWorkingLevel` (`modules/input/submission-controller.ts`) | ctrl |
| Approve submission / hint-addition | `persistence.approveSubmission` / `approveHintAddition` (`modules/persistence/review-repository.ts`) | ctrl |
| `REVIEW_APPROVE_CONFIRMED` (reject) | `persistence.rejectSubmission` | ctrl |
| Progress persistence | `persistSessionState` (`modules/persistence/progress-store.ts`) | ctrl |

## Testability

- Pure cores (`computeStep`, `computeWinEffects`, `compute{JumpScare,FalseGoalDetonation}Effects`,
  `planResetCheat`, `planSubmissionAdvance`, `PathNavigator.applySnapshot`) are unit-tested without
  the DOM.
- `replayMoves(baseState, targetKeys, level)` (`modules/runtime/path-state.ts`) replays a `MOVE` sequence
  through the real transition for declarative tests.
- Runtime/navigation behavior, including rebuild and replay paths, is covered by the Vitest unit suite (`npm run test:unit`).
