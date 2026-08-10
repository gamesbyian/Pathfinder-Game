/** Build the successful SOLVE response posted by the solver worker. Attempt records deliberately
 * remain raw: structured-clone is the worker transport contract, unlike the bounded whitelist used
 * for persisted reports, and therefore carries new own Attempt fields without another projection. */
export function buildSolveWorkerResult(id, result) {
  return {
    type: 'RESULT',
    id,
    ok: result.ok,
    status: result.status,
    solution: result.solution,
    elapsedMs: result.totalMs,
    nodesExpanded: result.nodesExpanded,
    attempts: result.attempts,
    deadlineTruncated: result.deadlineTruncated,
  };
}
