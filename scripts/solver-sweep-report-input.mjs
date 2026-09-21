/**
 * Normalize supported solver sweep report input shapes at one ingress boundary.
 *
 * Current shard producers write {summary, levels}. Historical/prior combined reports are flattened
 * for downstream benchmark consumers, so recombination may still ingest that shape. The combiner
 * itself should never care which shape arrived.
 */
export function normalizeSolverSweepReportInput(document, source = '<input>') {
    if (!document || typeof document !== 'object' || Array.isArray(document)) {
        throw new Error(`${source}: solver sweep report must be an object`);
    }
    if (!Array.isArray(document.levels)) {
        throw new Error(`${source}: does not look like a solver sweep report (levels array required)`);
    }

    if (document.summary && typeof document.summary === 'object' && !Array.isArray(document.summary)) {
        return {
            ...document,
            summary: { ...document.summary },
            levels: document.levels,
            inputShape: 'shard-envelope',
        };
    }

    if (typeof document.budgetMs !== 'number') {
        throw new Error(`${source}: does not look like a portfolio-solve-sweep report ({summary, levels} or flattened combined report expected)`);
    }

    const summary = {
        budgetMs: document.budgetMs,
        corpus: document.corpus,
        nodeBudget: document.nodeBudget,
        workBudget: document.workBudget,
        schedulerMode: document.schedulerMode ?? document.execution?.schedulerMode ?? document.executionConfig?.schedulerMode,
        repairBudgetFraction: document.repairBudgetFraction,
        commit: document.commitSha,
        ...(document.executionConfig || {}),
        ...(document.effectiveConfig ? {
            effectiveConfig: document.effectiveConfig,
            effectiveConfigDigest: document.effectiveConfigDigest,
        } : {}),
        ...(document.entrypoint ? { entrypoint: document.entrypoint } : {}),
        ...(document.producer ? { producer: document.producer } : {}),
        ...(document.workflowFamily ? { workflowFamily: document.workflowFamily } : {}),
        ...(document.execution?.levelBlind != null ? { levelBlind: document.execution.levelBlind } : {}),
        ...(document.execution?.historyAware != null ? { historyAware: document.execution.historyAware } : {}),
        ...(Array.isArray(document.sourceRuns) ? { sourceRuns: document.sourceRuns } : {}),
    };

    return {
        ...document,
        summary,
        levels: document.levels,
        inputShape: 'flattened-combined',
    };
}
