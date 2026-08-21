#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

const TROVE_BRANCH = 'claude/variant-levels-solver-insights-tpk4qg';
const args = new Map(process.argv.slice(2).filter((arg) => arg.startsWith('--')).map((arg) => {
  const [key, ...value] = arg.split('=');
  return [key, value.join('=')];
}));
const json = args.has('--json');
const root = resolve(args.get('--root') || process.env.PATHFINDER_VARIANT_TROVE || '../pathfinder-variant-research');

function git(cwd, ...argv) {
  try {
    return execFileSync('git', ['-C', cwd, ...argv], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

const currentRoot = process.cwd();
const currentBranch = git(currentRoot, 'branch', '--show-current');
const currentCommit = git(currentRoot, 'rev-parse', 'HEAD');
const troveBranch = git(root, 'branch', '--show-current');
const troveCommit = git(root, 'rev-parse', 'HEAD');
const required = ['data/families', 'logs/family-census', 'reports/families'];
const missing = required.filter((path) => !existsSync(resolve(root, path)));
const noticePath = resolve(root, 'AGENTS.md');
const hasHistoricalNotice = existsSync(noticePath)
  && readFileSync(noticePath, 'utf8').includes('historical data branch');

const problems = [];
if (currentBranch === TROVE_BRANCH) problems.push('current working checkout is the historical trove branch; use current main code instead');
if (!troveCommit) problems.push(`trove root is not a Git worktree: ${root}`);
if (missing.length) problems.push(`trove root is missing: ${missing.join(', ')}`);
if (troveBranch && troveBranch !== TROVE_BRANCH) problems.push(`trove worktree is on ${troveBranch}, expected ${TROVE_BRANCH}`);
if (!hasHistoricalNotice) problems.push('trove root lacks the current historical-branch AGENTS.md sentinel; fetch/update the trove branch before relying on branch-local guidance');

const report = {
  ok: problems.length === 0,
  current: { root: currentRoot, branch: currentBranch, commit: currentCommit },
  trove: { root, branch: troveBranch, commit: troveCommit },
  requiredPaths: required,
  missingPaths: missing,
  problems,
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Current code: ${currentBranch || '(detached)'} @ ${currentCommit || 'unknown'}`);
  console.log(`Trove data:   ${troveBranch || '(detached/unavailable)'} @ ${troveCommit || 'unknown'}`);
  console.log(`Trove root:   ${root}`);
  if (problems.length) {
    for (const problem of problems) console.error(`ERROR: ${problem}`);
  } else {
    console.log('Variant trove boundary looks safe: current code is separate from historical data.');
  }
}

process.exitCode = problems.length ? 1 : 0;
