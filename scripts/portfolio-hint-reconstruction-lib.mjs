import { provenanceFromHistoricalSolveResult } from '../modules/solver/hint-provenance.js';

/**
 * Reconstruct the exact canonical provenance event persisted by portfolio-solve-sweep's direct
 * hint-capture path from one self-describing solved report row.
 *
 * History-aware portfolio workflows use baselines/prime attempts/caches to shape solver policy, but
 * solveLevel() does not consume persisted Hint paths. Therefore usedExistingHints/hintGuided remain
 * false here, matching the direct createHintCapture() route.
 */
export function reconstructPortfolioHintProvenance(summary, row, {
    sourceRunId = null,
    sourceRunAttempt = null,
} = {}) {
    if (summary?.producer !== 'portfolio-solve-sweep') throw new Error('expected portfolio-solve-sweep summary');
    if (!row?.ok || !Array.isArray(row.solution) || row.solution.length === 0) throw new Error('expected solved portfolio row');
    if (typeof row.levelRevision !== 'string' || row.levelRevision.length === 0) throw new Error('portfolio row lacks levelRevision');
    if (typeof row.discoveryObservedAt !== 'string' || !Number.isFinite(Date.parse(row.discoveryObservedAt))) {
        throw new Error('portfolio row lacks valid discoveryObservedAt');
    }

    return provenanceFromHistoricalSolveResult({
        attempts: Array.isArray(row.attempts) ? row.attempts : [],
        nodesExpanded: Number.isFinite(row.nodesExpanded) ? row.nodesExpanded : undefined,
        totalMs: Number.isFinite(row.totalMs) ? row.totalMs
            : Number.isFinite(row.elapsedMs) ? row.elapsedMs : undefined,
        status: 'success',
        workSpent: Number.isFinite(row.workSpent) ? row.workSpent : undefined,
        workBudget: Number.isFinite(row.workBudget) ? row.workBudget : undefined,
    }, {
        solverVersion: typeof summary.commit === 'string' ? summary.commit : null,
        foundAt: row.discoveryObservedAt,
        budgetMs: Number.isFinite(summary.budgetMs) ? summary.budgetMs : null,
        usedExistingHints: false,
        levelRevision: row.levelRevision,
        ...(typeof summary.solverRequestIdentity === 'string' && summary.solverRequestIdentity
            ? { solverRequestIdentity: summary.solverRequestIdentity } : {}),
        ...(typeof summary.reproducibilityMode === 'string' && summary.reproducibilityMode
            ? { reproducibilityMode: summary.reproducibilityMode } : {}),
        ...(typeof summary.staticPortfolioArm === 'string' && summary.staticPortfolioArm
            ? { executionArm: summary.staticPortfolioArm } : {}),
        ...(sourceRunId != null
            ? {
                occurrenceRunId: String(sourceRunId),
                ...(sourceRunAttempt != null ? { occurrenceRunAttempt: String(sourceRunAttempt) } : {}),
            }
            : {}),
    });
}
