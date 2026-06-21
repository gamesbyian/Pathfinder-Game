// @ts-check
// Solver-local JSDoc type contracts. No runtime exports — referenced via
// `import('./types.js').T` from `// @ts-check`'d solver modules. (plan §5 / ADR 0009.)

/**
 * The solver's mutable DFS/beam search state (see search-state.js). This typedef is **partial** —
 * it lists only the fields read by already-typed solver modules and grows as more are typed.
 * All masks are 32-bit integers; all keys are packed.
 * @typedef {Object} SolverSearchState
 * @property {number[]} path           packed cell keys of the current path
 * @property {number}   portalJumps    portal jumps so far (subtracted from counted length)
 * @property {number}   ints           intersection count so far
 * @property {number}   mustMask       bit i set while must-pass[i] is unvisited
 * @property {number}   mustCrossMask  bit i set while must-cross[i] is unsatisfied
 * @property {number}   mpVisitedMask  bit i set once must-pass[i] is visited
 * @property {number}   surroundMask   bit i set while surround[i] has unvisited neighbors
 * @property {number}   mustTurnMask   bit i set while must-turn[i] is unsatisfied
 * @property {number}   adjTurnMask    bit i set while adj-turn[i] is unsatisfied
 */

export {};
