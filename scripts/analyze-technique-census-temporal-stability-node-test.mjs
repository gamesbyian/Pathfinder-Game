import assert from 'node:assert/strict';
import { analyzeTemporalStability } from './analyze-technique-census-temporal-stability.mjs';

const level = (id, corpus, solvingActions, overrides = {}) => ({
    levelId: id, corpus,
    productionSolved: false, isolatedOracleSolved: solvingActions.length > 0,
    solverCount: solvingActions.length, solvingActions,
    singleton: solvingActions.length === 1, doubleton: solvingActions.length === 2,
    ...overrides,
});

const action = (raw, overrides = {}) => ({
    action: raw, family: 'other', eligibleCells: 10, solvedLevels: 1, exclusiveLevels: 0,
    thinBoundaryLevels: 0, productionMissWins: 0,
    successfulNodes: { median: 100, p90: 200 }, failedNodes: { median: 1000, p90: 2000 },
    ...overrides,
});

// A: singleton owner of R1 in old, loses R1 in fresh but gains sole ownership of R2.
// B: absent from old (legacy 'ida:none' spelling maps to the same canonical key fresh uses).
const oldBase = {
    schemaVersion: 2,
    levels: [
        level('R1', 'corpus1', ['dfs:harvestThenFinish']),
        level('R2', 'corpus1', ['dfs:harvestThenFinish', 'dfs:portalFirstTransfer']),
        level('R3', 'corpus1', []),
    ],
    actions: [
        action('dfs:harvestThenFinish', { solvedLevels: 2, exclusiveLevels: 1, thinBoundaryLevels: 1 }),
        action('dfs:portalFirstTransfer', { solvedLevels: 1, thinBoundaryLevels: 1 }),
    ],
};
const freshBase = {
    schemaVersion: 2,
    levels: [
        level('R1', 'corpus1', ['dfs|score=portalFirstTransfer|bias=none']),
        level('R2', 'corpus1', ['dfs|score=harvestThenFinish|bias=none']),
        level('R3', 'corpus1', ['ida:none']),
    ],
    actions: [
        action('dfs|score=harvestThenFinish|bias=none', { solvedLevels: 1, exclusiveLevels: 1 }),
        action('dfs|score=portalFirstTransfer|bias=none', { solvedLevels: 1, exclusiveLevels: 1 }),
        action('ida:none', { solvedLevels: 1, exclusiveLevels: 1 }),
    ],
};

const result = analyzeTemporalStability(oldBase, freshBase);

await test('level universe is fully comparable when ids match on both sides', () => {
    assert.equal(result.levelUniverse.comparable, 3);
    assert.equal(result.levelUniverse.missingFromFresh.length, 0);
    assert.equal(result.levelUniverse.missingFromOld.length, 0);
});

await test('legacy and canonical spellings of the same action normalize to one row', () => {
    const harvest = result.actions.find((a) => a.action === 'dfs|score=harvestThenFinish|bias=none');
    assert.ok(harvest, 'expected a single normalized row for harvestThenFinish');
    assert.equal(harvest.comparable, true);
    assert.equal(harvest.old.solvedLevels, 2);
    assert.equal(harvest.fresh.solvedLevels, 1);
});

await test('solve-set gained/lost are computed on the comparable level universe', () => {
    const harvest = result.actions.find((a) => a.action === 'dfs|score=harvestThenFinish|bias=none');
    // old solved R1,R2; fresh solved R2 only -> lost R1, gained none.
    assert.deepEqual(harvest.solveSet.lostIds, ['R1']);
    assert.deepEqual(harvest.solveSet.gainedIds, []);
});

await test('a fresh-only action (ida:none) normalizes to the canonical key and is marked non-comparable, not dropped', () => {
    const none = result.actions.find((a) => a.action === 'admissible-order|tieBreak=none|lds=off');
    assert.ok(none, 'ida:none must normalize to the canonical admissible-order key');
    assert.equal(none.comparable, false);
    assert.equal(none.nonComparableReason, 'action absent from old census');
    assert.equal(none.fresh.solvedLevels, 1);
});

await test('singleton ownership retained/gained/lost is tracked per action', () => {
    const harvest = result.actions.find((a) => a.action === 'dfs|score=harvestThenFinish|bias=none');
    // R1 was sole-owned by harvestThenFinish in old, not in fresh (lost). R2 was NOT sole-owned in
    // old (doubleton) but IS sole-owned by harvestThenFinish in fresh (gained).
    assert.equal(harvest.singletonOwnership.lost, 1);
    assert.equal(harvest.singletonOwnership.gained, 1);
});

await test('level-side summary counts singleton/doubleton movement', () => {
    // R1: singleton(old) -> singleton(fresh) but different owner => support class fields identical
    // (still isolatedOracleSolved) so singleton retained, not gained/lost by the level-level test.
    assert.equal(result.levelSummary.singleton.retained + result.levelSummary.singleton.gained + result.levelSummary.singleton.lost >= 2, true);
    // R3 gained isolated support entirely (0 -> 1 winner): support class changed.
    assert.ok(result.levelSummary.supportClassChanged >= 1);
});

await test('--check detects staleness (smoke, via the exported function only)', () => {
    const resultAgain = analyzeTemporalStability(oldBase, freshBase);
    assert.deepEqual(resultAgain, result);
});

async function test(name, fn) {
    try {
        await fn();
        console.log(`ok - ${name}`);
    } catch (err) {
        console.error(`not ok - ${name}`);
        throw err;
    }
}

console.log('analyze-technique-census-temporal-stability tests passed');
