// Level-rating slice state actions (engineState.levelRating.*): Dev Mode tags/custom-tags/
// difficulty/fun ratings, plus the stale-response request-id guard.
import { resolveEngineState } from './shared.js';
import type { StateOrEngine } from './shared.js';

export function setLevelRatingContext(
    stateOrEngine: StateOrEngine,
    { levelFingerprint = null, levelNumber = null, loaded = false }:
        { levelFingerprint?: string | null; levelNumber?: number | null; loaded?: boolean } = {}
) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating) return null;
    rating.levelFingerprint = levelFingerprint;
    rating.levelNumber = levelNumber;
    rating.loaded = loaded;
    rating.tags = new Set();
    rating.customTags = [];
    rating.difficulty = 0;
    rating.fun = 0;
    return rating;
}

export function applyLevelRatingData(
    stateOrEngine: StateOrEngine,
    { tags = [], customTags = [], difficulty = 0, fun = 0 }:
        { tags?: Iterable<string>; customTags?: string[]; difficulty?: number; fun?: number } = {}
) {
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

export function toggleLevelRatingTag(stateOrEngine: StateOrEngine, tag: string) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating || !tag) return false;
    if (rating.tags.has(tag)) rating.tags.delete(tag);
    else rating.tags.add(tag);
    return rating.tags.has(tag);
}

export function addLevelRatingCustomTag(stateOrEngine: StateOrEngine, tag: string) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    const trimmed = (tag || '').trim();
    if (!rating || !trimmed || rating.customTags.includes(trimmed)) return rating?.customTags ?? null;
    rating.customTags.push(trimmed);
    return rating.customTags;
}

export function removeLevelRatingCustomTag(stateOrEngine: StateOrEngine, tag: string) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating) return null;
    rating.customTags = rating.customTags.filter((t) => t !== tag);
    return rating.customTags;
}

export function setLevelRatingDifficulty(stateOrEngine: StateOrEngine, value: number) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating) return undefined;
    rating.difficulty = value;
    return rating.difficulty;
}

export function setLevelRatingFun(stateOrEngine: StateOrEngine, value: number) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating) return undefined;
    rating.fun = value;
    return rating.fun;
}

export function incrementLevelRatingRequestId(stateOrEngine: StateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating) return 0;
    rating.requestId += 1;
    return rating.requestId;
}
