// @ts-check
// Shared helper for the state-action modules. Every action accepts either the top-level
// State object (with an `.ENGINE` property) or the engine state object directly, and
// resolves to the engine state it mutates.
/** @param {any} stateOrEngine @returns {any} */
export const resolveEngineState = (stateOrEngine) => stateOrEngine?.ENGINE ?? stateOrEngine;
