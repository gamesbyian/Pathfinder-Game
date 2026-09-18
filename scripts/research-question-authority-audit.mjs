#!/usr/bin/env node
import { auditResearchQuestionAuthorities } from './research-question-authority-audit-lib.mjs';

const summary = auditResearchQuestionAuthorities(process.cwd());
console.log(JSON.stringify(summary, null, 2));
if (summary.errorCount) process.exitCode = 1;
