#!/usr/bin/env node
import assert from 'node:assert/strict';
import { computeArticulationCuts } from './articulation-census.mjs';

// Path graph A-B-C-D-E: B, C, D are all articulation points.
{
    const cuts = computeArticulationCuts({
        cellKeys: ['A', 'B', 'C', 'D', 'E'],
        edges: [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E']],
    });
    const byVertex = Object.fromEntries(cuts.map((c) => [c.cutVertex, c.componentSizes]));
    assert.deepEqual(Object.keys(byVertex).sort(), ['B', 'C', 'D']);
    assert.deepEqual(byVertex.B.sort(), [1, 3]); // {A} vs {C,D,E}
    assert.deepEqual(byVertex.C.sort(), [2, 2]); // {A,B} vs {D,E}
}

// Triangle: no cut vertex (2-connected).
{
    const cuts = computeArticulationCuts({
        cellKeys: ['A', 'B', 'C'],
        edges: [['A', 'B'], ['B', 'C'], ['C', 'A']],
    });
    assert.equal(cuts.length, 0);
}

// Two triangles joined at one shared vertex X: X is the sole articulation point, separating two
// components of size 2 each.
{
    const cuts = computeArticulationCuts({
        cellKeys: ['A', 'B', 'X', 'C', 'D'],
        edges: [['A', 'B'], ['B', 'X'], ['X', 'A'], ['X', 'C'], ['C', 'D'], ['D', 'X']],
    });
    assert.equal(cuts.length, 1);
    assert.equal(cuts[0].cutVertex, 'X');
    assert.deepEqual(cuts[0].componentSizes.sort(), [2, 2]);
}

// Star graph (center + 3 leaves): center is an articulation point cutting off 3 singleton leaves.
{
    const cuts = computeArticulationCuts({
        cellKeys: ['Z', 'L1', 'L2', 'L3'],
        edges: [['Z', 'L1'], ['Z', 'L2'], ['Z', 'L3']],
    });
    assert.equal(cuts.length, 1);
    assert.equal(cuts[0].cutVertex, 'Z');
    assert.deepEqual(cuts[0].componentSizes, [1, 1, 1]);
}

console.log('articulation-census-node-test: all assertions passed');
