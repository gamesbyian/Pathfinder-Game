#!/usr/bin/env node
/** Keep official GitHub Actions on maintained majors and reject stale workflow/script consumers. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const expected = new Map([
  ['actions/checkout', 'v7'],
  ['actions/cache', 'v5'],
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

  // Literal workflow path filters are live consumers of repository paths. On the Linux runner,
  // stale case or a renamed file can silently stop a workflow from triggering.
  for (const block of source.matchAll(/^\s*paths:\s*\n((?:\s+-\s+[^\n]+\n?)+)/gmu)) {
    for (const item of block[1].matchAll(/^\s*-\s+['"]?([^'"#\n]+?)['"]?\s*$/gmu)) {
      const filterPath = item[1].trim();
      if (!filterPath.includes('/') || /[*?\[\]{}$!]/u.test(filterPath)) continue;
      if (!existsSync(path.join(root, filterPath))) {
        failures.push(`${name}: paths filter references missing or wrong-case repository path ${filterPath}`);
      }
    }
  }

  // Workflow shell steps are a live consumer surface. A renamed/deleted local script must not
  // survive here merely because package.json and unit tests never execute that workflow.
  for (const match of source.matchAll(/\b(?:node|tsx)\s+((?:\.\/)?scripts\/[A-Za-z0-9_./-]+\.(?:mjs|js|cjs|ts|tsx))/g)) {
    const scriptPath = match[1].replace(/^\.\//, '');
    if (!existsSync(path.join(root, scriptPath))) {
      failures.push(`${name}: references missing local script ${scriptPath}`);
    }
  }
}

if (failures.length) {
  console.error('Workflow/action validation failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('Workflow actions, literal path filters, and local workflow entrypoints are valid.');
