#!/usr/bin/env node
import assert from 'node:assert/strict';
import { minVertexCut } from './vertex-mincut.mjs';

// Two vertex-disjoint S->T paths through A and B: min vertex cut is 2 (remove A and B).
{
    const r = minVertexCut({
        cellKeys: ['S', 'A', 'B', 'T'],
        edges: [['S', 'A'], ['S', 'B'], ['A', 'T'], ['B', 'T']],
        sources: ['S'], target: 'T',
    });
    assert.equal(r.width, 2);
    assert.deepEqual([...r.cutCells].sort(), ['A', 'B']);
}

// Single path S-A-B-T: min vertex cut is 1 (either internal cell disconnects it).
{
    const r = minVertexCut({
        cellKeys: ['S', 'A', 'B', 'T'],
        edges: [['S', 'A'], ['A', 'B'], ['B', 'T']],
        sources: ['S'], target: 'T',
    });
    assert.equal(r.width, 1);
    assert.equal(r.cutCells.length, 1);
    assert.ok(['A', 'B'].includes(r.cutCells[0]));
}

// Disconnected: no route at all — 0 vertex-disjoint paths, so width is 0 (nothing to cut; they
// are already unreachable). The census script treats width 0 as its own "no static route" signal,
// distinct from a positive cut width.
{
    const r = minVertexCut({
        cellKeys: ['S', 'T'],
        edges: [],
        sources: ['S'], target: 'T',
    });
    assert.equal(r.width, 0);
}

// Removing a bridge cell adds a third vertex-disjoint path: min cut rises from 2 to 3.
{
    const r = minVertexCut({
        cellKeys: ['S', 'A', 'B', 'C', 'T'],
        edges: [['S', 'A'], ['S', 'B'], ['S', 'C'], ['A', 'T'], ['B', 'T'], ['C', 'T']],
        sources: ['S'], target: 'T',
    });
    assert.equal(r.width, 3);
}

// Source and target directly adjacent: a direct edge has no vertex to cut, so no finite set of
// OTHER vertices can ever disconnect them — width is Infinity regardless of any detour path.
{
    const r = minVertexCut({
        cellKeys: ['S', 'T', 'A'],
        edges: [['S', 'T'], ['S', 'A'], ['A', 'T']],
        sources: ['S'], target: 'T',
    });
    assert.equal(r.width, Infinity);
    assert.equal(r.directlyAdjacent, true);
}

console.log('vertex-mincut-node-test: all assertions passed');
