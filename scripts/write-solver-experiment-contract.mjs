#!/usr/bin/env node
/**
 * Shared native v3 experiment-contract writer. Every migrated workflow's contract shape is
 * static except for a small runtime configuration object used only to compute
 * experiment.configurationHash. Factoring the hashConfiguration/JSON.stringify/fs.writeFileSync
 * glue out here (instead of repeating it as an inline Node heredoc in each workflow) keeps
 * per-workflow YAML additions small -- see scripts/check-file-size-ratchet.mjs.
 *
 * Usage: node scripts/write-solver-experiment-contract.mjs --spec=<file> --out=<file>
 * --spec must be a JSON file shaped:
 *   {
 *     "configuration": { ... arbitrary, hashed for experiment.configurationHash ... },
 *     "workflowFamily": "...", "producer": "...", "entrypoint": "...",
 *     "experiment": { ... optional provenance, refs, or paired arms ... },
 *     "population": { ... }, "execution": { ... }, "limits": { ... }, "sideEffects": { ... }
 *   }
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { hashConfiguration, isImmutableCommitSha } from './solver-experiment-contract.mjs';

function parseArgs(argv) {
  return new Map(argv.filter(a => a.startsWith('--')).map(a => {
    const eq = a.indexOf('=');
    return eq === -1 ? [a.slice(2), 'true'] : [a.slice(2, eq), a.slice(eq + 1)];
  }));
}

function currentHeadSha() {
  try {
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    return isImmutableCommitSha(sha) ? sha : null;
  } catch {
    return null;
  }
}

export function buildContract(spec, { resolvedSha = null } = {}) {
  const { configuration, workflowFamily, producer, entrypoint, experiment = {}, population, execution, limits, sideEffects } = spec;
  const executionIdentity = experiment.arms == null && experiment.resolvedSha == null && resolvedSha
    ? { resolvedSha }
    : {};
  return {
    experiment: {
      ...experiment,
      ...executionIdentity,
      workflowFamily,
      producer,
      entrypoint,
      configurationHash: hashConfiguration(configuration ?? {}),
    },
    population, execution, limits, sideEffects,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const specFile = args.get('spec');
  const out = args.get('out');
  if (!specFile || !out) {
    console.error('Usage: write-solver-experiment-contract.mjs --spec=<file> --out=<file>');
    process.exit(2);
  }
  const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  const contract = buildContract(spec, { resolvedSha: currentHeadSha() });
  fs.writeFileSync(out, `${JSON.stringify(contract, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  main();
}
