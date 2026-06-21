// @ts-check
// Hazard slice state actions (engineState.hazards.*): revealed geese plus armed/detonated
// false-goal tracking.
import { resolveEngineState } from './shared.js';

/** @param {any} stateOrEngine @param {any} [keys] @returns {any} */
export function setRevealedGeese(stateOrEngine, keys = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const hazards = engineState?.hazards;
    if (!hazards) return null;
    hazards.revealedGeese = new Set(keys);
    return hazards.revealedGeese;
}

/** @param {any} stateOrEngine @param {any} [keys] @returns {any} */
export function setDetonatedFalseGoals(stateOrEngine, keys = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const hazards = engineState?.hazards;
    if (!hazards) return null;
    hazards.detonatedFalseGoals = new Set(keys);
    return hazards.detonatedFalseGoals;
}

/** @param {any} stateOrEngine @param {any} [keys] @returns {any} */
export function setArmedFalseGoals(stateOrEngine, keys = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const hazards = engineState?.hazards;
    if (!hazards) return null;
    hazards.armedFalseGoals = new Set(keys);
    return hazards.armedFalseGoals;
}

/** @param {any} stateOrEngine @param {any} key @returns {any} */
export function detonateFalseGoal(stateOrEngine, key) {
    const engineState = resolveEngineState(stateOrEngine);
    const hazards = engineState?.hazards;
    if (!hazards) return null;
    hazards.armedFalseGoals.delete(key);
    hazards.detonatedFalseGoals.add(key);
    return hazards;
}

/** @param {any} stateOrEngine @param {any} level @returns {any} */
export function resetFalseGoalHazardsForLevel(stateOrEngine, level) {
    const engineState = resolveEngineState(stateOrEngine);
    const activeLevel = level ?? engineState?.level;
    setArmedFalseGoals(engineState, activeLevel?.falseGoalKeys || []);
    setDetonatedFalseGoals(engineState, []);
    return engineState?.hazards ?? null;
}

/** @param {any} stateOrEngine @param {any} level @param {any} [detonatedKeys] @returns {any} */
export function restoreFalseGoalHazardsForLevel(stateOrEngine, level, detonatedKeys = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const activeLevel = level ?? engineState?.level;
    const detonated = setDetonatedFalseGoals(engineState, detonatedKeys) || new Set();
    const armed = new Set(activeLevel?.falseGoalKeys || []);
    detonated.forEach((/** @type {any} */ k) => armed.delete(k));
    setArmedFalseGoals(engineState, armed);
    return engineState?.hazards ?? null;
}
