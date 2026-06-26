// Review slice state actions (engineState.review.*): review-mode submission list, current
// index, and saved play-level index.
import { resolveEngineState } from './shared.js';
import type { StateOrEngine } from './shared.js';
import type { ReviewSubmission } from '../../state-slices.js';

export function setReviewSavedPlayLevelIndex(stateOrEngine: StateOrEngine, levelIdx: number) {
    const engineState = resolveEngineState(stateOrEngine);
    const review = engineState?.review;
    if (!review) return undefined;
    review.savedPlayLevelIdx = levelIdx;
    return review.savedPlayLevelIdx;
}

export function setReviewIndex(stateOrEngine: StateOrEngine, currentIdx: number) {
    const engineState = resolveEngineState(stateOrEngine);
    const review = engineState?.review;
    if (!review) return undefined;
    review.currentIdx = currentIdx;
    return review.currentIdx;
}

export function setReviewSubmissions(stateOrEngine: StateOrEngine, submissions: ReviewSubmission[] = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const review = engineState?.review;
    if (!review) return null;
    review.submissions = submissions;
    return review.submissions;
}

export function removeReviewSubmission(stateOrEngine: StateOrEngine, idx: number) {
    const engineState = resolveEngineState(stateOrEngine);
    const review = engineState?.review;
    if (!review?.submissions) return null;
    review.submissions.splice(idx, 1);
    return review.submissions;
}

export function resetReviewSubmissions(stateOrEngine: StateOrEngine) {
    setReviewSubmissions(stateOrEngine, []);
    setReviewIndex(stateOrEngine, 0);
    return resolveEngineState(stateOrEngine)?.review ?? null;
}
