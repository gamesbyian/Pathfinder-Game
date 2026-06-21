// @ts-check
// Review slice state actions (engineState.review.*): review-mode submission list, current
// index, and saved play-level index.
import { resolveEngineState } from './shared.js';

/** @param {any} stateOrEngine @param {any} levelIdx @returns {any} */
export function setReviewSavedPlayLevelIndex(stateOrEngine, levelIdx) {
    const engineState = resolveEngineState(stateOrEngine);
    const review = engineState?.review;
    if (!review) return undefined;
    review.savedPlayLevelIdx = levelIdx;
    return review.savedPlayLevelIdx;
}

/** @param {any} stateOrEngine @param {any} currentIdx @returns {any} */
export function setReviewIndex(stateOrEngine, currentIdx) {
    const engineState = resolveEngineState(stateOrEngine);
    const review = engineState?.review;
    if (!review) return undefined;
    review.currentIdx = currentIdx;
    return review.currentIdx;
}

/** @param {any} stateOrEngine @param {any} [submissions] @returns {any} */
export function setReviewSubmissions(stateOrEngine, submissions = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const review = engineState?.review;
    if (!review) return null;
    review.submissions = submissions;
    return review.submissions;
}

/** @param {any} stateOrEngine @param {any} idx @returns {any} */
export function removeReviewSubmission(stateOrEngine, idx) {
    const engineState = resolveEngineState(stateOrEngine);
    const review = engineState?.review;
    if (!review?.submissions) return null;
    review.submissions.splice(idx, 1);
    return review.submissions;
}

/** @param {any} stateOrEngine @returns {any} */
export function resetReviewSubmissions(stateOrEngine) {
    setReviewSubmissions(stateOrEngine, []);
    setReviewIndex(stateOrEngine, 0);
    return resolveEngineState(stateOrEngine)?.review ?? null;
}
