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
                showSubmitDismiss() {},
                getValue: (id: string) => id === 'editReqLen' ? '8' : '0',
                setModalContent() {},
                setSolverControlsEnabled() {},
                setSolverDetailText() {},
                setSolverTimerText() {},
                setSolverProgress() {},
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
    assert.deepEqual(submittedPayload.hints, [hint]);
    assert.equal(submittedPayload.levelId, undefined);
});
