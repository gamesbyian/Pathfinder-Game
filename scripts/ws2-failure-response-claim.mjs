#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

import { buildWs2FailureResponseClaimCapsule } from './ws2-failure-response-claim-lib.mjs';

const args = process.argv.slice(2);
const value = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? '';
const analysisPath = value('analysis');
const outPath = value('out');
if (!analysisPath || !outPath) throw new Error('--analysis=<file> and --out=<file> are required');
if (!existsSync(analysisPath)) throw new Error(`missing analysis file: ${analysisPath}`);

const analysis = JSON.parse(readFileSync(analysisPath, 'utf8'));
const capsule = buildWs2FailureResponseClaimCapsule(analysis);
writeFileSync(outPath, JSON.stringify(capsule, null, 2) + '\n');
process.stdout.write(JSON.stringify({
  out: outPath,
  questionId: capsule.questionId,
  analysisIdentity: capsule.analysisIdentity,
  claimIdentity: capsule.claimIdentity,
  route: capsule.decisionDisposition.route,
}, null, 2) + '\n');
