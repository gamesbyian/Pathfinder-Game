import { createEngineState } from './state-slices.js';

export function createState({ core }) {
    return { ENGINE: createEngineState({ core }) };
}
