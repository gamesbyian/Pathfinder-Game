import assert from 'node:assert/strict';
import { afterEach, test } from 'vitest';
import { PACK } from '../domain/cell-key.js';
import { cloneLevelWithReq, parseRawLevel } from '../domain/level-codec.js';
import { createSubmissionController } from './submission-controller.js';

const K = (x: number, y: number) => PACK(x - 1, y - 1);

const originalDocument = globalThis.document;

afterEach(() => {
    globalThis.document = originalDocument;
});

function installDocumentStub() {
    const elements = new Map<string, any>();
    globalThis.document = {
        getElementById(id: string) {
            if (!elements.has(id)) {
                elements.set(id, {
                    id,
                    onclick: null,
                    addEventListener() {},
                });
            }
            return elements.get(id);
        },
    } as any;
    return elements;
}

test('submit flow serializes landmarks for duplicate check and Firestore submission', async () => {
    const elements = installDocumentStub();
    const hint = [K(1, 1), K(2, 1), K(3, 1), K(4, 1), K(5, 1)];
    const workingLevel = parseRawLevel({
        grid: { w: 5, h: 5 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 5, y: 5 },
        reqLen: 8,
        reqInt: 0,
        blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
        filters: [], flippingFilters: [], portals: [],
        landmarks: [
            { x: 2, y: 2, objectType: 'park', role: 'surround' },
            { x: 3, y: 3, objectType: 'library', role: 'mustTurnCcw' },
            { x: 4, y: 4, objectType: 'fountain', role: 'adjacentTurn', turn: 'cw' },
        ],
        hints: [hint],
    })!;
    const duplicatePayloads: any[] = [];
    let submittedPayload: any = null;
    const submitted = new Promise<void>((resolve) => {
        const persistence = {
            getCurrentUser: () => ({ uid: 'tester' }),
            findDuplicateLevel: async (levelData: any) => {
                duplicatePayloads.push(levelData);
                return { duplicate: null, fingerprint: 'v2:test', warnings: [] };
            },
            submitLevel: async (levelData: any) => {
                submittedPayload = levelData;
                resolve();
            },
        };
        createSubmissionController({
            core: { REVIEW: 2, OVERLAY_NONE: 0, SOLVER_RUNNING: 9 },
            state: {
                ENGINE: {
                    solver: { controller: null, abortRequested: false },
                    editor: { workingLevel },
                    foundHintsSinceLoad: [],
                    nav: { path: [] },
                    mode: 0,
                    review: { currentIdx: 0 },
                },
            },
            ui: {
                closeAllModals() {},
                showMessage() {},
                resetSubmitModal() {},
                showSubmitModal() {},
                setSubmitStep() {},
                setSubmitStepCountdown() {},
                showSubmitDismiss() {},
                getValue: (id: string) => id === 'editReqLen' ? '8' : '0',
                setModalContent() {},
                setSolverControlsEnabled() {},
                setFoundHintsSinceLoad() {},
                setButtonState() {},
                hideSubmitModal() {},
                updateLevelDisplay() {},
                setSolutionOutput() {},
                copyText: async () => {},
            },
            engine: {
                solver: { startSolverRun() {}, endSolverRun() {} },
                overlays: { setOverlayState() {}, startHintAnimation() {} },
                review: { setReviewSubmissions() {}, loadReviewLevel() {} },
                hints: { setHintPaths() {}, pinCurrentHint() {}, clearPersistedHint() {}, pinCurrentHeatmap() {}, clearPersistedHeatmap() {} },
            },
            levelUtils: { cloneLevelWithReq },
            editor: { applyMetricsFromUI() {}, validateWorkingLevel: () => ({ ok: true }) },
            persistence,
            solverApi: {
                validateCandidatePath: (_level: any, path: number[]) => ({ ok: true, path }),
                createVarietySearch: () => ({ run: async () => ({ newlySaved: [] }) }),
            },
            data: { getHints: async () => [] },
            reportError: (label: string, err: any) => { throw new Error(`${label}: ${err?.message || err}`); },
        } as any);
    });

    elements.get('reviewSubmitBtn').onclick();
    await submitted;

    assert.equal(duplicatePayloads.length, 1);
    assert.deepEqual(duplicatePayloads[0].hints, []);
    assert.deepEqual(duplicatePayloads[0].landmarks, [
        { x: 2, y: 2, objectType: 'park', role: 'surround' },
        { x: 3, y: 3, objectType: 'library', role: 'mustTurn', turn: 'ccw' },
        { x: 4, y: 4, objectType: 'fountain', role: 'adjacentTurn', turn: 'cw' },
    ]);
    assert.equal(duplicatePayloads[0].levelId, undefined);
    assert.deepEqual(submittedPayload.landmarks, duplicatePayloads[0].landmarks);
    // The submitted hint is now the canonical {path, provenance} shape (domain/hint-types.ts) —
    // empty provenance here since this fixture's workingLevel carries no hintRecords for it.
    assert.deepEqual(submittedPayload.hints, [{ path: hint, provenance: [] }]);
    assert.equal(submittedPayload.levelId, undefined);
});

