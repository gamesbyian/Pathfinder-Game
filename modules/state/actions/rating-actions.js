// Level-rating slice state actions (engineState.levelRating.*): Dev Mode tags/custom-tags/
// difficulty/fun ratings, plus the stale-response request-id guard.
import { resolveEngineState } from './shared.js';

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

export function toggleLevelRatingTag(stateOrEngine, tag) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating || !tag) return false;
    if (rating.tags.has(tag)) rating.tags.delete(tag);
    else rating.tags.add(tag);
    return rating.tags.has(tag);
}

export function addLevelRatingCustomTag(stateOrEngine, tag) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    const trimmed = (tag || '').trim();
    if (!rating || !trimmed || rating.customTags.includes(trimmed)) return rating?.customTags ?? null;
    rating.customTags.push(trimmed);
    return rating.customTags;
}

export function removeLevelRatingCustomTag(stateOrEngine, tag) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating) return null;
    rating.customTags = rating.customTags.filter(t => t !== tag);
    return rating.customTags;
}

export function setLevelRatingDifficulty(stateOrEngine, value) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating) return undefined;
    rating.difficulty = value;
    return rating.difficulty;
}

export function setLevelRatingFun(stateOrEngine, value) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating) return undefined;
    rating.fun = value;
    return rating.fun;
}

export function incrementLevelRatingRequestId(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating) return 0;
    rating.requestId += 1;
    return rating.requestId;
}
