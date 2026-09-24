#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { discoverHintStoreDirs, hintStoreLabel } from './hint-store-roots.mjs';

const root=mkdtempSync(path.join(tmpdir(),'hint-store-roots-'));
try {
  for (const dir of ['data/hints','data/stress/hints-random','data/families/phaseX/hints']) {
    mkdirSync(path.join(root,dir),{recursive:true});
    writeFileSync(path.join(root,dir,'A00001.json'),'[]\n');
  }
  mkdirSync(path.join(root,'data/not-hints'),{recursive:true});
  writeFileSync(path.join(root,'data/not-hints','x.json'),'[]\n');
  assert.deepEqual(discoverHintStoreDirs(root),[
    'data/families/phaseX/hints',
    'data/hints',
    'data/stress/hints-random',
  ]);
} finally { rmSync(root,{recursive:true,force:true}); }

assert.equal(hintStoreLabel('data/hints'), 'published');
assert.equal(hintStoreLabel('data/stress/hints'), 'stress1');
assert.equal(hintStoreLabel('data/stress/hints-random'), 'stress2');
assert.equal(hintStoreLabel('data/stress/hints-envelope'), 'envelope');
assert.equal(hintStoreLabel('data/families/hints'), 'families:hints');
console.log('hint-store-roots-node-test: ok');
