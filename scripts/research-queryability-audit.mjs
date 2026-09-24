#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { runResearchQueryabilityAudit } from './research-queryability-audit-lib.mjs';

let discoverArtifacts = false;
let benchmarkPath = null;
for (const arg of process.argv.slice(2)) {
    if (arg === '--discover') {
        discoverArtifacts = true;
        continue;
    }
    if (arg.startsWith('--benchmarks=')) {
        benchmarkPath = arg.slice('--benchmarks='.length);
        continue;
    }
    console.error('usage: node scripts/research-queryability-audit.mjs [--discover] [--benchmarks=FILE]');
    process.exit(2);
}

const registry = benchmarkPath
    ? JSON.parse(fs.readFileSync(path.resolve(process.cwd(), benchmarkPath), 'utf8'))
    : null;
const result = runResearchQueryabilityAudit(process.cwd(), {
    discoverArtifacts,
    registry,
});
console.log(JSON.stringify(result, null, 2));
if (result.failed) process.exitCode = 1;
