#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('modules/solver');
const TARGETS = [
  'mustPassIndex',
  'mustCrossIndex',
  'flipperIndexMap',
  'mustTurnCellIndex',
  'gateFlags',
  'reachBlockedArr',
];

function filesUnder(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...filesUnder(p));
    else if (name.endsWith('.ts')) out.push(p);
  }
  return out;
}

function ensureDenseImport(src) {
  if (!src.includes('denseIndex(')) return src;
  if (/import\s*\{[^}]*\bdenseIndex\b[^}]*\}\s*from\s*['"]\.\/distance\.js['"]/.test(src)) return src;
  const named = /import\s*\{([^}]*)\}\s*from\s*['"]\.\/distance\.js['"];?/;
  if (named.test(src)) {
    return src.replace(named, (m, names) => {
      const trimmed = names.trim();
      const next = trimmed ? `${trimmed}, denseIndex` : 'denseIndex';
      return `import { ${next} } from './distance.js';`;
    });
  }
  const firstImport = src.match(/^import .*?;\n/m);
  if (!firstImport) throw new Error('No import insertion point in file using denseIndex');
  return src.replace(firstImport[0], `${firstImport[0]}import { denseIndex } from './distance.js';\n`);
}

const prepPath = path.join(ROOT, 'prep.ts');
let prep = readFileSync(prepPath, 'utf8');
const oldBuilder = `function buildIndexArr(keys: number[]): Int8Array {\n    const arr = new Int8Array(KEY_SPACE);\n    for (let i = 0; i < keys.length; i++) arr[keys[i]] = i + 1;\n    return arr;\n}`;
const newBuilder = `function buildIndexArr(keys: number[], gridW: number, gridH: number): Int8Array {\n    const arr = new Int8Array(gridW * gridH);\n    for (let i = 0; i < keys.length; i++) arr[denseIndex(keys[i], gridW)] = i + 1;\n    return arr;\n}`;
if (!prep.includes(oldBuilder)) throw new Error('buildIndexArr source shape changed; aborting');
prep = prep.replace(oldBuilder, newBuilder);
for (const [oldText, newText] of [
  ['buildIndexArr(level.mustPassKeys)', 'buildIndexArr(level.mustPassKeys, level.grid.w, level.grid.h)'],
  ['buildIndexArr(level.mustCrossKeys)', 'buildIndexArr(level.mustCrossKeys, level.grid.w, level.grid.h)'],
  ['buildIndexArr(_fKeys)', 'buildIndexArr(_fKeys, level.grid.w, level.grid.h)'],
  ['buildIndexArr(prep.mustTurnKeys)', 'buildIndexArr(prep.mustTurnKeys, level.grid.w, level.grid.h)'],
  ['prep.gateFlags = new Uint8Array(KEY_SPACE);', 'prep.gateFlags = new Uint8Array(level.grid.w * level.grid.h);'],
  ['prep.reachBlockedArr = new Uint8Array(KEY_SPACE);', 'prep.reachBlockedArr = new Uint8Array(level.grid.w * level.grid.h);'],
]) {
  if (!prep.includes(oldText)) throw new Error(`Expected prep.ts text missing: ${oldText}`);
  prep = prep.replace(oldText, newText);
}
writeFileSync(prepPath, prep);

const accessRe = new RegExp(`\\b(prep\\.)?(${TARGETS.join('|')})\\[([^\\]\\n]+)\\]`, 'g');
const changed = [];
let replacements = 0;
for (const file of filesUnder(ROOT)) {
  let src = readFileSync(file, 'utf8');
  const before = src;
  src = src.replace(accessRe, (whole, prefix = '', name, expr) => {
    if (expr.includes('denseIndex(')) return whole;
    replacements++;
    return `${prefix}${name}[denseIndex(${expr.trim()}, prep.gridW)]`;
  });
  src = ensureDenseImport(src);
  if (src !== before) {
    writeFileSync(file, src);
    changed.push(path.relative(process.cwd(), file));
  }
}

