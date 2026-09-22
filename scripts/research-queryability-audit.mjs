#!/usr/bin/env node
import process from 'node:process';

import { runResearchQueryabilityAudit } from './research-queryability-audit-lib.mjs';

const args = new Set(process.argv.slice(2));
const result = runResearchQueryabilityAudit(process.cwd(), {
    discoverArtifacts: args.has('--discover'),
});
console.log(JSON.stringify(result, null, 2));
if (result.failed) process.exitCode = 1;
