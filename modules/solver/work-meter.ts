// Cross-technique work unit: applyMove calls + 12 * isConnected calls. Raw nodes are not comparable
// across DFS/beam/repair; this weighting was empirically fitted to near-equal work/second across them.
// Internal per-solve budgets use the isolated `prep._workMeter`; this module-global meter remains a
// cumulative cross-call counter for sequential external tooling. See docs/solver-budget-determinism.md.
export const workMeter = { units: 0 };

/** Fitted connectivity cost in applyMove-equivalents. */
export const CONNECTIVITY_WORK_UNITS = 12;

/**
 * Strict whole-solve research budgets must stop *before* an atomic metered operation.
 * Technique-level cap checks (e.g. once per repair restart or beam batch) cannot
 * guarantee that: one restart can charge thousands of additional work units.
 *
 * This is deliberately opt-in. Ordinary production charges stay byte-for-byte
 * identical, and a refused charge changes neither the per-solve nor global meter.
 */
export class StrictWorkBudgetExhausted extends Error {
    constructor(
        readonly operation: 'applyMove' | 'isConnected',
        readonly attemptedCharge: number,
        readonly remainingWork: number,
    ) {
        super('Solver:strict-work-budget');
        this.name = 'StrictWorkBudgetExhausted';
    }
}

export function assertStrictWorkChargeAllowed(
    workAlreadySpent: number,
    strictCap: number,
    charge: number,
    operation: 'applyMove' | 'isConnected',
): void {
    if (workAlreadySpent + charge > strictCap) {
        throw new StrictWorkBudgetExhausted(operation, charge, Math.max(0, strictCap - workAlreadySpent));
    }
}
