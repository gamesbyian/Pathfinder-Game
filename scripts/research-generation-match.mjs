#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { buildMatchedGroups, DEFAULT_MATCH_DIMENSIONS } from './research-generation-match-lib.mjs';

function help() {
  console.log(`Outcome-blind cross-source level matcher

Usage:
  npm run research:match-generation -- \
    --source=random=tmp/random.json \
    --source=topology=tmp/topology.json \
    --count=25 --max-distance=0.18 --out=tmp/matched.json

Options:
  --source=<name>=<corpus.json>     repeat at least twice
  --count=<groups>                  default: min source size
  --max-distance=<0..1>             optional hard caliper
  --anchor=<source-name>            default: smallest source
  --dimensions=<comma-separated>    default static puzzle descriptors
  --out=<file>                      required

The matcher never reads solver outcomes. It emits a selection artifact referencing existing
parents; it does not copy levels into a new corpus or change their research-block identities.
`);
}

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

function loadSource(spec) {
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
  const { sources: sourceSpecs, values } = parse(process.argv.slice(2));
  if (values.has('--help')) { help(); return; }
  if (sourceSpecs.length < 2) throw new Error('repeat --source at least twice');
  const out = values.get('--out');
  if (!out) throw new Error('--out is required');
  const sources = sourceSpecs.map(loadSource);
  const maxPossible = Math.min(...sources.map(source => source.levels.length));
  const count = Number(values.get('--count') || maxPossible);
  const maxDistance = values.has('--max-distance') ? Number(values.get('--max-distance')) : Infinity;
  if (!Number.isInteger(count) || count < 1) throw new Error('--count must be a positive integer');
  if (!(maxDistance >= 0)) throw new Error('--max-distance must be >= 0');
  const dimensions = values.get('--dimensions')
    ? values.get('--dimensions').split(',').map(x => x.trim()).filter(Boolean)
    : DEFAULT_MATCH_DIMENSIONS;
  const matched = buildMatchedGroups(sources, {
    count,
    maxDistance,
    dimensions,
    anchorSource: values.get('--anchor') || null,
  });
  const artifact = {
    schemaVersion: 1,
    kind: 'research-cross-source-matched-selection',
    createdAt: new Date().toISOString(),
    selectionProcedure: {
      outcomeBlind: true,
      algorithm: 'deterministic greedy nearest-neighbor without replacement from the anchor source',
      distance: 'mean capped relative difference over prespecified static puzzle descriptors; coverage ratio uses absolute difference',
      maxDistance: Number.isFinite(maxDistance) ? maxDistance : null,
      dimensions,
      tieBreak: 'lexicographic level id',
    },
    evidenceBoundary: 'This artifact records selection provenance only. Source blocks remain authoritative and separate; matched rows are not a new independent population and solver outcomes must not be used to revise this selection without reclassifying evidence.',
    sources: sources.map(({ levels, ...source }) => ({ ...source, parentCount: levels.length })),
    ...matched,
  };
  mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  writeFileSync(path.resolve(out), JSON.stringify(artifact, null, 2) + '\n');
  console.log(`${matched.matchedCount} matched group(s) -> ${out}`);
}

try { main(); }
catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
