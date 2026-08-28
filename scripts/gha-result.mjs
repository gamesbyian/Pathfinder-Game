#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const opts = new Map();
for (const arg of args) {
  if (!arg.startsWith('--')) continue;
  const i = arg.indexOf('=');
  opts.set(i === -1 ? arg.slice(2) : arg.slice(2, i), i === -1 ? 'true' : arg.slice(i + 1));
}

function runGh(argv, { capture = true } = {}) {
  const result = spawnSync('gh', argv, {
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (result.error) {
    console.error('gha-result: failed to execute gh:', result.error.message);
    process.exit(2);
  }
  if (result.status !== 0) {
    if (capture) {
      if (result.stderr) process.stderr.write(result.stderr);
      if (result.stdout) process.stderr.write(result.stdout);
    }
    process.exit(result.status || 1);
  }
  return capture ? result.stdout.trim() : '';
}

let runId = opts.get('run');
const workflow = opts.get('workflow');
if (!runId && workflow) {
  const branch = opts.get('branch');
  const argv = ['run', 'list', '--workflow', workflow, '--limit', '1', '--json', 'databaseId,status,conclusion,headSha,displayTitle'];
  if (branch) argv.push('--branch', branch);
  const rows = JSON.parse(runGh(argv) || '[]');
  if (!rows.length) {
    console.error(`gha-result: no runs found for workflow ${workflow}${branch ? ` on branch ${branch}` : ''}`);
    process.exit(1);
  }
  runId = String(rows[0].databaseId);
}

if (!runId) {
  console.error('Usage: node scripts/gha-result.mjs --run=<run-id>');
  console.error('   or: node scripts/gha-result.mjs --workflow=<workflow-file-or-name> [--branch=<branch>]');
  process.exit(2);
}

const keepDir = opts.get('out');
const tempRoot = keepDir ? path.resolve(keepDir) : fs.mkdtempSync(path.join(os.tmpdir(), 'pathfinder-gha-result-'));
if (keepDir) {
  fs.rmSync(tempRoot, { recursive: true, force: true });
  fs.mkdirSync(tempRoot, { recursive: true });
}

try {
  runGh(['run', 'download', runId, '-n', 'solver-sweep-result', '-D', tempRoot], { capture: false });

  const summaryPath = path.join(tempRoot, 'summary.md');
  const manifestPath = path.join(tempRoot, 'manifest.json');
  if (!fs.existsSync(summaryPath) || !fs.existsSync(manifestPath)) {
    console.error('gha-result: solver-sweep-result is missing summary.md or manifest.json');
    process.exit(1);
  }

  process.stdout.write(fs.readFileSync(summaryPath, 'utf8'));
  if (opts.get('json') === 'true') {
    process.stdout.write('\n');
    process.stdout.write(fs.readFileSync(manifestPath, 'utf8'));
  }
  if (keepDir) {
    console.error(`gha-result: downloaded standard result to ${tempRoot}`);
  }
} finally {
  if (!keepDir) fs.rmSync(tempRoot, { recursive: true, force: true });
}
