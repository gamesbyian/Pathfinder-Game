import { describe, expect, it } from 'vitest';
import { buildElitePrefixDfsCandidatePlan } from './repair-search.js';

describe('elite-prefix DFS candidate ordering', () => {
  const elites = [
    { path: Array.from({ length: 101 }, (_, i) => i) },
    { path: Array.from({ length: 81 }, (_, i) => i) },
  ];

  it('preserves the exact legacy nested-loop order by default', () => {
    const plan = buildElitePrefixDfsCandidatePlan(elites, 120);
    expect(plan.map(row => row.fraction)).toEqual([0.5, 0.65, 0.8, 0.9, 0.5, 0.65, 0.8, 0.9]);
    expect(plan.map(row => row.eliteIndex)).toEqual([0,0,0,0,1,1,1,1]);
    expect(plan.map(row => row.legacyOrdinal)).toEqual([0,1,2,3,4,5,6,7]);
    expect(buildElitePrefixDfsCandidatePlan(elites, 120, false)).toEqual(plan);
  });

  it('reorders the identical candidate multiset by ascending remaining length', () => {
    const legacy = buildElitePrefixDfsCandidatePlan(elites, 120, false);
    const treatment = buildElitePrefixDfsCandidatePlan(elites, 120, true);

    const key = row => [row.eliteIndex,row.fraction,row.destroyIdx,row.remainingLength,row.legacyOrdinal].join('|');
    expect(treatment.map(key).sort()).toEqual(legacy.map(key).sort());

    for (let i = 1; i < treatment.length; i++) {
      expect(treatment[i - 1].remainingLength).toBeLessThanOrEqual(treatment[i].remainingLength);
      if (treatment[i - 1].remainingLength === treatment[i].remainingLength) {
        expect(treatment[i - 1].legacyOrdinal).toBeLessThan(treatment[i].legacyOrdinal);
      }
    }
  });

  it('uses current prefix depth only and never outcome/history', () => {
    const plan = buildElitePrefixDfsCandidatePlan([{ path:Array.from({length:51},(_,i)=>i) }], 100, true);
    for (const row of plan) {
      expect(row.remainingLength).toBe(Math.max(0, 100 - row.destroyIdx));
    }
  });
});
