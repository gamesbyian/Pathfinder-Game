// Hazard slice state actions (engineState.hazards.*): revealed geese plus armed/detonated
// false-goal tracking.
import { resolveEngineState } from './shared.js';
import type { StateOrEngine } from './shared.js';
import type { EngineLevel } from '../../domain/level-schema.js';

export function setRevealedGeese(stateOrEngine: StateOrEngine, keys: Iterable<number> = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const hazards = engineState?.hazards;
    if (!hazards) return null;
    hazards.revealedGeese = new Set(keys);
    return hazards.revealedGeese;
}

export function setDetonatedFalseGoals(stateOrEngine: StateOrEngine, keys: Iterable<number> = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const hazards = engineState?.hazards;
    if (!hazards) return null;
    hazards.detonatedFalseGoals = new Set(keys);
    return hazards.detonatedFalseGoals;
}

export function setArmedFalseGoals(stateOrEngine: StateOrEngine, keys: Iterable<number> = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const hazards = engineState?.hazards;
    if (!hazards) return null;
    hazards.armedFalseGoals = new Set(keys);
    return hazards.armedFalseGoals;
}

export function detonateFalseGoal(stateOrEngine: StateOrEngine, key: number) {
    const engineState = resolveEngineState(stateOrEngine);
    const hazards = engineState?.hazards;
    if (!hazards) return null;
    hazards.armedFalseGoals.delete(key);
    hazards.detonatedFalseGoals.add(key);
    return hazards;
}

export function resetFalseGoalHazardsForLevel(stateOrEngine: StateOrEngine, level: EngineLevel | null) {
    const engineState = resolveEngineState(stateOrEngine);
    const activeLevel = level ?? engineState?.level;
    setArmedFalseGoals(engineState, activeLevel?.falseGoalKeys || []);
    setDetonatedFalseGoals(engineState, []);
    return engineState?.hazards ?? null;
}

export function restoreFalseGoalHazardsForLevel(stateOrEngine: StateOrEngine, level: EngineLevel | null, detonatedKeys: Iterable<number> = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const activeLevel = level ?? engineState?.level;
    const detonated = setDetonatedFalseGoals(engineState, detonatedKeys) || new Set<number>();
    const armed = new Set(activeLevel?.falseGoalKeys || []);
    detonated.forEach((k) => armed.delete(k));
    setArmedFalseGoals(engineState, armed);
    return engineState?.hazards ?? null;
}
