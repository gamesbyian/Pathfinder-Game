#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { decisionBearingExperimentResultIssues } from './solver-experiment-contract.mjs';
import { DURABLE_EVIDENCE_BUNDLE_SCHEMA_VERSION } from './durable-evidence-bundle-lib.mjs';

const args = process.argv.slice(2);
const values = new Map();
for (const arg of args) {
  if (!arg.startsWith('--')) continue;
  const eq = arg.indexOf('=');
  values.set(eq === -1 ? arg.slice(2) : arg.slice(2, eq), eq === -1 ? 'true' : arg.slice(eq + 1));
}

function safeSegment(value, fallback) {
  const result = String(value ?? '')
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '');
  return result || fallback;
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function sha256(bytes) {
  return `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
}

function walk(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  const visit = current => {
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(current).sort()) visit(path.join(current, name));
    } else {
      files.push(current);
    }
  };
  visit(root);
  return files;
}

function directoryBytesEqual(leftRoot, rightRoot) {
  const relativeFiles = root => walk(root)
    .map(file => path.relative(root, file).replaceAll('\\', '/'))
    .sort();
  const leftFiles = relativeFiles(leftRoot);
  const rightFiles = relativeFiles(rightRoot);
  if (JSON.stringify(leftFiles) !== JSON.stringify(rightFiles)) return false;
  return leftFiles.every(relative =>
    fs.readFileSync(path.join(leftRoot, relative)).equals(fs.readFileSync(path.join(rightRoot, relative))));
}

function levelBearingJsonFiles(root) {
  return walk(root).filter(file => {
    if (!file.endsWith('.json') || path.basename(file) === 'manifest.json') return false;
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      return Array.isArray(parsed?.levels);
    } catch {
      return false;
    }
  });
}

function entryByteBindingIssues(manifest, artifactRoot) {
  const issues = [];
  for (const entry of manifest?.entries ?? []) {
    if (entry?.missing || !entry?.published || entry?.sha256 == null) continue;
    const target = path.resolve(artifactRoot, entry.published);
    if (!isInside(artifactRoot, target) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
      issues.push(`entry ${entry.published} cannot satisfy declared sha256 binding`);
      continue;
    }
    if (sha256(fs.readFileSync(target)) !== entry.sha256) {
      issues.push(`entry ${entry.published} bytes no longer match manifest sha256`);
    }
  }
  return issues;
}

function exactOutcomeBindingIssues(manifest, artifactRoot) {
  const binding = manifest?.researchOutcome?.binding;
  if (!Array.isArray(binding?.resultContentHashes)) return [];
  const observed = levelBearingJsonFiles(artifactRoot)
    .map(file => sha256(fs.readFileSync(file)))
    .sort();
  const expected = [...binding.resultContentHashes].map(String).sort();
  return JSON.stringify(observed) === JSON.stringify(expected)
    ? []
    : ['researchOutcome.binding.resultContentHashes no longer match the artifact result bytes'];
}

function simplePopulationBindingIssues(manifest, artifactRoot) {
  const integrity = manifest?.populationIntegrity ?? manifest?.coverage?.populationIntegrity ?? null;
  if (!Array.isArray(integrity?.expectedIds) || integrity?.components || integrity?.arms) return [];
  const primaryEntry = (manifest?.entries ?? []).find(entry => entry?.role === 'primary' && !entry?.missing && entry?.published);
  if (!primaryEntry) return ['simple population integrity has no retained primary entry to revalidate'];
  const primaryPath = path.resolve(artifactRoot, primaryEntry.published);
  if (!isInside(artifactRoot, primaryPath) || !fs.existsSync(primaryPath) || fs.statSync(primaryPath).isDirectory()) {
    return [];
  }
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(primaryPath, 'utf8')); } catch { return []; }
  if (!Array.isArray(parsed?.levels)) return [];
  const actual = parsed.levels.map(row => row?.id ?? row?.levelId ?? row?.level ?? null);
  if (actual.some(value => value == null)) return ['simple primary result contains a row without identity'];
  const actualStrings = actual.map(String);
  if (new Set(actualStrings).size !== actualStrings.length) return ['simple primary result contains duplicate row identities'];
  const expected = integrity.expectedIds.map(String);
  if (new Set(expected).size !== expected.length) return ['populationIntegrity.expectedIds contains duplicate identities'];
  return JSON.stringify([...actualStrings].sort()) === JSON.stringify([...expected].sort())
    ? []
    : ['simple primary result rows no longer match populationIntegrity.expectedIds'];
}

function isInsideDurableEvidenceBundle(manifestFile) {
  const bundlePath = path.join(path.dirname(manifestFile), 'bundle.json');
  if (!fs.existsSync(bundlePath)) return false;
  try {
    const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
    return bundle?.kind === 'pathfinder-durable-experiment-evidence-bundle';
  } catch {
    return false;
  }
}

function findDecisionBearingManifests(root) {
  return walk(root)
    .filter(file => path.basename(file) === 'manifest.json')
    .filter(file => !isInsideDurableEvidenceBundle(file))
    .map(file => {
      try {
        return { file, manifest: JSON.parse(fs.readFileSync(file, 'utf8')) };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter(({ manifest }) => manifest?.kind === 'pathfinder-solver-experiment-result' && manifest?.schemaVersion === 3 && manifest?.decisionBearing === true);
}

function copyEvidenceFile(source, artifactRoot, destinationRoot, logicalRelative, files, compressAboveBytes, { allowCompression = true } = {}) {
  const resolved = path.resolve(source);
  if (!isInside(artifactRoot, resolved)) throw new Error(`evidence path escapes artifact root: ${source}`);
  if (!fs.existsSync(resolved)) throw new Error(`decision-bearing evidence file is missing: ${source}`);
  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) {
    for (const child of walk(resolved)) {
      const nested = path.join(logicalRelative, path.relative(resolved, child));
      copyEvidenceFile(child, artifactRoot, destinationRoot, nested, files, compressAboveBytes, { allowCompression });
    }
    return;
  }

  const bytes = fs.readFileSync(resolved);
  const relative = logicalRelative.replaceAll('\\', '/');
  const shouldCompress = allowCompression && bytes.length > compressAboveBytes;
  const storedRelative = shouldCompress ? `${relative}.gz` : relative;
  const destination = path.resolve(destinationRoot, storedRelative);
  if (!isInside(destinationRoot, destination)) throw new Error(`retained evidence path escapes destination root: ${storedRelative}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (shouldCompress) fs.writeFileSync(destination, zlib.gzipSync(bytes, { level: 9, mtime: 0 }));
  else fs.writeFileSync(destination, bytes);
  files.push({
    source: path.relative(artifactRoot, resolved).replaceAll('\\', '/'),
    stored: storedRelative,
    bytes: bytes.length,
    sha256: sha256(bytes),
    compression: shouldCompress ? 'gzip' : 'none',
  });
}

