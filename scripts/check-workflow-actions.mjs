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

  // Workflow shell steps are a live consumer surface. A renamed/deleted local script must not
  // survive here merely because package.json and unit tests never execute that workflow.
  for (const match of source.matchAll(/\b(?:node|tsx)\s+((?:\.\/)?scripts\/[A-Za-z0-9_./-]+\.(?:mjs|js|cjs|ts|tsx))/g)) {
    const scriptPath = match[1].replace(/^\.\//, '');
    if (!existsSync(path.join(root, scriptPath))) {
      failures.push(`${name}: references missing local script ${scriptPath}`);
    }
  }

  if (source.includes('repair-probe-badness-report.mjs')) {
    failures.push(`${name}: references deleted repair-probe-badness-report.mjs`);
  }
  if (source.includes('Solver archetype-gated routing sample A/B')) {
    failures.push(`${name}: watches stale pre-rename workflow display name`);
  }
}

// These removed Phase 1-7 APIs caused runtime failures in scripts that ordinary CI did not invoke.
// Scan live executable code, while leaving frozen reports/docs and explicit compatibility readers alone.
const removedConsumerPatterns = [
  ['removed Solver.solve alias', /\bSolver\.solve\s*\(/],
  ['removed POLICY_PROFILES export', /\bPOLICY_PROFILES\b/],
  ['removed TEMPLATES export', /\bTEMPLATES\b/],
  ['removed detectArchetype API', /\bdetectArchetype\b/],
  ['removed attractionDiversity result field', /\.attractionDiversity\b/],
];

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

for (const base of ['scripts', 'modules']) {
  for (const full of walk(path.join(root, base))) {
    if (!/\.(?:[cm]?js|mjs|ts|tsx)$/.test(full)) continue;
    if (full.endsWith(path.join('scripts', 'check-workflow-actions.mjs'))) continue;
    const source = readFileSync(full, 'utf8');
    const relative = path.relative(root, full).split(path.sep).join('/');
    for (const [label, pattern] of removedConsumerPatterns) {
      if (pattern.test(source)) failures.push(`${relative}: ${label}`);
    }
  }
}

if (failures.length) {
  console.error('Workflow/action and naming-consumer validation failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('Workflow actions, local workflow entrypoints, and Phase 1-7 live consumers are valid.');
