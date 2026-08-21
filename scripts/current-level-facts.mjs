#!/usr/bin/env node
/** Derive decision-sensitive level/corpus snapshots from canonical JSON; never hand-maintain them. */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveCurrentLevelFacts, renderCurrentLevelFacts } from './current-level-facts-lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const facts = deriveCurrentLevelFacts(read('data/levels.json'), [
  read('data/stress/stress-levels.json').levels,
  read('data/stress/stress-levels-random.json').levels,
]);
const file = resolve(root, 'DEVELOPER_REFERENCE.md');
const rendered = renderCurrentLevelFacts(facts);
const source = readFileSync(file, 'utf8');
const pattern = /<!-- generated: current-level-facts;[^\n]* -->[\s\S]*?<!-- \/generated: current-level-facts -->/;

if (process.argv.includes('--write')) {
  if (!pattern.test(source)) throw new Error('DEVELOPER_REFERENCE.md: generated current-level-facts block is missing');
  writeFileSync(file, source.replace(pattern, rendered));
  console.log('Updated DEVELOPER_REFERENCE.md from canonical level data.');
} else if (process.argv.includes('--check')) {
  if (source.match(pattern)?.[0] !== rendered) {
    console.error('DEVELOPER_REFERENCE.md: current level facts are stale; run npm run facts:levels -- --write');
    process.exit(1);
  }
  console.log('Current level facts match canonical data.');
} else {
  console.log(JSON.stringify(facts, null, 2));
}
