import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'method-probe-shard-plan-'));
try {
  const corpus=path.join(temp,'corpus.json');
  fs.writeFileSync(corpus,JSON.stringify({levels:Array.from({length:7},(_,i)=>({id:'R'+String(i+1).padStart(5,'0')}))}));
  const run=(...a)=>execFileSync('node',['scripts/method-probe-shard-plan.mjs','--corpus='+corpus,...a],{cwd:process.cwd(),encoding:'utf8'}).trim();
  assert.equal(run('--levels=R00001,R00003,R00005','--count=true'),'3');
  assert.equal(run('--levels=R00001,R00003,R00005','--shard=1','--shards=2'),'R00001');
  assert.equal(run('--levels=R00001,R00003,R00005','--shard=2','--shards=2'),'R00003,R00005');
  assert.equal(run('--levels=all','--shard=1','--shards=3'),'R00001,R00002');
  assert.equal(run('--levels=all','--shard=3','--shards=3'),'R00005,R00006,R00007');
  console.log('method probe shard plan tests passed');
} finally { fs.rmSync(temp,{recursive:true,force:true}); }
