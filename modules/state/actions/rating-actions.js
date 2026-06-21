// @ts-check
// Level-rating slice state actions (engineState.levelRating.*): Dev Mode tags/custom-tags/
// difficulty/fun ratings, plus the stale-response request-id guard.
import { resolveEngineState } from './shared.js';

/** @param {any} stateOrEngine @param {any} [opts] @returns {any} */
export function setLevelRatingContext(stateOrEngine, { fingerprint = null, levelNumber = null, loaded = false } = {}) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating) return null;
    rating.fingerprint = fingerprint;
    rating.levelNumber = levelNumber;
    rating.loaded = loaded;
    rating.tags = new Set();
    rating.customTags = [];
    rating.difficulty = 0;
    rating.fun = 0;
    return rating;
}

/** @param {any} stateOrEngine @param {any} [opts] @returns {any} */
export function applyLevelRatingData(stateOrEngine, { tags = [], customTags = [], difficulty = 0, fun = 0 } = {}) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating) return null;
    rating.tags = new Set(tags);
    rating.customTags = [...customTags];
    rating.difficulty = difficulty || 0;
    rating.fun = fun || 0;
    rating.loaded = true;
    return rating;
}

/** @param {any} stateOrEngine @param {any} tag @returns {any} */
export function toggleLevelRatingTag(stateOrEngine, tag) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating || !tag) return false;
    if (rating.tags.has(tag)) rating.tags.delete(tag);
    else rating.tags.add(tag);
    return rating.tags.has(tag);
}

/** @param {any} stateOrEngine @param {any} tag @returns {any} */
export function addLevelRatingCustomTag(stateOrEngine, tag) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    const trimmed = (tag || '').trim();
    if (!rating || !trimmed || rating.customTags.includes(trimmed)) return rating?.customTags ?? null;
    rating.customTags.push(trimmed);
    return rating.customTags;
}

/** @param {any} stateOrEngine @param {any} tag @returns {any} */
export function removeLevelRatingCustomTag(stateOrEngine, tag) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating) return null;
    rating.customTags = rating.customTags.filter((/** @type {any} */ t) => t !== tag);
    return rating.customTags;
}

/** @param {any} stateOrEngine @param {any} value @returns {any} */
export function setLevelRatingDifficulty(stateOrEngine, value) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating) return undefined;
    rating.difficulty = value;
    return rating.difficulty;
}

/** @param {any} stateOrEngine @param {any} value @returns {any} */
export function setLevelRatingFun(stateOrEngine, value) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating) return undefined;
    rating.fun = value;
    return rating.fun;
}

/** @param {any} stateOrEngine @returns {any} */
export function incrementLevelRatingRequestId(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating) return 0;
    rating.requestId += 1;
    return rating.requestId;
}
