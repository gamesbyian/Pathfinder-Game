import assert from 'node:assert/strict';
import { describe, test } from 'vitest';
import { PACK } from './encoding.js';
import { prepLevel } from './prep.js';
import { applyMove, createState, getNeighbors } from './search-state.js';
import { evaluatePrunedMove } from './hard-prune-pipeline.js';
import { getRealLengthFromState } from './solution.js';
import { runAttemptSearch } from './attempt-dispatch.js';
import { SCORING_PROFILES } from './policy.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { AttemptConfig, PrepLevel } from './types.js';

/**
 * Independent executable semantics oracle for Audits 4/9/13.
 *
 * This intentionally models a tiny strict subset of Pathfinder rather than importing solver
 * successor/prune/solution helpers into the reference side: rectangular cardinal movement,
 * static blocked cells, no portals/filters/objectives, zero intersections, and exact edge length.
 * The subset is sufficient to cross-check three contracts without making the "oracle" another
 * implementation of production search:
 *   1. successor legality on every oracle prefix;
 *   2. survival of every prefix of every oracle-known exact solution through production hard prunes;
 *   3. complete-search solve vs genuine exhaustion semantics on independently classified fixtures.
 */
type XY = Readonly<{ x: number; y: number }>;
type MicroSpec = Readonly<{
  w: number;
  h: number;
  start: XY;
  goal: XY;
  requiredLength: number;
  blocks?: readonly XY[];
}>;

type OraclePath = number[];

const key = ({ x, y }: XY): number => PACK(x, y);
const label = (k: number): string => `${k & 0xffff},${(k >>> 16) & 0xffff}`;

function makeLevel(spec: MicroSpec): NormalizedLevel {
  return {
    grid: { w: spec.w, h: spec.h },
    requiredLength: spec.requiredLength,
    requiredIntersections: 0,
    goalKey: key(spec.goal),
    gateKeys: [key(spec.start)],
    blockSet: new Set((spec.blocks ?? []).map(key)),
    gooseSet: new Set(),
    falseGoalKeys: new Set(),
    mustPassKeys: [],
    mustCrossKeys: [],
    filterMap: new Map(),
    flippingFilterMap: new Map(),
    portalMap: new Map(),
  } as unknown as NormalizedLevel;
}

function oracleNeighbors(spec: MicroSpec, path: readonly number[]): number[] {
  const pos = path[path.length - 1];
  const x = pos & 0xffff;
  const y = (pos >>> 16) & 0xffff;
  const blocked = new Set((spec.blocks ?? []).map(key));
  const visited = new Set(path);
  const result: number[] = [];

  // In this micro-domain requiredIntersections=0, so a cell revisit can never belong to a valid
  // path. Keeping that rule on the oracle side is independent of production edge-axis bookkeeping.
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= spec.w || ny < 0 || ny >= spec.h) continue;
    const next = PACK(nx, ny);
    if (blocked.has(next) || visited.has(next)) continue;
    result.push(next);
  }
  return result.sort((a, b) => a - b);
}

function enumerateOracleSolutions(spec: MicroSpec): OraclePath[] {
  const goal = key(spec.goal);
  const solutions: OraclePath[] = [];
  const walk = (path: number[]) => {
    const edges = path.length - 1;
    const pos = path[path.length - 1];
    if (pos === goal) {
      if (edges === spec.requiredLength) solutions.push(path.slice());
      return; // a Pathfinder goal is terminal, including when reached too early
    }
    if (edges >= spec.requiredLength) return;
    for (const next of oracleNeighbors(spec, path)) {
      path.push(next);
      walk(path);
      path.pop();
    }
  };
  walk([key(spec.start)]);
  return solutions;
}

function prepFor(level: NormalizedLevel): PrepLevel {
  const prep = prepLevel(level);
  prep._metrics = { nodesExpanded: 0 };
  return prep;
}

function replayPrefix(level: NormalizedLevel, prep: PrepLevel, prefix: readonly number[]) {
  const state = createState(prefix[0], level, prep);
  for (let i = 1; i < prefix.length; i++) applyMove(prefix[i], state, level, prep, false);
  return state;
}

const SAT: MicroSpec = {
  w: 3,
  h: 2,
  start: { x: 0, y: 0 },
  goal: { x: 2, y: 0 },
  requiredLength: 4,
};

// Same-colour endpoints on a bipartite 2x2 grid cannot be joined by an odd-length simple path.
// The oracle establishes that fact by enumeration rather than relying on production parity pruning.
const UNSAT: MicroSpec = {
  w: 2,
  h: 2,
  start: { x: 0, y: 0 },
  goal: { x: 1, y: 1 },
  requiredLength: 3,
};

