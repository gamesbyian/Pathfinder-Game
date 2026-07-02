import { createEngineState } from './state-slices.js';
import type { EngineState, EngineCoreConstants } from './state-slices.js';

/** The top-level mutable application state container handed to every controller. */
export type AppState = { ENGINE: EngineState };

/**
 * The dependency bundle a controller/factory receives. The `state` carrier is typed to {@link
 * AppState} so `state.ENGINE.<field>` accesses and state-action calls are checked end-to-end; the
 * remaining injected subsystem handles (core/ui/engine/levelUtils/editor/renderer/persistence/…)
 * stay `any` by design — they are the adapter boundary (see docs/typing.md), not domain objects.
 */
export type ControllerDeps = { state: AppState; [k: string]: any };

export function createState({ core }: { core: EngineCoreConstants }): AppState {
    return { ENGINE: createEngineState({ core }) };
}

/**
 * The level currently being played/edited: the play-mode `level`, or the editor's
 * `workingLevel` in editor/review mode. This "which level is active" branch recurs across
 * the render, input, and engine layers — centralize it so the mode→level mapping lives in
 * one place. Optional-chained on `editor` so it is safe before the editor slice exists.
 */
export function activeLevel(engineState: any, core: { PLAY: number }): any {
    return engineState.mode === core.PLAY ? engineState.level : engineState.editor?.workingLevel;
}
