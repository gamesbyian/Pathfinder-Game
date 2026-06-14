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

const allowedRawAuditFiles = new Set([
  'audits/raw/2026-06-12T22-57-04Z-ca8febfb44f0.json',
  'audits/raw/latest.json',
]);

const trackedFiles = execFileSync('git', ['ls-files', '-z', 'audits/raw'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const unexpected = trackedFiles.filter(file => !allowedRawAuditFiles.has(file));

if (unexpected.length > 0) {
  console.error('Unexpected tracked raw audit artifact(s):');
  for (const file of unexpected) console.error(`  - ${file}`);
  console.error('\nUpdate audits/README.md and this allowlist only for intentionally curated fixtures; otherwise keep generated audits as CI/release artifacts.');
  process.exit(1);
}

console.log('Audit artifact policy check passed.');
