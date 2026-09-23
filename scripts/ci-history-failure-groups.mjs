#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
  const out = {
    signatures: 'tmp/ci-audit/failure-signatures.json',
    registry: 'scripts/validation-groups.json',
    output: 'tmp/ci-audit/failure-signature-groups.json',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--signatures') out.signatures = argv[++i];
    else if (arg.startsWith('--signatures=')) out.signatures = arg.slice(13);
    else if (arg === '--registry') out.registry = argv[++i];
    else if (arg.startsWith('--registry=')) out.registry = arg.slice(11);
    else if (arg === '--output') out.output = argv[++i];
    else if (arg.startsWith('--output=')) out.output = arg.slice(9);
    else if (arg === '--help' || arg === '-h') {
      console.log('usage: node scripts/ci-history-failure-groups.mjs [--signatures file] [--registry file] [--output file]');
      process.exit(0);
    } else throw new Error(`unknown argument: ${arg}`);
  }
  return out;
}

function buildMembership(registry) {
  const map = new Map();
  for (const [family, groups] of [['validator', registry.validators ?? {}], ['test', registry.nodeTests ?? {}]]) {
    for (const [group, commands] of Object.entries(groups)) {
      for (const command of commands) {
        if (map.has(command)) throw new Error(`duplicate validation registry membership for ${command}`);
        map.set(command, { family, group });
      }
    }
  }
  return map;
}

const options = parseArgs(process.argv.slice(2));
const signatures = JSON.parse(fs.readFileSync(options.signatures, 'utf8'));
const registry = JSON.parse(fs.readFileSync(options.registry, 'utf8'));
const membership = buildMembership(registry);

const groupSummary = new Map();
const detectorRows = [];
const unclassified = [];

for (const detector of signatures.detectorSummary ?? []) {
  const member = membership.get(detector.name) ?? null;
  const row = {
    ...detector,
    registryFamily: member?.family ?? null,
    validationGroup: member?.group ?? null,
  };
  detectorRows.push(row);
  if (!member) {
    unclassified.push(row);
    continue;
  }
  const key = `${member.family}:${member.group}`;
  if (!groupSummary.has(key)) {
    groupSummary.set(key, {
      registryFamily: member.family,
      validationGroup: member.group,
      representativeDetectorHits: 0,
      detectorCount: 0,
      detectors: [],
    });
  }
  const group = groupSummary.get(key);
  group.representativeDetectorHits += detector.representativeEpisodes;
  group.detectorCount += 1;
  group.detectors.push({
    name: detector.name,
    representativeEpisodes: detector.representativeEpisodes,
  });
}

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  note: 'Representative detector hits are first-failure-episode evidence, not unique-catch counts. Multiple detectors in one episode can share a root cause.',
  episodesRequested: signatures.episodesRequested ?? null,
  episodesWithSignatures: signatures.episodesWithSignatures ?? null,
  retrievalGapCount: signatures.gaps?.length ?? 0,
  groupSummary: [...groupSummary.values()].sort((a, b) =>
    b.representativeDetectorHits - a.representativeDetectorHits ||
    a.validationGroup.localeCompare(b.validationGroup)),
  detectors: detectorRows,
  unclassified,
};

fs.mkdirSync(path.dirname(options.output), { recursive: true });
fs.writeFileSync(options.output, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({
  episodesRequested: output.episodesRequested,
  episodesWithSignatures: output.episodesWithSignatures,
  retrievalGapCount: output.retrievalGapCount,
  groupSummary: output.groupSummary,
  unclassified: output.unclassified,
}, null, 2));
