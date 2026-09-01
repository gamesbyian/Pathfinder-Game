#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

const VARIANT_FAMILY_DATASET_BRANCH = 'claude/variant-levels-solver-insights-tpk4qg';
const args = new Map(process.argv.slice(2).filter((arg) => arg.startsWith('--')).map((arg) => {
  const [key, ...value] = arg.split('=');
  return [key, value.join('=')];
}));
const json = args.has('--json');
// Phase 15 retired the former PATHFINDER_VARIANT_TROVE transition input after the final review.
// Keep the external root contract canonical-only: explicit --root, then the canonical environment
// variable, then the historical-worktree default.
const root = resolve(
  args.get('--root')
  || process.env.PATHFINDER_VARIANT_FAMILY_DATASET_ROOT
  || '../pathfinder-variant-research',
);

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
const datasetBranch = git(root, 'branch', '--show-current');
const datasetCommit = git(root, 'rev-parse', 'HEAD');
const required = ['data/families', 'logs/family-census', 'reports/families'];
const missing = required.filter((path) => !existsSync(resolve(root, path)));
const noticePath = resolve(root, 'AGENTS.md');
const hasHistoricalNotice = existsSync(noticePath)
  && readFileSync(noticePath, 'utf8').includes('historical data branch');

const problems = [];
if (currentBranch === VARIANT_FAMILY_DATASET_BRANCH) problems.push('current working checkout is the historical variant-family dataset branch; use current main code instead');
if (!datasetCommit) problems.push(`variant-family dataset root is not a Git worktree: ${root}`);
if (missing.length) problems.push(`variant-family dataset root is missing: ${missing.join(', ')}`);
if (datasetBranch && datasetBranch !== VARIANT_FAMILY_DATASET_BRANCH) problems.push(`variant-family dataset worktree is on ${datasetBranch}, expected ${VARIANT_FAMILY_DATASET_BRANCH}`);
if (!hasHistoricalNotice) problems.push('variant-family dataset root lacks the current historical-branch AGENTS.md sentinel; fetch/update the dataset branch before relying on branch-local guidance');

const report = {
  ok: problems.length === 0,
  current: { root: currentRoot, branch: currentBranch, commit: currentCommit },
  dataset: { root, branch: datasetBranch, commit: datasetCommit },
  requiredPaths: required,
  missingPaths: missing,
  problems,
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Current code:            ${currentBranch || '(detached)'} @ ${currentCommit || 'unknown'}`);
  console.log(`Variant-family dataset:  ${datasetBranch || '(detached/unavailable)'} @ ${datasetCommit || 'unknown'}`);
  console.log(`Dataset root:            ${root}`);
  if (problems.length) {
    for (const problem of problems) console.error(`ERROR: ${problem}`);
  } else {
    console.log('Variant-family dataset boundary looks safe: current code is separate from historical data.');
  }
}

process.exitCode = problems.length ? 1 : 0;
