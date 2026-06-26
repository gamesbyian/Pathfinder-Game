import { createEngineState } from './state-slices.js';

export function createState({ core }: { core: any }): { ENGINE: any } {
    return { ENGINE: createEngineState({ core }) };
}
