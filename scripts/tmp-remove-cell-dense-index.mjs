#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

function edit(path, fn) {
  const before = readFileSync(path, 'utf8');
  const after = fn(before);
  if (after === before) throw new Error(`No change made to ${path}`);
  writeFileSync(path, after);
}
function mustReplace(src, from, to, label) {
  if (!src.includes(from)) throw new Error(`Missing expected text: ${label}`);
  return src.replace(from, to);
}

edit('modules/solver/prep.ts', src => {
  src = mustReplace(src,
    "import { buildAxisApproachMap, buildDistMap, distMapToArray } from './distance.js';",
    "import { buildAxisApproachMap, buildDistMap, denseIndex, distMapToArray } from './distance.js';",
    'prep distance import');
  const oldBlock = `    // Dense indexing (2026-08-23): this used to be a flat KEY_SPACE * 4 Int32Array (16.8 MB),\n    // directly packed-key-indexed. A grid has at most a few hundred live (non-block/non-goose)\n    // cells while KEY_SPACE is 1,048,576, so the array was >99.9% permanently-zero padding —\n    // microbenchmarked at ~2ms per allocation from the array's SIZE alone (not from filling it;\n    // only real cells were ever written either way, same as the "+1 bias avoids fill(-1)" note\n    // below always meant). \`cellDenseIndex\` is the one remaining KEY_SPACE-sized array (a\n    // Uint8Array, 1 MB — grid cell counts fit comfortably under 256): every packed key that is a\n    // live cell maps to a dense row 0..N-1; \`staticNeighborKeys\` itself shrinks to N*4 slots.\n    // Every direct-index consumer (prep.ts's own gateForcedFirstStepKey below, search-state.ts's\n    // getNeighbors, lower-bounds.ts's two must-cross deadlock checks) resolves the dense row via\n    // cellDenseIndex first. See reports/2026-08-23-dense-static-neighbor-keys.md.\n    {\n        const { w, h } = level.grid;\n        // Stores neighbourKey+1 so that ZERO means "no neighbour in this direction" — the same\n        // zero-means-absent trick distance.ts's distMapToArray uses, and for the same reason: the\n        // old -1 sentinel forced \`.fill(-1)\` over every entry, for a grid with at most a few\n        // hundred live cells. A packed key of 0 is the legitimate cell (0,0), so the sentinel\n        // cannot simply be 0 — hence the +1 bias, undone at every read site.\n        prep.cellDenseIndex = new Uint8Array(KEY_SPACE);\n        let _liveCellCount = 0;\n        for (let y = 0; y < h; y++) {\n            for (let x = 0; x < w; x++) {\n                const k = PACK(x, y);\n                if (level.blockSet.has(k) || level.gooseSet.has(k)) continue;\n                prep.cellDenseIndex[k] = ++_liveCellCount;\n            }\n        }\n        prep.staticNeighborKeys = new Int32Array(_liveCellCount * 4);\n        for (let y = 0; y < h; y++) {\n            for (let x = 0; x < w; x++) {\n                const k = PACK(x, y);\n                const denseIdx = prep.cellDenseIndex[k];\n                if (denseIdx === 0) continue; // block/goose: no adjacency row (matches skip above)\n                const filterFrom = level.filterMap.get(k);\n                const base = (denseIdx - 1) * 4;`;
  const newBlock = `    // Row-major dense indexing: static adjacency is gridW*gridH*4, still at most 900 slots.\n    // This removes the former 1 MB KEY_SPACE-sized packed-key-to-row indirection; packed grid keys\n    // resolve directly through distance.ts's denseIndex(key, gridW). Block/goose rows stay zero.\n    {\n        const { w, h } = level.grid;\n        // Stores neighbourKey+1 so that ZERO means "no neighbour in this direction".\n        prep.staticNeighborKeys = new Int32Array(w * h * 4);\n        for (let y = 0; y < h; y++) {\n            for (let x = 0; x < w; x++) {\n                const k = PACK(x, y);\n                if (level.blockSet.has(k) || level.gooseSet.has(k)) continue;\n                const filterFrom = level.filterMap.get(k);\n                const base = denseIndex(k, w) * 4;`;
  src = mustReplace(src, oldBlock, newBlock, 'prep dense adjacency block');
  src = mustReplace(src,
    '            const base = (prep.cellDenseIndex[g] - 1) * 4;',
    '            const base = denseIndex(g, level.grid.w) * 4;',
    'gate forced base');
  return src;
});

edit('modules/solver/lower-bounds.ts', src => {
  src = mustReplace(src,
    "import { getDistanceFromArray } from './distance.js';",
    "import { denseIndex, getDistanceFromArray } from './distance.js';",
    'lower bounds import');
  src = src.replace(/    const cellDenseIndex = prep\.cellDenseIndex;\n/g, '');
  const hits = (src.match(/const base = \(cellDenseIndex\[mcKey\] - 1\) \* 4;/g) || []).length;
  if (hits !== 2) throw new Error(`Expected 2 lower-bounds base reads, saw ${hits}`);
  src = src.replace(/const base = \(cellDenseIndex\[mcKey\] - 1\) \* 4;/g,
    'const base = denseIndex(mcKey, prep.gridW) * 4;');
  src = src.replace(/staticNeighborKeys is dense-indexed[^\n]*\n\s*\/\/ cell \(a must-cross cell is always a valid traversable cell\), so this is always nonzero\.\n/g,
    'staticNeighborKeys is row-major dense-indexed by denseIndex(mcKey, gridW).\n');
  src = src.replace(/staticNeighborKeys is dense-indexed — see prep\.ts's own comment\. mcKey is always live\./g,
    'staticNeighborKeys is row-major dense-indexed by denseIndex(mcKey, gridW).');
  return src;
});

