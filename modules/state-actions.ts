// Re-export barrel for the engine state-action helpers. All engineState mutations must flow
// through these helpers (enforced by check:engine-state-boundary). The implementations are
// split by state slice under modules/state/actions/ — this file preserves the historical
// `modules/state-actions.js` import path so existing callers keep working unchanged.
//
// Slice modules (each mutates exactly one createEngineState() slice):
//   core-actions.js       — top-level scalars (dirty/muted/mode/logic/overlay/level/cheat/
//                           reset-streak/dev-mode/flags/options) + ripples + foundHints
//   navigation-actions.js — engineState.nav.*
//   hazard-actions.js     — engineState.hazards.*
//   hint-actions.js       — engineState.hinter.*
//   solver-actions.js     — engineState.solver.*
//   review-actions.js     — engineState.review.*
//   editor-actions.js     — engineState.editor.*
//   ui-actions.js         — engineState.ui.* + engineState.gamepad.*
//   runtime-actions.js    — engineState.runtime.*
//   rating-actions.js     — engineState.levelRating.*
export * from './state/actions/core-actions.js';
export * from './state/actions/navigation-actions.js';
export * from './state/actions/hazard-actions.js';
export * from './state/actions/hint-actions.js';
export * from './state/actions/solver-actions.js';
export * from './state/actions/review-actions.js';
export * from './state/actions/editor-actions.js';
export * from './state/actions/ui-actions.js';
export * from './state/actions/runtime-actions.js';
export * from './state/actions/rating-actions.js';
