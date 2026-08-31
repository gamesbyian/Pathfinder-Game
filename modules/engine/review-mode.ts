import type { RequireDeps } from '../state.js';
import { clearEditorUndoStack, clearEditorTriggerableFalseGoalCells, clearNavigationUndoStack,
         markDirty, removeReviewSubmission as removeReviewSubmissionState,
         resetHinterForLevel, setFoundHintsSinceLoad,
         setDetonatedFalseGoals, setEditorModified,
         setEditorWorkingLevel, setRevealedGeese, setReviewIndex,
         setReviewSubmissions as setReviewSubmissionsState } from '../state-actions.js';
import { knownHintCount, hintButtonLabel } from '../solver/diversification.js';
import { hintPaths, upgradeLegacyHints } from '../domain/hint-types.js';
import { parseRawLevel } from '../domain/level-codec.js';

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

export function createReviewModeController({ state, ui, editor, PathNavigator, refreshLevelRatingPane = () => {} }: RequireDeps<never>) {
    function resetEmptyReviewState() {
        setReviewIndex(state, 0);
        setEditorWorkingLevel(state, null);
        clearEditorUndoStack(state);
        setEditorModified(state, false);
        clearEditorTriggerableFalseGoalCells(state);
        PathNavigator.clear(state.ENGINE);
        clearNavigationUndoStack(state);
        setRevealedGeese(state);
        setDetonatedFalseGoals(state);
        resetHinterForLevel(state);
        ui.setInputValue('editReqLen', 0);
        ui.setInputValue('editReqInt', 0);
        ui.renderMetricsPanel({ currentLen: 0, requiredLength: 0, currentInt: 0, requiredIntersections: 0 });
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
        const normalized = parseRawLevel(rawLevel, safeIdx);
        if (!normalized) {
            ui.showMessage('Could not load submission.', 'error');
            return;
        }
        // A submission's levelData.hints is the canonical Hint[] (path + provenance) — split it
        // into the working level's dual fields, same as the editor's own load path: .hints stays
        // plain paths (every existing dedup/novelty/UI-cycling call site expects that), .hintRecords
        // carries the provenance through so it survives approve/publish.
        const hintRecords = upgradeLegacyHints(normalized.hints);
        normalized.hints = hintPaths(hintRecords);
        normalized.hintRecords = hintRecords;
        setEditorWorkingLevel(state, normalized);
        clearEditorUndoStack(state);
        setEditorModified(state, false);
        PathNavigator.clear(state.ENGINE);
        clearNavigationUndoStack(state);
        setRevealedGeese(state);
        setDetonatedFalseGoals(state);
        setFoundHintsSinceLoad(state); // reset per-submission so the count/cycle don't leak across levels
        resetHinterForLevel(state);
        ui.setInputValue('editReqLen', normalized.requiredLength || 0);
        ui.setInputValue('editReqInt', normalized.requiredIntersections || 0);
        editor.syncMetadataFieldsFromLevel(normalized);
        ui.updateLevelDisplay(safeIdx, false, `${safeIdx + 1}/${subs.length}`);
        ui.setButtonLabel('reviewHintBtn', hintButtonLabel(knownHintCount(normalized.hints, state.ENGINE.foundHintsSinceLoad)));
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
