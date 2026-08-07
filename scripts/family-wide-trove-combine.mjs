#!/usr/bin/env node
/**
 * Aggregates the family-wide-trove.yml workflow's per-(level,mode) summary lines
 * (logs/family-census/wide-shard-*-summary.jsonl, one line per {id, mode, solved, total}) into a
 * compact coverage/solve-rate report, joined against data/families/wide-trove-manifest.json for
 * corpus. Unlike the fragile-robust census, this run's purpose is building a general reusable
 * trove (levels + hints + per-attempt telemetry across corpora/modes), not testing one specific
 * hypothesis -- so the report here is a coverage/health check, not a research finding.
 *
 * Usage: node scripts/family-wide-trove-combine.mjs --in-dir=logs/family-census
 *   [--manifest=data/families/wide-trove-manifest.json] [--out=<report.md>]
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const IN_DIR = args.get('--in-dir') || 'logs/family-census';
const MANIFEST = args.get('--manifest') || 'data/families/wide-trove-manifest.json';
const OUT = args.get('--out') || 'reports/families/2026-08-07-wide-trove-summary.md';

const manifest = JSON.parse(readFileSync(path.resolve(process.cwd(), MANIFEST), 'utf8'));
const idToCorpus = new Map(manifest.map((e) => [e.id, e.corpus]));

const rows = [];
const inDirAbs = path.resolve(process.cwd(), IN_DIR);
if (existsSync(inDirAbs)) {
    for (const file of readdirSync(inDirAbs).filter((f) => /^wide-shard-\d+-summary\.jsonl$/.test(f))) {
        const text = readFileSync(path.join(inDirAbs, file), 'utf8');
        for (const line of text.split('\n')) {
            if (!line.trim()) continue;
            try { rows.push(JSON.parse(line)); } catch { /* partial last line from a killed shard */ }
        }
    }
}

const expectedTasks = manifest.reduce((a, e) => a + e.modes.length, 0);
console.log(`Parsed ${rows.length} (level,mode) result(s) against ${expectedTasks} expected tasks.`);

const byCorpus = {};
const byMode = {};
for (const r of rows) {
    const corpus = idToCorpus.get(r.id) || 'unknown';
    (byCorpus[corpus] ??= []).push(r);
    (byMode[r.mode] ??= []).push(r);
}

function summarize(rowsSubset, label) {
    const withTotal = rowsSubset.filter((r) => r.total > 0);
    const levels = new Set(rowsSubset.map((r) => r.id)).size;
    const solvedVariants = withTotal.reduce((a, r) => a + r.solved, 0);
    const totalVariants = withTotal.reduce((a, r) => a + r.total, 0);
    const tasksWithZeroVariants = rowsSubset.length - withTotal.length;
    return `| ${label} | ${rowsSubset.length} | ${levels} | ${solvedVariants}/${totalVariants} | ${totalVariants ? (100 * solvedVariants / totalVariants).toFixed(1) : '-'}% | ${tasksWithZeroVariants} |`;
}

const lines = [];
lines.push('# Wide trove: generation + solve + hint-extraction coverage');
lines.push('');
lines.push(`${rows.length}/${expectedTasks} (level, mode) tasks completed (${manifest.length} levels in manifest across published/corpus1/corpus2).`);
lines.push('');
lines.push('A "0-variant" task is a level with no eligible objects for that mode (e.g. local-mutant');
lines.push('on a level with zero movable objects) -- expected, not a failure.');
lines.push('');
lines.push('## By corpus');
lines.push('');
lines.push('| Corpus | Tasks | Levels | Variants solved | Solve rate | 0-variant tasks |');
lines.push('|---|---|---|---|---|---|');
for (const [c, rs] of Object.entries(byCorpus)) lines.push(summarize(rs, c));
lines.push('');
lines.push('## By mode');
lines.push('');
lines.push('| Mode | Tasks | Levels | Variants solved | Solve rate | 0-variant tasks |');
lines.push('|---|---|---|---|---|---|');
for (const [m, rs] of Object.entries(byMode)) lines.push(summarize(rs, m));
lines.push('');

const missingIds = new Set(manifest.map((e) => e.id));
for (const r of rows) missingIds.delete(r.id);
lines.push(`## Coverage gaps`);
lines.push('');
lines.push(`${missingIds.size} manifest level(s) have zero completed tasks (shard didn't reach them / stopped early on the wall-clock budget). First 50:`);
lines.push('');
lines.push([...missingIds].slice(0, 50).join(', ') || '(none)');

// Failure provenance: solve-<id>-<abbr>.json (portfolio-solve-sweep's own --out format,
// {summary, levels:[{...full per-attempt record: attempts, failedStrategies, nodesExpanded,
// winningConfig, ...}]}) already carries the WHY behind every unsolved variant, not just pass/
// fail -- it's just scattered across ~7800 small per-task files with no index. This merges every
// one's single level entry (tagged with parentId/mode/corpus) into per-corpus combined files in
// the SAME {levels:[...]} shape scripts/stress/rank-levels.mjs and
// scripts/stress/cluster-unsolved-failures.mjs already know how to read, so this trove's failure
// data is queryable with the existing corpus-analysis tooling, not just readable.
const ABBR_TO_MODE = { sym: 'symmetry', lm: 'local-mutant', swap: 'swap', gr: 'group-reshuffle', cs: 'constrained-shuffle' };
const solveFileRe = /^solve-([A-Za-z]\d+)-(sym|lm|swap|gr|cs)\.json$/;
const attemptsByCorpus = {};
if (existsSync(inDirAbs)) {
    for (const file of readdirSync(inDirAbs)) {
        const m = solveFileRe.exec(file);
        if (!m) continue;
        const [, parentId, abbr] = m;
        const corpus = idToCorpus.get(parentId) || 'unknown';
        let parsed;
        try { parsed = JSON.parse(readFileSync(path.join(inDirAbs, file), 'utf8')); } catch { continue; }
        for (const levelResult of parsed.levels || []) {
            (attemptsByCorpus[corpus] ??= []).push({ ...levelResult, parentId, mode: ABBR_TO_MODE[abbr] });
        }
    }
}
let totalAttemptRecords = 0;
for (const [corpus, levels] of Object.entries(attemptsByCorpus)) {
    const outPath = path.resolve(process.cwd(), `reports/families/2026-08-07-wide-trove-attempts-${corpus}.json`);
    writeFileSync(outPath, JSON.stringify({ levels }));
    totalAttemptRecords += levels.length;
    console.log(`Wrote ${levels.length} full attempt record(s) to ${outPath}.`);
}
lines.push('');
lines.push('## Failure provenance');
lines.push('');
lines.push(`${totalAttemptRecords} full per-variant attempt records (attempts, failedStrategies, nodesExpanded,`);
lines.push('winningConfig -- not just solved/total) consolidated into');
lines.push('`reports/families/2026-08-07-wide-trove-attempts-<corpus>.json`, one file per corpus, in the same');
lines.push('`{levels:[...]}` shape `scripts/stress/rank-levels.mjs` / `cluster-unsolved-failures.mjs` already read.');

writeFileSync(path.resolve(process.cwd(), OUT), lines.join('\n') + '\n');
console.log(`Wrote ${OUT}.`);
