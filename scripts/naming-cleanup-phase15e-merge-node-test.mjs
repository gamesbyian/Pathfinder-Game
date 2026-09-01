#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = mkdtempSync(path.join(tmpdir(), 'variant-family-dataset-merge-'));
mkdirSync(path.join(temp, 'data/families'), { recursive: true });
mkdirSync(path.join(temp, 'logs/family-census/corpus1'), { recursive: true });
mkdirSync(path.join(temp, 'reports/families'), { recursive: true });

writeFileSync(path.join(temp, 'data/families/variant-family-dataset-manifest.json'), JSON.stringify([
    { id: 'S00001', corpus: 'corpus1', corpusPath: 'data/stress/stress-levels.json', modes: ['symmetry'], group: null },
]));
writeFileSync(path.join(temp, 'logs/family-census/wide-shard-01-summary.jsonl'),
    JSON.stringify({ id: 'S00001', mode: 'symmetry', solved: 1, total: 1 }) + '\n');
writeFileSync(path.join(temp, 'logs/family-census/corpus1/solve-S00001-sym.json'), JSON.stringify({
    levels: [{ id: 'V1', ok: true, workSpent: 17, winningConfig: 'fixture' }],
}));

const staleCanonical = path.join(temp, 'reports/families/variant-family-dataset-attempts-corpus1-part99.json');
const frozenHistorical = path.join(temp, 'reports/families/2026-08-07-wide-trove-attempts-corpus1-part99.json');
writeFileSync(staleCanonical, '{"levels":[{"id":"STALE"}]}');
writeFileSync(frozenHistorical, '{"levels":[{"id":"HISTORICAL"}]}');

const run = spawnSync(process.execPath, [path.join(ROOT, 'scripts/merge-variant-family-dataset-shards.mjs'),
    '--in-dir=logs/family-census',
    '--manifest=data/families/variant-family-dataset-manifest.json',
], { cwd: temp, encoding: 'utf8' });
assert.equal(run.status, 0, `merge script failed:\n${run.stdout}\n${run.stderr}`);

const summary = path.join(temp, 'reports/families/variant-family-dataset-summary.md');
const attempts = path.join(temp, 'reports/families/variant-family-dataset-attempts-corpus1-part01.json');
assert.ok(existsSync(summary), 'new runs must write the stable canonical summary path');
assert.ok(existsSync(attempts), 'new runs must write stable canonical attempt chunks');
assert.equal(existsSync(staleCanonical), false, 'rerun must remove stale prior canonical chunks before writing');
assert.equal(existsSync(frozenHistorical), true, 'writer must never delete frozen wide-trove historical evidence');
assert.equal(existsSync(path.join(temp, 'reports/families/2026-08-07-wide-trove-summary.md')), false,
    'new runs must not regenerate the dated historical summary name');
const report = readFileSync(summary, 'utf8');
assert.match(report, /variant-family-dataset-attempts-<corpus>-part<NN>\.json/u);
const attemptDoc = JSON.parse(readFileSync(attempts, 'utf8'));
assert.equal(attemptDoc.levels.length, 1);
assert.equal(attemptDoc.levels[0].id, 'V1');

console.log('variant-family dataset shard merger canonical-path/stale-chunk tests passed');
