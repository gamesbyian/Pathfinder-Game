#!/usr/bin/env node
/**
 * Read-only integrity audit for compact failure-response identity granularity.
 *
 * Usage:
 *   node scripts/failure-response-identity-audit.mjs --in=a.json,b.json [--out=tmp/audit.json]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { auditFailureResponseIdentity } from './failure-response-identity-audit-lib.mjs';
import { validateFailureResponseDocument } from './solver-failure-response-lib.mjs';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
    const eq = arg.indexOf('=');
    return [arg.slice(2, eq), arg.slice(eq + 1)];
}));
const inputs = (args.get('in') ?? '').split(',').map(value => value.trim()).filter(Boolean);
const outFile = args.get('out') ?? null;
if (!inputs.length) {
    console.error('Usage: node scripts/failure-response-identity-audit.mjs --in=a.json,b.json [--out=tmp/audit.json]');
    process.exit(2);
}

const documents = inputs.map(file => validateFailureResponseDocument(JSON.parse(readFileSync(file, 'utf8'))));
const result = {
    schemaVersion: 1,
    kind: 'pathfinder-failure-response-identity-audit',
    sourceFiles: inputs,
    semantics: {
        conflictingKey: 'same run/protocol/parent/action-stage-config identity with incompatible compact payloads',
        interpretation: 'investigation lead for duplicate capture or under-resolved identity; not automatically corruption',
    },
    ...auditFailureResponseIdentity(documents),
};

const json = JSON.stringify(result, null, 2) + '\n';
if (outFile) {
    writeFileSync(path.resolve(outFile), json);
    console.error(`failure-response-identity-audit: ${result.conflictingKeys} conflicting key(s) -> ${outFile}`);
} else {
    process.stdout.write(json);
}
if (result.conflictingKeys > 0 && process.argv.includes('--fail-on-conflict')) process.exitCode = 1;
