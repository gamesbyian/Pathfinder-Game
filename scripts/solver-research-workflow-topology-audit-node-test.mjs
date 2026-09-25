import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = mkdtempSync(path.join(os.tmpdir(), 'solver-research-workflow-topology-'));
const workflowsDir = path.join(root, '.github', 'workflows');
mkdirSync(workflowsDir, { recursive: true });

function writeWorkflow(name, nodeVersion) {
  writeFileSync(path.join(workflowsDir, name), `name: ${name}
jobs:
  job:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: '${nodeVersion}'
      - run: npm ci
`);
}

writeWorkflow('solver-exact-modern.yml', '22.23.2');
writeWorkflow('harvest-solver-evidence.yml', '22.23.2');
writeWorkflow('solver-diagnostics.yml', '20.20.2');
writeWorkflow('solver-legacy-major.yml', '20');

try {
  const script = path.resolve('scripts/solver-research-workflow-topology-audit.mjs');
  const result = spawnSync(process.execPath, [
    script,
    '--root', root,
    '--output', 'tmp/topology.json',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const audit = JSON.parse(readFileSync(path.join(root, 'tmp', 'topology.json'), 'utf8'));
  assert.equal(audit.schemaVersion, 4);
  assert.equal(audit.summary.workflowCount, 4);
  assert.equal(audit.summary.setupNodeSites, 4);
  assert.equal(audit.summary.exactNode22232Sites, 2);
  assert.equal(audit.summary.exactNode20202Sites, 1);
  assert.equal(audit.summary.floatingMajorOnlyNodeSites, 1);
  assert.deepEqual(audit.summary.exactNode22232Workflows, [
    'harvest-solver-evidence.yml',
    'solver-exact-modern.yml',
  ]);
  assert.deepEqual(audit.summary.exactNode20202Workflows, ['solver-diagnostics.yml']);
  assert.deepEqual(audit.summary.floatingMajorOnlyWorkflows, ['solver-legacy-major.yml']);

  const diagnostics = audit.workflows.find(row => row.name === 'solver-diagnostics.yml');
  assert.equal(diagnostics.exactNode20202Sites, 1);
  assert.equal(diagnostics.exactNode22232Sites, 0);
  assert.equal(diagnostics.floatingMajorOnlyNodeSites, 0);

  const modernJob = audit.jobs.find(row => row.workflow === 'solver-exact-modern.yml');
  assert.equal(modernJob.exactNode22232Sites, 1);
  assert.equal(modernJob.exactNode20202Sites, 0);
  assert.equal(modernJob.floatingMajorOnlyNodeSites, 0);
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log('solver research workflow topology audit tests passed');