edit('modules/solver/search-state.ts', src => {
  src = mustReplace(src,
    "import { AXIS_H, AXIS_NONE, AXIS_V, KEY_SPACE, NEIGHBOR_AXIS, popcount } from './encoding.js';",
    "import { AXIS_H, AXIS_NONE, AXIS_V, KEY_SPACE, NEIGHBOR_AXIS, popcount } from './encoding.js';\nimport { denseIndex } from './distance.js';",
    'search-state import');
  src = mustReplace(src,
    `    // staticNeighborKeys is dense-indexed (cellDenseIndex[pos] - 1) * 4 + d, not packed-key-\n    // indexed — see prep.ts's own comment. pos is always a live cell here (the search only ever\n    // moves onto cells getNeighbors itself returned), so cellDenseIndex[pos] is always nonzero.\n    const base = (prep.cellDenseIndex[pos] - 1) * 4;`,
    `    // staticNeighborKeys is row-major dense-indexed by grid cell.\n    const base = denseIndex(pos, prep.gridW) * 4;`,
    'search-state neighbor base');
  return src;
});

edit('modules/solver/prep.test.ts', src => {
  const firstImport = "import { AXIS_H, AXIS_V, PACK } from './encoding.js';";
  if (!src.includes("from './distance.js'")) src = mustReplace(src, firstImport, `${firstImport}\nimport { denseIndex } from './distance.js';`, 'prep test import');
  src = mustReplace(src,
    '  // staticNeighborKeys is dense-indexed via cellDenseIndex, not directly by packed key.\n  assert.equal(prep.staticNeighborKeys[(prep.cellDenseIndex[PACK(1, 0)] - 1) * 4 + 1], corner + 1,',
    '  assert.equal(prep.staticNeighborKeys[denseIndex(PACK(1, 0), prep.gridW) * 4 + 1], corner + 1,',
    'prep test dead flipper base');
  src = mustReplace(src,
    '  // staticNeighborKeys is dense-indexed via cellDenseIndex, not directly by packed key.\n  const base = (prep.cellDenseIndex[center] - 1) * 4;',
    '  const base = denseIndex(center, prep.gridW) * 4;',
    'prep test static base');
  return src;
});

edit('modules/solver/representation-contracts.test.ts', src => {
  src = mustReplace(src,
    "import { NEIGHBOR_DX, NEIGHBOR_DY, PACK } from './encoding.js';",
    "import { NEIGHBOR_DX, NEIGHBOR_DY, PACK } from './encoding.js';\nimport { denseIndex } from './distance.js';",
    'representation import');
  src = mustReplace(src,
    '    // staticNeighborKeys is dense-indexed via cellDenseIndex, not directly by packed key.\n    const base = (prep.cellDenseIndex[origin] - 1) * 4;',
    '    const base = denseIndex(origin, prep.gridW) * 4;',
    'representation base');
  return src;
});

edit('modules/solver/types.ts', src => {
  const old = `    /** packed key → dense per-level cell index PLUS ONE, 0 meaning "not a live (non-block/goose)\n     *  grid cell" — same zero-means-absent bias as mustPassIndex etc. A grid has at most a few\n     *  hundred live cells while KEY_SPACE is 1,048,576; this is the one KEY_SPACE-sized array\n     *  \`staticNeighborKeys\` below still needs to resolve a packed key to its dense row. See\n     *  staticNeighborKeys' own comment for why this indirection exists. */\n    cellDenseIndex: Uint8Array;\n    /** \`(cellDenseIndex[packedKey] - 1) * 4 + direction\` → neighbor's packed key PLUS ONE, 0 if no\n     *  static neighbor in that direction (direction order/axis: see encoding.ts's\n     *  NEIGHBOR_DX/DY/AXIS). Dense-indexed (via cellDenseIndex above), not packed-key-indexed:\n     *  sized \`liveCellCount * 4\` instead of \`KEY_SPACE * 4\` — the difference between allocating a\n     *  ~900-slot array and a 4.2M-slot (16.8 MB) one, microbenchmarked at ~2ms per allocation for\n     *  the old form purely from array size, not from filling it (only real cells were ever\n     *  written either way). Every read site resolves the dense row via cellDenseIndex first. See\n     *  reports/2026-08-23-dense-static-neighbor-keys.md. */`;
  const replacement = `    /** \`denseIndex(packedKey, gridW) * 4 + direction\` → neighbor's packed key PLUS ONE, 0 if no\n     *  static neighbor in that direction. Sized \`gridW * gridH * 4\` (at most ~900 slots), with\n     *  block/goose rows left zero. This keeps the compact adjacency table without a KEY_SPACE-sized\n     *  packed-key-to-row indirection. See reports/2026-08-23-dense-static-neighbor-keys.md. */`;
  return mustReplace(src, old, replacement, 'PrepLevel dense adjacency contract');
});

const forbiddenCodePatterns = [
  /prep\.cellDenseIndex\b/,
  /\bcellDenseIndex\s*:/,
  /\bconst\s+cellDenseIndex\b/,
  /\blet\s+cellDenseIndex\b/,
  /\bvar\s+cellDenseIndex\b/,
];
for (const path of ['modules/solver/prep.ts','modules/solver/lower-bounds.ts','modules/solver/search-state.ts','modules/solver/prep.test.ts','modules/solver/representation-contracts.test.ts','modules/solver/types.ts']) {
  const text = readFileSync(path, 'utf8');
  if (forbiddenCodePatterns.some(re => re.test(text))) throw new Error(`cellDenseIndex code reference remains in ${path}`);
}
console.log('Removed packed-key row indirection and switched staticNeighborKeys to row-major dense indexing.');
