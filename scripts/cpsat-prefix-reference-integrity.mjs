#!/usr/bin/env node
/**
 * Exact population integrity for cpsat-explicit-prefix-reference.yml's case-shaped results.
 * combine-cpsat-explicit-prefix-reference-shards.mjs's rows use referenceLabel (live/dead/
 * timeout-abstain) and correctnessAlarm/inputAlarm, not the solver-sweep ok/status vocabulary that
 * solver-experiment-contract.mjs's buildPopulationIntegrity/classifyRow assume -- normalizing this
 * family through that generic classifier would silently misclassify every row as 'unknown'. This is
 * a small dedicated adapter instead of flattening the domain-specific statuses (see
 * docs/solver-workflow-remediation-review-handoff.md).
 *
 * 'live'/'dead' are decisive reference verdicts; 'timeout/abstain' is indeterminate (no verdict
 * reached); a correctness/input alarm means the reference check itself found a problem, which must
 * also block decision-bearing publication regardless of the case's own label.
 */
import fs from 'node:fs';
import path from 'node:path';
import { canonicalizeIdentities, hashPopulation } from './solver-experiment-contract.mjs';

export function buildCaseIntegrity(expectedIds, rows) {
  const expected = canonicalizeIdentities(expectedIds).identities;
  const actualRaw = (rows ?? []).map(row => row?.caseId).filter(id => id != null).map(String);
  const actual = canonicalizeIdentities(actualRaw, { rejectDuplicates: false });
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual.identities);
  const missingIds = expected.filter(id => !actualSet.has(id));
  const unexpectedIds = actual.identities.filter(id => !expectedSet.has(id));
  const outcomes = { live: 0, dead: 0, timeoutAbstain: 0, correctnessAlarm: 0, inputAlarm: 0, malformed: 0 };
  for (const row of rows ?? []) {
    if (row?.caseId == null) { outcomes.malformed += 1; continue; }
    if (row.referenceLabel === 'live') outcomes.live += 1;
    else if (row.referenceLabel === 'dead') outcomes.dead += 1;
    else outcomes.timeoutAbstain += 1;
    if (row.correctnessAlarm) outcomes.correctnessAlarm += 1;
    if (row.inputAlarm) outcomes.inputAlarm += 1;
  }
  const coverageComplete = missingIds.length === 0 && unexpectedIds.length === 0
    && actual.duplicates.length === 0 && outcomes.malformed === 0;
  const decisionValidComplete = coverageComplete
    && outcomes.timeoutAbstain === 0 && outcomes.correctnessAlarm === 0 && outcomes.inputAlarm === 0;
  const population = hashPopulation({ kind: 'explicit-cpsat-prefix-cases', identityBasis: 'stable-case-id', identities: expected });
  return {
    expectedCount: expected.length,
    observedCount: (rows ?? []).length,
    duplicateIds: actual.duplicates,
    unexpectedIds,
    missingIds,
    coverageComplete,
    decisionValidComplete,
    complete: coverageComplete,
    outcomes,
    populationIdentityHash: population.identityHash,
  };
}

function parseArgs(argv) {
  return new Map(argv.filter(a => a.startsWith('--')).map(a => {
    const eq = a.indexOf('=');
    return eq === -1 ? [a.slice(2), 'true'] : [a.slice(2, eq), a.slice(eq + 1)];
  }));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const expectedFile = args.get('expected-ids');
  const resultFile = args.get('result');
  const out = args.get('out');
  if (!expectedFile || !resultFile || !out) {
    console.error('Usage: cpsat-prefix-reference-integrity.mjs --expected-ids=<file> --result=<combined.json> --out=<file>');
    process.exit(2);
  }
  const expectedIds = fs.readFileSync(expectedFile, 'utf8').split(/[\s,]+/).map(x => x.trim()).filter(Boolean);
  const result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
  const integrity = buildCaseIntegrity(expectedIds, result.rows);
  fs.writeFileSync(out, `${JSON.stringify(integrity, null, 2)}\n`);
  console.log(`Case population coverage: ${integrity.observedCount}/${integrity.expectedCount} (coverageComplete=${integrity.coverageComplete}; decisionValidComplete=${integrity.decisionValidComplete}).`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  main();
}
