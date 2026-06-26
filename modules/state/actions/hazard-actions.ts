// Hazard slice state actions (engineState.hazards.*): revealed geese plus armed/detonated
// false-goal tracking.
import { resolveEngineState } from './shared.js';

export function setRevealedGeese(stateOrEngine: any, keys: any = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const hazards = engineState?.hazards;
    if (!hazards) return null;
    hazards.revealedGeese = new Set(keys);
    return hazards.revealedGeese;
}

export function setDetonatedFalseGoals(stateOrEngine: any, keys: any = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const hazards = engineState?.hazards;
    if (!hazards) return null;
    hazards.detonatedFalseGoals = new Set(keys);
    return hazards.detonatedFalseGoals;
}

export function setArmedFalseGoals(stateOrEngine: any, keys: any = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const hazards = engineState?.hazards;
    if (!hazards) return null;
    hazards.armedFalseGoals = new Set(keys);
    return hazards.armedFalseGoals;
}

export function detonateFalseGoal(stateOrEngine: any, key: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const hazards = engineState?.hazards;
    if (!hazards) return null;
    hazards.armedFalseGoals.delete(key);
    hazards.detonatedFalseGoals.add(key);
    return hazards;
}

export function resetFalseGoalHazardsForLevel(stateOrEngine: any, level: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const activeLevel = level ?? engineState?.level;
    setArmedFalseGoals(engineState, activeLevel?.falseGoalKeys || []);
    setDetonatedFalseGoals(engineState, []);
    return engineState?.hazards ?? null;
}

export function restoreFalseGoalHazardsForLevel(stateOrEngine: any, level: any, detonatedKeys: any = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const activeLevel = level ?? engineState?.level;
    const detonated = setDetonatedFalseGoals(engineState, detonatedKeys) || new Set();
    const armed = new Set(activeLevel?.falseGoalKeys || []);
    detonated.forEach((k: any) => armed.delete(k));
    setArmedFalseGoals(engineState, armed);
    return engineState?.hazards ?? null;
}
