#!/usr/bin/env node
/** Keep official GitHub Actions on the maintained Node-24-generation majors.
 *
 * Project runtime Node versions are separate: setup-node may still install Node 20 for Pathfinder.
 * This check concerns the JavaScript runtime embedded inside the action wrapper itself.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const expected = new Map([
  ['actions/checkout', 'v7'],
  ['actions/setup-node', 'v7'],
  ['actions/setup-python', 'v7'],
  ['actions/upload-artifact', 'v7'],
  ['actions/download-artifact', 'v8'],
  ['actions/upload-pages-artifact', 'v5'],
  ['actions/deploy-pages', 'v5'],
]);

const root = process.cwd();
const workflowDir = path.join(root, '.github', 'workflows');
const failures = [];

for (const name of readdirSync(workflowDir).filter(name => /\.ya?ml$/i.test(name)).sort()) {
  const source = readFileSync(path.join(workflowDir, name), 'utf8');
  for (const match of source.matchAll(/uses:\s*(actions\/[A-Za-z0-9_-]+)@([^\s#]+)/g)) {
    const action = match[1];
    const required = expected.get(action);
    if (!required) continue;
    const actual = match[2].replace(/['"]/g, '');
    if (actual !== required) failures.push(`${name}: ${action}@${actual}; expected ${action}@${required}`);
  }
}

if (failures.length) {
  console.error('Outdated official GitHub Action wrapper(s):');
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error('Update the action major after reviewing that release\'s migration notes.');
  process.exit(1);
}
console.log('Official GitHub Action wrappers use the repository-approved Node-24-generation majors.');
