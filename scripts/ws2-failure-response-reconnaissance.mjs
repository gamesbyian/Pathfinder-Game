#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

import { validateFailureResponseDocument } from './solver-failure-response-lib.mjs';
import {
  validateWs2FailureResponseAnalysisContract,
  ws2FailureResponseAnalysisContractIdentity,
  WS2_FAILURE_RESPONSE_ROUTES,
} from './ws2-failure-response-analysis-contract-lib.mjs';

const argv = process.argv.slice(2);
const value = name => argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? '';
const input = value('in');
const contractPath = value('analysis-contract');
const selectedRoute = value('route') || null;

if (!input || !contractPath) {
  throw new Error('--in=<doc1>[,<doc2>...] and --analysis-contract=<file> are required');
}
if (!existsSync(contractPath)) throw new Error(`missing analysis contract: ${contractPath}`);
const contract = validateWs2FailureResponseAnalysisContract(JSON.parse(readFileSync(contractPath, 'utf8')));
const contractIdentity = ws2FailureResponseAnalysisContractIdentity(contract);

const inputFiles = input.split(',').map(item => item.trim()).filter(Boolean);
if (!inputFiles.length) throw new Error('at least one compact failure-response input is required');
const documents = inputFiles.map(file => {
  if (!existsSync(file)) throw new Error(`missing compact failure-response input: ${file}`);
  return { file, document: validateFailureResponseDocument(JSON.parse(readFileSync(file, 'utf8'))) };
});

const query = spawnSync(process.execPath, ['scripts/failure-response-query.mjs', `--in=${input}`], {
  cwd: process.cwd(),
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});
if (query.status !== 0) throw new Error(`failure-response query failed: ${query.stderr || query.stdout}`);
const observation = JSON.parse(query.stdout);

const eligibilityReasons = [];
const protocolHashes = new Set();
const solverRefs = new Set();
for (const { file, document } of documents) {
  if (!document.populationIntegrity || typeof document.populationIntegrity !== 'object') {
    eligibilityReasons.push(`${file}: missing externally verified populationIntegrity`);
  } else if (document.populationIntegrity.coverageComplete !== true) {
    eligibilityReasons.push(`${file}: population coverage is not complete`);
  }
  if (typeof document.protocolHash === 'string' && document.protocolHash) protocolHashes.add(document.protocolHash);
  else eligibilityReasons.push(`${file}: unknown protocolHash`);
  if (typeof document.solverRef === 'string' && document.solverRef) solverRefs.add(document.solverRef);
  else eligibilityReasons.push(`${file}: unknown solverRef`);
}
if (protocolHashes.size > 1) eligibilityReasons.push('primary comparison mixes protocolHash values');
if (solverRefs.size > 1) eligibilityReasons.push('primary comparison mixes solverRef values');
if (observation.summary.protocolComparability.parentsWithUnknownProtocol > 0) {
  eligibilityReasons.push('one or more parents have unknown protocol identity');
}
if (observation.summary.protocolComparability.parentsWithMultipleKnownProtocols > 0) {
  eligibilityReasons.push('one or more parents span multiple known protocols');
}

const eligible = eligibilityReasons.length === 0;
if (selectedRoute && !WS2_FAILURE_RESPONSE_ROUTES.includes(selectedRoute)) {
  throw new Error(`--route must be one of ${WS2_FAILURE_RESPONSE_ROUTES.join(', ')}`);
}
if (selectedRoute && !eligible) {
  throw new Error(`cannot select WS2 route from scientifically ineligible evidence: ${eligibilityReasons.join('; ')}`);
}

const result = {
  schemaVersion: 1,
  kind: 'pathfinder-ws2-failure-response-reconnaissance-analysis',
  questionId: contract.questionId,
  analysisContract: {
    path: contractPath,
    identityHash: contractIdentity,
    evidenceRole: contract.evidenceRole,
    decisionPurpose: contract.decisionPurpose,
  },
  execution: {
    status: 'completed',
    implementation: contract.analysisImplementation,
    inputFiles,
  },
  scientificDisposition: {
    status: eligible ? 'eligible-for-prespecified-routing' : 'ineligible',
    reasons: eligibilityReasons,
    independentUnit: contract.independentUnit,
    unitTopology: contract.unitTopology,
    instrument: contract.instrument,
    currentApplicability: contract.currentApplicability,
    protocolHashes: [...protocolHashes].sort(),
    solverRefs: [...solverRefs].sort(),
    censoringPolicy: contract.censoringPolicy,
    solvedControlPolicy: contract.solvedControlPolicy,
  },
  observation,
  decision: {
    status: selectedRoute ? 'selected' : 'pending-interpretation',
    route: selectedRoute,
    allowedRoutes: contract.allowedRoutes,
    note: selectedRoute
      ? 'Route selection is a decision over the prespecified observation; it is not the observation itself.'
      : 'No route is inferred automatically. Interpret only under the frozen preflight and contract.',
  },
};

process.stdout.write(JSON.stringify(result, null, 2) + '\n');
