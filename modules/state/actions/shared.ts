// Shared helper for the state-action modules. Every action accepts either the top-level
// State object (with an `.ENGINE` property) or the engine state object directly, and
// resolves to the engine state it mutates.
export const resolveEngineState = (stateOrEngine: any): any => stateOrEngine?.ENGINE ?? stateOrEngine;
