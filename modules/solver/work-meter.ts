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
// CONCURRENCY (fixed 2026-08-20). This module-level counter used to be the ONLY work counter,
// shared by every `solveLevel()` call in the same JS realm — safe under `worker_threads` (module
// state is per-worker, a separate V8 isolate each) but NOT safe for two solves running
// concurrently in the SAME realm (e.g. `Promise.all([solveLevel(a), solveLevel(b)])`, which the
// public API has always permitted): one solve's own `spent = workMeter.units - workStart` delta
// could silently include work a completely unrelated concurrent solve did in between, and — more
// seriously — search-state.ts's DFS/beam/repair buffer pool was ALSO module-global at the time,
// so two overlapping attempts of the same technique could have their live `visited`/`edgeUsage`
// arrays cleared out from under them by each other's `createState` calls.
//
// Every internal budget check and per-solve accounting computation in the solver now reads
// `prep._workMeter.units` instead (see PrepLevel's own comment) — a fresh, isolated counter per
// `solveLevel()` call, since `prep` is already threaded through every hot-path function and
// recreated fresh per solve. `applyMove`/`isConnected` (the two sites that increment work) still
// ALSO increment THIS module-global counter, unchanged, purely so offline hint-discovery tooling
// that spans many sequential `solveLevel()` calls in one process (diversification.ts, hint-
// ablation-generator.ts, scripts/hint-workbench.mjs) can keep reading a monotonically-increasing
// cross-call cumulative total exactly as before — none of those read prep-scoped state (they call
// `solverApi.solve(...)` as a black box, never internal search functions directly), so this
// module-global counter's ORIGINAL role is fully preserved for them.
//
// Deliberately a plain module-level object rather than a field on `prep` for ITS OWN increment
// site's sake: it is incremented on the hottest path in the solver, and a monomorphic direct field
// bump is the cheapest form available — `prep._workMeter` gets the exact same treatment.
export const workMeter = { units: 0 };

/** Cost of one isConnected flood fill, in applyMove-equivalents. Fitted — see above. */
export const CONNECTIVITY_WORK_UNITS = 12;
