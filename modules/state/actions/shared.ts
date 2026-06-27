import type { EngineState } from '../../state-slices.js';

/** Either the top-level State (with `.ENGINE`) or the engine state object directly. */
export type StateOrEngine = { ENGINE?: EngineState } | EngineState | null | undefined;

// Shared helper for the state-action modules. Every action accepts either the top-level
// State object (with an `.ENGINE` property) or the engine state object directly, and
// resolves to the engine state it mutates.
export const resolveEngineState = (stateOrEngine: StateOrEngine): EngineState | undefined =>
    (stateOrEngine as { ENGINE?: EngineState })?.ENGINE ?? (stateOrEngine as EngineState | undefined) ?? undefined;
