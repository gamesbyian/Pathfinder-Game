#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const checker = path.join(here, 'check-workflow-actions.mjs');

function run(workflow) {
  const root = mkdtempSync(path.join(tmpdir(), 'pathfinder-workflow-check-'));
  try {
    mkdirSync(path.join(root, '.github', 'workflows'), { recursive: true });
    writeFileSync(path.join(root, '.github', 'workflows', 'fixture.yml'), workflow);
    return spawnSync(process.execPath, [checker], { cwd: root, encoding: 'utf8' });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function expectFailure(workflow, pattern) {
  const result = run(workflow);
  assert.notEqual(result.status, 0, `fixture unexpectedly passed:\n${workflow}`);
  assert.match(result.stderr, pattern);
}

const good = `name: good
on:
  workflow_dispatch:
jobs:
  x:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/download-artifact@v8
      - run: echo scripts/write-solver-experiment-contract.mjs --contract-file=logs/experiment-contract.json
`;
assert.equal(run(good).status, 0, 'valid checkout/artifact/contract-owner order should pass');

expectFailure(`name: bad-order
on:
  workflow_dispatch:
jobs:
  x:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v8
      - uses: actions/checkout@v7
`, /downloads an artifact before a later checkout/);

expectFailure(`name: bad-yaml-quote
on:
  workflow_dispatch:
    inputs:
      x:
        description: 'run\\'s value'
        default: ''
jobs:
  x:
    runs-on: ubuntu-latest
    steps:
      - run: echo "\${{ inputs.x }}"
`, /backslash-escaped apostrophe/);

expectFailure(`name: bad-manual-contract
on:
  workflow_dispatch:
jobs:
  x:
    runs-on: ubuntu-latest
    steps:
      - run: node -e "require('fs').writeFileSync('logs/experiment-contract.json','{}')"
`, /writes experiment-contract\.json directly/);

expectFailure(`name: bad-missing-owner
on:
  workflow_dispatch:
jobs:
  x:
    runs-on: ubuntu-latest
    steps:
      - run: echo --contract-file=logs/experiment-contract.json
`, /without a recognized contract constructor/);

console.log('workflow action guard fixture tests passed');
