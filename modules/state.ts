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
