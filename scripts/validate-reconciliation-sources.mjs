#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { assertCompatibleExperiments, decisionContractIssues, declaredDecisionContractIssues, stableHash } from './solver-experiment-contract.mjs';

function sourceContract(manifest, runId) {
  const resolvedSha = manifest?.experiment?.resolvedSha ?? null;
  const configurationHash = manifest?.experiment?.configurationHash ?? null;
  if (!resolvedSha) throw new Error(`source run ${runId} has no declared experiment resolved SHA`);
  if (!configurationHash) throw new Error(`source run ${runId} has no declared experiment configuration hash`);

  const contract = {
    experiment: {
      workflowFamily: manifest?.experiment?.workflowFamily ?? null,
      producer: manifest?.experiment?.producer ?? null,
      entrypoint: manifest?.experiment?.entrypoint ?? null,
      resolvedSha,
      configurationHash,
    },
    population: {
      kind: manifest?.population?.kind ?? null,
      identityBasis: manifest?.population?.identityBasis ?? null,
      corpusIdentity: manifest?.population?.corpusIdentity ?? null,
      identityHash: manifest?.population?.identityHash ?? manifest?.populationIdentityHash ?? null,
    },
    execution: {
      levelBlind: manifest?.execution?.levelBlind ?? null,
      historyAware: manifest?.execution?.historyAware ?? null,
      historicalInputs: manifest?.execution?.historicalInputs ?? null,
      reproducibilityExpected: manifest?.execution?.reproducibilityExpected ?? null,
      producerFamily: manifest?.execution?.producerFamily ?? null,
      schedulerMode: manifest?.execution?.schedulerMode ?? null,
    },
    limits: {
      cumulativeNodeCeiling: manifest?.limits?.cumulativeNodeCeiling,
      initialWorkAllocation: manifest?.limits?.initialWorkAllocation,
      totalWorkCeiling: manifest?.limits?.totalWorkCeiling,
      wallSafetyDeadlineMs: manifest?.limits?.wallSafetyDeadlineMs,
      wallDeadlineBinding: manifest?.limits?.wallDeadlineBinding,
    },
    sideEffects: manifest?.sideEffects ?? null,
  };

  const issues = decisionContractIssues(contract).filter(issue => issue !== 'population.identityHash');
  if (issues.length) throw new Error(`source run ${runId} has incomplete experiment protocol: ${issues.join(', ')}`);
  return contract;
}

export function validateReconciliationSources(sources) {
  if (!sources.length) throw new Error('no source manifests supplied');
  const normalized = sources.map(({ runId, manifest }) => {
    const contract = sourceContract(manifest, runId);
    return {
      runId: String(runId),
      runAttempt: manifest?.experiment?.workflowRunAttempt ?? manifest?.runAttempt ?? null,
      resolvedSha: contract.experiment.resolvedSha,
      configurationHash: contract.experiment.configurationHash,
      populationIdentityHash: contract.population.identityHash,
      contract,
    };
  });
  const runIds = normalized.map(source => source.runId);
  if (new Set(runIds).size !== runIds.length) {
    throw new Error('source run IDs must be unique for reconciliation');
  }

  const reference = normalized[0].contract;
  for (const source of normalized.slice(1)) {
    if (source.contract.experiment.resolvedSha !== reference.experiment.resolvedSha) {
      throw new Error(
        `source run ${source.runId} resolved SHA ${source.contract.experiment.resolvedSha} differs from `
        + `source run ${normalized[0].runId} resolved SHA ${reference.experiment.resolvedSha}; `
        + 'a recombine-only result cannot claim one preserved experiment identity across different solver revisions',
      );
    }
    try {
      assertCompatibleExperiments(reference, source.contract);
    } catch (error) {
      throw new Error(`source run ${source.runId} is not protocol-compatible with source run ${normalized[0].runId}: ${error.message}`);
    }
  }

  const sourcesForProvenance = normalized
    .map(({ contract: _contract, ...source }) => source)
    .sort((left, right) => left.runId.localeCompare(right.runId));
  const sourceExperiment = {
    workflowFamily: reference.experiment.workflowFamily,
    producer: reference.experiment.producer,
    entrypoint: reference.experiment.entrypoint,
  };
  const population = {
    kind: reference.population.kind,
    identityBasis: reference.population.identityBasis,
    corpusIdentity: reference.population.corpusIdentity,
  };
  const protocol = {
    sourceExperiment,
    resolvedSha: reference.experiment.resolvedSha,
    configurationHash: reference.experiment.configurationHash,
    population,
    execution: reference.execution,
    limits: reference.limits,
  };
  return {
    sources: sourcesForProvenance,
    resolvedSha: reference.experiment.resolvedSha,
    configurationHash: reference.experiment.configurationHash,
    sourceExperiment,
    population,
    execution: reference.execution,
    limits: reference.limits,
    protocolHash: stableHash(protocol),
    sourceSetHash: stableHash(sourcesForProvenance),
  };
}


