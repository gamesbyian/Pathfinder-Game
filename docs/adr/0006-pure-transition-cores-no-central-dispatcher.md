# ADR 0006: Pure transition/decision cores per flow; no central command dispatcher

**Status:** Accepted (modernization-plan §2 realized).

## Context
`engineState` is one mutable tree. ADR 0002 confines mutation to state-action helpers, but correctness
of complex flows (movement, undo, reset, win, hazard, level-load, review) still lived in imperative
controller code that was hard to test without booting the DOM. modernization-plan §2 asked to make
these flows inspectable and testable as transitions.

A literal reading of §2 suggests a single command dispatcher: every change dispatched as a command
through one reducer that returns `{ state patch, effects }`, plus a global transition log. The
plan's own guiding principles push back on that: "Use commands only for significant state changes;
small local UI state may remain imperative," and "Extend the existing runtime action/effect
vocabulary rather than inventing a parallel system."

> This matches the clarified modernization-plan §2 (commit `213b7b6`): the flow vocabulary is a
> documentation/testability tool mapped to existing implementations (see `docs/command-glossary.md`),
> not a mandate for a global dispatcher/reducer. (Note: that clarification was later reverted on
> `main` by an unrelated merge — see the journal — and is restored on this branch.)

## Decision
Each correctness-sensitive flow gets a **pure, unit-tested transition or decision core**, and the
owning controller applies the result. We do **not** introduce a single central command dispatcher
or a global transition log.

- **Effects-as-data cores** (return `Effect[]`, executed by `modules/runtime/effect-runner.js`):
  `computeStep` (movement), `computeWinEffects` (win), `compute{JumpScare,FalseGoalDetonation}Effects`
  (hazard).
- **Pure decision cores** (return a plain decision object the controller applies):
  `planResetCheat` (reset-streak cheat), `planSubmissionAdvance` (review approve/reject advance),
  `PathNavigator.applySnapshot` (undo restoration).
- **Thin slice updates** for the rest (solver lifecycle `startSolverRun`/`endSolverRun`, level/mode
  orchestration): state goes through state-action helpers (ADR 0002); shared sub-steps are factored
  (`_initEditorWorkingCopy`, `resetRunState`).
- **Inspectability/testability:** the move pipeline returns its gameplay-event/effect sequence;
  `replayMoves(baseState, targetKeys, level)` replays a move sequence through the pure transition so
  tests read as behavior specs. `test:path-state-invariants` guarantees incremental vs. recomputed
  derived nav state can't diverge.

## Consequences
- Every gameplay-critical flow is testable without the DOM, and side effects at the core boundary
  are data, not hidden imperative calls.
- There is intentionally no global "dispatch + transition log" surface. The trade-off: you inspect a
  flow via its own pure core + the move pipeline's returned events, not via one central log. A
  cross-flow debug log would require the central dispatcher we deliberately avoided; if that need
  becomes real, it can be added without unwinding these cores.
- state-action helpers remain the mutation boundary (ADR 0002); these cores sit above them.
