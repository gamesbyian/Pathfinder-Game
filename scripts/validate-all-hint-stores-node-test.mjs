#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { encodeHintArtifact, toHint } from '../modules/domain/hint-runtime.mjs';
import { validateAllTrackedHintStores } from './validate-all-hint-stores.mjs';

const root=mkdtempSync(path.join(tmpdir(),'validate-all-hint-stores-'));
try {
  mkdirSync(path.join(root,'data','hints'),{recursive:true});
  const level={id:'P00001',grid:{w:2,h:1},gates:[{x:1,y:1}],goal:{x:2,y:1},reqLen:1,reqInt:0};
  writeFileSync(path.join(root,'data','levels.json'),JSON.stringify([level])+'\n');
  writeFileSync(path.join(root,'data','hints','P00001.json'),JSON.stringify(encodeHintArtifact([toHint([0,65536],[])]))+'\n');
  const result=validateAllTrackedHintStores(root);
  assert.equal(result.ok,true,JSON.stringify(result.failures));
  assert.equal(result.artifacts,1);
  assert.equal(result.hints,1);
} finally { rmSync(root,{recursive:true,force:true}); }
console.log('validate-all-hint-stores-node-test: ok');
