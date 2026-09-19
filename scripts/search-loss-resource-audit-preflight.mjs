#!/usr/bin/env node
/**
 * Mechanical readiness check for promoting search-loss-evidence from catalogue/contract-only
 * into a Resource Contract audit. This is intentionally conservative: one valid canary capture
 * proves less than a recurring producer population.
 */
import fs from 'node:fs';
import path from 'node:path';

import { validateSearchLossCapture } from './solver-search-loss-evidence-lib.mjs';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--') && a.includes('=')).map(a => {
  const i = a.indexOf('=');
  return [a.slice(2, i), a.slice(i + 1)];
}));
const captureFile = args.get('capture');
if (!captureFile) throw new Error('--capture= is required');
const outFile = args.get('out') ?? null;
const recurringProducer = args.get('recurring-producer') === 'true';

const capture = validateSearchLossCapture(JSON.parse(fs.readFileSync(captureFile, 'utf8')));
const registry = JSON.parse(fs.readFileSync('docs/solver-research-data-assets.json', 'utf8'));
const asset = registry.assets.find(row => row.id === 'search-loss-evidence');
if (!asset) throw new Error('search-loss-evidence missing from resource registry');

const selectorEntries = Object.entries(capture.capture.selectorSummaries ?? {});
const populationOutcomes = capture.population?.parentOutcomes && typeof capture.population.parentOutcomes === 'object'
  ? Object.values(capture.population.parentOutcomes)
  : [];
const capsuleOutcomes = capture.capsules
  .map(row => row.context?.parentSolved)
  .filter(value => typeof value === 'boolean');
const parentSolvedValues = populationOutcomes.length ? populationOutcomes : capsuleOutcomes;
const checks = {
  registeredAsset: true,
  validCapture: true,
  observerParityVerified: capture.capture.observerParityVerified === true,
  multiParent: capture.population.parentCount >= 4,
  nonEmptyCapsules: capture.capsules.length > 0,
  selectorDenominatorsPresent: selectorEntries.length > 0
    && selectorEntries.every(([, summary]) => Number.isSafeInteger(summary.observed)
      && Number.isSafeInteger(summary.retained)
      && typeof summary.truncated === 'boolean'),
  immutableResolvedSha: /^[0-9a-f]{40}$/i.test(capture.run.resolvedSha ?? ''),
  nonSyntheticProducer: !/(fixture|synthetic|test)/i.test(capture.run.producer ?? ''),
  solvedControlObserved: parentSolvedValues.includes(true),
  failedParentObserved: parentSolvedValues.includes(false),
  recurringProducerDeclared: recurringProducer,
};
const captureGateClear = checks.validCapture
  && checks.observerParityVerified
  && checks.multiParent
  && checks.nonEmptyCapsules
  && checks.selectorDenominatorsPresent
  && checks.immutableResolvedSha
  && checks.nonSyntheticProducer;
const empiricalConditioningReady = captureGateClear
  && checks.solvedControlObserved
  && checks.failedParentObserved;
const auditReady = empiricalConditioningReady && checks.recurringProducerDeclared;

const result = {
  schemaVersion: 1,
  kind: 'pathfinder-search-loss-resource-audit-preflight',
  capture: captureFile,
  assetStatus: asset.status,
  checks,
  captureGateClear,
  empiricalConditioningReady,
  auditReady,
  remaining: Object.entries(checks).filter(([, value]) => value !== true).map(([key]) => key),
  note: auditReady
    ? 'Resource Contract audit prerequisites are mechanically satisfied; empirical audit still requires human interpretation of conditioning/dependence/missingness.'
    : 'Do not promote search-loss-evidence from contract-only solely from this capture. Clear the remaining gates first.',
};
if (outFile) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify(result, null, 2));
