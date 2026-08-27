import assert from 'node:assert/strict';

import { PACK } from './encoding.js';
import { normalizeRawLevel } from './normalization.js';
import { prepLevel } from './prep.js';
import { createState, applyMove, getNeighbors, undoMove } from './search-state.js';
import { getRealLengthFromState } from './solution.js';
import { validateCandidatePath } from '../domain/path-validator.js';
import { evaluatePrunedMove } from './prune-gauntlet.js';
import type { PruneDiagnostics, PruneId } from './prune-gauntlet.js';
import { normalizeAblationConfig } from './orchestration.js';
import {
  mustTurnDeadlocked,
  mustCrossForcedNeighborDeadlocked,
  mustCrossNeighborBudgetDeadlocked,
} from './lower-bounds.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { SolverSearchState } from './types.js';

export const W = (x: number, y: number) => PACK(x - 1, y - 1); // 1-based wire coords

export function wireLevel(overrides: any = {}) {
  const grid = overrides.grid || { w: 5, h: 3 };
  return normalizeRawLevel({
    grid, gates: [{ x: 1, y: 1 }], goal: { x: grid.w, y: grid.h },
    reqLen: 6, reqInt: 0,
    blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
    filters: [], flippingFilters: [], portals: [], landmarks: [], hints: [],
    ...overrides,
  });
}

/** Run exactly one configurable gauntlet rule against an already-reached test state. */
export function diagnoseRule(
  id: PruneId,
  next: number,
  state: SolverSearchState,
  level: NormalizedLevel,
  prep: ReturnType<typeof prepLevel>,
) {
  const diagnostics: PruneDiagnostics = { reached: {}, rejected: {} };
  const verdict = evaluatePrunedMove(
    next,
    getRealLengthFromState(state),
    state,
    level,
    prep,
    { [id]: true },
    false,
    { diagnostics },
  );
  return { verdict, reached: diagnostics.reached[id] ?? 0, rejected: diagnostics.rejected[id] ?? 0 };
}

export function mustTurnLevel(turn: string) {
  return wireLevel({
    grid: { w: 3, h: 3 }, gates: [{ x: 2, y: 1 }], goal: { x: 2, y: 3 },
    landmarks: [{ x: 2, y: 2, objectType: 'library', role: 'mustTurn', turn }],
    reqLen: 6,
  });
}

export function mcForcedNeighborLevel() {
  return wireLevel({
    grid: { w: 5, h: 5 }, gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 5 },
    mustCross: [{ x: 3, y: 3 }],
    reqLen: 20,
  });
}

function referenceAccounting(path: number[], level: NormalizedLevel) {
  const counts = new Map<number, number>();
  const gateSet = new Set(level.gateKeys);
  counts.set(path[0], 1);
  let cost = 0;
  // Count revisits to every non-gate cell without treating any cell as the goal. For a chosen
  // goal G, the referee's intersection count is this value minus G's revisit contribution.
  // Keeping that goal-neutral total lets the prefix referee below change goalKey to the current
  // endpoint in O(1), instead of rescanning the whole path for every candidate.
  let nonGateRevisits = 0;
  let lastWasJump = false;
  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1], to = path[i];
    const jump: boolean = !lastWasJump && level.portalMap.get(from)?.dest === to;
    if (!jump) cost++;
    const seen = counts.get(to) ?? 0;
    if (seen > 0 && !gateSet.has(to)) nonGateRevisits++;
    counts.set(to, seen + 1);
    lastWasJump = jump;
  }
  return { counts, gateSet, cost, nonGateRevisits, lastWasJump };
}

function goalAdjustedIntersections(
  nonGateRevisits: number,
  counts: Map<number, number>,
  gateSet: Set<number>,
  goalKey: number,
) {
  if (gateSet.has(goalKey)) return nonGateRevisits;
  return nonGateRevisits - Math.max(0, (counts.get(goalKey) ?? 0) - 1);
}

function referenceCandidates(pos: number, lastWasJump: boolean, level: NormalizedLevel): number[] {
  const portal = level.portalMap.get(pos);
  if (portal && !lastWasJump) return [portal.dest];
  const x = pos & 0xFFFF, y = (pos >>> 16) & 0xFFFF;
  const out: number[] = [];
  if (x > 0) out.push(pos - 1);
  if (x + 1 < level.grid.w) out.push(pos + 1);
  if (y > 0) out.push(pos - 0x10000);
  if (y + 1 < level.grid.h) out.push(pos + 0x10000);
  return out;
}

/** Independent reference search: candidate generation/accounting remain separate from solver
 * transitions, while incremental bookkeeping avoids O(path length) rescans at every recursion.
 * The explored candidate tree and independent referee call at every prefix are unchanged. */
