import type { RequireDeps } from '../state.js';
import { clearEditorUndoStack, clearEditorValidTrapSpots, clearNavigationUndoStack,
         markDirty, removeReviewSubmission as removeReviewSubmissionState,
         resetHinterForLevel,
         setDetonatedFalseGoals, setEditorModified,
         setEditorWorkingLevel, setRevealedGeese, setReviewIndex,
         setReviewSubmissions as setReviewSubmissionsState } from '../state-actions.js';

/**
 * Pure decision: after removing the submission at `removedIdx`, which review index should load
 * next, and is the queue now empty? Shared by the approve and reject flows (which previously
 * duplicated this navigation logic). `remainingCount` is the submission count AFTER removal.
 *
 * @param {number} remainingCount submissions left after the removal
 * @param {number} removedIdx     index that was removed
 * @returns {{ loadReviewIdx: number, allDone: boolean }}
 */
export function planSubmissionAdvance(remainingCount: any, removedIdx: any) {
    if (remainingCount <= 0) return { loadReviewIdx: 0, allDone: true };
    return { loadReviewIdx: Math.min(removedIdx, remainingCount - 1), allDone: false };
}

export function createReviewModeController({ state, ui, levelUtils, editor, PathNavigator, refreshLevelRatingPane = () => {} }: RequireDeps<'levelUtils'>) {
    function resetEmptyReviewState() {
        setReviewIndex(state, 0);
        setEditorWorkingLevel(state, null);
        clearEditorUndoStack(state);
        setEditorModified(state, false);
        clearEditorValidTrapSpots(state);
        PathNavigator.clear(state.ENGINE);
        clearNavigationUndoStack(state);
        setRevealedGeese(state);
        setDetonatedFalseGoals(state);
        resetHinterForLevel(state);
        ui.setInputValue('editReqLen', 0);
        ui.setInputValue('editReqInt', 0);
        ui.renderMetricsPanel({ currentLen: 0, reqLen: 0, currentInt: 0, reqInt: 0 });
        ui.updateLevelDisplay(0, false, '0/0');
        ui.setButtonLabel('reviewHintBtn', 'Hints');
        ui.setClassState('reviewEmptyMsg', 'hidden', false);
        ui.setClassState('reviewHintAdditionBadge', 'hidden', true);
        ui.applyHintPinState(false, false);
        ui.updateAppScale();
        ui.updateViewport();
        markDirty(state);
        refreshLevelRatingPane();
    }

    function loadReviewLevel(idx: any) {
        const subs = state.ENGINE.review.submissions;
        if (!subs || !subs.length) {
            resetEmptyReviewState();
            return;
        }
        const safeIdx = Math.max(0, Math.min(idx, subs.length - 1));
        setReviewIndex(state, safeIdx);
        const rawLevel   = subs[safeIdx].levelData;
        const normalized = levelUtils.processRawLevel(rawLevel, safeIdx);
        if (!normalized) {
            ui.showMessage('Could not load submission.', 'error');
            return;
        }
        setEditorWorkingLevel(state, normalized);
        clearEditorUndoStack(state);
        setEditorModified(state, false);
        PathNavigator.clear(state.ENGINE);
        clearNavigationUndoStack(state);
        setRevealedGeese(state);
        setDetonatedFalseGoals(state);
        resetHinterForLevel(state);
        ui.setInputValue('editReqLen', normalized.reqLen || 0);
        ui.setInputValue('editReqInt', normalized.reqInt || 0);
        editor.syncMetadataFieldsFromLevel(normalized);
        ui.updateLevelDisplay(safeIdx, false, `${safeIdx + 1}/${subs.length}`);
        const hintCount = normalized.hints?.length || 0;
        ui.setButtonLabel('reviewHintBtn', hintCount > 0 ? `Hints (${hintCount})` : 'Hints');
        ui.setClassState('reviewEmptyMsg', 'hidden', true);
        const isHintAddition = subs[safeIdx].type === 'hintAddition' && !!subs[safeIdx].targetPublishedLevelId;
        ui.setClassState('reviewHintAdditionBadge', 'hidden', !isHintAddition);
        ui.applyHintPinState(false, false);
        ui.updateAppScale();
        ui.updateViewport();
        markDirty(state);
        refreshLevelRatingPane();
    }

    function setReviewSubmissions(subs: any) { setReviewSubmissionsState(state, subs); }
    function removeReviewSubmission(idx: any) { removeReviewSubmissionState(state, idx); }

    // Remove the submission at idx and navigate to the next one (or the empty state). Returns
    // { loadReviewIdx, allDone } so the caller can pick the appropriate user message.
    function removeAndAdvance(idx: any) {
        removeReviewSubmission(idx);
        const plan = planSubmissionAdvance(state.ENGINE.review.submissions.length, idx);
        loadReviewLevel(plan.loadReviewIdx);
        return plan;
    }

    return { resetEmptyReviewState, loadReviewLevel, setReviewSubmissions, removeReviewSubmission, removeAndAdvance };
}
