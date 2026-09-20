#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

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

function findDecisionBearingManifests(root) {
  return walk(root)
    .filter(file => path.basename(file) === 'manifest.json')
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
    const artifactRoot = path.dirname(manifestFile);
    const experimentId = safeSegment(manifest?.experiment?.experimentId, 'experiment');
    const runId = safeSegment(manifest?.experiment?.workflowRunId ?? manifest?.runId, 'unknown-run');
    const runAttempt = safeSegment(manifest?.experiment?.workflowRunAttempt ?? manifest?.runAttempt, '1');
    const destinationRoot = path.join(output, `${experimentId}__run-${runId}__attempt-${runAttempt}`);
    fs.rmSync(destinationRoot, { recursive: true, force: true });
    fs.mkdirSync(destinationRoot, { recursive: true });

    const files = [];
    copyEvidenceFile(manifestFile, artifactRoot, destinationRoot, 'manifest.json', files, compressAboveBytes, { allowCompression: false });
    for (const entry of manifest.entries || []) {
      if (entry?.missing || !entry?.published) continue;
      const source = path.resolve(artifactRoot, entry.published);
      const role = safeSegment(entry.role, 'entry');
      const logical = path.join('evidence', role, entry.published);
      copyEvidenceFile(source, artifactRoot, destinationRoot, logical, files, compressAboveBytes);
    }

    const bundle = {
      schemaVersion: 1,
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
    fs.writeFileSync(path.join(destinationRoot, 'bundle.json'), `${JSON.stringify(bundle, null, 2)}\n`);
    retained.push({ experimentId: bundle.experimentId, workflowRunId: bundle.workflowRunId, path: destinationRoot, files: files.length });
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
      decisionBearing: true,
      runId: '123',
      runAttempt: '2',
      experiment: { experimentId: 'fixture/experiment', workflowFamily: 'fixture', workflowRunId: '123', workflowRunAttempt: '2', resolvedSha: 'a'.repeat(40), configurationHash: `sha256:${'b'.repeat(64)}` },
      population: {
        identityHash: `sha256:${'c'.repeat(64)}`,
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
      researchOutcome: { outcome: 'completed-positive' },
      entries: [
        { role: '../primary', source: 'fixture', published: 'result.json', missing: false },
        { role: 'compact-failure-response', source: 'fixture-compact', published: 'failure-response/compact.json', missing: false },
      ],
    };
    fs.writeFileSync(path.join(artifact, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    fs.writeFileSync(path.join(ignored, 'manifest.json'), JSON.stringify({ ...manifest, decisionBearing: false }));

    const retained = persistDecisionBearingExperimentEvidence({ stagingDir: staging, outRoot: output, compressAboveBytes: 8 });
    assert.equal(retained.length, 1);
    const destination = path.join(output, 'fixture-experiment__run-123__attempt-2');
    const bundle = JSON.parse(fs.readFileSync(path.join(destination, 'bundle.json'), 'utf8'));
    assert.equal(bundle.decisionBearing, true);
    assert.equal(bundle.researchQuestion.questionId, 'WS2-D1-PRODUCTION-INERT-OBSERVATION');
    assert.equal(bundle.researchQuestion.measurementOpportunity, 'MO-002');
    assert.equal(bundle.researchBlock.blockId, 'BLOCK-001');
    assert.equal(bundle.researchBlock.evidenceRole, 'development');
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
      console.log(`- ${item.experimentId ?? 'unknown experiment'} run ${item.workflowRunId ?? 'unknown'} -> ${path.relative(process.cwd(), item.path).replaceAll('\\', '/')} (${item.files} files)`);
    }
  }
}