function referenceSearch(state: SolverSearchState, level: NormalizedLevel, targetOnly?: number): number {
  const path = state.path.slice();
  const initial = referenceAccounting(path, level);
  const prefixCost = initial.cost;
  const maxCost = level.grid.w * level.grid.h - 1 + level.reqInt;
  // On a single-gate, mechanics-free grid, an unseen orthogonal neighbor cannot violate blocks,
  // hazards, portal/filter rules, gate re-entry, edge reuse, or intersection limits. A must-cross
  // cell on its first visit is the one remaining case where departure-axis legality can reject a
  // first-time destination, so keep the referee there.
  const simpleOpenGrid =
    level.gateKeys.length === 1 &&
    level.blockSet.size === 0 &&
    level.gooseSet.size === 0 &&
    level.falseGoalKeys.size === 0 &&
    level.portalMap.size === 0 &&
    level.filterMap.size === 0 &&
    level.flippingFilterMap.size === 0;
  const mustCrossSet = new Set(level.mustCrossKeys);
  let best = Infinity;

  const walk = (
    cost: number,
    nonGateRevisits: number,
    lastWasJump: boolean,
  ) => {
    const pos = path[path.length - 1];
    const ints = goalAdjustedIntersections(nonGateRevisits, initial.counts, initial.gateSet, level.goalKey);
    if (ints > level.reqInt || cost > maxCost || cost - prefixCost >= best) return;
    if (targetOnly !== undefined && pos === targetOnly) {
      best = cost - prefixCost;
      return;
    }
    if (pos === level.goalKey) {
      if (targetOnly !== undefined) return;
      const candidateLevel = { ...level, reqLen: cost, reqInt: ints } as NormalizedLevel;
      if (validateCandidatePath(candidateLevel, path).ok) best = cost - prefixCost;
      return;
    }

    for (const next of referenceCandidates(pos, lastWasJump, level)) {
      const jump: boolean = !lastWasJump && level.portalMap.get(pos)?.dest === next;
      const seen = initial.counts.get(next) ?? 0;
      const nextCount = seen + 1;
      initial.counts.set(next, nextCount);
      path.push(next);

      const nextCost = cost + (jump ? 0 : 1);
      const nextNonGateRevisits = nonGateRevisits + (seen > 0 && !initial.gateSet.has(next) ? 1 : 0);
      // Prefix validation temporarily makes the endpoint the goal. Subtracting that cell's whole
      // revisit contribution is exactly equivalent to the previous full-path rescan with goalKey=next.
      const probeInts = goalAdjustedIntersections(
        nextNonGateRevisits,
        initial.counts,
        initial.gateSet,
        next,
      );
      const prefixLevel = {
        ...level,
        goalKey: next,
        mustPassKeys: [],
        mustCrossKeys: [],
        surroundKeys: [],
        mustPassTurnDirs: new Map(),
        adjacentTurnKeys: [],
        reqLen: nextCost,
        reqInt: probeInts,
      } as unknown as NormalizedLevel;

      const firstVisitIsTriviallyLegal =
        simpleOpenGrid &&
        seen === 0 &&
        !(mustCrossSet.has(pos) && (initial.counts.get(pos) ?? 0) === 1);
      if (firstVisitIsTriviallyLegal || validateCandidatePath(prefixLevel, path).ok) {
        walk(nextCost, nextNonGateRevisits, jump);
      }

      path.pop();
      if (seen === 0) initial.counts.delete(next);
      else initial.counts.set(next, seen);
    }
  };

  walk(initial.cost, initial.nonGateRevisits, initial.lastWasJump);
  return best;
}

export function exactRemainingCost(
  _pos: number,
  state: SolverSearchState,
  level: NormalizedLevel,
  _prep: ReturnType<typeof prepLevel>,
): number {
  return referenceSearch(state, level);
}

export function exactCostToRequiredCell(
  target: number,
  state: SolverSearchState,
  level: NormalizedLevel,
  _prep: ReturnType<typeof prepLevel>,
): number {
  return referenceSearch(state, level, target);
}

/**
 * Exhaustively prove one of the two root subtrees of the 5x5 must-cross deadlock fixture.
 * The tiny must-turn fixture is repeated in each shard so each file independently exercises every
 * helper/control; its measured cost is negligible. Roots 0 and 1 are disjoint and collectively
 * exhaustive for the expensive fixture.
 */
