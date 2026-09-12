#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { stableHash } from './solver-experiment-contract.mjs';

const DEFAULT_CORPORA = [
  ['corpus1', 'data/stress/stress-levels.json'],
  ['corpus2', 'data/stress/stress-levels-random.json'],
  ['published', 'data/levels.json'],
];

function parseDocument(text, source) {
  const parsed = JSON.parse(text);
  const levels = Array.isArray(parsed) ? parsed : parsed?.levels;
  if (!Array.isArray(levels)) throw new Error(`${source}: expected an array or { levels: [] }`);
  return levels;
}

function canonicalEntries(expectedIds, corpora) {
  const byId = new Map();
  for (const [corpus, levels] of corpora) {
    for (const level of levels) {
      const id = level?.id == null ? null : String(level.id);
      if (!id) continue;
      if (byId.has(id)) throw new Error(`duplicate level id across corpora: ${id}`);
      byId.set(id, { corpus, level });
    }
  }
  const entries = expectedIds.map(id => {
    const found = byId.get(id);
    if (!found) throw new Error(`expected population id not found in corpus content: ${id}`);
    return { id, corpus: found.corpus, level: found.level };
  });
  return entries.sort((a, b) => a.id.localeCompare(b.id));
}

export function buildPopulationSeal(expectedIds, corpora) {
  const ids = expectedIds.map(String);
  if (new Set(ids).size !== ids.length) throw new Error('expected population contains duplicate ids');
  const entries = canonicalEntries(ids, corpora);
  return {
    schemaVersion: 1,
    kind: 'pathfinder-routing-ab-population-seal',
    count: entries.length,
    identityHash: stableHash(entries),
  };
}

export function readCorporaFromFiles(specs = DEFAULT_CORPORA) {
  return specs.map(([corpus, file]) => [corpus, parseDocument(readFileSync(file, 'utf8'), file)]);
}

export function readCorporaFromGitRef(ref, specs = DEFAULT_CORPORA) {
  return specs.map(([corpus, file]) => {
    const text = execFileSync('git', ['show', `${ref}:${file}`], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
    return [corpus, parseDocument(text, `${ref}:${file}`)];
  });
}

function parseArgs(argv) {
  return new Map(argv.filter(a => a.startsWith('--')).map(a => {
    const eq = a.indexOf('=');
    return eq === -1 ? [a.slice(2), 'true'] : [a.slice(2, eq), a.slice(eq + 1)];
  }));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const idsFile = args.get('expected-ids');
  const out = args.get('out');
  const gitRef = args.get('git-ref');
  const expectFile = args.get('expect-seal');
  if (!idsFile || !out) {
    throw new Error('Usage: --expected-ids=<file> --out=<file> [--git-ref=<sha>] [--expect-seal=<file>]');
  }
  const expectedIds = readFileSync(idsFile, 'utf8').split(/\s+/u).map(s => s.trim()).filter(Boolean);
  const corpora = gitRef ? readCorporaFromGitRef(gitRef) : readCorporaFromFiles();
  const seal = buildPopulationSeal(expectedIds, corpora);
  if (expectFile) {
    const expected = JSON.parse(readFileSync(expectFile, 'utf8'));
    if (seal.count !== expected.count || seal.identityHash !== expected.identityHash) {
      throw new Error(`population content seal mismatch: expected ${expected.identityHash}/${expected.count}, observed ${seal.identityHash}/${seal.count}`);
    }
  }
  writeFileSync(out, `${JSON.stringify(seal, null, 2)}\n`);
  console.log(`Sealed ${seal.count} routing A/B population levels as ${seal.identityHash}${gitRef ? ` at ${gitRef}` : ''}.`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  try { main(); } catch (error) { console.error(`seal-routing-regime-population: ${error.message}`); process.exit(2); }
}