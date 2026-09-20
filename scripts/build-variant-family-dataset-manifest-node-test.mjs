#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = mkdtempSync(path.join(tmpdir(), 'variant-family-manifest-identity-'));
mkdirSync(path.join(temp, 'data/stress'), { recursive: true });
mkdirSync(path.join(temp, 'data/families'), { recursive: true });

const level = { id: 'R02000', blocks: [{ x: 1, y: 1 }] };
writeFileSync(path.join(temp, 'data/levels.json'), JSON.stringify([level]));
writeFileSync(path.join(temp, 'data/stress/stress-levels.json'), JSON.stringify([level]));
writeFileSync(path.join(temp, 'data/stress/stress-levels-random.json'), JSON.stringify([level]));
writeFileSync(path.join(temp, 'data/families/fragile-robust-census-manifest.json'), JSON.stringify([{ id: 'R02000' }]));

const run = spawnSync(process.execPath, [
  path.join(ROOT, 'scripts/build-variant-family-dataset-manifest.mjs'),
  '--out=data/families/variant-family-dataset-manifest.json',
], { cwd: temp, encoding: 'utf8' });
assert.equal(run.status, 0, `manifest builder failed:\n${run.stdout}\n${run.stderr}`);

const manifest = JSON.parse(readFileSync(path.join(temp, 'data/families/variant-family-dataset-manifest.json'), 'utf8'));
const byCorpus = new Map(manifest.map(row => [row.corpus, row]));
for (const corpus of ['published', 'corpus1']) {
  assert.ok(byCorpus.get(corpus).modes.includes('symmetry'), `${corpus} must not inherit corpus2 prior coverage through a bare-id collision`);
  assert.ok(byCorpus.get(corpus).modes.includes('local-mutant'));
}
assert.deepEqual(byCorpus.get('corpus2').modes.sort(), ['constrained-shuffle', 'group-reshuffle', 'swap'].sort(),
  'prior fragile/robust coverage applies only to the corpus2 identity that produced it');

console.log('variant-family dataset manifest corpus identity test passed');