export function buildReconciliationContract(provenance, {
  runId = null,
  runAttempt = null,
  reconciliationSha = null,
} = {}) {
  const sourceRuns = (provenance?.sources ?? []).map(source => String(source?.runId ?? '').trim()).filter(Boolean);
  const contract = {
    experiment: {
      ...(provenance?.sourceExperiment ?? {}),
      resolvedSha: provenance?.resolvedSha ?? null,
      configurationHash: provenance?.configurationHash ?? null,
      sourceRuns,
      sourceProtocolHash: provenance?.protocolHash ?? null,
      reconciliationRun: {
        kind: 'recombine-only',
        preservesExperimentIdentity: true,
        acquisitionRecomputed: false,
        sourceRuns,
        runId,
        runAttempt,
        resolvedSha: reconciliationSha,
        producer: 'solver-combine-sweep-runs.yml',
        entrypoint: 'scripts/combine-solver-sweep-reports.mjs',
      },
    },
    population: {
      kind: 'explicit-reconciled-population',
      identityBasis: provenance?.population?.identityBasis ?? null,
      corpusIdentity: provenance?.population?.corpusIdentity ?? null,
    },
    execution: provenance?.execution ?? null,
    limits: provenance?.limits ?? null,
    sideEffects: { hints: 'none', canonicalBaseline: 'none', telemetry: 'compact', reports: 'artifact-only' },
  };
  const issues = declaredDecisionContractIssues(contract);
  if (issues.length) throw new Error(`invalid reconciliation experiment contract: ${issues.join(', ')}`);
  return contract;
}

function main() {
  const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('='))
    .map(arg => { const [key, ...rest] = arg.slice(2).split('='); return [key, rest.join('=')]; }));
  const root = args.get('sources-dir'); const out = args.get('out'); const contractOut = args.get('contract-out') || null;
  if (!root || !out) throw new Error('--sources-dir=<dir> and --out=<file> are required');
  const sources = fs.readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => {
    const manifestPath = path.join(root, entry.name, 'manifest.json');
    if (!fs.existsSync(manifestPath)) throw new Error(`source run ${entry.name} has no manifest.json`);
    return { runId: entry.name, manifest: JSON.parse(fs.readFileSync(manifestPath, 'utf8')) };
  });
  const result = validateReconciliationSources(sources);
  fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
  if (contractOut) {
    const contract = buildReconciliationContract(result, {
      runId: process.env.GITHUB_RUN_ID ?? null,
      runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
      reconciliationSha: process.env.GITHUB_SHA ?? null,
    });
    fs.mkdirSync(path.dirname(contractOut), { recursive: true });
    fs.writeFileSync(contractOut, `${JSON.stringify(contract, null, 2)}\n`);
  }
  console.log(`Validated ${sources.length} compatible source run manifests (${result.sourceSetHash}; protocol ${result.protocolHash}).`);
}

if (process.argv[1] && import.meta.url === `file://${path.resolve(process.argv[1])}`) {
  try { main(); } catch (error) { console.error(`validate-reconciliation-sources: ${error.message}`); process.exit(2); }
}