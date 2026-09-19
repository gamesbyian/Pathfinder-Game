#!/usr/bin/env node
/**
 * Shared workflow wrapper for the automatic compact failure-evidence path.
 *
 * It composes the standard failure-response summarizer with the standard sweep-result publisher so
 * large GHA workflows do not each repeat the same two-command plumbing. This is deliberately thin:
 * producer-native rows remain authoritative; this script only writes the compact summary then passes
 * all remaining arguments through to publish-solver-sweep-result.mjs with --failure-response-file.
 *
 * Usage:
 *   node scripts/publish-solver-sweep-with-failure-response.mjs \
 *     --failure-in=<file1>[,<file2>,...] \
 *     [--failure-rows-key=auto|levels|results] \
 *     [--failure-out=<path>] \
 *     --primary=<file> [publisher args...]
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const argv = process.argv.slice(2);
const valueOf = name => {
  const prefix = `--${name}=`;
  const hit = argv.find(arg => arg.startsWith(prefix));
  return hit == null ? null : hit.slice(prefix.length);
};

const failureIn = valueOf('failure-in');
if (!failureIn) {
  console.error('publish-solver-sweep-with-failure-response: --failure-in=<file1>[,<file2>,...] is required');
  process.exit(2);
}
const failureRowsKey = valueOf('failure-rows-key') || 'auto';
const failureOut = valueOf('failure-out') || 'logs/solver-sweep-result-inputs/failure-response-summary.json';

const passthrough = argv.filter(arg =>
  !arg.startsWith('--failure-in=')
  && !arg.startsWith('--failure-rows-key=')
  && !arg.startsWith('--failure-out='));

function run(script, args) {
  const result = spawnSync(process.execPath, [path.resolve('scripts', script), ...args], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('summarize-solver-failure-response.mjs', [
  `--in=${failureIn}`,
  `--rows-key=${failureRowsKey}`,
  `--out=${failureOut}`,
]);

run('publish-solver-sweep-result.mjs', [
  ...passthrough,
  `--failure-response-file=${failureOut}`,
]);
