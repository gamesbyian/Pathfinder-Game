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

export function createLevelRatingManager({ state, ui, data, levelUtils, persistence, reportError = defaultReportError }: RequireDeps<'data' | 'levelUtils'>) {

    function getCurrentRawLevel() {
        const eng = state.ENGINE;
        if (eng.mode === PLAY) return data.getLevel(eng.levelIdx);
        const wl = eng.editor.workingLevel;
        return wl ? levelUtils.denormalizeLevel(wl) : null;
    }

    function render() {
        ui.renderLevelRatingPane(state.ENGINE.levelRating);
    }

    // A rating saved under a pre-bump fingerprint algorithm (see LEVEL_FINGERPRINT_VERSION) is
    // otherwise permanently unreachable once a version bump changes every level's lookup key.
    // On a current-fingerprint miss, check the keys this level could have been saved under by
    // an older version; a hit is copied forward to the current key so subsequent loads take the
    // fast path. The old doc is left in place (not deleted) — harmless, and safer on a
    // best-effort migration path than a delete that a failed save could turn into data loss.
    async function loadLegacyRatingAndMigrate(rawLevel: any, currentFingerprint: string, levelNumber: number | null) {
        const legacyFingerprints = await getLegacyLevelFingerprints(rawLevel);
        for (const legacyFingerprint of legacyFingerprints) {
            if (legacyFingerprint === currentFingerprint) continue;
            const found = await persistence.loadLevelRating(legacyFingerprint);
            if (!found) continue;
            try {
                await persistence.saveLevelRating(currentFingerprint, levelNumber, found);
            } catch (e: any) {
                reportError('level-rating.migrate', e); // best-effort — still show the found rating
            }
            return found;
        }
        return null;
    }

    async function refreshForCurrentLevel() {
        const eng = state.ENGINE;
        const requestId = incrementLevelRatingRequestId(state);
        const levelNumber = eng.mode === REVIEW ? null : eng.levelIdx + 1;
        setLevelRatingContext(state, { fingerprint: null, levelNumber, loaded: false });
        render();
        if (!eng.isDevMode) return;
        const rawLevel = getCurrentRawLevel();
        if (!rawLevel) return;
        const fingerprint = await getLevelFingerprint(rawLevel);
        if (state.ENGINE.levelRating.requestId !== requestId) return;
        setLevelRatingContext(state, { fingerprint, levelNumber, loaded: false });
        render();
        let existing = null;
        try {
            existing = await persistence.loadLevelRating(fingerprint);
            if (!existing) existing = await loadLegacyRatingAndMigrate(rawLevel, fingerprint, levelNumber);
        } catch (e: any) {
            reportError('level-rating.load', e);
        }
        if (state.ENGINE.levelRating.requestId !== requestId) return;
        applyLevelRatingData(state, existing || {});
        render();
    }

    function save() {
        const rating = state.ENGINE.levelRating;
        if (!rating.fingerprint) return;
        persistence.saveLevelRating(rating.fingerprint, rating.levelNumber, {
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
