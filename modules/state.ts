import { createEngineState } from './state-slices.js';
import type { EngineState } from './state-slices.js';
import type { EngineLevel } from './domain/level-schema.js';
import type { DataService, SolverApi, ReportError } from './ports.js';
import { PLAY } from './app-constants.js';

/** The top-level mutable application state container handed to every controller. */
export type AppState = { ENGINE: EngineState };

/**
 * The dependency bundle a controller/factory receives. The `state` carrier is typed to {@link
 * AppState} (so `state.ENGINE.<field>` accesses and state-action calls are checked end-to-end),
 * and the domain-object-bearing bags carry real interfaces (see ports.ts) so level objects, raw
 * data, and solver results stay typed at every call site. The remaining DOM/controller handles
 * (ui/engine/editor/renderer/persistence/themes/debug) still arrive via the index signature
 * — they are the adapter boundary (see docs/typing.md).
 */
export type ControllerDeps = {
    state: AppState;
    data?: DataService;
    solverApi?: SolverApi;
    reportError?: ReportError;
    [k: string]: any;
};

/**
 * `ControllerDeps` with a chosen subset of the typed bags made **required**. Construction is
 * piecemeal (different controllers get different bags), so the bags are optional on the base type;
 * a factory that genuinely uses one declares it required, e.g.
 * `({ … }: RequireDeps<'data' | 'solverApi'>)`. The destructured bag is then non-optional
 * (no `?.`/`!` noise) and the composition root is checked to actually pass it.
 */
export type RequireDeps<K extends 'data' | 'solverApi'> =
    ControllerDeps & Required<Pick<ControllerDeps, K>>;

export function createState(): AppState {
    return { ENGINE: createEngineState() };
}

/**
 * The level currently being played/edited: the play-mode `level`, or the editor's
 * `workingLevel` in editor/review mode. This "which level is active" branch recurs across
 * the render, input, and engine layers — centralize it so the mode→level mapping lives in
 * one place. Optional-chained on `editor` so it is safe before the editor slice exists.
 */
export function activeLevel(engineState: EngineState): EngineLevel | null {
    return engineState.mode === PLAY ? engineState.level : engineState.editor?.workingLevel;
}
