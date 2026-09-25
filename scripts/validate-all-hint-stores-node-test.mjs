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
  const level={id:'P00001',grid:{w:2,h:2},gates:[{x:1,y:1}],goal:{x:2,y:1},reqLen:1,reqInt:0};
  writeFileSync(path.join(root,'data','levels.json'),JSON.stringify([level])+'\n');
  writeFileSync(path.join(root,'data','hints','P00001.json'),JSON.stringify(encodeHintArtifact([toHint([0,1],[])]))+'\n');
  assert.throws(
    () => validateAllTrackedHintStores(root),
    /canonical Hint-store population incomplete or changed/u,
    'default whole-store validation must fail closed when a canonical store is absent',
  );
  let result=validateAllTrackedHintStores(root,{requireComplete:false});
  assert.equal(result.ok,true,JSON.stringify(result.failures));
  assert.equal(result.artifacts,1);
  assert.equal(result.hints,1);

  // Family-generation stores legitimately contain research levels beyond the player/editor 15x15
  // schema ceiling. The whole-store referee must still validate their paths rather than rejecting
  // the owning level before the PLAY/path referee runs.
  mkdirSync(path.join(root,'data','families','hints'),{recursive:true});
  const familyLevel={
    id:'F00001-re-01',
    grid:{w:16,h:16},
    gates:[{x:1,y:1}],
    goal:{x:16,y:1},
    reqLen:15,
    reqInt:0,
  };
  writeFileSync(path.join(root,'data','families','family-test.json'),JSON.stringify([familyLevel])+'\n');
  writeFileSync(
    path.join(root,'data','families','hints','F00001-re-01.json'),
    JSON.stringify(encodeHintArtifact([toHint(Array.from({length:16},(_,i)=>i),[])]))+'\n',
  );
  result=validateAllTrackedHintStores(root,{requireComplete:false});
  assert.equal(result.ok,true,JSON.stringify(result.failures));
  assert.equal(result.artifacts,2);
  assert.equal(result.hints,2);
} finally { rmSync(root,{recursive:true,force:true}); }
console.log('validate-all-hint-stores-node-test: ok');
