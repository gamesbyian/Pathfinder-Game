import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Regression for cancelled 2Y canary 39067937869: a 25k-work admissible
// method-probe row previously consumed ~1.97 BILLION work and the 10m wall cap
// because method-probe set only the soft cap, not _strictWorkCap.
const dir=mkdtempSync(path.join(os.tmpdir(),'pathfinder-admissible-cap-'));
try{
 const out=path.join(dir,'probe.json');
 const res=spawnSync(process.execPath,[
  'scripts/run-bundled.mjs','scripts/method-probe.mjs','--',
  '--corpus=data/stress/stress-levels-random.json','--levels=R00242',
  '--only=admissible-order|tieBreak=default|lds=off',
  '--work-budget=25000','--budget-ms=10000',
  '--out='+out,
 ],{cwd:process.cwd(),encoding:'utf8',timeout:45000,maxBuffer:4*1024*1024});
 assert.equal(res.status,0,JSON.stringify({status:res.status,signal:res.signal,stderr:res.stderr?.slice(-1500),stdout:res.stdout?.slice(-1000)}));
 const doc=JSON.parse(readFileSync(out,'utf8'));
 assert.equal(doc.levels.length,1,'frozen single-level row missing');
 const row=doc.levels[0];
 assert.equal(row.id,'R00242');
 assert.equal(row.deadlineTruncated,false,'wall safety cap must not make a false work verdict');
 assert.equal(row.status,'work-budget-reached','canary must exercise the strict budget');
 assert.ok(row.workSpent>=25000,'canary must reach real paid work cap');
 assert.ok(row.workSpent<=27000,'atomic work overshoot exceeds preregistered 2000-unit guard: '+row.workSpent);
 assert.ok(row.totalMs<10000,'budget must bind before wall timeout');
 assert.equal(row.validDeterministicEvidence,true);
 console.log('method-probe admissible strict cap regression passed: '+JSON.stringify({workSpent:row.workSpent,totalMs:row.totalMs}));
}finally{rmSync(dir,{recursive:true,force:true})}
