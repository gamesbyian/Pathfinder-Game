export function createChallengeOptionsController({ core, state, ui, levelUtils }) {
    return {
        applyPlayChallengeOptions(level) {
            if (!level || state.ENGINE.mode !== core.PLAY) return { playable: true };
            const opts = state.ENGINE.options || {};
            if (opts.geese === false) level.gooseSet = new Set();
            if (opts.falseGoals === false) level.falseGoalKeys = new Set();
            if (opts.deadGates === false) {
                const dead = levelUtils.getParityInvalidKeys(level);
                if (dead.gates.size > 0) {
                    const kept = level.gateKeys.filter(k => !dead.gates.has(k));
                    if (kept.length === 0) return { playable: false, reason: 'dead-gates' };
                    level.gateKeys = kept;
                }
            }
            return { playable: true };
        },

        showOptionsBlockedModalIfNeeded(result) {
            ui.setOptionsBlockedVisible(result?.playable === false);
        },
    };
}
