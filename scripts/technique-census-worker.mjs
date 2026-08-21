#!/usr/bin/env node
/** Dedicated worker for technique-census.mjs's --workers>1 path (scripts/solver-worker-pool.mjs's
 *  runWorkerPool/runWorkerMain contract — same shape as level-blind-capability-worker.mjs). Each
 *  worker process gets its own createCellRunner() instance (own corpus cache, own parsed-config
 *  cache) — cheap (a few MB per corpus, parsed once per worker) and avoids any shared-mutable-state
 *  hazard across the OS-level process boundary. */
import { runWorkerMain } from './solver-worker-pool.mjs';
import { createCellRunner } from './technique-census-cell.mjs';

const { runCellSafe } = await createCellRunner();

runWorkerMain(async (cell) => runCellSafe(cell));
