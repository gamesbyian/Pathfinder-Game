# ADR 0005: Grouped engine facade and narrow controller ports

**Status:** Accepted; flat-surface removal deliberately deferred.

## Context
`createEngine()` returned a very wide flat "god-object" facade, and controllers (and the
editor) tended to receive whole subsystems (`engine`, `state`, `ui`) rather than the narrow
slice they used.

## Decision
- `createEngine()` returns the flat methods **plus** grouped namespaces (`game`, `navigation`,
  `overlays`, `hints`, `solver`, `review`, `ratings`). Each grouped entry is the *same function
  instance* as its flat counterpart (`engine-facade-unit-tests` guards this). Input controllers
  call the grouped namespaces.
- The editor receives a **narrow port** — `createEditorEnginePort(engine)` (9 members) injected
  via `editor.init({ engineRuntime })` — not the whole engine.

## Consequences
- Intent is visible at call sites (`engine.solver.cancelSolver`, not `engine.cancelSolver`).
- The editor cannot reach unrelated engine behavior.
- The **flat surface is intentionally retained**: the grouped namespaces are *built from* it,
  and `boot.js`/the editor port/`window.APP.Engine` debug consume it. Removing flat methods
  would be a risky `engine.js` restructure for cosmetic gain, so it is deferred (the achievable,
  valuable part — migrating callers to groups — is complete). The remaining flat-only methods
  (`setLogicState`, `switchMode`, `setMuted`, `setOption`, pending-action trio, `toggleMute`,
  `updatePlayModeLayout`) have no group by design.
- This realizes part of modernization-plan §1 (narrow ports). Broader port definitions
  (`RendererPort`, `UiPort`, …) are **deliberately not planned**: they would mean typing the
  `ui`/`renderer`/`engine` dependency bags — exactly the adapter-boundary typing declined in
  ADR 0011's "Scope decisions". The domain-object-bearing bags *are* typed (`modules/ports.ts`);
  the DOM/controller bags stay `any` by design.