test('an unexpected throw outside the per-step guards still surfaces a clear modal error, not a stuck spinner', async () => {
    const elements = installDocumentStub();
    const workingLevel = parseRawLevel({
        grid: { w: 5, h: 5 }, gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 5 },
        reqLen: 8, reqInt: 0, blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
        filters: [], flippingFilters: [], portals: [],
    })!;
    const submitSteps: any[] = [];
    const reportedErrors: any[] = [];
    let dismissShown = false;

    await createSubmissionController({
        core: { REVIEW: 2, OVERLAY_NONE: 0, SOLVER_RUNNING: 9 },
        state: {
            ENGINE: {
                solver: { controller: null, abortRequested: false },
                editor: { workingLevel },
                foundHintsSinceLoad: [],
                nav: { path: [] },
                mode: 0,
                review: { currentIdx: 0 },
            },
        },
        ui: {
            closeAllModals() {},
            showMessage() {},
            resetSubmitModal() {},
            showSubmitModal() {},
            setSubmitStep(stepId: string, status: string, detail: any) { submitSteps.push({ stepId, status, detail }); },
            setSubmitStepCountdown() {},
            showSubmitDismiss() { dismissShown = true; },
            getValue: (id: string) => id === 'editReqLen' ? '8' : '0',
            setModalContent() {},
            setSolverControlsEnabled() {},
            setFoundHintsSinceLoad() {},
            setButtonState() {},
            hideSubmitModal() {},
            updateLevelDisplay() {},
            setSolutionOutput() {},
            copyText: async () => {},
        },
        engine: {
            solver: { startSolverRun() {}, endSolverRun() {} },
            overlays: { setOverlayState() {}, startHintAnimation() {} },
            review: { setReviewSubmissions() {}, loadReviewLevel() {} },
            hints: { setHintPaths() {}, pinCurrentHint() {}, clearPersistedHint() {}, pinCurrentHeatmap() {}, clearPersistedHeatmap() {} },
        },
        levelUtils: { cloneLevelWithReq },
        // Simulates an unanticipated bug in a code path with no dedicated try/catch of its own.
        editor: { applyMetricsFromUI() {}, validateWorkingLevel: () => { throw new Error('boom'); } },
        persistence: {
            getCurrentUser: () => ({ uid: 'tester' }),
            findDuplicateLevel: async () => { throw new Error('should never be reached'); },
            submitLevel: async () => { throw new Error('should never be reached'); },
        },
        solverApi: {
            validateCandidatePath: (_level: any, path: number[]) => ({ ok: true, path }),
            createVarietySearch: () => ({ run: async () => ({ newlySaved: [] }) }),
        },
        data: { getHints: async () => [] },
        reportError: (label: string, err: any) => { reportedErrors.push({ label, message: err?.message }); },
    } as any);

    elements.get('reviewSubmitBtn').onclick();
    // The onclick handler is synchronous but submitWorkingLevel is async; give its microtasks a
    // turn (it awaits a resolved setTimeout(0) promise right after the validate step starts).
    await new Promise((r) => setTimeout(r, 10));

    assert.ok(reportedErrors.some((e) => e.label === 'submit.unexpected' && e.message === 'boom'),
        'the unexpected error should be reported with its real message');
    const errorStep = submitSteps.find((s) => s.status === 'error');
    assert.ok(errorStep, 'a step should have been marked as errored');
    assert.equal(errorStep.stepId, 'smStep-validate', 'the step that was running when it threw');
    assert.ok(String(errorStep.detail).includes('boom'), 'the shown message should include the real error');
    assert.ok(dismissShown, 'the dismiss button must be shown so the modal is never stuck');
});
