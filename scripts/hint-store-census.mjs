#!/usr/bin/env node
import process from 'node:process';
import { discoverHintStoreDirs } from './hint-store-roots.mjs';

const EXPECTED = Object.freeze([
  'data/families/hints',
  'data/families/phaseB/hints',
  'data/hints',
  'data/stress/hints',
  'data/stress/hints-envelope',
  'data/stress/hints-random',
]);

const actual = discoverHintStoreDirs(process.cwd());
if (JSON.stringify(actual) !== JSON.stringify(EXPECTED)) {
  console.error('Tracked canonical Hint-store census changed or full research data is not materialized.');
  console.error(JSON.stringify({ expected: EXPECTED, actual }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ stores: actual.length, directories: actual }, null, 2));
