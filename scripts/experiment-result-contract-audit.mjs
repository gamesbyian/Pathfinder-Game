#!/usr/bin/env node
import { auditExperimentResultDeclaredShape } from './experiment-result-contract-audit-lib.mjs';

const result = auditExperimentResultDeclaredShape(process.cwd());
console.log(JSON.stringify(result, null, 2));
if (result.mismatchCount || result.schemaCoverageIssueCount) process.exitCode = 1;
