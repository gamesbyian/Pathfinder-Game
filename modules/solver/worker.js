import { installBrowserStubs } from '../../scripts/test-lib/browser-stubs.mjs';
import { normalizeRawLevel } from '../domain/level-normalizer.js';
import { validateRawLevelForSolver } from '../domain/validation.js';
import { solveLevel } from './orchestration.js';
import { buildSolveWorkerResult } from './worker-result-serialization.mjs';

installBrowserStubs();

function errorMessage(err) {
    return err instanceof Error ? err.message : String(err);
}

/**
 * @param {unknown} message
 * @param {{ postBack: (msg: any) => void, cancelledIds: Set<any> }} deps
 */
export async function handleWorkerMessage(message, deps) {
    const { postBack, cancelledIds } = deps;
    if (!message || typeof message !== 'object') return;
    const { type, id } = /** @type {any} */ (message);

    if (type === 'CANCEL') {
        cancelledIds.add(id);
        return;
    }
    if (type !== 'SOLVE') return;

    const {
        level: levelRaw,
        budgetMs,
        schedulerMode,
        nodeBudget,
        workBudget,
        strictWorkCap,
        ablation,
        repairAdditiveBudgetMultiplierOverride,
        repairBudgetMultiplierOverride,
        goalAttractionDisabledRetryBudgetFractionOverride,
        attractionDiversityBudgetFractionOverride,
        admissibleOrderBudgetFractionOverride,
        admissibleOrderNodeReserveFractionOverride,
        mainSearchLateReserveFractionOverride,
        mainLoopLateReserveFractionOverride,
        mainSearchLateReserveConfigCountOverride,
        mainLoopLateReserveConfigCountOverride,
        disableExtraBudgetPasses,
        primeAttempt,
        staticPortfolio,
        attemptBudgetTelemetry,
        beamResearchObserver,
        connectivityRejectionObserver,
        repairEliteResearchObserver,
        repairChoiceResearchObserver,
    } = /** @type {any} */ (message);

    const solveOpts = {
        ...(schedulerMode !== undefined ? { schedulerMode } : {}),
        ...(nodeBudget !== undefined ? { nodeBudget } : {}),
        ...(workBudget !== undefined ? { workBudget } : {}),
        ...(strictWorkCap !== undefined ? { strictWorkCap } : {}),
        ...(ablation !== undefined ? { ablation } : {}),
        ...(repairAdditiveBudgetMultiplierOverride !== undefined ? { repairAdditiveBudgetMultiplierOverride } : {}),
        ...(repairBudgetMultiplierOverride !== undefined ? { repairBudgetMultiplierOverride } : {}),
        ...(goalAttractionDisabledRetryBudgetFractionOverride !== undefined ? { goalAttractionDisabledRetryBudgetFractionOverride } : {}),
        ...(attractionDiversityBudgetFractionOverride !== undefined ? { attractionDiversityBudgetFractionOverride } : {}),
        ...(admissibleOrderBudgetFractionOverride !== undefined ? { admissibleOrderBudgetFractionOverride } : {}),
        ...(admissibleOrderNodeReserveFractionOverride !== undefined ? { admissibleOrderNodeReserveFractionOverride } : {}),
        ...(mainSearchLateReserveFractionOverride !== undefined ? { mainSearchLateReserveFractionOverride } : {}),
        ...(mainLoopLateReserveFractionOverride !== undefined ? { mainLoopLateReserveFractionOverride } : {}),
        ...(mainSearchLateReserveConfigCountOverride !== undefined ? { mainSearchLateReserveConfigCountOverride } : {}),
        ...(mainLoopLateReserveConfigCountOverride !== undefined ? { mainLoopLateReserveConfigCountOverride } : {}),
        ...(disableExtraBudgetPasses !== undefined ? { disableExtraBudgetPasses } : {}),
        ...(primeAttempt !== undefined ? { primeAttempt } : {}),
        ...(staticPortfolio !== undefined ? { staticPortfolio } : {}),
        ...(attemptBudgetTelemetry !== undefined ? { attemptBudgetTelemetry } : {}),
        ...(beamResearchObserver !== undefined ? { beamResearchObserver } : {}),
        ...(connectivityRejectionObserver !== undefined ? { connectivityRejectionObserver } : {}),
        ...(repairEliteResearchObserver !== undefined ? { repairEliteResearchObserver } : {}),
        ...(repairChoiceResearchObserver !== undefined ? { repairChoiceResearchObserver } : {}),
    };

    try {
        const solverBoundaryErrors = validateRawLevelForSolver(levelRaw);
        if (solverBoundaryErrors.length > 0) {
            throw new Error(`Solver: invalid raw level: ${solverBoundaryErrors.join('; ')}`);
        }
        const level = normalizeRawLevel(levelRaw);
        const yieldFn = () => {
            if (cancelledIds.has(id)) throw new Error('Solver:cancelled');
        };
        const result = await solveLevel(level, { ...solveOpts, timeBudgetMs: budgetMs, yieldFn });
        cancelledIds.delete(id);
        postBack(buildSolveWorkerResult(id, result));
    } catch (err) {
        cancelledIds.delete(id);
        if (err instanceof Error && err.message === 'Solver:cancelled') {
            postBack({ type: 'RESULT', id, ok: false, solution: null, elapsedMs: 0, nodesExpanded: 0, attempts: [], cancelled: true });
        } else {
            postBack({ type: 'ERROR', id, message: errorMessage(err) });
        }
    }
}

// Bootstrap: only run in an actual Worker context. Route through an `any`-typed global solely so
// Node's checkJs environment need not declare DOM WorkerGlobalScope; runtime detection is unchanged.
const workerGlobal = /** @type {any} */ (globalThis);
if (typeof workerGlobal.WorkerGlobalScope !== 'undefined' && workerGlobal.self instanceof workerGlobal.WorkerGlobalScope) {
    const _cancelledIds = new Set();
    /** @param {{ data: unknown }} event */
    const onWorkerMessage = ({ data }) => handleWorkerMessage(data, {
        postBack: (msg) => workerGlobal.self.postMessage(msg),
        cancelledIds: _cancelledIds,
    });
    workerGlobal.self.onmessage = onWorkerMessage;
}
