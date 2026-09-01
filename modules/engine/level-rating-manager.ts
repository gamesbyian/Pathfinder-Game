import type { RequireDeps } from '../state.js';
import {
    setLevelRatingContext,
    applyLevelRatingData,
    toggleLevelRatingTag as toggleLevelRatingTagState,
    addLevelRatingCustomTag as addLevelRatingCustomTagState,
    removeLevelRatingCustomTag as removeLevelRatingCustomTagState,
    setLevelRatingDifficulty as setLevelRatingDifficultyState,
    setLevelRatingFun as setLevelRatingFunState,
    incrementLevelRatingRequestId,
} from '../state-actions.js';
import { getLevelFingerprint, getLegacyLevelFingerprints } from '../domain/level-fingerprint.js';
import { defaultReportError } from '../error-reporting.js';
import { PLAY, REVIEW } from '../app-constants.js';
import { denormalizeLevel } from '../domain/level-codec.js';

export function createLevelRatingManager({ state, ui, data, persistence, reportError = defaultReportError }: RequireDeps<'data'>) {

    function getCurrentRawLevel() {
        const eng = state.engineState;
        if (eng.mode === PLAY) return data.getLevel(eng.levelIdx);
        const wl = eng.editor.workingLevel;
        return wl ? denormalizeLevel(wl) : null;
    }

    function render() {
        ui.renderLevelRatingPane(state.engineState.levelRating);
    }

    // A rating saved under a pre-bump fingerprint algorithm (see LEVEL_FINGERPRINT_VERSION) is
    // otherwise permanently unreachable once a version bump changes every level's lookup key.
    // On a current-fingerprint miss, check the keys this level could have been saved under by
    // an older version; a hit is copied forward to the current key so subsequent loads take the
    // fast path. The old doc is left in place (not deleted) — harmless, and safer on a
    // best-effort migration path than a delete that a failed save could turn into data loss.
    async function loadLegacyRatingAndMigrate(rawLevel: any, currentLevelFingerprint: string, levelNumber: number | null) {
        const legacyLevelFingerprints = await getLegacyLevelFingerprints(rawLevel);
        for (const legacyLevelFingerprint of legacyLevelFingerprints) {
            if (legacyLevelFingerprint === currentLevelFingerprint) continue;
            const found = await persistence.loadLevelRating(legacyLevelFingerprint);
            if (!found) continue;
            try {
                await persistence.saveLevelRating(currentLevelFingerprint, levelNumber, found);
            } catch (e: any) {
                reportError('level-rating.migrate', e); // best-effort — still show the found rating
            }
            return found;
        }
        return null;
    }

    async function refreshForCurrentLevel() {
        const eng = state.engineState;
        const requestId = incrementLevelRatingRequestId(state);
        const levelNumber = eng.mode === REVIEW ? null : eng.levelIdx + 1;
        setLevelRatingContext(state, { levelFingerprint: null, levelNumber, loaded: false });
        render();
        if (!eng.isDevMode) return;
        const rawLevel = getCurrentRawLevel();
        if (!rawLevel) return;
        const levelFingerprint = await getLevelFingerprint(rawLevel);
        if (state.engineState.levelRating.requestId !== requestId) return;
        setLevelRatingContext(state, { levelFingerprint, levelNumber, loaded: false });
        render();
        let existing = null;
        try {
            existing = await persistence.loadLevelRating(levelFingerprint);
            if (!existing) existing = await loadLegacyRatingAndMigrate(rawLevel, levelFingerprint, levelNumber);
        } catch (e: any) {
            reportError('level-rating.load', e);
        }
        if (state.engineState.levelRating.requestId !== requestId) return;
        applyLevelRatingData(state, existing || {});
        render();
    }

    function save() {
        const rating = state.engineState.levelRating;
        if (!rating.levelFingerprint) return;
        persistence.saveLevelRating(rating.levelFingerprint, rating.levelNumber, {
            tags: [...rating.tags],
            customTags: rating.customTags,
            difficulty: rating.difficulty,
            fun: rating.fun,
        }).catch((e: any) => {
            reportError('level-rating.save', e);
            ui.showMessage('Rating save failed.', 'error');
        });
    }

    function toggleTag(tag: any) {
        toggleLevelRatingTagState(state, tag);
        render();
        save();
    }

    function addCustomTag(tag: any) {
        addLevelRatingCustomTagState(state, tag);
        render();
        save();
    }

    function removeCustomTag(tag: any) {
        removeLevelRatingCustomTagState(state, tag);
        render();
        save();
    }

    function setScale(scale: any, value: any) {
        if (scale === 'difficulty') setLevelRatingDifficultyState(state, value);
        else if (scale === 'fun') setLevelRatingFunState(state, value);
        else return;
        render();
        save();
    }

    return { refreshForCurrentLevel, toggleTag, addCustomTag, removeCustomTag, setScale };
}
