import type { EngineState } from '../../state-slices.js';

/** Either the top-level State (with `.engineState`) or the engine state object directly. */
export type StateOrEngine = { engineState?: EngineState } | EngineState | null | undefined;

// Shared helper for the state-action modules. Every action accepts either the top-level
// State object (with an `.engineState` property) or the engine state object directly, and
// resolves to the engine state it mutates.
export const resolveEngineState = (stateOrEngine: StateOrEngine): EngineState | undefined =>
    (stateOrEngine as { engineState?: EngineState })?.engineState ?? (stateOrEngine as EngineState | undefined) ?? undefined;
