#!/usr/bin/env node
import process from 'node:process';
import { validateFailureEvidenceDisposition } from './solver-failure-evidence-disposition-lib.mjs';

const failures = validateFailureEvidenceDisposition(process.cwd());
if (failures.length) {
    console.error('Failure-evidence disposition check failed:');
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
}
console.log('Failure-evidence disposition check passed.');
