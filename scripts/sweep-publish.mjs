#!/usr/bin/env node
/**
 * Automatic compact-failure-response + standard sweep-result publisher.
 * Publisher args pass through unchanged. Unless --failure-in= is supplied, failure rows are read
 * from --primary plus JSON --include files, which matches the normal combined-result workflows.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const argv = process.argv.slice(2);
const allValues = name => {
  const prefix = `--${name}=`;
  return argv.filter(arg => arg.startsWith(prefix)).map(arg => arg.slice(prefix.length));
};
const value = name => allValues(name)[0] ?? null;
const primary = value('primary');
const inferred = [primary, ...allValues('include').filter(file => file.endsWith('.json'))].filter(Boolean);
const failureIn = value('failure-in') || inferred.join(',');
const failureRowsKey = value('failure-rows-key') || 'auto';
const failureOut = value('failure-out') || 'logs/solver-sweep-result-inputs/failure-response-summary.json';
if (!failureIn) {
  console.error('sweep-publish: --primary=<file> or --failure-in=<files> is required');
  process.exit(2);
}
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
run('publish-solver-sweep-result.mjs', [...passthrough, `--failure-response-file=${failureOut}`]);
