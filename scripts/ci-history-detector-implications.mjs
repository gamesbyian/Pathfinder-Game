#!/usr/bin/env node
/**
 * Derive observational detector implication/co-failure evidence from the historical CI
 * failure-signature corpus.
 *
 * This deliberately does not produce a delete/keep score. A => B means only that every
 * recoverable representative episode containing A also contained B in the sampled corpus.
 * Correlated defects, detector lineage changes, missing logs, and first-failure selection can
 * all create apparent implication without semantic redundancy.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

function parseArgs(argv) {
  const out = {
    signatures: 'tmp/ci-audit/failure-signatures.json',
    registry: 'scripts/validation-groups.json',
    output: 'tmp/ci-audit/detector-implications.json',
    minEpisodes: 3,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--signatures') out.signatures = argv[++i];
    else if (arg.startsWith('--signatures=')) out.signatures = arg.slice(13);
    else if (arg === '--registry') out.registry = argv[++i];
    else if (arg.startsWith('--registry=')) out.registry = arg.slice(11);
    else if (arg === '--output') out.output = argv[++i];
    else if (arg.startsWith('--output=')) out.output = arg.slice(9);
    else if (arg === '--min-episodes') out.minEpisodes = Number(argv[++i]);
    else if (arg.startsWith('--min-episodes=')) out.minEpisodes = Number(arg.slice(15));
    else if (arg === '--help' || arg === '-h') {
      console.log('usage: node scripts/ci-history-detector-implications.mjs [--signatures FILE] [--registry FILE] [--output FILE] [--min-episodes N]');
      process.exit(0);
    } else throw new Error(`unknown argument: ${arg}`);
  }
  if (!Number.isSafeInteger(out.minEpisodes) || out.minEpisodes < 1) {
    throw new Error('--min-episodes must be a positive integer');
  }
  return out;
}

function membership(registry) {
  const map = new Map();
  for (const [family, groups] of [['validator', registry.validators ?? {}], ['test', registry.nodeTests ?? {}]]) {
    for (const [group, commands] of Object.entries(groups)) {
      for (const command of commands) map.set(command, { family, group });
    }
  }
  return map;
}

function key(detector) {
  return `${detector.kind}:${detector.name}`;
}

function registeredName(detector, memberMap) {
  return memberMap.has(detector.name);
}

export function analyzeDetectorImplications(signatures, registry, { minEpisodes = 3 } = {}) {
  const memberMap = membership(registry);
  const timingByName = new Map((signatures.commandTimingSummary ?? []).map(row => [row.name, row]));

  const episodeSets = new Map();
  const detectorMeta = new Map();
  const episodes = signatures.episodes ?? [];

  for (const episode of episodes) {
    const current = new Map();
    for (const detector of episode.detectors ?? []) {
      if (!registeredName(detector, memberMap)) continue;
      current.set(key(detector), detector);
    }
    for (const [detectorKey, detector] of current) {
      if (!episodeSets.has(detectorKey)) episodeSets.set(detectorKey, new Set());
      episodeSets.get(detectorKey).add(episode.episodeId);
      detectorMeta.set(detectorKey, detector);
    }
  }

  const detectorRows = [...episodeSets.entries()].map(([detectorKey, set]) => {
    const detector = detectorMeta.get(detectorKey);
    const member = memberMap.get(detector.name);
    const timing = timingByName.get(detector.name) ?? null;
    return {
      key: detectorKey,
      kind: detector.kind,
      name: detector.name,
      registryFamily: member.family,
      validationGroup: member.group,
      representativeEpisodes: set.size,
      observedExecutions: timing?.observedExecutions ?? null,
      observedTotalSeconds: timing?.observedTotalSeconds ?? null,
      medianSeconds: timing?.medianSeconds ?? null,
      p90Seconds: timing?.p90Seconds ?? null,
    };
  }).sort((a, b) => b.representativeEpisodes - a.representativeEpisodes || a.name.localeCompare(b.name));

  const pairRows = [];
  const keys = [...episodeSets.keys()].sort();
  for (let i = 0; i < keys.length; i += 1) {
    for (let j = i + 1; j < keys.length; j += 1) {
      const aKey = keys[i];
      const bKey = keys[j];
      const aSet = episodeSets.get(aKey);
      const bSet = episodeSets.get(bKey);
      let coEpisodes = 0;
      for (const id of aSet) if (bSet.has(id)) coEpisodes += 1;
      if (coEpisodes === 0) continue;

      const a = detectorMeta.get(aKey);
      const b = detectorMeta.get(bKey);
      const aMember = memberMap.get(a.name);
      const bMember = memberMap.get(b.name);
      const aOnly = aSet.size - coEpisodes;
      const bOnly = bSet.size - coEpisodes;
      pairRows.push({
        a: { key: aKey, name: a.name, registryFamily: aMember.family, validationGroup: aMember.group },
        b: { key: bKey, name: b.name, registryFamily: bMember.family, validationGroup: bMember.group },
        aEpisodes: aSet.size,
        bEpisodes: bSet.size,
        coEpisodes,
        aOnlyEpisodes: aOnly,
        bOnlyEpisodes: bOnly,
        pBGivenA: coEpisodes / aSet.size,
        pAGivenB: coEpisodes / bSet.size,
        observedAImpliesB: aSet.size >= minEpisodes && aOnly === 0,
        observedBImpliesA: bSet.size >= minEpisodes && bOnly === 0,
        observedExactCoFailure:
          aSet.size >= minEpisodes
          && bSet.size >= minEpisodes
          && aOnly === 0
          && bOnly === 0,
      });
    }
  }

  const implicationCandidates = [];
  const exactCoFailureCandidates = [];
  for (const row of pairRows) {
    if (row.observedExactCoFailure) {
      exactCoFailureCandidates.push(row);
      continue;
    }
    if (row.observedAImpliesB) {
      implicationCandidates.push({
        antecedent: row.a,
        consequent: row.b,
        antecedentEpisodes: row.aEpisodes,
        consequentEpisodes: row.bEpisodes,
        coEpisodes: row.coEpisodes,
        antecedentOnlyEpisodes: row.aOnlyEpisodes,
        consequentOnlyEpisodes: row.bOnlyEpisodes,
      });
    }
    if (row.observedBImpliesA) {
      implicationCandidates.push({
        antecedent: row.b,
        consequent: row.a,
        antecedentEpisodes: row.bEpisodes,
        consequentEpisodes: row.aEpisodes,
        coEpisodes: row.coEpisodes,
        antecedentOnlyEpisodes: row.bOnlyEpisodes,
        consequentOnlyEpisodes: row.aOnlyEpisodes,
      });
    }
  }

  const uniqueEpisodeCounts = new Map([...episodeSets.keys()].map(k => [k, 0]));
  for (const episode of episodes) {
    const current = [...new Set((episode.detectors ?? [])
      .filter(detector => registeredName(detector, memberMap))
      .map(key))];
    if (current.length === 1) uniqueEpisodeCounts.set(current[0], (uniqueEpisodeCounts.get(current[0]) ?? 0) + 1);
  }

  const noUniqueEpisodeDetectors = detectorRows
    .filter(row => row.representativeEpisodes >= minEpisodes && (uniqueEpisodeCounts.get(row.key) ?? 0) === 0)
    .map(row => ({ ...row, uniqueRepresentativeEpisodes: 0 }));

  implicationCandidates.sort((a, b) =>
    b.antecedentEpisodes - a.antecedentEpisodes
    || b.consequentOnlyEpisodes - a.consequentOnlyEpisodes
    || a.antecedent.name.localeCompare(b.antecedent.name));
  exactCoFailureCandidates.sort((a, b) =>
    b.coEpisodes - a.coEpisodes || a.a.name.localeCompare(b.a.name));
  pairRows.sort((a, b) =>
    b.coEpisodes - a.coEpisodes
    || Math.max(b.pBGivenA, b.pAGivenB) - Math.max(a.pBGivenA, a.pAGivenB)
    || a.a.name.localeCompare(b.a.name));

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceSignatures: signatures.sourceEpisodes ?? null,
    representativePolicy: signatures.representativePolicy ?? null,
    episodesRequested: signatures.episodesRequested ?? null,
    episodesWithSignatures: signatures.episodesWithSignatures ?? null,
    retrievalGapCount: signatures.gaps?.length ?? 0,
    minEpisodes,
    note:
      'Observed implication is historical co-failure evidence only. It does not prove semantic redundancy or justify deletion without source-level contract comparison, fault injection, and cadence/backstop analysis.',
    detectors: detectorRows.map(row => ({
      ...row,
      uniqueRepresentativeEpisodes: uniqueEpisodeCounts.get(row.key) ?? 0,
    })),
    pairRows,
    implicationCandidates,
    exactCoFailureCandidates,
    noUniqueEpisodeDetectors,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const options = parseArgs(process.argv.slice(2));
  const signatures = JSON.parse(fs.readFileSync(options.signatures, 'utf8'));
  const registry = JSON.parse(fs.readFileSync(options.registry, 'utf8'));
  const output = analyzeDetectorImplications(signatures, registry, { minEpisodes: options.minEpisodes });
  
  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, `${JSON.stringify(output, null, 2)}\n`);
  
  console.log(JSON.stringify({
    episodesRequested: output.episodesRequested,
    episodesWithSignatures: output.episodesWithSignatures,
    retrievalGapCount: output.retrievalGapCount,
    currentDetectorsObserved: output.detectors.length,
    implicationCandidates: output.implicationCandidates.slice(0, 20),
    exactCoFailureCandidates: output.exactCoFailureCandidates.slice(0, 20),
    noUniqueEpisodeDetectors: output.noUniqueEpisodeDetectors.slice(0, 20),
  }, null, 2));
  
}
