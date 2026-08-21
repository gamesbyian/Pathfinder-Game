// Cross-technique work unit: applyMove calls + 12 * isConnected calls. Raw nodes are not comparable
// across DFS/beam/repair; this weighting was empirically fitted to near-equal work/second across them.
// Internal per-solve budgets use the isolated `prep._workMeter`; this module-global meter remains a
// cumulative cross-call counter for sequential external tooling. See docs/solver-budget-determinism.md.
export const workMeter = { units: 0 };

/** Fitted connectivity cost in applyMove-equivalents. */
export const CONNECTIVITY_WORK_UNITS = 12;
