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
 *
 * If population-seal.json sits beside --out, its sha256 identity is adopted as
 * population.corpusIdentity (or checked against an explicit value). This lets planners seal exact
 * level content once without repeating file-plumbing in every workflow YAML.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { hashConfiguration, isImmutableCommitSha } from './solver-experiment-contract.mjs';

const SHA256_RE = /^sha256:[0-9a-f]{64}$/iu;

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

function inferredPairedArms(configuration) {
  const control = configuration?.baselineRef ?? configuration?.controlRef ?? null;
  const treatment = configuration?.treatmentRef ?? null;
  if (control == null && treatment == null) return null;
  if (!isImmutableCommitSha(control) || !isImmutableCommitSha(treatment)) {
    throw new Error('paired experiment baseline/control and treatment refs must be immutable 40-character commit SHAs');
  }
  return {
    control: { requestedRef: control, resolvedSha: control },
    treatment: { requestedRef: treatment, resolvedSha: treatment },
  };
}

function populationWithSeal(population, populationSeal) {
  if (!populationSeal) return population;
  const identityHash = populationSeal?.identityHash;
  if (!SHA256_RE.test(String(identityHash ?? ''))) throw new Error('population seal identityHash must be sha256:<64 hex>');
  if (population?.corpusIdentity && population.corpusIdentity !== identityHash) {
    throw new Error(`declared population.corpusIdentity disagrees with population seal: ${population.corpusIdentity} vs ${identityHash}`);
  }
  return { ...(population ?? {}), corpusIdentity: identityHash };
}

export function buildContract(spec, { resolvedSha = null, populationSeal = null } = {}) {
  const { configuration, workflowFamily, producer, entrypoint, experiment = {}, population, execution, limits, sideEffects } = spec;
  const inferredArms = experiment.arms ?? inferredPairedArms(configuration);
  const executionIdentity = inferredArms != null
    ? { arms: inferredArms }
    : (experiment.resolvedSha == null && resolvedSha ? { resolvedSha } : {});
  return {
    experiment: {
      ...experiment,
      ...executionIdentity,
      workflowFamily,
      producer,
      entrypoint,
      configurationHash: hashConfiguration(configuration ?? {}),
    },
    population: populationWithSeal(population, populationSeal), execution, limits, sideEffects,
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
  const sealFile = path.join(path.dirname(out), 'population-seal.json');
  const populationSeal = fs.existsSync(sealFile) ? JSON.parse(fs.readFileSync(sealFile, 'utf8')) : null;
  const contract = buildContract(spec, { resolvedSha: currentHeadSha(), populationSeal });
  fs.writeFileSync(out, `${JSON.stringify(contract, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  try { main(); } catch (error) { console.error(`write-solver-experiment-contract: ${error.message}`); process.exit(2); }
}