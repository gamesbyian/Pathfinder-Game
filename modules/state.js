// @ts-check
import { createEngineState } from './state-slices.js';

/** @param {{ core: any }} deps @returns {{ ENGINE: any }} */
export function createState({ core }) {
    return { ENGINE: createEngineState({ core }) };
}
