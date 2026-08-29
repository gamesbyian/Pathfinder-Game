import assert from 'node:assert/strict';
import { afterEach, test, vi } from 'vitest';
import { PACK } from '../domain/cell-key.js';
import { createTrapScanController } from './trap-scan-controller.js';

function makeLevel() {
    return {
        grid: { w: 4, h: 4 },
        reqLen: 6,
        reqInt: 0,
        gateKeys: [PACK(0, 0)],
        goalKey: PACK(3, 3),
        falseGoalKeys: new Set<number>(),
        blockSet: new Set<number>(),
        gooseSet: new Set<number>(),
        mustPassKeys: [] as number[],
        mustCrossKeys: [] as number[],
        filterMap: new Map(),
        flippingFilterMap: new Map(),
        portalMap: new Map(),
        landmarkMeta: new Map(),
    };
}

function makeHarness(solverApi: any, reportError: (...args: any[]) => void = () => {}) {
    const level = makeLevel();
    const state: any = {
        ENGINE: {
            editor: {
                workingLevel: level,
                falseGoalTriggerScanState: 'stale',
                triggerableFalseGoalCells: new Set<number>(),
                falseGoalTriggerParityCandidates: new Set<number>(),
                selectedTool: null,
                draggedObject: null,
            },
            mode: 'editor',
            overlayState: 'none',
            solver: { controller: null },
            isDirty: false,
        },
    };
    const controller = createTrapScanController({
        core: { EDITOR: 'editor', OVERLAY_NONE: 'none' },
        state,
        ui: { showMessage() {} },
        levelUtils: { deepCloneLevel: (value: any) => value },
        editor: { validateWorkingLevel: () => ({ ok: true }) },
        solverApi,
        reportError,
    } as any);
    return { controller, state, level };
}

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

test('worker-backed editor scan sends canonical budget, streams canonical progress, and stores canonical result cells', async () => {
    vi.useFakeTimers();
    const originalWorker = Object.getOwnPropertyDescriptor(globalThis, 'Worker');

    class FakeWorker {
        static instances: FakeWorker[] = [];
        onmessage: ((event: any) => void) | null = null;
        onerror: ((event: any) => void) | null = null;
        messages: any[] = [];

        constructor() { FakeWorker.instances.push(this); }

        postMessage(message: any) {
            this.messages.push(message);
            if (message.type === 'FALSE_GOAL_TRIGGER_SEARCH') {
                queueMicrotask(() => this.onmessage?.({
                    data: {
                        type: 'FALSE_GOAL_TRIGGER_SEARCH_PROGRESS',
                        id: message.id,
                        newTriggerableCells: [PACK(1, 1)],
                        gatesProcessed: 1,
                        gatesCompleted: 0,
                        totalGates: 1,
                    },
                }));
            }
        }

        emitResult(message: any) { this.onmessage?.({ data: message }); }
        terminate() {}
    }

    Object.defineProperty(globalThis, 'Worker', { value: FakeWorker, configurable: true, writable: true });
    try {
        const { controller, state } = makeHarness({
            findTriggerableFalseGoalCells() { throw new Error('main-thread fallback should not run'); },
            getFalseGoalTriggerSearchBudgetMs: () => 999,
        });

        const scanPromise = controller.scan(1234);
        await Promise.resolve();
        await Promise.resolve();

        const worker = FakeWorker.instances[0];
        assert.ok(worker, 'controller should construct the solver worker');
        const searchMessage = worker.messages.find(m => m.type === 'FALSE_GOAL_TRIGGER_SEARCH');
        assert.ok(searchMessage);
        assert.equal(searchMessage.budgetMs, 1234, 'controller budget must reach worker client as timeLimitMs');
        assert.ok(state.ENGINE.editor.triggerableFalseGoalCells.has(PACK(1, 1)),
            'canonical newTriggerableCells progress must stream into editor state');

        worker.emitResult({
            type: 'FALSE_GOAL_TRIGGER_SEARCH_RESULT',
            id: searchMessage.id,
            status: 'complete',
            triggerableCells: [PACK(1, 1), PACK(2, 0)],
            gatesProcessed: 1,
            gatesCompleted: 1,
            totalGates: 1,
            elapsedMs: 5,
            timeLimitMs: 1234,
        });
        const result: any = await scanPromise;

        assert.equal(result.status, 'complete');
        assert.deepEqual([...state.ENGINE.editor.triggerableFalseGoalCells].sort((a, b) => a - b),
            [PACK(1, 1), PACK(2, 0)].sort((a, b) => a - b));
        assert.equal(state.ENGINE.editor.falseGoalTriggerScanState, 'complete');
        assert.equal(state.ENGINE.editor.falseGoalTriggerParityCandidates.size, 0);
    } finally {
        if (originalWorker) Object.defineProperty(globalThis, 'Worker', originalWorker);
        else delete (globalThis as any).Worker;
    }
});

test('main-thread fallback passes canonical timeLimitMs/onTriggerableCell and stores triggerableCells', async () => {
    vi.useFakeTimers();
    const originalWorker = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
    Object.defineProperty(globalThis, 'Worker', {
        value: class { constructor() { throw new Error('worker unavailable'); } },
        configurable: true,
        writable: true,
    });

    try {
        let receivedOpts: any = null;
        const { controller, state } = makeHarness({
            async findTriggerableFalseGoalCells(_level: any, opts: any) {
                receivedOpts = opts;
                opts.onTriggerableCell(PACK(1, 1));
                await opts.onProgress({ gatesProcessed: 1, gatesCompleted: 0, totalGates: 1, triggerableCells: 1 });
                return {
                    status: 'partial',
                    triggerableCells: new Set([PACK(1, 1), PACK(2, 0)]),
                    gatesProcessed: 1,
                    gatesCompleted: 0,
                    totalGates: 1,
                    elapsedMs: 5,
                    timeLimitMs: 4321,
                };
            },
            getFalseGoalTriggerSearchBudgetMs: () => 999,
        });

        const result: any = await controller.scan(4321);

        assert.equal(receivedOpts.timeLimitMs, 4321);
        assert.equal(typeof receivedOpts.onTriggerableCell, 'function');
        assert.equal(Object.hasOwn(receivedOpts, 'timeLimit'), false);
        assert.equal(Object.hasOwn(receivedOpts, 'onSpot'), false);
        assert.equal(result.status, 'partial');
        assert.deepEqual([...state.ENGINE.editor.triggerableFalseGoalCells].sort((a, b) => a - b),
            [PACK(1, 1), PACK(2, 0)].sort((a, b) => a - b));
        assert.equal(state.ENGINE.editor.falseGoalTriggerScanState, 'partial');
    } finally {
        if (originalWorker) Object.defineProperty(globalThis, 'Worker', originalWorker);
        else delete (globalThis as any).Worker;
    }
});
