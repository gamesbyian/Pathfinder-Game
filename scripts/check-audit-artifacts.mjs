#!/usr/bin/env node
/**
 * Guards against routine generated raw audit output becoming source-history noise.
 *
 * This does not validate audit correctness; `check:audit-output` handles JSON/log
 * invariants. This check only enforces the repository policy for tracked raw
 * audit artifacts.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import process from 'node:process';

// Allow latest.json and any timestamped snapshot: YYYY-MM-DDTHH-MM-SSZ-<sha>.json
// Timestamped snapshots are committed by the audit-export workflow to maintain a
// rolling history for solver regression analysis.
const ALLOWED_NAMES = new Set(['latest.json']);
const TIMESTAMP_SNAPSHOT = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z-[0-9a-f]+\.json$/;

const trackedFiles = execFileSync('git', ['ls-files', '-z', 'logs/solver-workflow'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const unexpected = trackedFiles.filter(file => {
  const name = file.split('/').pop();
  return !ALLOWED_NAMES.has(name) && !TIMESTAMP_SNAPSHOT.test(name);
});

if (unexpected.length > 0) {
  console.error('Unexpected tracked raw audit artifact(s):');
  for (const file of unexpected) console.error(`  - ${file}`);
  console.error('\nOnly latest.json and timestamped snapshots (YYYY-MM-DDTHH-MM-SSZ-<sha>.json) may be committed to logs/solver-workflow/.');
  process.exit(1);
}

const metadata = JSON.parse(readFileSync('logs/artifact-metadata.json', 'utf8'));
const requiredFields = [
  'selector', 'role', 'canonicalInput', 'generator', 'artifactSchemaVersion',
  'sourceCommitOrRunId', 'consumers', 'regenerationCommand', 'supersededBy',
  'safeToDelete', 'safeToRegenerate',
];
const allTrackedLogs = execFileSync('git', ['ls-files', '-z', 'logs'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
const metadataFailures = [];
const allowedRoles = new Set([
  'current-pointer', 'historical-snapshot', 'historical-source-evidence',
  'compatibility-baseline', 'comparison-baseline', 'superseded-historical-snapshot',
  'superseded-run-archive',
]);
const matchedBy = new Map();
if (metadata.schemaVersion !== 1 || !Array.isArray(metadata.artifacts)) {
  metadataFailures.push('metadata must have schemaVersion 1 and an artifacts array');
} else {
  for (const [index, artifact] of metadata.artifacts.entries()) {
    for (const field of requiredFields) {
      if (!Object.hasOwn(artifact, field)) metadataFailures.push(`artifacts[${index}] missing ${field}`);
    }
    const { kind, value } = artifact.selector ?? {};
    if (!['exact', 'prefix'].includes(kind) || typeof value !== 'string' || !value.startsWith('logs/')) {
      metadataFailures.push(`artifacts[${index}] has an invalid selector`);
      continue;
    }
    const matches = allTrackedLogs.filter(file => kind === 'exact' ? file === value : file.startsWith(value));
    for (const file of matches) matchedBy.set(file, [...(matchedBy.get(file) ?? []), index]);
    if (matches.length === 0) metadataFailures.push(`artifacts[${index}] selector matches no tracked file: ${value}`);
    if (kind === 'exact' && matches.length !== 1) metadataFailures.push(`artifacts[${index}] exact selector is ambiguous: ${value}`);
    if (!allowedRoles.has(artifact.role)) metadataFailures.push(`artifacts[${index}] has unknown role: ${artifact.role}`);
    for (const field of ['generator', 'sourceCommitOrRunId']) {
      if (typeof artifact[field] !== 'string' || artifact[field].trim() === '') metadataFailures.push(`artifacts[${index}] ${field} must be a non-empty string`);
    }
    if (artifact.artifactSchemaVersion !== null && !Number.isInteger(artifact.artifactSchemaVersion)) {
      metadataFailures.push(`artifacts[${index}] artifactSchemaVersion must be an integer or null`);
    }
    if (typeof artifact.canonicalInput !== 'boolean' || typeof artifact.safeToDelete !== 'boolean' || typeof artifact.safeToRegenerate !== 'boolean') {
      metadataFailures.push(`artifacts[${index}] status flags must be boolean`);
    }
    if (!Array.isArray(artifact.consumers) || artifact.consumers.length === 0) {
      metadataFailures.push(`artifacts[${index}] must name at least one consumer`);
    }
    if (artifact.safeToRegenerate && !artifact.regenerationCommand) {
      metadataFailures.push(`artifacts[${index}] is safeToRegenerate but has no regenerationCommand`);
    }
  }
  for (const [file, indexes] of matchedBy) {
    if (indexes.length > 1) metadataFailures.push(`${file} has overlapping metadata selectors: ${indexes.join(', ')}`);
  }
}
if (metadataFailures.length > 0) {
  console.error('Invalid logs/artifact-metadata.json:');
  for (const failure of metadataFailures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`Artifact metadata check passed (${metadata.artifacts.length} tracked exception classes).`);

console.log('Audit artifact policy check passed.');
