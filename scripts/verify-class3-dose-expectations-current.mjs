#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os'; import path from 'node:path';
const temp=mkdtempSync(path.join(os.tmpdir(),'class3-dose-'));
try {
 const atlas=path.join(temp,'atlas.json'), actual=path.join(temp,'expectations.json');
 execFileSync('npm',['exec','--','tsx','scripts/stress/analyze-post-1029-residual-atlas.mjs','--baseline=reports/stress/capability-runs/35066677597/per-level-corpus2.json','--lifecycle=reports/stress/capability-runs/35066677597/lifecycle-failure-map-corpus2.json','--census=reports/stress/technique-census/33717910218/combined-cells.json',`--out=${atlas}`],{stdio:'ignore'});
 execFileSync('node',['scripts/build-class3-dose-expectations.mjs',`--atlas=${atlas}`,`--out=${actual}`]);
 const frozen='reports/stress/failure-evidence/class3-dose-expectations-2026-09-19.json';
 assert.deepEqual(JSON.parse(readFileSync(actual,'utf8')),JSON.parse(readFileSync(frozen,'utf8')),'frozen Class-3 expectation map is stale');
 console.log('Class-3 dose expectations match current boundary/census semantics.');
} finally {rmSync(temp,{recursive:true,force:true});}
