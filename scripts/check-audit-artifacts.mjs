#!/usr/bin/env node
/**
 * Guards against routine generated raw audit output becoming source-history noise.
 *
 * This does not validate audit correctness; `check:audit-output` handles JSON/log
 * invariants. This check only enforces the repository policy for tracked raw
 * audit artifacts.
 */
import { execFileSync } from 'node:child_process';
import process from 'node:process';

// Allow latest.json and any timestamped snapshot: YYYY-MM-DDTHH-MM-SSZ-<sha>.json
// Timestamped snapshots are committed by the audit-export workflow to maintain a
// rolling history for solver regression analysis.
const ALLOWED_NAMES = new Set(['latest.json']);
const TIMESTAMP_SNAPSHOT = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z-[0-9a-f]+\.json$/;

const trackedFiles = execFileSync('git', ['ls-files', '-z', 'audits/raw'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const unexpected = trackedFiles.filter(file => {
  const name = file.split('/').pop();
  return !ALLOWED_NAMES.has(name) && !TIMESTAMP_SNAPSHOT.test(name);
});

if (unexpected.length > 0) {
  console.error('Unexpected tracked raw audit artifact(s):');
  for (const file of unexpected) console.error(`  - ${file}`);
  console.error('\nOnly latest.json and timestamped snapshots (YYYY-MM-DDTHH-MM-SSZ-<sha>.json) may be committed to audits/raw/.');
  process.exit(1);
}

console.log('Audit artifact policy check passed.');