// Keep the type contract explicit: these six arrays are row-major gridW*gridH arrays now.
const typesPath = path.join(ROOT, 'types.ts');
let types = readFileSync(typesPath, 'utf8');
types = types
  .replace('Typed arrays are indexed by packed key (KEY_SPACE) or by\n * objective index.', 'Typed arrays are indexed either by dense row-major cell index (gridW * gridH), by packed key\n * where explicitly documented, or by objective index.')
  .replace('/** packed key → 1 if a gate cell, 0 otherwise */\n    gateFlags: Uint8Array;', '/** denseIndex(packedKey, gridW) → 1 if a gate cell, 0 otherwise */\n    gateFlags: Uint8Array;')
  .replace('/** blocks ∪ geese ∪ gates, indexed by packed key — used by the isConnected BFS */\n    reachBlockedArr: Uint8Array;', '/** blocks ∪ geese ∪ gates, dense-indexed by denseIndex(key, gridW) — used by isConnected */\n    reachBlockedArr: Uint8Array;')
  .replace('/** packed key → index into mustPassKeys PLUS ONE, 0 meaning "not a must-pass cell"', '/** denseIndex(packedKey, gridW) → index into mustPassKeys PLUS ONE, 0 meaning "not a must-pass cell"')
  .replace('/** packed key → index into mustCrossKeys PLUS ONE, 0 meaning "not a must-cross cell"', '/** denseIndex(packedKey, gridW) → index into mustCrossKeys PLUS ONE, 0 meaning "not a must-cross cell"')
  .replace('/** packed key → index into the flipping-filter map PLUS ONE, 0 meaning "not a flipper cell"', '/** denseIndex(packedKey, gridW) → index into the flipping-filter map PLUS ONE, 0 meaning "not a flipper cell"')
  .replace('/** packed key → index into mustTurnKeys, or -1 if not a must-turn cell (always present,', '/** denseIndex(packedKey, gridW) → index into mustTurnKeys PLUS ONE, 0 meaning absent (always present,');
writeFileSync(typesPath, types);

// Update prep's stale packed-array prose while keeping the historical motivation.
prep = readFileSync(prepPath, 'utf8')
  .replace('// Builds a KEY_SPACE-sized index lookup. Same "typed array beats Map.get()" rationale as', '// Builds a compact row-major index lookup (gridW * gridH). Same typed-array hot-path rationale as')
  .replace('// contains — no fill needed. The old `-1` sentinel required fill(-1) over 1,048,576 entries per\n// array, four arrays per level, for a grid with at most 225 live cells (4.1% of solver CPU on a', '// contains — no fill needed. The old representation allocated KEY_SPACE entries per array; the\n// dense representation stores only grid cells, while preserving the same i+1/zero sentinel. The old fills were 4.1% of solver CPU on a')
  .replace('// so all the existing `!== -1` comparisons stay correct verbatim. Same zero-means-absent trick as', '// so all the existing `!== -1` comparisons stay correct verbatim. Reads use denseIndex(key, gridW), same pattern as')
  .replace('// Flat presence flag instead of Set<number>: read per-candidate in scoreMove/applyMove', '// Dense row-major presence flag instead of Set<number>: read per-candidate in scoreMove/applyMove')
  .replace('// Unified impassable-for-BFS lookup (blocks ∪ geese ∪ gates), used by the connectivity-prune', '// Dense row-major impassable-for-BFS lookup (blocks ∪ geese ∪ gates), used by the connectivity-prune');
writeFileSync(prepPath, prep);

// Dense conversion must eliminate direct packed-key indexing of all six targets in solver TS.
const leftovers = [];
for (const file of filesUnder(ROOT)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const name of TARGETS) {
      if (new RegExp(`\\b(?:prep\\.)?${name}\\[(?!denseIndex\\()`).test(line)) {
        leftovers.push(`${path.relative(process.cwd(), file)}:${i + 1}: ${line.trim()}`);
      }
    }
  });
}
if (leftovers.length) throw new Error(`Unconverted direct accesses:\n${leftovers.join('\n')}`);

console.log(`Dense-prep codemod changed ${changed.length} files and rewrote ${replacements} direct accesses.`);
for (const file of changed) console.log(`  ${file}`);
