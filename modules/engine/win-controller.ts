import type { AppState, ControllerDeps } from '../state.js';
import { Effects } from '../runtime/effects.js';
import { runEffects } from '../runtime/effect-runner.js';
import type { Effect } from '../runtime/effects.js';
import { hintPathSignature, makeProvenanceEntry, HUMAN_PLAYER_ID } from '../domain/hint-types.js';
import { getLevelFingerprint } from '../domain/level-fingerprint.js';
import { defaultReportError } from '../error-reporting.js';
import { PLAY, RESOLVED } from '../app-constants.js';

// Pure function: produces the side-effect list for a win event without touching adapters.
// Enables DOM-free testing of win-event logic.
export function computeWinEffects(state: AppState): Effect[] {
    const effects: Effect[] = [
        Effects.playSound('C5', '8n'),
        Effects.openModal('winModal'),
    ];
    if (state.ENGINE.mode === PLAY) {
        effects.push(Effects.persistProgress(state.ENGINE.levelIdx));
    }
    return effects;
}

/**
 * Invisibly saves the just-completed path as a new Firestore-backed hint for the published
 * level, if it isn't already known (locally or in Firestore — data.getHints() already merges
 * both) and the level hasn't hit its cap (enforced inside saveLocalLevelHintIfNovel). Play-mode
 * only, and only for the published corpus — a Dev-Mode stress-corpus playtest has no real
 * published level for the fingerprint to mean anything. Never awaited by the caller: a failure
 * here (offline, no Firestore connection) must never affect the player's win in any way, so it's
 * reported and swallowed here rather than surfaced.
 */
export async function saveWinAsHintIfNovel(
    { state, data, persistence, reportError = defaultReportError }: ControllerDeps,
): Promise<void> {
    if (state.ENGINE.mode !== PLAY) return;
    if (state.ENGINE.runtime?.devCorpus !== 'published') return;
    if (typeof persistence?.saveLocalLevelHintIfNovel !== 'function' || typeof data?.getLevel !== 'function') return;
    const path = state.ENGINE.nav.path;
    if (!Array.isArray(path) || path.length < 2) return;
    try {
        const levelIdx = state.ENGINE.levelIdx;
        const rawLevel = data.getLevel(levelIdx);
        if (!rawLevel) return;
        const fingerprint = await getLevelFingerprint(rawLevel);
        const knownHints = await data.getHints(rawLevel); // already merges local + Firestore
        const signature = hintPathSignature(path);
        const alreadyKnown = new Set(knownHints.map((h: any) => hintPathSignature(h.path)));
        if (alreadyKnown.has(signature)) return;
        const provenanceEntry = makeProvenanceEntry('manual-path', { solverId: HUMAN_PLAYER_ID, termination: 'solved', levelRevision: fingerprint });
        await persistence.saveLocalLevelHintIfNovel(fingerprint, path, signature, provenanceEntry, alreadyKnown);
    } catch (err: any) {
        reportError('win.auto-save-hint', err);
    }
}

export function createWinController({ state, ui, data, persistence, reportError, setLogicState, audioService }: ControllerDeps) {
    return {
        handleWin() {
            setLogicState(RESOLVED);
            ui.renderWinExportPanel({
                solutionOutput: JSON.stringify(state.ENGINE.nav.path).replace(/\s/g, ''),
                showExportArea: state.ENGINE.isDevMode,
            });
            runEffects(computeWinEffects(state), {
                playSound:       (note: any, dur: any) => audioService.play(note, dur),
                openModal:       (id: any)        => ui.openModal(id),
                persistProgress: (idx: any)       => persistence.markLevelComplete(idx),
            });
            void saveWinAsHintIfNovel({ state, data, persistence, reportError });
        },
    };
}
