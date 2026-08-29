import type { RequireDeps } from '../state.js';
// Background trap-spot scan. When the false-goal tool is active and the
// cached spot set is stale, the trap search runs off-thread (solver Web Worker)
// and streams confirmed spots onto the grid as they are found — no blocking
// overlay, so the maker sees viable trap-spot cells while placing false goals. The
// Trap Spots button (editor-toolbar-controller) runs its explicit, deeper scans through the
// same scan() seam so worker use, streaming, and state updates have one owner.
//
// Invalidation model: every level-mutating path calls clearEditorTriggerableFalseGoalCells,
// which resets falseGoalTriggerScanState to 'stale'. An in-flight scan observes that (or a
// newer scan's token) and cancels, discarding its stream — so spots on screen
// always describe the level currently on screen.
import {
    addEditorTriggerableFalseGoalCells, markDirty, setEditorFalseGoalTriggerParityCandidates,
    setEditorFalseGoalTriggerScanState, setEditorTriggerableFalseGoalCells,
} from '../state-actions.js';
import { computeParityCandidates } from './trap-scan-core.js';
import { createSolverWorkerClient } from '../solver/solver-worker-client.js';
import { defaultReportError } from '../error-reporting.js';

const WATCH_INTERVAL_MS = 300;

export function createTrapScanController({ core, state, ui, levelUtils, editor, solverApi, reportError = defaultReportError }: RequireDeps<'levelUtils' | 'solverApi'>) {
    let client: any = null;
    let workerFailed = false;
    let scanToken = 0;              // bump to detach any in-flight scan from state
    let activeScans = 0;
    let queue: Promise<unknown> = Promise.resolve(); // serializes scans through the single worker
    let lastBudgetMs = 0;           // budget of the scan that produced the current spots

    const getClient = () => {
        if (workerFailed) return null;
        if (!client) {
            try {
                // Worker constructed inline so Vite statically bundles the worker module.
                client = createSolverWorkerClient(
                    new Worker(new URL('../solver/worker.js', import.meta.url), { type: 'module' }));
            } catch (err) {
                workerFailed = true;
                reportError('trap-scan.worker-create', err);
            }
        }
        return client;
    };

    // Runs the search off-thread when possible; falls back to the cooperative
    // main-thread search (same streaming hooks) if the worker can't be used.
    async function runTrapSearch(level: any, budgetMs: number, { shouldCancel, onSpots, onGateProgress }: any) {
        const c = getClient();
        if (c) {
            try {
                return await c.findTriggerableFalseGoalCells(level, {
                    timeLimit: budgetMs,
                    shouldCancel,
                    onProgress: (p: any) => {
                        if (p.newSpots?.length) onSpots(p.newSpots);
                        if (p.totalGates != null && onGateProgress) onGateProgress(p);
                    },
                });
            } catch (err) {
                workerFailed = true; // worker is unhealthy — main-thread for the rest of the session
                reportError('trap-scan.worker', err);
            }
        }
        const pending: number[] = [];
        return solverApi.findTriggerableFalseGoalCells(level, {
            timeLimit: budgetMs,
            onSpot: (k: number) => pending.push(k),
            onProgress: (p: any) => { if (onGateProgress) onGateProgress(p); },
            yieldFn: async () => {
                if (pending.length) onSpots(pending.splice(0));
                await new Promise((r: any) => setTimeout(r, 0));
                if (shouldCancel()) throw new Error('Solver:cancelled');
            },
        });
    }

    // A scan's stream is valid only while state still says 'scanning' for its
    // token; any edit resets falseGoalTriggerScanState via clearEditorTriggerableFalseGoalCells, which
    // both cancels the scan and discards whatever it already streamed.
    const scanInvalidated = (token: number) =>
        token !== scanToken || state.ENGINE.editor.falseGoalTriggerScanState !== 'scanning';

    async function executeScan(budgetMs: number, hooks: any) {
        const token = ++scanToken;
        setEditorFalseGoalTriggerScanState(state, 'scanning');
        // Instant layer: faint outlines on every cell parity can't rule out.
        setEditorFalseGoalTriggerParityCandidates(state, computeParityCandidates(state.ENGINE.editor.workingLevel));
        markDirty(state);
        const searchLevel = levelUtils.deepCloneLevel(state.ENGINE.editor.workingLevel);
        try {
            const res: any = await runTrapSearch(searchLevel, budgetMs, {
                shouldCancel: () => scanInvalidated(token) || (hooks.shouldCancel?.() ?? false),
                onSpots: (keys: number[]) => {
                    if (scanInvalidated(token)) return;
                    addEditorTriggerableFalseGoalCells(state, keys);
                    markDirty(state);
                },
                onGateProgress: hooks.onGateProgress,
            });
            if (scanInvalidated(token)) return null;
            setEditorTriggerableFalseGoalCells(state, res.spots);
            const complete = res.status === 'complete';
            setEditorFalseGoalTriggerScanState(state, complete ? 'complete' : 'partial');
            // A complete sweep resolves every candidate: only confirmed spots remain.
            if (complete) setEditorFalseGoalTriggerParityCandidates(state, new Set());
            lastBudgetMs = budgetMs;
            markDirty(state);
            return res;
        } catch (err) {
            if (!scanInvalidated(token)) {
                setEditorFalseGoalTriggerScanState(state, 'failed'); // retried after the next edit, not in a loop
                setEditorFalseGoalTriggerParityCandidates(state, new Set());
                markDirty(state);
                reportError('trap-scan.search', err);
            }
            return null;
        }
    }

    /**
     * Start a trap scan, superseding any in-flight one (the worker processes one
     * search at a time, so runs are queued and stale runs cancel via their token).
     * hooks: { shouldCancel?, onGateProgress? } — used by the Trap Spots overlay flow.
     * Resolves to the search result, or null when superseded/cancelled/failed.
     */
    function scan(budgetMs: number, hooks: any = {}) {
        scanToken++; // cancel the in-flight scan before queueing behind it
        activeScans++;
        const run = queue.then(() => executeScan(budgetMs, hooks)).finally(() => { activeScans--; });
        queue = run.then(() => undefined, () => undefined);
        return run;
    }

    // --- Auto-scan watcher ---
    // Polling one cheap condition set beats hooking every invalidation call site
    // (object place/remove, grid transforms, undo, metric edits — they all funnel
    // through clearEditorTriggerableFalseGoalCells, which this observes as 'stale').
    const falseGoalToolActive = () => {
        const ed = state.ENGINE.editor;
        return ed.selectedTool === 'falseGoal' || ed.draggedObject?.type === 'falseGoal';
    };

    const shouldAutoScan = () => {
        const eng = state.ENGINE;
        return eng.mode === core.EDITOR                    // spots only render in editor mode
            && eng.overlayState === core.OVERLAY_NONE      // don't race the modal solver flows
            && !eng.solver.controller
            && activeScans === 0
            && !!eng.editor.workingLevel
            && eng.editor.falseGoalTriggerScanState === 'stale'
            && falseGoalToolActive();
    };

    setInterval(() => {
        if (!shouldAutoScan()) return;
        // A structurally-invalid or metric-less level has no meaningful spot set;
        // stay 'stale' and re-check next tick (edits change the answer).
        const l = state.ENGINE.editor.workingLevel;
        if (!(l.reqLen > 0) || !editor.validateWorkingLevel()?.ok) return;
        void scan(solverApi.getFalseGoalTriggerSearchBudgetMs(l)).then((res: any) => {
            // Background completion is silent — the highlights are the signal, and the
            // lingering faint candidate layer already says "incomplete" (full enumeration
            // rarely finishes on open levels, so a toast per rescan would be constant
            // noise). Speak only when an incomplete sweep found NOTHING: a bare grid
            // would otherwise read as "no valid spots".
            if (res && res.status !== 'complete' && state.ENGINE.editor.triggerableFalseGoalCells.size === 0) {
                ui.showMessage('Trap scan incomplete — press Trap Spots for a deeper search.', 'warning');
            }
        });
    }, WATCH_INTERVAL_MS);

    return {
        scan,
        isBusy: () => activeScans > 0,
        getLastBudgetMs: () => lastBudgetMs,
    };
}
