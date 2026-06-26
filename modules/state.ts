import { createEngineState } from './state-slices.js';
import type { EngineState, EngineCoreConstants } from './state-slices.js';

export function createState({ core }: { core: EngineCoreConstants }): { ENGINE: EngineState } {
    return { ENGINE: createEngineState({ core }) };
}
