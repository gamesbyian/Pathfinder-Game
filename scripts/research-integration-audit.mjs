#!/usr/bin/env node
import { auditResearchIntegration } from './research-integration-audit-lib.mjs';

const result = auditResearchIntegration(process.cwd());
console.log(JSON.stringify(result, null, 2));
if (result.errorCount) process.exitCode = 1;
