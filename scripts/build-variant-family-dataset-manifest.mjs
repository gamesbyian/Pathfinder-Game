#!/usr/bin/env node
/**
 * Builds the variant-family dataset manifest: every level across all 3 real corpora (published,
 * corpus-1, corpus-2), tagged with which family-generate.mjs modes to run for it.
 *
 * Corpus-2 levels already covered by the 2026-08-06 fragile-robust census (symmetry + local-mutant
 * data already collected against data/families/fragile-robust-census-manifest.json's 959 ids, plus
 * the 16 covered by that session's local batch) get only the THREE modes not yet run against them
 * (swap, group-reshuffle, constrained-shuffle) -- avoids regenerating/re-solving data already on
 * the branch. Every other level (corpus-2 solved, all of corpus-1, all of published) gets the full
 * five-mode set (symmetry, local-mutant, swap, group-reshuffle, constrained-shuffle). re-embed is
 * deliberately excluded from this general dataset -- it needs a per-level grid-size decision that
 * doesn't automate uniformly across thousands of differently-sized levels; it's a better fit for a
 * focused follow-up targeting the space-as-a-variable question specifically (see
 * docs/sibling-cousin-system.md's "space is a puzzle variable" section).
 *
 * group-reshuffle needs one --group=<type>; per level, picks the type (of blocks|mustPass|
 * mustCross|flippingFilters|geese|falseGoals|landmarks) with the most instances (ties broken by
 * the listed order), matching the heuristic used in the earlier local dose-response experiment
 * (reports/families/2026-07-15-dose-response-mutation-intensity.md). A level with zero eligible
 * objects of any type has group-reshuffle dropped from its mode list (nothing to reshuffle).
 *
 * Usage: node scripts/build-variant-family-dataset-manifest.mjs --out=data/families/variant-family-dataset-manifest.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const OUT = args.get('--out') || 'data/families/variant-family-dataset-manifest.json';
const ROOT = process.cwd();
const readJson = (p) => JSON.parse(readFileSync(path.resolve(ROOT, p), 'utf8'));

const GROUP_TYPES = ['blocks', 'mustPass', 'mustCross', 'flippingFilters', 'geese', 'falseGoals', 'landmarks'];

function pickGroup(level) {
    let best = null, bestCount = 0;
    for (const t of GROUP_TYPES) {
        const count = Array.isArray(level[t]) ? level[t].length : 0;
        if (count > bestCount) { best = t; bestCount = count; }
    }
    return best; // null if every type is empty
}

const CORPORA = [
    { name: 'published', path: 'data/levels.json' },
    { name: 'corpus1', path: 'data/stress/stress-levels.json' },
    { name: 'corpus2', path: 'data/stress/stress-levels-random.json' },
];

// Ids already covered by the fragile-robust census (symmetry + local-mutant already collected).
const censusManifest = readJson('data/families/fragile-robust-census-manifest.json');
const localBatchIds = ['R00500', 'R03013', 'R02057', 'R02897', 'R01155', 'R03288', 'R02717', 'R01000',
    'R02593', 'R02432', 'R01234', 'R00340', 'R02734', 'R02816', 'R01609', 'R02989'];
const alreadyCoveredIds = new Set([...censusManifest.map(e => e.id), ...localBatchIds]);

const FULL_MODES = ['symmetry', 'local-mutant', 'swap', 'group-reshuffle', 'constrained-shuffle'];
const PARTIAL_MODES = ['swap', 'group-reshuffle', 'constrained-shuffle'];

const manifest = [];
for (const { name, path: corpusPath } of CORPORA) {
    const raw = readJson(corpusPath);
    const levels = Array.isArray(raw) ? raw : raw.levels;
    for (const level of levels) {
        const id = level.id;
        if (!id) continue;
        const modes = (alreadyCoveredIds.has(id) ? PARTIAL_MODES : FULL_MODES).slice();
        const group = pickGroup(level);
        const finalModes = group ? modes : modes.filter(m => m !== 'group-reshuffle');
        if (finalModes.length === 0) continue;
        manifest.push({ id, corpus: name, corpusPath, modes: finalModes, group });
    }
}

writeFileSync(path.resolve(ROOT, OUT), JSON.stringify(manifest, null, 2));

const counts = {};
for (const e of manifest) for (const m of e.modes) counts[m] = (counts[m] || 0) + 1;
console.log(`Wrote ${manifest.length} level entries to ${OUT}.`);
console.log('Mode counts:', counts);
console.log('Corpus counts:', Object.fromEntries(CORPORA.map(c => [c.name, manifest.filter(e => e.corpus === c.name).length])));