export function runDeadlockSoundnessRoot(rootBranch: 0 | 1) {
  const levels = [mustTurnLevel('cw'), mcForcedNeighborLevel()];
  const reportedDeadStates = [0, 0, 0];
  const diagnosedDeadStates = [0, 0, 0];
  const feasibleControls = [0, 0, 0];
  const ids: PruneId[] = [
    'PRUNE_MUST_TURN_DEADLOCK',
    'PRUNE_MC_FORCED_NEIGHBOR',
    'PRUNE_MC_NEIGHBOR_BUDGET',
  ];

  for (const [fixtureIndex, level] of levels.entries()) {
    const prep = prepLevel(level), state = createState(level.gateKeys[0], level, prep);

    for (let i = 0; i < ids.length; i++) {
      const applicable = i === 0 ? state.mustTurnMask !== 0 : state.mustCrossMask !== 0;
      if (!applicable || feasibleControls[i]) continue;
      assert.deepEqual(
        diagnoseRule(ids[i], level.gateKeys[0], state, level, prep),
        { verdict: 'pass', reached: 1, rejected: 0 },
        `${ids[i]} fresh feasible control must survive`,
      );
      feasibleControls[i]++;
    }

    const walk = () => {
      const pos = state.path[state.path.length - 1];
      const reports = [
        mustTurnDeadlocked(state, prep),
        mustCrossForcedNeighborDeadlocked(pos, state, level, prep),
        mustCrossNeighborBudgetDeadlocked(pos, state, level, prep),
      ];

      let exactForReportedState: number | undefined;
      for (let i = 0; i < reports.length; i++) {
        if (!reports[i]) continue;
        reportedDeadStates[i]++;
        // Multiple independent helpers can correctly flag the same state. The exact reference
        // search proves the state itself unreachable, so solve that identical oracle problem once
        // and reuse its answer for every helper-specific false-positive assertion at this state.
        exactForReportedState ??= exactRemainingCost(pos, state, level, prep);
        assert.equal(exactForReportedState, Infinity, `deadlock helper ${i} false positive`);
        const diagnostic = diagnoseRule(ids[i], pos, state, level, prep);
        if (!diagnostic.reached) continue;

        assert.deepEqual(
          diagnostic,
          { verdict: 'reject', reached: 1, rejected: 1 },
          `${ids[i]} must be the isolated firing rule once its branch is reached`,
        );

        if (i === 2 && diagnosedDeadStates[i] === 0) {
          const suppressedDiagnostics: PruneDiagnostics = { reached: {}, rejected: {} };
          assert.equal(
            evaluatePrunedMove(
              pos,
              getRealLengthFromState(state),
              state,
              level,
              prep,
              { PRUNE_MC_NEIGHBOR_BUDGET: true },
              false,
              { allowNeighborBudgetPrune: false, diagnostics: suppressedDiagnostics },
            ),
            'pass',
            'stochastic-repair participation policy keeps this otherwise rejected candidate alive',
          );
          assert.equal(
            suppressedDiagnostics.reached.PRUNE_MC_NEIGHBOR_BUDGET,
            undefined,
            'diagnostics remain independent and do not claim a suppressed rule was reached',
          );
          assert.equal(
            evaluatePrunedMove(
              pos,
              getRealLengthFromState(state),
              state,
              level,
              prep,
              { PRUNE_MC_NEIGHBOR_BUDGET: false },
              false,
            ),
            'pass',
            'explicit disable still suppresses the rule regardless of production default',
          );

          const isolatedCfg = normalizeAblationConfig({ PRUNE_MC_CEILING: false });
          const isolatedDiagnostics: PruneDiagnostics = { reached: {}, rejected: {} };
          const isolatedVerdict = evaluatePrunedMove(
            pos,
            getRealLengthFromState(state),
            state,
            level,
            prep,
            isolatedCfg,
            false,
            { diagnostics: isolatedDiagnostics },
          );
          assert.equal(
            isolatedDiagnostics.rejected.PRUNE_MC_NEIGHBOR_BUDGET,
            1,
            `production default-ON: an ablation config that leaves PRUNE_MC_NEIGHBOR_BUDGET unset must still activate it (verdict=${isolatedVerdict} rejected=${JSON.stringify(isolatedDiagnostics.rejected)} reached=${JSON.stringify(isolatedDiagnostics.reached)})`,
          );
          assert.equal(
            evaluatePrunedMove(pos, getRealLengthFromState(state), state, level, prep, null, false),
            'reject',
            'an omitted ablation config must not let this genuinely dead state pass',
          );
        }
        diagnosedDeadStates[i]++;
      }

      if (pos === level.goalKey) return;
      const neighbors = getNeighbors(pos, state, level, prep);
      const partitionRoot = fixtureIndex === 1 && state.path.length === 1;
      if (partitionRoot) {
        assert.equal(
          neighbors.length,
          2,
          'the fixed 5x5 deadlock-proof fixture must retain exactly two root moves',
        );
      }

      for (let neighborIndex = 0; neighborIndex < neighbors.length; neighborIndex++) {
        if (partitionRoot && neighborIndex !== rootBranch) continue;
        const undo = applyMove(neighbors[neighborIndex], state, level, prep, false);
        if (state.ints <= level.reqInt) walk();
        undoMove(undo, state);
      }
    };

    walk();
  }

  assert.ok(
    reportedDeadStates.every(n => n > 0),
    `property must exercise every deadlock helper; reports=${reportedDeadStates.join(',')}`,
  );
  assert.ok(
    diagnosedDeadStates.every(n => n > 0),
    `property must reach every gauntlet branch before it fires; diagnostics=${diagnosedDeadStates.join(',')}`,
  );
  assert.ok(
    feasibleControls.every(n => n > 0),
    `property must find an oracle-feasible negative control for every helper; controls=${feasibleControls.join(',')}`,
  );
}
