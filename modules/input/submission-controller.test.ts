import assert from 'node:assert/strict';
import { afterEach, test } from 'vitest';
import { PACK } from '../domain/cell-key.js';
import { parseRawLevel } from '../domain/level-codec.js';
import { getLevelFingerprint } from '../domain/level-fingerprint.js';
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
            state: {
                engineState: {
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
            editor: { applyMetricsFromUI() {}, validateWorkingLevel: () => ({ ok: true }) },
            persistence,
            solverApi: {
                validateCandidatePath: (_level: any, path: number[]) => ({ ok: true, path }),
                createVarietySearch: () => ({ run: async () => ({ newlySaved: [] }) }),
            },
            data: { getHints: async () => [], getLevels: () => [] },
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
        state: {
            engineState: {
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
        data: { getHints: async () => [], getLevels: () => [] },
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

test('submission-time false-goal check passes the capped budget as timeLimitMs and surfaces untriggerable cells', async () => {
    const elements = installDocumentStub();
    const workingLevel = parseRawLevel({
        grid: { w: 5, h: 5 }, gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 5 },
        reqLen: 8, reqInt: 0, blocks: [], geese: [], falseGoals: [{ x: 3, y: 3 }], mustPass: [], mustCross: [],
        filters: [], flippingFilters: [], portals: [],
    })!;
    const submitSteps: any[] = [];
    let capturedOpts: any = null;

    const submitted = new Promise<void>((resolve) => {
        const persistence = {
            getCurrentUser: () => ({ uid: 'tester' }),
            findDuplicateLevel: async () => ({ duplicate: null, fingerprint: 'v2:test', warnings: [] }),
            submitLevel: async () => { resolve(); },
        };
        createSubmissionController({
            state: {
                engineState: {
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
            editor: { applyMetricsFromUI() {}, validateWorkingLevel: () => ({ ok: true }) },
            persistence,
            solverApi: {
                validateCandidatePath: (_level: any, path: number[]) => ({ ok: true, path }),
                createVarietySearch: () => ({ run: async () => ({ newlySaved: [] }) }),
                // Budget well above the 8s submission-time cap, so the test proves the
                // controller actually clamps it rather than passing the raw value through.
                getFalseGoalTriggerSearchBudgetMs: () => 30000,
                findTriggerableFalseGoalCells: async (_level: any, opts: any) => {
                    capturedOpts = opts;
                    return { status: 'complete', triggerableCells: new Set(), gatesProcessed: 1, gatesCompleted: 1, totalGates: 1 };
                },
                classifyFalseGoalTriggerability: (level: any) =>
                    new Map(Array.from(level.falseGoalKeys as Set<number>).map((k) => [k, 'untriggerable'])),
            },
            data: { getHints: async () => [], getLevels: () => [] },
            reportError: (label: string, err: any) => { throw new Error(`${label}: ${err?.message || err}`); },
        } as any);
    });

    elements.get('reviewSubmitBtn').onclick();
    await submitted;

    assert.ok(capturedOpts, 'findTriggerableFalseGoalCells should have been called');
    assert.equal(capturedOpts.timeLimitMs, 8000, 'the submission-time cap must reach the solver API as timeLimitMs, not timeLimit');
    assert.equal('timeLimit' in capturedOpts, false, 'the legacy field name must not be sent');

    const warnStep = submitSteps.find((s) => s.status === 'warn');
    assert.ok(warnStep, 'an untriggerable false goal must produce a warning step');
    assert.ok(String(warnStep.detail).includes('can never be triggered'), 'the warning should describe the dead false goal');
});

test('re-submitting an already-locally-published level with a new hint contributes only the new hint', async () => {
    const elements = installDocumentStub();
    const rawLevel = {
        grid: { w: 5, h: 5 }, gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 5 },
        reqLen: 8, reqInt: 0, blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
        filters: [], flippingFilters: [], portals: [],
    };
    const existingHint = [K(1, 1), K(2, 1), K(3, 1), K(4, 1), K(5, 1)];
    const newHint = [K(1, 1), K(1, 2), K(1, 3), K(1, 4), K(1, 5)];
    // Matches the local corpus's only level exactly (same fingerprint-relevant fields) but with
    // one hint the local corpus doesn't have yet.
    const workingLevel = parseRawLevel({ ...rawLevel, hints: [existingHint, newHint] })!;
    const localFingerprint = await getLevelFingerprint(rawLevel);

    const stepMessages: any[] = [];
    let submittedPayload: any = null;
    const submitted = new Promise<void>((resolve) => {
        const persistence = {
            getCurrentUser: () => ({ uid: 'tester' }),
            findDuplicateLevel: async () => ({ duplicate: null, fingerprint: localFingerprint, warnings: [] }),
            submitLevel: async (levelData: any, options: any) => {
                submittedPayload = { levelData, options };
                resolve();
            },
        };
        createSubmissionController({
            state: {
                engineState: {
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
                setSubmitStep(_stepId: string, _status: string, detail: any) { if (detail) stepMessages.push(detail); },
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
            editor: { applyMetricsFromUI() {}, validateWorkingLevel: () => ({ ok: true }) },
            persistence,
            solverApi: {
                validateCandidatePath: (_level: any, path: number[]) => ({ ok: true, path }),
                createVarietySearch: () => ({ run: async () => ({ newlySaved: [] }) }),
            },
            data: {
                // The local corpus has exactly one level, matching rawLevel, whose only saved
                // hint is existingHint -- so newHint (in workingLevel.hints) is the novel one.
                getLevels: () => [rawLevel],
                getLevel: (i: number) => [rawLevel][i],
                getHints: async () => [{ path: existingHint, provenance: [] }],
            },
            reportError: (label: string, err: any) => { throw new Error(`${label}: ${err?.message || err}`); },
        } as any);
    });

    elements.get('reviewSubmitBtn').onclick();
    await submitted;

    assert.ok(
        stepMessages.some((m) => String(m).includes('already exists in the published corpus (level 1)')),
        'the modal must advise the user their level already exists',
    );
    assert.equal(submittedPayload.options.targetLocalLevelFingerprint, localFingerprint);
    assert.equal(submittedPayload.options.targetPublishedLevelId, null);
    assert.deepEqual(submittedPayload.levelData.hints, [{ path: newHint, provenance: [] }],
        'only the novel hint should be submitted, not the one the local corpus already has');
});
