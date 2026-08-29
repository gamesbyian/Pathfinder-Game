#!/usr/bin/env node
/**
 * Aggregates the family-fragile-robust-census.yml workflow's per-level solve results into a
 * fragile/robust classification table, joined against
 * data/families/fragile-robust-census-manifest.json for group/routing regime/turnLoad. A level is
 * "fragile" if >=1 of its (local-mutant + symmetry) variants solved; "robust" if 0/N solved. See
 * docs/solver-development-roadmap.md's fragile/robust split and
 * reports/families/2026-07-29-turn-load-fragile-robust-split.md for the methodology this extends
 * corpus-wide.
 *
 * Data source, in preference order:
 *   1. logs/family-census/solve-<id>-{lm,sym}.json (per-variant JSON result files) when present.
 *   2. logs/family-census/shard-*.log (plain-text progress logs, parsed via
 *      family-census-parse-shard-logs.mjs's parseShardLog) as a fallback. Needed because the
 *      2026-08-07 shard-6 staging bug (family-fragile-robust-census.yml: git status collapsed the
 *      brand-new logs/family-census/ directory to a single untracked-dir line, and the staging
 *      loop's `cp` without -r on that "file" aborted the step under `set -e`) dropped every
 *      shard's individual solve-*.json files from its uploaded artifact -- but each shard's own
 *      shard-NN.log survived (copied by an earlier, unaffected step) and contains every solve's
 *      "Result: solved=X/Y" line, which is enough to reconstruct this table exactly.
 *
 * Usage: node scripts/family-census-combine.mjs --in-dir=logs/family-census
 *   [--manifest=data/families/fragile-robust-census-manifest.json] [--out=<report.md>]
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseShardLog } from './family-census-parse-shard-logs.mjs';
import { normalizeRoutingRegime } from '../modules/solver/routing-regime-normalization.mjs';

// The manifest may carry either the legacy archetype/navDensity fields or the canonical
// routingRegime/requiredPathCoverageRatio fields -- dual-read both, canonical-write only the
// new names into this script's own report/JSON output (single-write).
function safeNormalizeRoutingRegime(value) {
    if (value == null) return null;
    try { return normalizeRoutingRegime(value); } catch { return value; }
}

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

// Fallback map built from every shard-*.log found, keyed by id.
const logFallback = new Map();
const inDirAbs = path.resolve(process.cwd(), IN_DIR);
if (existsSync(inDirAbs)) {
    for (const file of readdirSync(inDirAbs).filter(f => /^shard-\d+\.log$/.test(f))) {
        const text = readFileSync(path.join(inDirAbs, file), 'utf8');
        for (const [id, row] of parseShardLog(text)) logFallback.set(id, row);
    }
}
console.log(`Log fallback covers ${logFallback.size} level(s) across shard-*.log files found in ${IN_DIR}.`);

const rows = [];
for (const entry of manifest) {
    const lmJson = solvedCount(path.join(IN_DIR, `solve-${entry.id}-lm.json`));
    const symJson = solvedCount(path.join(IN_DIR, `solve-${entry.id}-sym.json`));
    const fallback = logFallback.get(entry.id);
    const lmSolved = lmJson?.solved ?? fallback?.lmSolved ?? null;
    const lmTotal = lmJson?.total ?? fallback?.lmTotal ?? null;
    const symSolved = symJson?.solved ?? fallback?.symSolved ?? null;
    const symTotal = symJson?.total ?? fallback?.symTotal ?? null;
    if (lmTotal == null && symTotal == null) continue; // not yet processed by any shard (partial run)
    const solved = (lmSolved || 0) + (symSolved || 0);
    const total = (lmTotal || 0) + (symTotal || 0);
    const { archetype: legacyArchetype, navDensity: legacyNavDensity, routingRegime: rawRoutingRegime,
        requiredPathCoverageRatio: rawCoverageRatio, ...rest } = entry;
    const routingRegime = safeNormalizeRoutingRegime(rawRoutingRegime ?? legacyArchetype ?? null);
    const requiredPathCoverageRatio = rawCoverageRatio ?? legacyNavDensity ?? null;
    rows.push({ ...rest, routingRegime, requiredPathCoverageRatio, lmSolved, lmTotal, symSolved, symTotal,
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
const byRoutingRegime = {};
const byGroupRoutingRegime = {};
for (const r of rows) {
    (byGroup[r.group] ??= []).push(r);
    (byRoutingRegime[r.routingRegime] ??= []).push(r);
    (byGroupRoutingRegime[`${r.group} / ${r.routingRegime}`] ??= []).push(r);
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
lines.push('## By routing regime');
lines.push('');
lines.push('| Routing regime | Levels | Fragile | Fragile rate | Variant solve rate |');
lines.push('|---|---|---|---|---|');
for (const [a, rs] of Object.entries(byRoutingRegime)) lines.push(summarize(rs, a));
lines.push('');
lines.push('## By group x routing regime');
lines.push('');
lines.push('| Group / Routing regime | Levels | Fragile | Fragile rate | Variant solve rate |');
lines.push('|---|---|---|---|---|');
for (const [k, rs] of Object.entries(byGroupRoutingRegime)) lines.push(summarize(rs, k));
lines.push('');
lines.push('## Fragile levels (>=1 variant solved) — candidates for scoring/attempt-policy work');
lines.push('');
lines.push('| id | group | routingRegime | turnLoad | requiredPathCoverageRatio | badness | solved/total |');
lines.push('|---|---|---|---|---|---|---|');
for (const r of rows.filter(r => r.fragile)) {
    lines.push(`| ${r.id} | ${r.group} | ${r.routingRegime} | ${r.turnLoad} | ${r.requiredPathCoverageRatio} | ${r.badness} | ${r.solved}/${r.total} |`);
}

writeFileSync(path.resolve(process.cwd(), OUT), lines.join('\n') + '\n');
writeFileSync(path.resolve(process.cwd(), JSON_OUT), JSON.stringify(rows, null, 2));
console.log(`Processed ${rows.length}/${manifest.length} manifest levels.`);
console.log(`Wrote ${OUT} and ${JSON_OUT}.`);
