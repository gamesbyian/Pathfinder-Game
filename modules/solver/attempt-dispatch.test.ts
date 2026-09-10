/**
 * Guards the single attempt-config → search-function dispatch shared by orchestration.ts's
 * runAttempt() and the offline race worker (scripts/solver-parallel/worker-source.mjs).
 *
 * Both call sites used to hand-roll the same repair/beam/DFS branch independently; the worker's
 * copy silently dropped args (nodeBudget/seedSalt/out) and could not learn about a new attempt
 * type. runAttemptSearch() is now the one dispatcher both import. These tests pin the routing
 * contract (behavioral) and assert the worker never re-forks it (structural).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';
import { runAttemptSearch } from './attempt-dispatch.js';
import { PACK } from './encoding.js';
import { SCORING_PROFILES } from './policy.js';
import { prepLevel } from './prep.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { AblationConfig, AttemptConfig, PrepLevel } from './types.js';

function makeLevel(overrides = {}) {
  return {
    grid: { w: 3, h: 1 },
    requiredLength: 2,
    requiredIntersections: 0,
    goalKey: PACK(2, 0),
    gateKeys: [PACK(0, 0)],
    blockSet: new Set(),
    gooseSet: new Set(),
    falseGoalKeys: new Set(),
    mustPassKeys: [],
    mustCrossKeys: [],
    filterMap: new Map(),
    flippingFilterMap: new Map(),
    portalMap: new Map(),
    ...overrides,
  } as unknown as NormalizedLevel;
}

function prepFor(level: NormalizedLevel): PrepLevel {
  const prep = prepLevel(level);
  prep._metrics = { nodesExpanded: 0 };
  return prep;
}

const SOLUTION = [PACK(0, 0), PACK(1, 0), PACK(2, 0)];

test('DFS branch (no beamWidth, no repair) runs the DFS search and solves', async () => {
  const level = makeLevel();
  const cfg: AttemptConfig = { scoringProfileId: 'default', orderingBias: null };
  const path = await runAttemptSearch(cfg, PACK(0, 0), level, prepFor(level), SCORING_PROFILES.default, 1000, Date.now(), null);
  assert.deepEqual(path, SOLUTION);
});

test('beam branch (beamWidth set) runs the beam search and solves', async () => {
  const level = makeLevel();
  const cfg: AttemptConfig = { scoringProfileId: 'default', orderingBias: null, beamWidth: 8 };
  const path = await runAttemptSearch(cfg, PACK(0, 0), level, prepFor(level), SCORING_PROFILES.default, 1000, Date.now(), null);
  assert.deepEqual(path, SOLUTION);
});

test('repair branch routes to repair search — distinguishable from DFS by its repair-only `out` fields', async () => {
  // requiredLength:5 is unreachable on a 3-cell line, so every search fails and only the `out` shape
  // reveals which one ran. bestBadness is written ONLY by repairSearchFromGate (see its
  // signature); dfsFromGateLDS never sets it. This is what makes the routing observable.
  const level = makeLevel({ requiredLength: 5 });

  const repairOut: { bestBadness?: number } = {};
  const repairCfg: AttemptConfig = { scoringProfileId: 'repair', orderingBias: null, repair: true };
  const repairPath = await runAttemptSearch(repairCfg, PACK(0, 0), level, prepFor(level), SCORING_PROFILES.repair, 200, Date.now(), null, Infinity, repairOut);
  assert.equal(repairPath, null);
  assert.equal(typeof repairOut.bestBadness, 'number', 'repair config must dispatch to repairSearchFromGate (sets bestBadness)');

  const dfsOut: { bestBadness?: number } = {};
  const dfsCfg: AttemptConfig = { scoringProfileId: 'default', orderingBias: null };
  const dfsPath = await runAttemptSearch(dfsCfg, PACK(0, 0), level, prepFor(level), SCORING_PROFILES.default, 200, Date.now(), null, Infinity, dfsOut);
  assert.equal(dfsPath, null);
  assert.equal(dfsOut.bestBadness, undefined, 'DFS config must NOT dispatch to repair (leaves bestBadness unset)');
});

test('STRATEGY_REPAIR_BEAM_SEED threads through to repairSearchFromGate\'s enableBeamSeed param', async () => {
  // Distinguishable the same way the repair-branch test above distinguishes repair from DFS: an
  // elite-research observer only ever fires from inside repairSearchFromGate's considerElite(), and
  // the beam-seed step (when enabled) calls it BEFORE any restart -- restart:0 on at least one
  // arrival is therefore observable only when the flag genuinely reached repairSearchFromGate, not
  // just when the repair branch ran at all (the OTHER repair test above already covers that).
  const level = makeLevel({ requiredLength: 5 }); // unreachable, so the search runs its full budget
  const prep = prepFor(level);
  const arrivals: { restart: number }[] = [];
  prep._repairEliteResearchObserver = { observe: record => arrivals.push(record) };

  const offCfg: AttemptConfig = { scoringProfileId: 'repair', orderingBias: null, repair: true };
  prep._cfg = null;
  await runAttemptSearch(offCfg, PACK(0, 0), level, prep, SCORING_PROFILES.repair, 200, Date.now(), null);
  assert.equal(arrivals.some(a => a.restart === 0), false, 'no beam-seeded elite without the flag');

  prep._cfg = { STRATEGY_REPAIR_BEAM_SEED: true } as AblationConfig;
  await runAttemptSearch(offCfg, PACK(0, 0), level, prep, SCORING_PROFILES.repair, 200, Date.now(), null);
  assert.equal(arrivals.some(a => a.restart === 0), true, 'a beam-seeded elite arrives at restart 0 once the flag is set on prep._cfg');
});

test('enforceAdmissibleOrderWorkCap threads through to admissibleOrderSearch and is false by default', async () => {
  // admissibleOrder configs only (admissibleOrderSearch is the only primitive this param affects —
  // see admissible-order-search.ts's own enforceWorkCap doc and reports/2026-09-10-admissible-
  // order-non-default-retry-matched-work-methodology-001.md for why this param exists at all).
  // See admissible-order-search.test.ts's own periodic-check test for why four must-pass cells are
  // needed to force enough real branching over the 256-node checkpoint (an open grid alone solves
  // in well under 256 nodes for this search).
  const level = makeLevel({
    grid: { w: 11, h: 11 }, requiredLength: 50, goalKey: PACK(10, 10), gateKeys: [PACK(0, 0)],
    mustPassKeys: [PACK(5, 1), PACK(1, 5), PACK(9, 5), PACK(5, 9)],
  });
  const cfg: AttemptConfig = { scoringProfileId: 'mustCrossFirst', orderingBias: null, admissibleOrder: true };

  const refPrep = prepFor(level);
  const refPath = await runAttemptSearch(cfg, PACK(0, 0), level, refPrep, SCORING_PROFILES.mustCrossFirst, 60_000, Date.now(), null);
  assert.ok(refPath, 'sanity: reference run solves');
  assert.ok(refPrep._metrics!.nodesExpanded! > 256, 'sanity: fixture must exercise the periodic work-cap check, not just the pre-search one');

  const cappedWorkCap = Math.floor(refPrep._workMeter.units / 2);

  // Default (param omitted): must ignore prep._workCap entirely, same as before this param existed.
  const offPrep = prepFor(level);
  offPrep._workCap = cappedWorkCap;
  const offPath = await runAttemptSearch(cfg, PACK(0, 0), level, offPrep, SCORING_PROFILES.mustCrossFirst, 60_000, Date.now(), null);
  assert.deepEqual(offPath, refPath, 'omitting the param must leave admissible-order dispatch byte-for-byte unaffected by prep._workCap');

  // Explicit true: must actually reach admissibleOrderSearch and truncate at the cap.
  const onPrep = prepFor(level);
  onPrep._workCap = cappedWorkCap;
  const onOut: { timedOut?: boolean; nodesExpanded?: number } = {};
  const onPath = await runAttemptSearch(cfg, PACK(0, 0), level, onPrep, SCORING_PROFILES.mustCrossFirst, 60_000, Date.now(), null, Infinity, onOut, 0, true);
  assert.equal(onPath, null, 'true must actually enforce the cap and stop short of the solution');
  assert.equal(onOut.timedOut, true);
  assert.ok(onPrep._workMeter.units >= cappedWorkCap);
});

test('the race worker routes through the shared dispatcher instead of re-forking it', () => {
  // Structural drift guard: worker-source.mjs must call runAttemptSearch(), not re-hand-roll the
  // repair/beam/DFS branch by calling the individual search functions directly (the exact fork
  // this change removed). If a future edit re-inlines the dispatch, this fails.
  const workerSrc = readFileSync(
    fileURLToPath(new URL('../../scripts/solver-parallel/worker-source.mjs', import.meta.url)),
    'utf8',
  );
  assert.match(workerSrc, /runAttemptSearch/, 'worker must import & call the shared dispatcher');
  const directCall = /\b(dfsFromGateLDS|beamSearchFromGate|repairSearchFromGate)\s*\(/;
  assert.doesNotMatch(workerSrc, directCall, 'worker must not call the individual search functions directly — route through runAttemptSearch');
});
