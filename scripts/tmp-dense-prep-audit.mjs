#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('modules/solver');
const names = [
  'mustPassIndex',
  'mustCrossIndex',
  'flipperIndexMap',
  'mustTurnCellIndex',
  'gateFlags',
  'reachBlockedArr',
  'cellDenseIndex',
  'staticNeighborKeys',
];

function filesUnder(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out.push(...filesUnder(p));
    else if (/\.(?:ts|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

const counts = Object.fromEntries(names.map(n => [n, 0]));
for (const file of filesUnder(ROOT)) {
  const rel = path.relative(process.cwd(), file);
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const name of names) {
      if (!line.includes(name)) continue;
      counts[name]++;
      console.log(`${rel}:${i + 1}: ${line.trim()}`);
    }
  });
}
console.log('\nCOUNTS');
for (const name of names) console.log(`${name}=${counts[name]}`);
