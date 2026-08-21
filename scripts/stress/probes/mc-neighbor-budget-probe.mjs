/**
 * Harness-pluggable wrapper around scripts/stress/lib/mc-neighbor-budget.mjs — see that file for
 * the full derivation, soundness argument, and honest scope limits. This is the shadow-probe
 * prototype for docs/solver-heuristic-capability-gap-analysis.md's item 3 ("bounded dynamic
 * propagation over forced interfaces and remaining free intersection budget"), scored against
 * scripts/stress/interface-probe-harness.mjs's oracle-labelled atlas per that doc's own
 * instruction: "prototype as a shadow propagator and compare unique catches ... before hot-path
 * integration."
 */
import { evaluateMcNeighborBudget } from '../lib/mc-neighbor-budget.mjs';

export const name = 'mc-neighbor-budget-propagation';
export const soundnessClass = 'sound prune (dynamic forced-neighbor revisit cost vs. remaining free intersection budget)';

export function evaluate({ level, prep, state, pos }) {
    return evaluateMcNeighborBudget({ level, prep, state, pos });
}
