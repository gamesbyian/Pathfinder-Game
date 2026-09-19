import assert from 'node:assert/strict'; import {execFileSync} from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const d=fs.mkdtempSync(path.join(os.tmpdir(),'class3-test-')); try {
 const e=path.join(d,'e.json'), f=path.join(d,'f.json');
 fs.writeFileSync(e,JSON.stringify({schemaVersion:1,kind:'pathfinder-class3-dose-expectations',parents:[{parentId:'A',expectations:[{actionIdentity:'repair|x',isolatedCensusNodes:5}]},{parentId:'B',expectations:[{actionIdentity:'beam|x',isolatedCensusNodes:7}]}]}));
 fs.writeFileSync(f,JSON.stringify({schemaVersion:1,kind:'pathfinder-compact-failure-response',protocolHash:'p',solverRef:'s',records:[{identity:'A',parentId:'A',outcome:'exhaustedNegative',protocolHash:'p',solverRef:'s',attempts:[{configKey:'repair|x',outcome:'exhausted',workSpent:10,nodesExpanded:8}]},{identity:'B',parentId:'B',outcome:'nodeLimited',protocolHash:'p',solverRef:'s',attempts:[{configKey:'beam|x',outcome:'node-limited',workSpent:20}]}],summary:{observed:2},populationIntegrity:null,sourceFiles:[],missingSourceFiles:[],invalidSourceFiles:[]}));
 const got=JSON.parse(execFileSync('node',['scripts/analyze-class3-dose-exposure.mjs',`--expectations=${e}`,`--in=${f}`],{encoding:'utf8'}));
 assert.equal(got.classificationCounts['exact-participated-exhausted-negative'],1); assert.equal(got.classificationCounts['exact-participated-censored'],1); assert.equal(got.independentUnit,'parentId');
 const bad=path.join(d,'bad.json'); fs.writeFileSync(bad,JSON.stringify({...JSON.parse(fs.readFileSync(f)),protocolHash:'other',records:[]}));
 assert.throws(()=>execFileSync('node',['scripts/analyze-class3-dose-exposure.mjs',`--expectations=${e}`,`--in=${f},${bad}`],{stdio:'pipe'}),/Command failed/);
 console.log('Class-3 exact-dose reducer tests passed.');
} finally {fs.rmSync(d,{recursive:true,force:true});}
