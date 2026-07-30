// One canonical unit of solver work, counted identically by every search technique.
//
// WHY THIS EXISTS. `nodesExpanded` is not comparable across techniques, because each counts a
// different primitive: dfsFromGate counts one loop iteration (≈ one child edge), beamSearchFromGate
// counts one frontier vertex expanded (a path replay plus up to 4 candidate evaluations), and
// repairSearchFromGate counts one walk ply (up to 4 candidate evaluations). Measured across
// published levels, that makes the SAME nominal node buy ~11-17x different amounts of real work
// depending on which technique spends it. A budget denominated in such a unit cannot be divided
// fairly between attempts — it hands a beam attempt an order of magnitude more wall time per
// allocated node than a DFS attempt — which is why raw-node allocation reshaped the attempt ladder
// and lost solves rather than merely making it reproducible.
//
// THE UNIT. Every technique funnels its inner loop through the same two primitives: applyMove (one
// candidate move evaluated) and isConnected (the connectivity flood fill, which repair skips
// entirely, beam runs on a wide throttle and DFS on a narrow one — the single largest source of
// per-candidate cost variance). Counting
//
//     work = applyMove calls + CONNECTIVITY_WORK_UNITS * isConnected calls
//
// collapses the cross-technique spread from 11.4x to **1.02x** (dfs 3.34M, repair 3.33M, beam
// 3.39M work/s), i.e. one work unit costs the same wherever it is spent. CONNECTIVITY_WORK_UNITS
// was fitted, not guessed: it is the weight that minimises that spread over per-attempt
// work/elapsedMs samples. See docs/solver-budget-determinism.md.
//
// Deliberately a plain module-level object rather than a field on `prep`: it is incremented on the
// hottest path in the solver, and a monomorphic direct field bump is the cheapest form available.
// Module state is per-worker under worker_threads, same as the other solver scratch. Consumers read
// DELTAS across a span (attempt, probe, restart) rather than resetting it.
export const workMeter = { units: 0 };

/** Cost of one isConnected flood fill, in applyMove-equivalents. Fitted — see above. */
export const CONNECTIVITY_WORK_UNITS = 12;
