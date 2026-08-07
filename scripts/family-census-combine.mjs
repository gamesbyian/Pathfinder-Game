#!/usr/bin/env node
/**
 * Aggregates the family-fragile-robust-census.yml workflow's per-level solve results
 * (logs/family-census/solve-<id>-{lm,sym}.json, one pair per manifest id) into a fragile/robust
 * classification table, joined against data/families/fragile-robust-census-manifest.json for
 * group/archetype/turnLoad. A level is "fragile" if >=1 of its (local-mutant + symmetry) variants
 * solved; "robust" if 0/N solved. See docs/solver-development-roadmap.md's fragile/robust split
 * and reports/families/2026-07-29-turn-load-fragile-robust-split.md for the methodology this
 * extends corpus-wide.
 *
 * Usage: node scripts/family-census-combine.mjs --in-dir=logs/family-census
 *   [--manifest=data/families/fragile-robust-census-manifest.json] [--out=<report.md>]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const IN_DIR = args.get('--in-dir') || 'logs/family-census';
const MANIFEST = args.get('--manifest') || 'data/families/fragile-robust-census-manifest.json';
const OUT = args.get('--out') || 'reports/families/2026-08-06-fragile-robust-census-summary.md';
const JSON_OUT = args.get('--json-out') || 'reports/families/2026-08-06-fragile-robust-census-data.json';

const manifest = JSON.parse(readFileSync(path.resolve(process.cwd(), MANIFEST), 'utf8'));

function solvedCount(file) {
    if (!existsSync(file)) return null;
    try {
        const d = JSON.parse(readFileSync(file, 'utf8'));
        const levels = d.levels || [];
        return { solved: levels.filter(l => l.ok).length, total: levels.length };
    } catch {
        return null;
    }
}

const rows = [];
for (const entry of manifest) {
    const lm = solvedCount(path.join(IN_DIR, `solve-${entry.id}-lm.json`));
    const sym = solvedCount(path.join(IN_DIR, `solve-${entry.id}-sym.json`));
    if (!lm && !sym) continue; // not yet processed by any shard (partial run)
    const solved = (lm?.solved || 0) + (sym?.solved || 0);
    const total = (lm?.total || 0) + (sym?.total || 0);
    rows.push({ ...entry, lmSolved: lm?.solved ?? null, lmTotal: lm?.total ?? null,
        symSolved: sym?.solved ?? null, symTotal: sym?.total ?? null,
        solved, total, fragile: total > 0 ? solved > 0 : null,
        rate: total > 0 ? solved / total : null });
}

function summarize(rowsSubset, label) {
    const withData = rowsSubset.filter(r => r.total > 0);
    const fragileCount = withData.filter(r => r.fragile).length;
    const totalVariants = withData.reduce((a, r) => a + r.total, 0);
    const solvedVariants = withData.reduce((a, r) => a + r.solved, 0);
    return `| ${label} | ${withData.length} | ${fragileCount} | ${withData.length ? (100 * fragileCount / withData.length).toFixed(1) : '-'}% | ${solvedVariants}/${totalVariants} |`;
}

const byGroup = {};
const byArch = {};
const byGroupArch = {};
for (const r of rows) {
    (byGroup[r.group] ??= []).push(r);
    (byArch[r.archetype] ??= []).push(r);
    (byGroupArch[`${r.group} / ${r.archetype}`] ??= []).push(r);
}

const lines = [];
lines.push(`# Fragile/robust census: ${rows.length} levels processed (of ${manifest.length} in manifest)`);
lines.push('');
lines.push('A level is **fragile** if at least one of its 22 structural variants (15 local-mutant + 7');
lines.push('symmetry) solved; **robust** if 0/22 (or 0/N if generation produced fewer than 22 for that');
lines.push('level) solved. See `docs/solver-development-roadmap.md`\'s fragile/robust split and');
lines.push('`reports/families/2026-07-29-turn-load-fragile-robust-split.md` for the methodology.');
lines.push('');
lines.push('## By turn-load group');
lines.push('');
lines.push('| Group | Levels | Fragile | Fragile rate | Variant solve rate |');
lines.push('|---|---|---|---|---|');
for (const [g, rs] of Object.entries(byGroup)) lines.push(summarize(rs, g));
lines.push('');
lines.push('## By archetype');
lines.push('');
lines.push('| Archetype | Levels | Fragile | Fragile rate | Variant solve rate |');
lines.push('|---|---|---|---|---|');
for (const [a, rs] of Object.entries(byArch)) lines.push(summarize(rs, a));
lines.push('');
lines.push('## By group x archetype');
lines.push('');
lines.push('| Group / Archetype | Levels | Fragile | Fragile rate | Variant solve rate |');
lines.push('|---|---|---|---|---|');
for (const [k, rs] of Object.entries(byGroupArch)) lines.push(summarize(rs, k));
lines.push('');
lines.push('## Fragile levels (>=1 variant solved) — candidates for scoring/attempt-policy work');
lines.push('');
lines.push('| id | group | archetype | turnLoad | navDensity | badness | solved/total |');
lines.push('|---|---|---|---|---|---|---|');
for (const r of rows.filter(r => r.fragile)) {
    lines.push(`| ${r.id} | ${r.group} | ${r.archetype} | ${r.turnLoad} | ${r.navDensity} | ${r.badness} | ${r.solved}/${r.total} |`);
}

writeFileSync(path.resolve(process.cwd(), OUT), lines.join('\n') + '\n');
writeFileSync(path.resolve(process.cwd(), JSON_OUT), JSON.stringify(rows, null, 2));
console.log(`Processed ${rows.length}/${manifest.length} manifest levels.`);
console.log(`Wrote ${OUT} and ${JSON_OUT}.`);
