#!/usr/bin/env node
import process from 'node:process';
import { assertCompleteHintStoreDirs, discoverHintStoreDirs } from './hint-store-roots.mjs';

const actual = assertCompleteHintStoreDirs(
  discoverHintStoreDirs(process.cwd()),
  'tracked canonical Hint-store census',
);
console.log(JSON.stringify({ stores: actual.length, directories: actual }, null, 2));