export function persistDecisionBearingExperimentEvidence({ stagingDir, outRoot, compressAboveBytes = 4 * 1024 * 1024 }) {
  const staging = path.resolve(stagingDir);
  const output = path.resolve(outRoot);
  fs.mkdirSync(output, { recursive: true });
  const retained = [];

  for (const { file: manifestFile, manifest } of findDecisionBearingManifests(staging)) {
    const eligibilityIssues = decisionBearingExperimentResultIssues(manifest);
    if (eligibilityIssues.length > 0) {
      throw new Error(
        `refusing to persist manifest that claims decisionBearing=true but fails shared eligibility: ${path.relative(staging, manifestFile)}: ${eligibilityIssues.join(', ')}`,
      );
    }
    const artifactRoot = path.dirname(manifestFile);
    const entryBindingIssues = entryByteBindingIssues(manifest, artifactRoot);
    const byteBindingIssues = exactOutcomeBindingIssues(manifest, artifactRoot);
    const populationBindingIssues = simplePopulationBindingIssues(manifest, artifactRoot);
    const retainedBindingIssues = [...entryBindingIssues, ...byteBindingIssues, ...populationBindingIssues];
    if (retainedBindingIssues.length > 0) {
      throw new Error(
        `refusing to persist decision-bearing artifact whose retained scientific binding is stale: ${path.relative(staging, manifestFile)}: ${retainedBindingIssues.join(', ')}`,
      );
    }
    const experimentId = safeSegment(manifest?.experiment?.experimentId, 'experiment');
    const runId = safeSegment(manifest?.experiment?.workflowRunId ?? manifest?.runId, 'unknown-run');
    const runAttempt = safeSegment(manifest?.experiment?.workflowRunAttempt ?? manifest?.runAttempt, '1');
    const destinationRoot = path.join(output, `${experimentId}__run-${runId}__attempt-${runAttempt}`);
    const candidateRoot = fs.mkdtempSync(path.join(output, '.incoming-'));
    const files = [];
    copyEvidenceFile(manifestFile, artifactRoot, candidateRoot, 'manifest.json', files, compressAboveBytes, { allowCompression: false });
    for (const entry of manifest.entries || []) {
      if (entry?.missing || !entry?.published) continue;
      const source = path.resolve(artifactRoot, entry.published);
      const role = safeSegment(entry.role, 'entry');
      const logical = path.join('evidence', role, entry.published);
      copyEvidenceFile(source, artifactRoot, candidateRoot, logical, files, compressAboveBytes);
    }

    const bundle = {
      schemaVersion: DURABLE_EVIDENCE_BUNDLE_SCHEMA_VERSION,
      kind: 'pathfinder-durable-experiment-evidence-bundle',
      experimentId: manifest?.experiment?.experimentId ?? null,
      workflowFamily: manifest?.experiment?.workflowFamily ?? null,
      workflowRunId: manifest?.experiment?.workflowRunId ?? manifest?.runId ?? null,
      workflowRunAttempt: manifest?.experiment?.workflowRunAttempt ?? manifest?.runAttempt ?? null,
      resolvedSha: manifest?.experiment?.resolvedSha ?? null,
      configurationHash: manifest?.experiment?.configurationHash ?? null,
      populationIdentityHash: manifest?.population?.identityHash ?? manifest?.populationIdentityHash ?? null,
      researchQuestion: manifest?.researchQuestion ?? null,
      researchBlock: manifest?.population?.researchBlock ? {
        blockId: manifest.population.researchBlock.blockId ?? null,
        questionId: manifest.population.researchBlock.questionId ?? null,
        evidenceRole: manifest.population.researchBlock.evidenceRole ?? null,
        independentUnit: manifest.population.researchBlock.independentUnit ?? null,
      } : null,
      researchOutcome: manifest?.researchOutcome ?? null,
      sourceArtifact: manifest?.sourceArtifact ?? null,
      runUrl: manifest?.runUrl ?? null,
      decisionBearing: true,
      manifestStoredPath: files.find(file => file.source === 'manifest.json')?.stored ?? null,
      files,
    };
    fs.writeFileSync(path.join(candidateRoot, 'bundle.json'), `${JSON.stringify(bundle, null, 2)}\n`);
    if (fs.existsSync(destinationRoot)) {
      const identical = directoryBytesEqual(destinationRoot, candidateRoot);
      fs.rmSync(candidateRoot, { recursive: true, force: true });
      if (!identical) {
        throw new Error(
          `durable evidence identity collision for ${path.basename(destinationRoot)}: immutable source run/attempt bytes differ from the retained bundle`,
        );
      }
      retained.push({
        experimentId: bundle.experimentId, workflowRunId: bundle.workflowRunId,
        path: destinationRoot, files: files.length, disposition: 'unchanged',
      });
      continue;
    }
    fs.renameSync(candidateRoot, destinationRoot);
    retained.push({
      experimentId: bundle.experimentId, workflowRunId: bundle.workflowRunId,
      path: destinationRoot, files: files.length, disposition: 'created',
    });
  }
  return retained;
}

