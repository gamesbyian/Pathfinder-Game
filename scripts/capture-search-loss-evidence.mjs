#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { createSearchLossCollector, decisionObservationToSearchLossCapsule, searchLossCapsuleIdentity, validateSearchLossCapture } from './solver-search-loss-evidence-lib.mjs';
import { assertCanonicalResearchArtifactLocations, extractResearchArtifactEnvelope } from './research-artifact-envelope-lib.mjs';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
    const i = arg.indexOf('='); return [arg.slice(2, i), arg.slice(i + 1)];
}));
for (const key of ['in', 'metadata', 'out']) if (!args.get(key)) throw new Error(`--${key}= is required`);
const source = JSON.parse(fs.readFileSync(args.get('in'), 'utf8'));
const metadata = JSON.parse(fs.readFileSync(args.get('metadata'), 'utf8'));
const records = Array.isArray(source?.records) ? source.records : source;
if (!Array.isArray(records)) throw new Error('decision input must be an array or {records:[]}');
const limit = Number(args.get('selector-limit') ?? 20);
if (!Number.isSafeInteger(limit) || limit < 0) throw new Error('--selector-limit must be a non-negative integer');
for (const field of ['runId', 'solverRef', 'producer', 'protocolHash', 'configurationHash']) {
    if (metadata.run?.[field] == null) throw new Error(`metadata.run.${field} is required`);
}
const metadataEnvelope = extractResearchArtifactEnvelope(metadata);
if (!metadataEnvelope.populationIdentity || !metadata.population?.source) {
    throw new Error('metadata population identity/source are required');
}
const {
    populationIdentity: _legacyPopulationIdentity,
    researchBlock: _legacyResearchBlock,
    ...populationMetadata
} = metadata.population;

const selectorIds = ['score-width-cull', 'mechanic-bucket-cull', 'ints-bucket-cull'];
const collector = createSearchLossCollector({ captureProfileId: metadata.captureProfileId, selectorLimits: Object.fromEntries(selectorIds.map(id => [id, limit])) });
for (const observation of records) {
    const levelRevision = metadata.levelRevisions?.[observation.parentId];
    if (!levelRevision) throw new Error(`missing structural revision for parent ${observation.parentId}`);
    const capsule = decisionObservationToSearchLossCapsule(observation, {
        levelRevision, runId: metadata.run.runId, solverRef: metadata.run.solverRef,
        protocolHash: metadata.run.protocolHash, captureReason: 'near-cutoff-culled',
        disposition: 'culled', replayBasis: 'identity-only',
    });
    const retained = new Set(observation.retainedCandidateIds);
    const selected = observation.candidateIds.find(id => !retained.has(id));
    if (capsule && selected) {
        try {
            const path = JSON.parse(selected);
            if (Array.isArray(path) && path.every(Number.isSafeInteger)) {
                capsule.pathIdentity = selected;
                capsule.replayBasis = 'replayable';
                capsule.reconstructability = { kind: 'inline-exact-prefix', path };
                capsule.capsuleId = searchLossCapsuleIdentity(capsule);
            }
        } catch { /* Non-path candidate identity remains identity-only. */ }
    }
    if (capsule && typeof metadata.parentOutcomes?.[observation.parentId] === 'boolean') {
        capsule.context = { ...capsule.context, parentSolved: metadata.parentOutcomes[observation.parentId] };
    }
    if (capsule) collector.observe(capsule);
}
const snapshot = collector.snapshot();
const capture = validateSearchLossCapture({
    schemaVersion: 1,
    kind: 'pathfinder-search-loss-capture',
    researchEnrichmentKind: 'observation',
    run: { ...metadata.run, levelBlind: metadata.run.levelBlind },
    populationIdentity: metadataEnvelope.populationIdentity,
    ...(metadataEnvelope.researchBlock ? { researchBlock: metadataEnvelope.researchBlock } : {}),
    population: { ...populationMetadata, parentCount: new Set(records.map(row => row.parentId)).size },
    capture: { captureProfileId: metadata.captureProfileId, observerParityVerified: metadata.observerParityVerified === true, selectorSummaries: snapshot.selectorSummaries },
    capsules: snapshot.capsules.sort((a, b) => a.capsuleId.localeCompare(b.capsuleId)),
});
assertCanonicalResearchArtifactLocations(capture);
fs.mkdirSync(path.dirname(args.get('out')), { recursive: true });
fs.writeFileSync(args.get('out'), `${JSON.stringify(capture, null, 2)}\n`);
console.log(JSON.stringify({ parents: capture.population.parentCount, capsules: capture.capsules.length, selectors: capture.capture.selectorSummaries }));
