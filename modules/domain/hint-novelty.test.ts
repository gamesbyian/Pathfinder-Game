import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK } from './cell-key.js';
import {
    coverageCellsForHints,
    decideCandidateAcceptance,
    evaluateCandidateNovelty,
    heatmapNoveltyStats,
    nearestDrawnEdgeDistance,
    pathSignature,
    pathVisitCells,
    portalSignature,
    scoreCandidateHeatmapNovelty,
} from './hint-novelty.js';

const p = (cells: [number, number][]) => cells.map(([x, y]) => PACK(x, y));

test('path and portal signatures are deterministic', () => {
    const path = p([[0, 0], [1, 0], [3, 3], [3, 4], [8, 8]]);
    assert.equal(pathSignature(path), path.join(','));
    assert.equal(portalSignature(path), `${PACK(1, 0)}>${PACK(3, 3)},${PACK(3, 4)}>${PACK(8, 8)}`);
});

test('coverage cells combine gate and directed portal usage', () => {
    const plain = p([[0, 0], [1, 0], [2, 0]]);
    const portalA = p([[0, 0], [1, 0], [4, 4]]);
    const portalB = p([[9, 9], [8, 9], [4, 4]]);
    assert.equal(coverageCellsForHints([plain, portalA, portalB]).size, 3);
});

test('pathVisitCells ignores out-of-grid cells', () => {
    const cells = pathVisitCells([PACK(0, 0), PACK(1, 1), PACK(3, 3)], { w: 2, h: 2 });
    assert.deepEqual([...cells].sort(), ['0,0', '1,1']);
});

test('heatmapNoveltyStats reports untouched non-object cells and concentration', () => {
    const level = {
        grid: { w: 3, h: 3 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 3, y: 3 },
        blocks: [{ x: 2, y: 2 }],
        hints: [
            p([[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]]),
            p([[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]]),
        ],
    };
    const stats = heatmapNoveltyStats(level);
    assert.equal(stats.touchedCells, 8);
    assert.equal(stats.untouchedNonObjectCells, 0, 'only untouched cell is an object block');
    assert.equal(stats.coldThreshold, 1);
    assert.equal(stats.coldTouchedCells, 6);
    assert.equal(stats.topCellDominance, 0.2);
});

test('drawn-edge distance identifies nearest visual duplicate', () => {
    const base = p([[0, 0], [1, 0], [2, 0]]);
    const duplicate = p([[0, 0], [1, 0], [2, 0]]);
    const disjoint = p([[0, 2], [1, 2], [2, 2]]);
    assert.equal(nearestDrawnEdgeDistance(duplicate, [base]), 0);
    assert.equal(nearestDrawnEdgeDistance(disjoint, [base]), 1);
});

test('scoreCandidateHeatmapNovelty rewards new cells and edges over hot corridors', () => {
    const level = {
        grid: { w: 4, h: 4 },
        hints: [
            p([[0, 0], [1, 0], [2, 0]]),
            p([[0, 0], [1, 0], [2, 0]]),
        ],
    };
    const hot = p([[0, 0], [1, 0], [2, 0]]);
    const novel = p([[0, 1], [1, 1], [2, 1]]);
    const hotScore = scoreCandidateHeatmapNovelty(level, hot);
    const novelScore = scoreCandidateHeatmapNovelty(level, novel);
    assert.equal(hotScore.newCells, 0);
    assert.equal(novelScore.newCells, 3);
    assert.equal(novelScore.newEdges, 2);
    assert.ok(novelScore.score > hotScore.score);
});

test('evaluateCandidateNovelty combines duplicate, coverage, distance, and heatmap signals', () => {
    const level = {
        grid: { w: 5, h: 5 },
        hints: [p([[0, 0], [1, 0], [2, 0]])],
    };
    const duplicate = evaluateCandidateNovelty(level, p([[0, 0], [1, 0], [2, 0]]));
    const newGate = evaluateCandidateNovelty(level, p([[4, 4], [3, 4], [2, 4]]));
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.coverageNovel, false);
    assert.equal(duplicate.nearestEdgeDistance, 0);
    assert.equal(newGate.duplicate, false);
    assert.equal(newGate.coverageNovel, true);
    assert.equal(newGate.nearestEdgeDistance, 1);
    assert.equal(newGate.heatmap.newCells, 3);
});


test('decideCandidateAcceptance enforces cap, duplicate, coverage, distance, and heatmap gates', () => {
    const existing = p([[0, 0], [1, 0], [2, 0]]);
    const sameCoverageDistinct = p([[0, 0], [0, 1], [0, 2]]);
    const sameCoverageTooSimilar = p([[0, 0], [1, 0], [2, 0], [3, 0]]);
    const newGate = p([[4, 4], [3, 4], [2, 4]]);
    const level = { grid: { w: 5, h: 5 }, hints: [existing] };

    assert.equal(decideCandidateAcceptance(level, existing).reason, 'duplicate');
    assert.equal(decideCandidateAcceptance({ ...level, hints: [existing] }, sameCoverageDistinct, { maxHintsPerLevel: 1 }).reason, 'at-cap');
    assert.deepEqual(
        pickDecision(decideCandidateAcceptance(level, newGate)),
        { accept: true, reason: 'coverage-novel' },
    );
    assert.deepEqual(
        pickDecision(decideCandidateAcceptance(level, sameCoverageTooSimilar, { diversityFloor: 0.8 })),
        { accept: true, reason: 'heatmap-novel' },
    );
    assert.deepEqual(
        pickDecision(decideCandidateAcceptance(level, sameCoverageDistinct, { heatmapScoreFloor: 100 })),
        { accept: false, reason: 'low-heatmap-novelty' },
    );
    assert.deepEqual(
        pickDecision(decideCandidateAcceptance(level, sameCoverageDistinct, { heatmapScoreFloor: 1 })),
        { accept: true, reason: 'distinct-heatmap-novel' },
    );
    assert.deepEqual(
        pickDecision(decideCandidateAcceptance(level, existing, { heatmapScoreFloor: 0, diversityFloor: 0.8 })),
        { accept: false, reason: 'duplicate' },
    );
});

function pickDecision(decision: ReturnType<typeof decideCandidateAcceptance>) {
    return { accept: decision.accept, reason: decision.reason };
}
