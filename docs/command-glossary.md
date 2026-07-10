# Engine Flow Command Glossary

> **Status:** current-state reference: a canonical glossary of flow/command names mapped to
> their **actual implementation locations**. Per ADR 0006, this is a documentation/testability
> tool — there is deliberately
> **no** central dispatcher or app-wide reducer that these names route through. Each name is
> implemented as an existing runtime `ActionType`, a state-action helper, a controller method, a
> pure decision/effect core, or a small flow-local object.

Implementation-location key: **A** = runtime `ActionType` constant (`modules/runtime/actions.js`);
**SA** = state-action helper (`modules/state/actions/*.js`); **core** = pure transition/decision
core; **ctrl** = controller method (orchestration).

## Gameplay (engine)

| Command / flow | Implementation | Kind |
|---|---|---|
| `MOVE` / add path step | `computeStep` (`runtime/step-processor.js`) → effects via `effect-runner`; `pushStep` (`runtime/path-state.js`); dispatched by `step-dispatcher.js` | A + core |
| `BACKTRACK` | `computeStep` backtrack branch (`truncateNavTo`) | A + core |
| `PORTAL_TRAVERSE` | `computeStep` portal branch (`resolvePortal`) | A + core |
| `UNDO` | `PathNavigator.applySnapshot` (`engine/path-navigator.js`) + `popNavigationUndoStack` (SA); snapshot built by `createSnapshot` (`engine.js`) | core + SA |
| `RESET` | `handleResetAction` (`engine/level-flow.js`) + pure `planResetCheat`; reloads via `_loadLevelByIndex` | A + core + ctrl |
| `WIN` | `computeWinEffects` (`engine/win-controller.js`) → `effect-runner`; metrics in `runtime/game-rules.js` | A + core |
| `GOOSE_TRIGGERED` | `computeStep` goose branch + `computeJumpScareEffects` (`engine/hazard-controller.js`) | A + core |
| `FALSE_GOAL_DETONATED` | `computeStep` detonate branch + `computeFalseGoalDetonationEffects` (`engine/hazard-controller.js`) | A + core |
| `LOGIC_STATE_CHANGE` | `setLogicState` (`engine.js`); legal transitions in `runtime/state-machine.js` | A + ctrl |

## Level / mode (engine)

| Command / flow | Implementation | Kind |
|---|---|---|
| `LEVEL_LOAD` | `loadLevel` / `_loadLevelByIndex` (`engine/level-flow.js`); state via `setLevel`/`setLevelIndex` (SA) + `resetRunState` (the single nav-reset primitive) | A + ctrl |
| `LEVEL_ADVANCE` / `LEVEL_PREV` | `engine.game.loadLevel(levelIdx ± 1)` from `input/navigation-controller.js` (no separate method — the `ActionType` names the intent) | A + ctrl |
| `LEVEL_RESTART` | `handleResetAction` → `_loadLevelByIndex(levelIdx, true)` | A + ctrl |
| `SWITCH_MODE` | `switchMode` (`engine/level-flow.js`); `setMode` (SA) + shared `_initEditorWorkingCopy` | ctrl |

## Editor

| Command / flow | Implementation | Kind |
|---|---|---|
| Edit snapshot (undo/redo) | `saveEditorSnapshot` / `restoreEditorSnapshot` (`editor/editor-history.js`) | core |
| Editor working-copy init | `_initEditorWorkingCopy` (`engine/level-flow.js`) | ctrl |

## Review

| Command / flow | Implementation | Kind |
|---|---|---|
| `REVIEW_APPROVE` / `REVIEW_REJECT` advance | pure `planSubmissionAdvance` + `removeAndAdvance` (`engine/review-mode.js`); handlers in `input/review-controller.js` choose the message | core + ctrl |
| Load review level | `loadReviewLevel` (`engine/review-mode.js`) | ctrl |
| Set / remove submissions | `setReviewSubmissions` / `removeReviewSubmission` (SA via review-mode) | SA |

## Solver lifecycle

| Command / flow | Implementation | Kind |
|---|---|---|
| `SOLVER_STARTED` | `startSolverRun` (SA) via `engine/solver-manager.js` | SA |
| `SOLVER_COMPLETED` | `endSolverRun` (SA) | SA |
| Solver cancelled | `cancelSolver` (`solver-manager.js`) + `requestSolverAbort` (SA) | SA + ctrl |
| Set hint paths | `setHintPaths` (SA) | SA |

## Persistence

| Command / flow | Implementation | Kind |
|---|---|---|
| `SUBMIT_LEVEL_REQUESTED` | `submitWorkingLevel` (`input/submission-controller.js`) | ctrl |
| Approve submission / hint-addition | `persistence.approveSubmission` / `approveHintAddition` (`persistence/review-repository.js`) | ctrl |
| `REVIEW_APPROVE_CONFIRMED` (reject) | `persistence.rejectSubmission` | ctrl |
| Progress persistence | `persistSessionState` (`persistence/progress-store.js`) | ctrl |

## Testability

- Pure cores (`computeStep`, `computeWinEffects`, `compute{JumpScare,FalseGoalDetonation}Effects`,
  `planResetCheat`, `planSubmissionAdvance`, `PathNavigator.applySnapshot`) are unit-tested without
  the DOM.
- `replayMoves(baseState, targetKeys, level)` (`runtime/path-state.js`) replays a `MOVE` sequence
  through the real transition for declarative tests.
- `test:path-state-invariants` guarantees the incremental and recomputed derived nav state agree.
