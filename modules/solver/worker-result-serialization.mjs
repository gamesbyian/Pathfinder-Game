/** Build the successful SOLVE response posted by the solver worker.
 *
 * Attempt records deliberately remain raw: structured-clone is the worker transport contract,
 * unlike the bounded whitelist used for persisted reports, and therefore carries new own Attempt
 * fields without another projection. The same rule applies to the aggregate SolveResult itself.
 * Keep the worker-only envelope (`type`/`id`) and the historical `elapsedMs` transport name, but
 * otherwise forward the direct solver's own enumerable result fields instead of maintaining a
 * second whitelist that can drift whenever SolveResult grows.
 *
 * A few long-standing optional public fields are materialized as `undefined` when the direct solve
 * did not need them. Existing worker consumers use `field in result` as their shape check, so this
 * preserves that stable transport contract without turning the object back into a whitelist: new
 * enumerable SolveResult fields still cross automatically via `...solveResult`.
 *
 * `techniqueLifecycle` and `portfolio` are historical internal aliases. If present, normalize them
 * onto the current public field names rather than exposing both dialects across the worker seam.
 *
 * The return type is intentionally open-ended. This transport's defining invariant is that future
 * plain enumerable SolveResult fields cross without a serializer edit; narrowing the inferred
 * object literal back to today's known keys would make TypeScript disagree with that runtime
 * contract and would discourage the future-field regression sentinel that protects it.
 * @param {string | number} id
 * @param {Record<string, any>} result
 * @returns {Record<string, any>}
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
    nodeBudgetReached: result.nodeBudgetReached,
    solvedByPrime: result.solvedByPrime,
    schedulerMode: result.schedulerMode,
    elapsedMs: totalMs,
    stageLifecycle: result.stageLifecycle ?? techniqueLifecycle,
    legacyLatencyPortfolioExperiment: result.legacyLatencyPortfolioExperiment ?? portfolio,
  };
}