function selfTest() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'persist-experiment-evidence-'));
  try {
    const staging = path.join(temp, 'staging');
    const artifact = path.join(staging, 'decision-artifact');
    const ignored = path.join(staging, 'ordinary-benchmark');
    const output = path.join(temp, 'retained');
    fs.mkdirSync(artifact, { recursive: true });
    fs.mkdirSync(ignored, { recursive: true });
    const primary = Buffer.from(JSON.stringify({ levels: [{ id: 'A', ok: true, workSpent: 12 }] }));
    fs.writeFileSync(path.join(artifact, 'result.json'), primary);
    const compact = Buffer.from(JSON.stringify({ schemaVersion: 1, kind: 'pathfinder-compact-failure-response', records: [] }));
    fs.mkdirSync(path.join(artifact, 'failure-response'));
    fs.writeFileSync(path.join(artifact, 'failure-response', 'compact.json'), compact);
    const manifest = {
      schemaVersion: 3,
      kind: 'pathfinder-solver-experiment-result',
      status: 'published',
      decisionContractIssues: [],
      decisionBearing: true,
      runId: '123',
      runAttempt: '2',
      experiment: {
        experimentId: 'fixture/experiment', workflowFamily: 'fixture', producer: 'fixture.yml',
        entrypoint: 'fixture.mjs', workflowRunId: '123', workflowRunAttempt: '2',
        resolvedSha: 'a'.repeat(40), configurationHash: `sha256:${'b'.repeat(64)}`,
      },
      populationIdentityHash: `sha256:${'c'.repeat(64)}`,
      populationIntegrity: {
        complete: true, coverageComplete: true, decisionValidComplete: true,
        inferredExpectedPopulation: false, populationIdentityHash: `sha256:${'c'.repeat(64)}`,
        expectedIds: ['A'],
        expectedCount: 1,
        observedCount: 1,
        outcomes: { deadlineTruncated: 0, harnessError: 0, malformed: 0, missing: 0, unknown: 0 },
      },
      population: {
        kind: 'explicit-ids', identityBasis: 'stable-level-id',
        identityHash: `sha256:${'c'.repeat(64)}`, independentUnit: 'parent-level',
        researchBlock: {
          blockId: 'BLOCK-001', questionId: 'WS2-D1-PRODUCTION-INERT-OBSERVATION',
          evidenceRole: 'development', independentUnit: 'parent-level',
        },
      },
      researchQuestion: {
        questionId: 'WS2-D1-PRODUCTION-INERT-OBSERVATION',
        liveAmbiguity: 'rank disagreement versus no decision opportunity',
        discriminatingObservable: 'production-inert cutoff disagreement',
        outcomeInterpretation: { disagreement: 'economics gate earned' },
        measurementOpportunity: 'MO-002',
      },
      execution: {
        levelBlind: true, historyAware: false, historicalInputs: [], reproducibilityExpected: true,
        producerFamily: 'fixture', schedulerMode: 'production',
      },
      limits: {
        cumulativeNodeCeiling: 1, initialWorkAllocation: 1, totalWorkCeiling: 1,
        wallSafetyDeadlineMs: 1000, wallDeadlineBinding: false,
      },
      sideEffects: { hints: 'none', canonicalBaseline: 'none', telemetry: 'none', reports: 'artifact-only' },
      researchOutcome: { outcome: 'completed-positive' },
      entries: [
        { role: 'primary', source: 'fixture', published: 'result.json', missing: false, sha256: sha256(primary) },
        { role: 'compact-failure-response', source: 'fixture-compact', published: 'failure-response/compact.json', missing: false, sha256: sha256(compact) },
      ],
    };
    fs.writeFileSync(path.join(artifact, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    fs.writeFileSync(path.join(ignored, 'manifest.json'), JSON.stringify({ ...manifest, decisionBearing: false }));

    const retained = persistDecisionBearingExperimentEvidence({ stagingDir: staging, outRoot: output, compressAboveBytes: 8 });
    assert.equal(retained.length, 1);
    assert.equal(retained[0].disposition, 'created');
    const destination = path.join(output, 'fixture-experiment__run-123__attempt-2');
    const bundle = JSON.parse(fs.readFileSync(path.join(destination, 'bundle.json'), 'utf8'));
    assert.equal(bundle.decisionBearing, true);
    assert.equal(bundle.researchQuestion.questionId, 'WS2-D1-PRODUCTION-INERT-OBSERVATION');
    assert.equal(bundle.researchQuestion.measurementOpportunity, 'MO-002');
    assert.equal(bundle.researchBlock.blockId, 'BLOCK-001');
    assert.equal(bundle.researchBlock.evidenceRole, 'development');
    assert.equal(bundle.schemaVersion, DURABLE_EVIDENCE_BUNDLE_SCHEMA_VERSION);
    assert.equal(bundle.manifestStoredPath, 'manifest.json');
    assert.equal(bundle.files.length, 3);
    const manifestRecord = bundle.files.find(file => file.source === 'manifest.json');
    assert.ok(manifestRecord);
    assert.equal(manifestRecord.compression, 'none');
    assert.equal(manifestRecord.stored, 'manifest.json');
    const primaryRecord = bundle.files.find(file => file.source === 'result.json');
    assert.ok(primaryRecord);
    assert.equal(primaryRecord.sha256, sha256(primary));
    assert.equal(primaryRecord.compression, 'gzip');
    assert.ok(primaryRecord.stored.startsWith('evidence/primary/'));
    assert.deepEqual(zlib.gunzipSync(fs.readFileSync(path.join(destination, primaryRecord.stored))), primary);
    const compactRecord = bundle.files.find(file => file.source === 'failure-response/compact.json');
    assert.ok(compactRecord, 'published compact response follows the ordinary durable evidence rail');
    assert.deepEqual(zlib.gunzipSync(fs.readFileSync(path.join(destination, compactRecord.stored))), compact);
    assert.equal(fs.existsSync(path.join(output, 'experiment__run-123__attempt-2')), false);

    const exactBoundArtifact = path.join(temp, 'exact-bound-artifact');
    fs.mkdirSync(exactBoundArtifact, { recursive: true });
    const exactResult = Buffer.from(JSON.stringify({ levels: [{ id: 'A', ok: true }] }));
    fs.writeFileSync(path.join(exactBoundArtifact, 'result.json'), exactResult);
    const exactManifest = {
      ...manifest,
      runId: '124',
      runAttempt: '1',
      experiment: { ...manifest.experiment, experimentId: 'fixture/exact-bound', workflowRunId: '124', workflowRunAttempt: '1' },
      researchOutcome: {
        outcome: 'completed-positive',
        reason: 'exact result fixture',
        binding: { resultContentHashes: [sha256(exactResult)] },
      },
      entries: [{ role: 'primary', source: 'fixture', published: 'result.json', missing: false, sha256: sha256(exactResult) }],
    };
    fs.writeFileSync(path.join(exactBoundArtifact, 'manifest.json'), `${JSON.stringify(exactManifest, null, 2)}\n`);
    const exactRetained = persistDecisionBearingExperimentEvidence({ stagingDir: exactBoundArtifact, outRoot: path.join(temp, 'exact-retained'), compressAboveBytes: 8 });
    assert.equal(exactRetained.length, 1, 'exact-bound artifact persists while its classified bytes match');
    fs.writeFileSync(path.join(exactBoundArtifact, 'result.json'), JSON.stringify({ levels: [{ id: 'A', ok: false }] }));
    assert.throws(
      () => persistDecisionBearingExperimentEvidence({ stagingDir: exactBoundArtifact, outRoot: path.join(temp, 'exact-retained-2'), compressAboveBytes: 8 }),
      /retained scientific binding is stale.*resultContentHashes no longer match/u,
      'durable retention must re-prove an exact verdict-byte binding instead of trusting the manifest boolean',
    );

    const populationMismatchArtifact = path.join(temp, 'population-mismatch-artifact');
    fs.mkdirSync(populationMismatchArtifact, { recursive: true });
    const populationMismatchResult = Buffer.from(JSON.stringify({ levels: [{ id: 'B', ok: true }] }));
    fs.writeFileSync(path.join(populationMismatchArtifact, 'result.json'), populationMismatchResult);
    fs.writeFileSync(path.join(populationMismatchArtifact, 'manifest.json'), JSON.stringify({
      ...manifest,
      runId: '125',
      experiment: { ...manifest.experiment, experimentId: 'fixture/population-mismatch', workflowRunId: '125', workflowRunAttempt: '1' },
      researchOutcome: {
        outcome: 'completed-positive',
        reason: 'bytes are exact but population is stale',
        binding: { resultContentHashes: [sha256(populationMismatchResult)] },
      },
      entries: [{ role: 'primary', source: 'fixture', published: 'result.json', missing: false, sha256: sha256(populationMismatchResult) }],
    }));
    assert.throws(
      () => persistDecisionBearingExperimentEvidence({ stagingDir: populationMismatchArtifact, outRoot: path.join(temp, 'population-mismatch-retained') }),
      /retained scientific binding is stale.*rows no longer match populationIntegrity\.expectedIds/u,
      'exact content binding must not substitute for revalidating the retained simple population join',
    );

    const staleEntryArtifact = path.join(temp, 'stale-entry-artifact');
    fs.mkdirSync(staleEntryArtifact, { recursive: true });
    const staleEntryOriginal = Buffer.from(JSON.stringify({ levels: [{ id: 'A', ok: true }] }));
    fs.writeFileSync(path.join(staleEntryArtifact, 'result.json'), staleEntryOriginal);
    fs.writeFileSync(path.join(staleEntryArtifact, 'manifest.json'), JSON.stringify({
      ...manifest,
      runId: '126',
      experiment: { ...manifest.experiment, experimentId: 'fixture/stale-entry', workflowRunId: '126', workflowRunAttempt: '1' },
      researchOutcome: { outcome: 'completed-positive', reason: 'embedded verdict fixture' },
      entries: [{ role: 'primary', source: 'fixture', published: 'result.json', missing: false, sha256: sha256(staleEntryOriginal) }],
    }));
    fs.writeFileSync(path.join(staleEntryArtifact, 'result.json'), JSON.stringify({ levels: [{ id: 'A', ok: false }] }));
    assert.throws(
      () => persistDecisionBearingExperimentEvidence({ stagingDir: staleEntryArtifact, outRoot: path.join(temp, 'stale-entry-retained') }),
      /entry result\.json bytes no longer match manifest sha256/u,
      'durable retention must re-prove publisher entry bytes even when an embedded verdict has no self-referential content binding',
    );

    const bundleBeforeReharvest = fs.readFileSync(path.join(destination, 'bundle.json'));
    const reharvested = persistDecisionBearingExperimentEvidence({ stagingDir: staging, outRoot: output, compressAboveBytes: 8 });
    assert.equal(reharvested[0].disposition, 'unchanged', 'same immutable run/attempt reharvest is idempotent');
    assert.deepEqual(fs.readFileSync(path.join(destination, 'bundle.json')), bundleBeforeReharvest);

    const changedSource = Buffer.from(JSON.stringify({ levels: [{ id: 'A', ok: true, workSpent: 13 }] }));
    fs.writeFileSync(path.join(artifact, 'result.json'), changedSource);
    const changedManifest = JSON.parse(fs.readFileSync(path.join(artifact, 'manifest.json'), 'utf8'));
    changedManifest.entries = changedManifest.entries.map(entry =>
      entry.published === 'result.json' ? { ...entry, sha256: sha256(changedSource) } : entry);
    if (Array.isArray(changedManifest?.researchOutcome?.binding?.resultContentHashes)) {
      changedManifest.researchOutcome.binding.resultContentHashes = [sha256(changedSource)];
    }
    fs.writeFileSync(path.join(artifact, 'manifest.json'), `${JSON.stringify(changedManifest, null, 2)}\n`);
    assert.throws(
      () => persistDecisionBearingExperimentEvidence({ stagingDir: staging, outRoot: output, compressAboveBytes: 8 }),
      /(?:retained scientific binding is stale.*bytes no longer match manifest sha256|durable evidence identity collision.*immutable source run\/attempt bytes differ)/u,
      'same run/attempt identity with changed source bytes must fail before any retained science can be overwritten',
    );

    const forgedStaging = path.join(temp, 'forged-staging');
    const forgedArtifact = path.join(forgedStaging, 'forged');
    fs.mkdirSync(forgedArtifact, { recursive: true });
    fs.writeFileSync(path.join(forgedArtifact, 'manifest.json'), JSON.stringify({
      ...manifest,
      status: 'missing-primary',
      decisionBearing: true,
    }));
    assert.throws(
      () => persistDecisionBearingExperimentEvidence({ stagingDir: forgedStaging, outRoot: path.join(temp, 'forged-out') }),
      /claims decisionBearing=true but fails shared eligibility.*status/u,
    );
    console.log('persist decision-bearing experiment evidence self-test passed');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

if (values.has('self-test')) {
  selfTest();
} else {
  const stagingDir = path.resolve(values.get('staging-dir') || 'artifact-staging');
  const outRoot = path.resolve(values.get('out-root') || 'reports/stress/experiment-evidence');
  const compressAboveBytes = Number(values.get('compress-above-bytes') || 4 * 1024 * 1024);
  const retained = persistDecisionBearingExperimentEvidence({ stagingDir, outRoot, compressAboveBytes });
  if (retained.length === 0) {
    console.log('No decision-bearing v3 experiment artifacts found; nothing to retain.');
  } else {
    console.log(`Retained ${retained.length} decision-bearing experiment evidence bundle(s).`);
    for (const item of retained) {
      console.log(`- ${item.experimentId ?? 'unknown experiment'} run ${item.workflowRunId ?? 'unknown'} -> ${path.relative(process.cwd(), item.path).replaceAll('\\', '/')} (${item.files} files; ${item.disposition})`);
    }
  }
}
