#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const args = process.argv.slice(2);
const values = new Map();
for (const arg of args) {
  if (!arg.startsWith('--')) continue;
  const eq = arg.indexOf('=');
  values.set(eq === -1 ? arg.slice(2) : arg.slice(2, eq), eq === -1 ? 'true' : arg.slice(eq + 1));
}

const stagingDir = path.resolve(values.get('staging-dir') || 'artifact-staging');
const outRoot = path.resolve(values.get('out-root') || 'reports/stress/experiment-evidence');
const compressAboveBytes = Number(values.get('compress-above-bytes') || 4 * 1024 * 1024);

function safeSegment(value, fallback) {
  const result = String(value ?? '').trim().replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
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

function copyEvidenceFile(source, artifactRoot, destinationRoot, logicalRelative, files) {
  const resolved = path.resolve(source);
  if (!isInside(artifactRoot, resolved)) throw new Error(`evidence path escapes artifact root: ${source}`);
  if (!fs.existsSync(resolved)) throw new Error(`decision-bearing evidence file is missing: ${source}`);
  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) {
    for (const child of walk(resolved)) {
      const nested = path.join(logicalRelative, path.relative(resolved, child));
      copyEvidenceFile(child, artifactRoot, destinationRoot, nested, files);
    }
    return;
  }

  const bytes = fs.readFileSync(resolved);
  const relative = logicalRelative.replaceAll('\\', '/');
  const shouldCompress = bytes.length > compressAboveBytes;
  const storedRelative = shouldCompress ? `${relative}.gz` : relative;
  const destination = path.join(destinationRoot, storedRelative);
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

fs.mkdirSync(outRoot, { recursive: true });
const retained = [];
for (const { file: manifestFile, manifest } of findDecisionBearingManifests(stagingDir)) {
  const artifactRoot = path.dirname(manifestFile);
  const experimentId = safeSegment(manifest?.experiment?.experimentId, 'experiment');
  const runId = safeSegment(manifest?.experiment?.workflowRunId ?? manifest?.runId, 'unknown-run');
  const runAttempt = safeSegment(manifest?.experiment?.workflowRunAttempt ?? manifest?.runAttempt, '1');
  const destinationRoot = path.join(outRoot, `${experimentId}__run-${runId}__attempt-${runAttempt}`);
  fs.rmSync(destinationRoot, { recursive: true, force: true });
  fs.mkdirSync(destinationRoot, { recursive: true });

  const files = [];
  copyEvidenceFile(manifestFile, artifactRoot, destinationRoot, 'manifest.json', files);
  for (const entry of manifest.entries || []) {
    if (entry?.missing || !entry?.published) continue;
    const source = path.resolve(artifactRoot, entry.published);
    const logical = path.join('evidence', entry.role || 'entry', entry.published);
    copyEvidenceFile(source, artifactRoot, destinationRoot, logical, files);
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
    researchOutcome: manifest?.researchOutcome ?? null,
    sourceArtifact: manifest?.sourceArtifact ?? null,
    runUrl: manifest?.runUrl ?? null,
    decisionBearing: true,
    files,
  };
  fs.writeFileSync(path.join(destinationRoot, 'bundle.json'), `${JSON.stringify(bundle, null, 2)}\n`);
  retained.push({ experimentId: bundle.experimentId, workflowRunId: bundle.workflowRunId, path: path.relative(process.cwd(), destinationRoot).replaceAll('\\', '/'), files: files.length });
}

if (retained.length === 0) {
  console.log('No decision-bearing v3 experiment artifacts found; nothing to retain.');
} else {
  console.log(`Retained ${retained.length} decision-bearing experiment evidence bundle(s).`);
  for (const item of retained) console.log(`- ${item.experimentId ?? 'unknown experiment'} run ${item.workflowRunId ?? 'unknown'} -> ${item.path} (${item.files} files)`);
}
