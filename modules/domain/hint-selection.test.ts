/** Unit tests for modules/domain/hint-selection.ts (selectDisplayHints). */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK } from './cell-key.js';
import { selectDisplayHints } from './hint-selection.js';

/** Build a path from [x,y] cells. */
const p = (cells: [number, number][]) => cells.map(([x, y]) => PACK(x, y));
// Edge-disjoint building blocks (share no drawn segment → distance 1 apart).
const rowFrom = (x0: number, y: number, n: number) => p(Array.from({ length: n }, (_, i) => [x0 + i, y]));

test('returns every path when all are clearly distinct (under the cap)', () => {
    const paths = [rowFrom(0, 0, 5), rowFrom(0, 2, 5), rowFrom(0, 4, 5)]; // 3 disjoint rows
    const sel = selectDisplayHints(paths, { floor: 0.5, cap: 15 });
    assert.equal(sel.indices.length, 3);
    assert.deepEqual([...sel.indices].sort(), [0, 1, 2]);
    assert.equal(sel.moreButSimilar, false);
});

test('early-stops on near-duplicates and flags moreButSimilar', () => {
    const distinctA = rowFrom(0, 0, 6);
    const distinctB = rowFrom(0, 3, 6);
    const dupOfA1 = rowFrom(0, 0, 6);   // identical drawn line → distance 0 from A
    const dupOfA2 = rowFrom(0, 0, 6);
    const paths = [distinctA, distinctB, dupOfA1, dupOfA2];
    const sel = selectDisplayHints(paths, { floor: 0.5, cap: 15 });
    assert.equal(sel.indices.length, 2, 'only the two genuinely-distinct shapes are shown');
    assert.equal(sel.moreButSimilar, true, 'the hidden duplicates merely resemble the shown set');
});

test('caps distinct hints and does NOT flag similar when it dropped distinct ones', () => {
    const paths = Array.from({ length: 20 }, (_, i) => rowFrom(0, i, 4)); // 20 disjoint rows, all distinct
    const sel = selectDisplayHints(paths, { floor: 0.5, cap: 5 });
    assert.equal(sel.indices.length, 5, 'capped at 5');
    assert.equal(sel.moreButSimilar, false, 'the 15 dropped are genuinely distinct — not "similar"');
});

test('interleaves gates so cycling alternates', () => {
    // Two gates (distinct first cells), two disjoint shapes each.
    const a1 = p([[0, 0], [1, 0], [2, 0]]);        // gate A, horizontal
    const a2 = p([[0, 0], [0, 1], [0, 2]]);        // gate A, vertical (no shared edge with a1)
    const b1 = p([[9, 9], [8, 9], [7, 9]]);        // gate B, horizontal
    const b2 = p([[9, 9], [9, 8], [9, 7]]);        // gate B, vertical
    const sel = selectDisplayHints([a1, a2, b1, b2], { floor: 0.5, cap: 15 });
    assert.equal(sel.indices.length, 4);
    const gates = sel.indices.map(i => [a1, a2, b1, b2][i][0]);
    // Adjacent picks come from different gates (round-robin).
    assert.notEqual(gates[0], gates[1]);
    assert.notEqual(gates[1], gates[2]);
    assert.equal(new Set(gates).size, 2);
});

test('near-Hamiltonian: rescues variety from crossing placement when edges collapse', () => {
    // Two paths sharing most drawn segments (edge distance 0.5, below the 0.65 floor) but
    // self-crossing at different cells: A revisits (2,0), B revisits (3,0) (crossing distance 1.0).
    const a = p([[0, 0], [1, 0], [2, 0], [3, 0], [2, 0], [2, 1]]); // crosses at (2,0)
    const b = p([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [3, 0], [3, 1]]); // crosses at (3,0)
    // Edge-only (default navDensity) reads them as near-duplicates → shows one.
    const edgeOnly = selectDisplayHints([a, b], { floor: 0.65, cap: 15 });
    assert.equal(edgeOnly.indices.length, 1, 'edge-distance alone collapses the pair');
    // Near-Hamiltonian: crossing placement counts as variety → both shown.
    const withCross = selectDisplayHints([a, b], { floor: 0.65, cap: 15, navDensity: 0.9 });
    assert.equal(withCross.indices.length, 2, 'differing crossing locations rescue the second hint');
});

test('handles empty and single-path lists', () => {
    assert.deepEqual(selectDisplayHints([]), { indices: [], moreButSimilar: false });
    assert.deepEqual(selectDisplayHints([rowFrom(0, 0, 4)]), { indices: [0], moreButSimilar: false });
});

test('memoizes by path-list identity at the default floor/cap', () => {
    const paths = [rowFrom(0, 0, 5), rowFrom(0, 2, 5)];
    const a = selectDisplayHints(paths);
    const b = selectDisplayHints(paths);
    assert.equal(a, b, 'same object returned for the same array (cycle re-requests it each click)');
});
