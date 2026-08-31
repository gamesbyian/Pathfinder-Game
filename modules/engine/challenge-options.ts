import type { RequireDeps } from '../state.js';
import { PLAY } from '../app-constants.js';
import { getParityInvalidKeys } from '../domain/portal-utils.js';
export function createChallengeOptionsController({ state, ui }: RequireDeps<never>) {
    return {
        // Returns { playable, level, reason? } where `level` is a derived copy with options
        // applied — the input level is never mutated. Callers must use result.level.
        applyPlayChallengeOptions(level: any) {
            if (!level || state.engineState.mode !== PLAY) return { playable: true, level };
            const opts = state.engineState.options || {};
            let derived = level;

            if (opts.geese === false && derived.gooseSet.size > 0) {
                derived = { ...derived, gooseSet: new Set() };
            }
            if (opts.falseGoals === false && derived.falseGoalKeys.size > 0) {
                derived = { ...derived, falseGoalKeys: new Set() };
            }
            if (opts.deadGates === false) {
                const dead = getParityInvalidKeys(derived);
                if (dead.gates.size > 0) {
                    const kept = derived.gateKeys.filter((k: any) => !dead.gates.has(k));
                    if (kept.length === 0) return { playable: false, reason: 'dead-gates', level };
                    derived = { ...derived, gateKeys: kept };
                }
            }
            return { playable: true, level: derived };
        },

        showOptionsBlockedModalIfNeeded(result: any) {
            ui.setOptionsBlockedVisible(result?.playable === false);
        },
    };
}