const DFS: AttemptConfig = { scoringProfileId: 'default', orderingBias: null };

describe('independent micro-domain executable semantics oracle', () => {
  test('production successor legality matches independently enumerated simple-path successors', () => {
    const spec: MicroSpec = { ...SAT, blocks: [{ x: 1, y: 0 }] };
    const level = makeLevel(spec);
    const prep = prepFor(level);

    // Enumerate every reachable oracle prefix up to the exact-length boundary, not just the winner.
    const prefixes: number[][] = [];
    const visit = (path: number[]) => {
      prefixes.push(path.slice());
      if (path.length - 1 >= spec.requiredLength || path.at(-1) === level.goalKey) return;
      for (const next of oracleNeighbors(spec, path)) {
        path.push(next);
        visit(path);
        path.pop();
      }
    };
    visit([key(spec.start)]);

    for (const prefix of prefixes) {
      const state = replayPrefix(level, prep, prefix);
      const production = getNeighbors(prefix[prefix.length - 1], state, level, prep)
        // Production successor generation may expose a revisit that the zero-intersection hard-prune
        // stage will immediately reject. Compare the shared strict-simple-path subset explicitly.
        .filter(next => !prefix.includes(next))
        .sort((a, b) => a - b);
      const reference = oracleNeighbors(spec, prefix);
      assert.deepEqual(production, reference, `successors diverged after ${prefix.map(label).join(' -> ')}`);
    }
  });

  test('every oracle-known winning prefix survives production hard pruning', () => {
    const solutions = enumerateOracleSolutions(SAT);
    assert.ok(solutions.length > 0, 'oracle fixture must independently contain at least one solution');

    for (const solution of solutions) {
      const level = makeLevel(SAT);
      const prep = prepFor(level);
      const state = createState(solution[0], level, prep);
      for (let i = 1; i < solution.length; i++) {
        const next = solution[i];
        applyMove(next, state, level, prep, false);
        const verdict = evaluatePrunedMove(
          next,
          getRealLengthFromState(state),
          state,
          level,
          prep,
          null,
          true,
        );
        const isFinal = i === solution.length - 1;
        assert.notEqual(verdict, 'reject', `hard prune killed oracle winner at ${solution.slice(0, i + 1).map(label).join(' -> ')}`);
        assert.equal(verdict, isFinal ? 'solution' : 'pass', `unexpected verdict on oracle-winning prefix at depth ${i}`);
      }
    }
  });

  test('complete DFS agrees with the oracle on solve versus genuine exhaustion', async () => {
    const satSolutions = enumerateOracleSolutions(SAT);
    const unsatSolutions = enumerateOracleSolutions(UNSAT);
    assert.ok(satSolutions.length > 0, 'SAT fixture must be independently satisfiable');
    assert.equal(unsatSolutions.length, 0, 'UNSAT fixture must be independently exhausted');

    const satLevel = makeLevel(SAT);
    const satOut: { timedOut?: boolean; nodesExpanded?: number } = {};
    const satPath = await runAttemptSearch(
      DFS, key(SAT.start), satLevel, prepFor(satLevel), SCORING_PROFILES.default,
      60_000, Date.now(), null, Infinity, satOut,
    );
    assert.ok(satPath, 'complete DFS must solve independently satisfiable fixture');
    assert.ok(satSolutions.some(path => path.length === satPath.length && path.every((k, i) => k === satPath[i])),
      `production returned a path outside the oracle solution set: ${satPath.map(label).join(' -> ')}`);
    assert.notEqual(satOut.timedOut, true, 'a found solution must not be reported as a budget exit');

    const unsatLevel = makeLevel(UNSAT);
    const unsatOut: { timedOut?: boolean; nodesExpanded?: number } = {};
    const unsatPath = await runAttemptSearch(
      DFS, key(UNSAT.start), unsatLevel, prepFor(unsatLevel), SCORING_PROFILES.default,
      60_000, Date.now(), null, Infinity, unsatOut,
    );
    assert.equal(unsatPath, null, 'complete DFS must return null after exhausting the independently unsatisfiable fixture');
    assert.notEqual(unsatOut.timedOut, true, 'genuine exhaustion must remain distinguishable from timeout/work-cap termination');
    assert.ok((unsatOut.nodesExpanded ?? 0) > 0, 'exhaustion must reflect actual search work');
  });
});
