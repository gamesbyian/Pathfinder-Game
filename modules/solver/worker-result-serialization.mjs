/** Build the successful SOLVE response posted by the solver worker. Attempt records deliberately
 * remain raw: structured-clone is the worker transport contract, unlike the bounded whitelist used
 * for persisted reports, and therefore carries new own Attempt fields without another projection.
 *
 * Includes every field the direct (on-thread) SolveResult carries (see orchestration.ts's own
 * interface) — fixed 2026-08-20: this used to return only a fixed subset (ok/status/solution/
 * elapsedMs/nodesExpanded/attempts/deadlineTruncated), silently dropping solutions/
 * nodeBudgetReached/workSpent/workBudget/solvedByPrime/stageLifecycle/schedulerMode/legacyLatencyPortfolioExperiment
 * for any caller that swapped the worker client in for the direct solver — the whole point of the
 * client's own "drop-in swap for on-thread solving" doc comment. Every one of these fields is
 * plain, structured-clone-safe data (numbers/strings/booleans/plain objects/arrays), so there is no
 * serialization reason to have excluded any of them. */
export function buildSolveWorkerResult(id, result) {
  return {
    type: 'RESULT',
    id,
    ok: result.ok,
    status: result.status,
    solution: result.solution,
    solutions: result.solutions,
    elapsedMs: result.totalMs,
    nodesExpanded: result.nodesExpanded,
    attempts: result.attempts,
    deadlineTruncated: result.deadlineTruncated,
    nodeBudgetReached: result.nodeBudgetReached,
    workSpent: result.workSpent,
    workBudget: result.workBudget,
    solvedByPrime: result.solvedByPrime,
    stageLifecycle: result.stageLifecycle ?? result.techniqueLifecycle,
    schedulerMode: result.schedulerMode,
    legacyLatencyPortfolioExperiment: result.legacyLatencyPortfolioExperiment ?? result.portfolio,
  };
}
