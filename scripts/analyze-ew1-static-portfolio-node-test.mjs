import assert from 'node:assert/strict';
import { analyze, analyzeProductionRanking } from './analyze-ew1-static-portfolio.mjs';

const cell = (levelId, technique, ok, workSpent, status = 'exhausted') => ({
    levelId, techniqueKeys: [technique], ok, workSpent, status,
});

// Three levels, three techniques. `beam|score=a` solves A and B (cheap). `dfs|score=b` solves only
// C (exclusive). `admissible-order|score=c` solves B and C but is expensive and adds nothing beam
// doesn't already cover on B, so a well-formed greedy ranking should pick beam first, then must pick
// dfs (the only source of C-coverage) before admissible-order contributes anything new.
const snapshot = {
    sourceRunId: 'test-run',
    sourceHeadSha: 'deadbeef',
    results: [
        cell('A', 'beam|score=a', true, 100),
        cell('A', 'dfs|score=b', false, 500),
        cell('A', 'admissible-order|score=c', false, 900),
        cell('B', 'beam|score=a', true, 200),
        cell('B', 'dfs|score=b', false, 500),
        cell('B', 'admissible-order|score=c', true, 900),
        cell('C', 'beam|score=a', false, 300),
        cell('C', 'dfs|score=b', true, 500),
        cell('C', 'admissible-order|score=c', false, 900, 'work-budget-reached'),
    ],
};

const result = analyze(snapshot);

assert.equal(result.levelCount, 3);
assert.equal(result.techniqueCount, 3);
assert.equal(result.oracleUnionCount, 3);

// beam solves A and B for cheap and nothing else does both -> picked first.
assert.equal(result.ranking[0], 'beam|score=a');
// dfs is the sole solver of C -> must be picked before admissible-order (which alone adds nothing beam+dfs don't already cover).
assert.ok(result.ranking.indexOf('dfs|score=b') < result.ranking.indexOf('admissible-order|score=c'));

const k1 = result.curve[0];
assert.equal(k1.addedTechnique, 'beam|score=a');
assert.equal(k1.cumulativeCoverage, 2); // A, B
assert.equal(k1.aggregateWork, 100 + 200 + 300); // A solved cheaply, B solved cheaply, C's sole attempt (beam) fails and is charged

const k2 = result.curve[1];
assert.equal(k2.cumulativeCoverage, 3); // A, B, C all covered once dfs joins
assert.equal(k2.exclusiveLevelsMissing, 0); // dfs's exclusive level C is now owned

const kFull = result.curve[result.curve.length - 1];
assert.equal(kFull.cumulativeCoverage, 3);
assert.equal(kFull.cumulativeCoverageFractionOfOracleUnion, 1);

// Technique-exclusive accounting: A is exclusive to beam, C is exclusive to dfs; B is solved by
// both beam and admissible-order so it is not exclusive to either.
const dfsStats = result.techniqueStats.find((t) => t.technique === 'dfs|score=b');
assert.equal(dfsStats.exclusiveLevels, 1);
const beamStats = result.techniqueStats.find((t) => t.technique === 'beam|score=a');
assert.equal(beamStats.exclusiveLevels, 1);
const admissibleOrderStats = result.techniqueStats.find((t) => t.technique === 'admissible-order|score=c');
assert.equal(admissibleOrderStats.exclusiveLevels, 0);

assert.throws(() => analyze({ results: [] }), /non-empty array/);
assert.throws(() => analyze({ results: [{ levelId: 'A', techniqueKeys: ['x', 'y'], ok: false, workSpent: 1, status: 'exhausted' }] }), /composite techniqueKeys/);

// analyzeProductionRanking: exact cumulative coverage from mutually exclusive per-level winners.
const productionReach = {
    techniques: [
        { attemptConfigIdentity: 'repair|score=repair|guidance=standard', production: { winningLevels: 224, work: 48_927_394_645 } },
        { attemptConfigIdentity: 'beam|score=perimeterSweep|bias=perimeterCW|width=2000|retention=plain', production: { winningLevels: 170, work: 3_186_580_869 } },
        { attemptConfigIdentity: 'dfs|score=closureCommitment|bias=none', production: { winningLevels: 0, work: 54_097_041 } },
    ],
};
const ranking = analyzeProductionRanking(productionReach);
assert.equal(ranking.totalWins, 394);
assert.equal(ranking.curve[0].technique, 'repair|score=repair|guidance=standard');
assert.equal(ranking.curve[0].cumulativeWinningLevels, 224);
assert.equal(ranking.curve[1].cumulativeWinningLevels, 394);
assert.equal(ranking.curve[2].technique, 'dfs|score=closureCommitment|bias=none');
assert.equal(ranking.curve[2].winningLevels, 0);
assert.equal(ranking.curve[2].cumulativeCoverageFractionOfWins, 1);
assert.throws(() => analyzeProductionRanking({ techniques: [] }), /non-empty array/);

console.log('analyze-ew1-static-portfolio tests passed');
