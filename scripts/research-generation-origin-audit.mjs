#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { DEFAULT_MATCH_DIMENSIONS } from './research-generation-match-lib.mjs';
import { auditOriginRecognizability } from './research-generation-origin-audit-lib.mjs';

function parse(argv) {
  const sources = [];
  const values = new Map();
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') { values.set('--help', '1'); continue; }
    if (arg.startsWith('--source=')) {
      const spec = arg.slice('--source='.length);
      const eq = spec.indexOf('=');
      if (eq <= 0) throw new Error('--source must be --source=name=path');
      sources.push({ name: spec.slice(0, eq), file: spec.slice(eq + 1) });
      continue;
    }
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    values.set(eq === -1 ? arg : arg.slice(0, eq), eq === -1 ? '1' : arg.slice(eq + 1));
  }
  return { sources, values };
}

function help() {
  console.log(`Generator-origin recognizability audit

Usage:
  npm run research:audit-generation-origin -- \
    --source=random=tmp/random.json \
    --source=topology=tmp/topology.json \
    --folds=5 --out=tmp/origin-audit.json

Uses only static puzzle descriptors and grouped deterministic cross-validation. It never reads
solver outcomes. High accuracy means the supplied descriptors already make source origin easy to
recognize; low accuracy makes cross-source matched comparison more informative.
`);
}

function load(spec) {
  const parsed = JSON.parse(readFileSync(spec.file, 'utf8'));
  const levels = Array.isArray(parsed) ? parsed : parsed.levels;
  if (!Array.isArray(levels)) throw new Error(`${spec.file}: expected level array or {levels}`);
  return {
    name: spec.name,
    file: spec.file,
    levels,
    blockId: parsed.researchBlock?.blockId ?? null,
    populationIdentity: parsed.populationIdentity ?? null,
    sourceRegime: parsed.researchBlock?.sourceRegime ?? parsed.corpusName ?? null,
  };
}

function main() {
  const { sources: specs, values } = parse(process.argv.slice(2));
  if (values.has('--help')) { help(); return; }
  if (specs.length < 2) throw new Error('repeat --source at least twice');
  const out = values.get('--out');
  if (!out) throw new Error('--out is required');
  const dimensions = values.get('--dimensions')
    ? values.get('--dimensions').split(',').map(x => x.trim()).filter(Boolean)
    : DEFAULT_MATCH_DIMENSIONS;
  const folds = Number(values.get('--folds') || 5);
  const sources = specs.map(load);
  const audit = auditOriginRecognizability(sources, { dimensions, folds });
  const artifact = {
    schemaVersion: 1,
    kind: 'research-generation-origin-recognizability',
    createdAt: new Date().toISOString(),
    outcomeBlind: true,
    model: 'nearest source centroid over standardized static descriptors with deterministic within-source k-fold cross-validation',
    interpretationBoundary: 'Recognizability diagnoses source-population descriptor differences. It is not a solver feature, a difficulty model, or evidence that source identity causes solver behavior.',
    sourceArtifacts: sources.map(({ levels, ...source }) => ({ ...source, parentCount: levels.length })),
    ...audit,
  };
  mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  writeFileSync(path.resolve(out), JSON.stringify(artifact, null, 2) + '\n');
  console.log(`origin accuracy=${audit.accuracy?.toFixed(3)} chance=${audit.chanceBaseline.toFixed(3)} -> ${out}`);
}

try { main(); }
catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
