import { clearEditorUndoStack, clearEditorValidTrapSpots, clearNavigationUndoStack,
         markDirty, removeReviewSubmission as removeReviewSubmissionState,
         setDetonatedFalseGoals, setEditorModified,
         setEditorWorkingLevel, setRevealedGeese, setReviewIndex,
         setReviewSubmissions as setReviewSubmissionsState } from '../state-actions.js';

export function createReviewModeController({ state, ui, levelUtils, editor, PathNavigator }) {
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
        ui.setInputValue('editReqLen', 0);
        ui.setInputValue('editReqInt', 0);
        ui.renderMetricsPanel({ currentLen: 0, reqLen: 0, currentInt: 0, reqInt: 0 });
        ui.updateLevelDisplay(0, false, '0/0');
        ui.setButtonLabel('reviewHintBtn', 'Hints');
        ui.setClassState('reviewEmptyMsg', 'hidden', false);
        ui.updateAppScale();
        ui.updateViewport();
        markDirty(state);
    }

    function loadReviewLevel(idx) {
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
            ui.showMessage('Could not load submission.', 'text-red-500 font-bold');
            return;
        }
        setEditorWorkingLevel(state, normalized);
        clearEditorUndoStack(state);
        setEditorModified(state, false);
        PathNavigator.clear(state.ENGINE);
        clearNavigationUndoStack(state);
        setRevealedGeese(state);
        setDetonatedFalseGoals(state);
        ui.setInputValue('editReqLen', normalized.reqLen || 0);
        ui.setInputValue('editReqInt', normalized.reqInt || 0);
        editor.syncMetadataFieldsFromLevel(normalized);
        ui.updateLevelDisplay(safeIdx, false, `${safeIdx + 1}/${subs.length}`);
        const hintCount = normalized.hints?.length || 0;
        ui.setButtonLabel('reviewHintBtn', hintCount > 0 ? `Hints (${hintCount})` : 'Hints');
        ui.setClassState('reviewEmptyMsg', 'hidden', true);
        ui.updateAppScale();
        ui.updateViewport();
        markDirty(state);
    }

    function setReviewSubmissions(subs) { setReviewSubmissionsState(state, subs); }
    function removeReviewSubmission(idx) { removeReviewSubmissionState(state, idx); }

    return { resetEmptyReviewState, loadReviewLevel, setReviewSubmissions, removeReviewSubmission };
}
