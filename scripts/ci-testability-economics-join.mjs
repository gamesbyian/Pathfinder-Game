#!/usr/bin/env node
/**
 * Join the static CI testability topology with historical representative detector/runtime evidence.
 *
 * This intentionally keeps dimensions separate. It does not compute a single "value score":
 * low observed catch frequency can mean irrelevance, rarity, missing history, or a high-severity
 * dormant guard. The output exists to prioritize human/refactor investigation.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
  const out = {
    topology: 'tmp/ci-testability-topology.json',
    signatures: 'tmp/ci-history-source/failure-signatures.json',
    output: 'tmp/ci-testability-economics.json',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--topology') out.topology = argv[++i];
    else if (arg.startsWith('--topology=')) out.topology = arg.slice(11);
    else if (arg === '--signatures') out.signatures = argv[++i];
    else if (arg.startsWith('--signatures=')) out.signatures = arg.slice(13);
    else if (arg === '--output') out.output = argv[++i];
    else if (arg.startsWith('--output=')) out.output = arg.slice(9);
    else if (arg === '--help' || arg === '-h') {
      console.log('usage: node scripts/ci-testability-economics-join.mjs [--topology FILE] [--signatures FILE] [--output FILE]');
      process.exit(0);
    } else throw new Error(`unknown argument: ${arg}`);
  }
  return out;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function add(target, key, amount) {
  target[key] = (target[key] ?? 0) + amount;
}

const options = parseArgs(process.argv.slice(2));
const topology = readJson(options.topology);
const signatures = readJson(options.signatures);

const detectorHits = new Map(
  (signatures.detectorSummary ?? [])
    .filter(row => row.kind === 'check' || row.kind === 'test')
    .map(row => [row.name, row.representativeEpisodes]),
);
const timings = new Map(
  (signatures.commandTimingSummary ?? []).map(row => [row.name, row]),
);

const rows = topology.contracts.map(contract => {
  const timing = timings.get(contract.name) ?? null;
  const hits = detectorHits.get(contract.name) ?? 0;
  return {
    family: contract.family,
    group: contract.group,
    surfaces: contract.surfaces ?? [contract.group],
    name: contract.name,
    invocation: contract.invocation,
    entrypoint: contract.entrypoint,
    refactorCandidates: contract.refactorCandidates,
    features: contract.features,
    representativeDetectorEpisodes: hits,
    observedExecutions: timing?.observedExecutions ?? 0,
    observedTotalSeconds: timing?.observedTotalSeconds ?? 0,
    medianSeconds: timing?.medianSeconds ?? null,
    p90Seconds: timing?.p90Seconds ?? null,
    observedButNeverRepresentativeDetector: !!timing && hits === 0,
  };
});

const groupSummary = {};
for (const row of rows) {
  const key = `${row.family}:${row.group}`;
  if (!groupSummary[key]) {
    groupSummary[key] = {
      contracts: 0,
      contractsWithTiming: 0,
      observedExecutions: 0,
      observedTotalSeconds: 0,
      representativeDetectorAppearances: 0,
      distinctDetectorsWithHits: 0,
      observedZeroHitContracts: 0,
      refactorCandidateCounts: {},
    };
  }
  const group = groupSummary[key];
  group.contracts += 1;
  if (row.observedExecutions > 0) group.contractsWithTiming += 1;
  group.observedExecutions += row.observedExecutions;
  group.observedTotalSeconds += row.observedTotalSeconds;
  group.representativeDetectorAppearances += row.representativeDetectorEpisodes;
  if (row.representativeDetectorEpisodes > 0) group.distinctDetectorsWithHits += 1;
  if (row.observedButNeverRepresentativeDetector) group.observedZeroHitContracts += 1;
  for (const candidate of row.refactorCandidates ?? []) {
    add(group.refactorCandidateCounts, candidate, 1);
  }
}

const byCost = [...rows].sort((a, b) =>
  b.observedTotalSeconds - a.observedTotalSeconds ||
  b.observedExecutions - a.observedExecutions ||
  a.name.localeCompare(b.name));

const lowHitHighExposure = rows
  .filter(row => row.observedExecutions > 0 && row.representativeDetectorEpisodes <= 3)
  .sort((a, b) =>
    b.observedTotalSeconds - a.observedTotalSeconds ||
    b.observedExecutions - a.observedExecutions ||
    a.name.localeCompare(b.name));

function queue(candidate) {
  return rows
    .filter(row => row.refactorCandidates?.includes(candidate))
    .sort((a, b) =>
      b.observedTotalSeconds - a.observedTotalSeconds ||
      b.observedExecutions - a.observedExecutions ||
      a.name.localeCompare(b.name));
}

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  topologySource: options.topology,
  historicalSource: options.signatures,
  note: 'Observed runtime and representative detector history are prioritization evidence, not a delete/keep score. Missing/old logs and correlated failures limit causal interpretation.',
  historyCoverage: {
    episodesRequested: signatures.episodesRequested ?? null,
    episodesWithSignatures: signatures.episodesWithSignatures ?? null,
    retrievalGapCount: signatures.gaps?.length ?? 0,
  },
  groupSummary,
  queues: {
    highestObservedCost: byCost.slice(0, 50),
    lowHitHighExposure: lowHitHighExposure.slice(0, 100),
    directModuleBatchCandidates: queue('direct-module/batch-runner-candidate').slice(0, 100),
    cliSubprocessSeamCandidates: queue('cli/subprocess-seam-candidate').slice(0, 100),
    bundleSeamCandidates: queue('bundle-once/direct-library-seam-candidate').slice(0, 100),
    filesystemFixtureCandidates: queue('filesystem-fixture-candidate').slice(0, 100),
    repositoryDataFixtureCandidates: queue('repository-data-fixture-candidate').slice(0, 100),
    sharedOwnershipCandidates: queue('ownership-disambiguation-candidate'),
  },
  contracts: rows,
};

const outPath = path.resolve(options.output);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);

console.log(JSON.stringify({
  historyCoverage: output.historyCoverage,
  groupSummary: output.groupSummary,
  topLowHitHighExposure: output.queues.lowHitHighExposure.slice(0, 20).map(row => ({
    name: row.name,
    group: `${row.family}:${row.group}`,
    representativeDetectorEpisodes: row.representativeDetectorEpisodes,
    observedExecutions: row.observedExecutions,
    observedTotalSeconds: Number(row.observedTotalSeconds.toFixed(1)),
    medianSeconds: row.medianSeconds,
    refactorCandidates: row.refactorCandidates,
  })),
}, null, 2));
