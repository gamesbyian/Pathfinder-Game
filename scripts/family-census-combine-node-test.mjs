import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFile = promisify(execFileCallback);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = await mkdtemp(path.join(os.tmpdir(), 'family-census-combine-'));
const logDir = path.join(dir, 'logs');
await mkdir(logDir, { recursive: true });

// One manifest row uses the legacy archetype/navDensity fields (as data/families/
// fragile-robust-census-manifest.json currently does); the other uses the canonical
// routingRegime/requiredPathCoverageRatio fields, proving this script dual-reads both.
const manifest = [
    { id: 'L1', group: 'hi-turn', archetype: 'portal-heavy', turnLoad: 3, navDensity: 0.7, badness: 5 },
    { id: 'L2', group: 'lo-turn', routingRegime: 'must-cross-heavy', turnLoad: 1, requiredPathCoverageRatio: 0.5, badness: 2 },
];
const manifestFile = path.join(dir, 'manifest.json');
await writeFile(manifestFile, JSON.stringify(manifest));
await writeFile(path.join(logDir, 'solve-L1-lm.json'), JSON.stringify({ levels: [{ ok: true }, { ok: false }] }));
await writeFile(path.join(logDir, 'solve-L1-sym.json'), JSON.stringify({ levels: [{ ok: false }] }));
await writeFile(path.join(logDir, 'solve-L2-lm.json'), JSON.stringify({ levels: [{ ok: false }, { ok: false }] }));
await writeFile(path.join(logDir, 'solve-L2-sym.json'), JSON.stringify({ levels: [{ ok: false }] }));

const out = path.join(dir, 'out.md');
const jsonOut = path.join(dir, 'out.json');
await execFile('node', ['scripts/family-census-combine.mjs',
    `--in-dir=${logDir}`, `--manifest=${manifestFile}`, `--out=${out}`, `--json-out=${jsonOut}`], { cwd: ROOT });

const rows = JSON.parse(await readFile(jsonOut, 'utf8'));
const byId = Object.fromEntries(rows.map(r => [r.id, r]));
assert.equal(byId.L1.routingRegime, 'multi-portal', 'legacy archetype value must normalize to its canonical routing regime');
assert.equal(byId.L1.requiredPathCoverageRatio, 0.7, 'legacy navDensity must dual-read into requiredPathCoverageRatio');
assert.equal('archetype' in byId.L1, false, 'the legacy field name must not appear in the canonical-write JSON output');
assert.equal('navDensity' in byId.L1, false, 'the legacy field name must not appear in the canonical-write JSON output');
assert.equal(byId.L2.routingRegime, 'must-cross-heavy', 'an already-canonical routingRegime value must pass through unchanged');
assert.equal(byId.L2.requiredPathCoverageRatio, 0.5);

const markdown = await readFile(out, 'utf8');
assert.match(markdown, /## By routing regime/, 'the report heading must use routing-regime vocabulary, not archetype');
assert.match(markdown, /\| Routing regime \|/);
assert.doesNotMatch(markdown, /[Aa]rchetype/, 'no archetype spelling should remain in fresh report output');

console.log('family-census-combine: all tests passed');
