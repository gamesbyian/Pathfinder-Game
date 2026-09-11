/** Build the successful SOLVE response posted by the solver worker.
 *
 * Attempt records deliberately remain raw: structured-clone is the worker transport contract,
 * unlike the bounded whitelist used for persisted reports, and therefore carries new own Attempt
 * fields without another projection. The same rule applies to the aggregate SolveResult itself.
 * Keep the worker-only envelope (`type`/`id`) and the historical `elapsedMs` transport name, but
 * otherwise forward the direct solver's own enumerable result fields instead of maintaining a
 * second whitelist that can drift whenever SolveResult grows.
 *
 * `techniqueLifecycle` and `portfolio` are historical internal aliases. If present, normalize them
 * onto the current public field names rather than exposing both dialects across the worker seam.
 * @param {string | number} id
 * @param {Record<string, any>} result
 */
export function buildSolveWorkerResult(id, result) {
  const {
    totalMs,
    techniqueLifecycle,
    portfolio,
    ...solveResult
  } = result;

  return {
    type: 'RESULT',
    id,
    ...solveResult,
    elapsedMs: totalMs,
    stageLifecycle: result.stageLifecycle ?? techniqueLifecycle,
    legacyLatencyPortfolioExperiment: result.legacyLatencyPortfolioExperiment ?? portfolio,
  };
}
