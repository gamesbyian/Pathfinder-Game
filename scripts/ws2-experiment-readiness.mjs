#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { analyzeClass2Economics, analyzeClass4Canary, armIdentityFromSweep, materializeClass2Cohort } from './ws2-experiment-readiness-lib.mjs';

const [mode, inputPath] = process.argv.slice(2);
if (!['class4-canary', 'class2-materialize', 'class2-analyze'].includes(mode) || !inputPath) {
  console.error('usage: node scripts/ws2-experiment-readiness.mjs <class4-canary|class2-materialize|class2-analyze> <input.json>');
  process.exit(2);
}
const input = JSON.parse(readFileSync(inputPath, 'utf8'));
const normalizedInput = input.controlDocument && input.treatmentDocument ? {
  ...input,
  controlRows: input.controlDocument.levels,
  treatmentRows: input.treatmentDocument.levels,
  controlIdentity: armIdentityFromSweep(input.controlDocument, false),
  treatmentIdentity: armIdentityFromSweep(input.treatmentDocument, true),
} : input;
const output = mode === 'class4-canary' ? analyzeClass4Canary(normalizedInput)
  : mode === 'class2-materialize' ? materializeClass2Cohort(input.rows, input.provenance)
    : analyzeClass2Economics(normalizedInput);
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
if (String(output.decision).startsWith('invalid')) process.exitCode = 1;
