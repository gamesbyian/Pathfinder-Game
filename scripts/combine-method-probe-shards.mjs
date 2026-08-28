#!/usr/bin/env node
/**
 * Combines method-probe-sweep.yml's downloaded artifacts into one result. Since 2026-08-25 each
 * outer Actions shard may contain several disjoint worker result files (`shard-NNN-wK.json`), so
 * every result JSON in every artifact directory is consumed rather than only the first one.
 * Console-log/result pairs are cross-checked so a timed-out worker cannot silently disappear from
 * an otherwise-successful outer shard artifact.
 *
 * Usage: node scripts/combine-method-probe-shards.mjs --staging-dir=artifact-staging --out-dir=logs/method-probe-shards
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const STAGING_DIR = args.get('--staging-dir') || 'artifact-staging';
const OUT_DIR = args.get('--out-dir') || 'logs/method-probe-shards';

const dirs = readdirSync(STAGING_DIR).filter(d => d.startsWith('method-probe-shard-'));
let allLevels = [];
let meta = null;
const missing = [];

for (const d of dirs.sort()) {
    const shardPath = path.join(STAGING_DIR, d);
    const names = readdirSync(shardPath);
    const files = names.filter(f => f.endsWith('.json') && !f.includes('summary')).sort();
    if (files.length === 0) { missing.push(d); continue; }

    // Every launched worker writes a console log immediately, while its JSON appears only if the
    // probe reaches normal report-writing. Use that pairing to expose partial outer shards.
    for (const log of names.filter(f => f.endsWith('.console.log'))) {
        const expectedJson = log.replace(/\.console\.log$/u, '.json');
        if (!names.includes(expectedJson)) missing.push(`${d}/${expectedJson}`);
    }

    for (const file of files) {
        const data = JSON.parse(readFileSync(path.join(shardPath, file), 'utf8'));
        const thisMeta = {
            corpus: data.corpus, only: data.only, budgetMs: data.budgetMs,
            workBudget: data.workBudget ?? null, nodeBudget: data.nodeBudget,
        };
        if (!meta) meta = thisMeta;
        else if (JSON.stringify(thisMeta) !== JSON.stringify(meta)) {
            throw new Error(`metadata mismatch in ${d}/${file}: ${JSON.stringify(thisMeta)} != ${JSON.stringify(meta)}`);
        }
        allLevels = allLevels.concat(data.levels || []);
    }
}

// Disjoint subranges are an invariant. A duplicate id means sharding overlapped or the same worker
// result was staged twice, either of which would make aggregate solved/tested counts misleading.
const seen = new Set();
const duplicates = [];
for (const level of allLevels) {
    if (seen.has(level.id)) duplicates.push(level.id);
    else seen.add(level.id);
}
if (duplicates.length) throw new Error(`duplicate level ids across method-probe results: ${[...new Set(duplicates)].join(', ')}`);

allLevels.sort((a, b) => String(a.id ?? '').localeCompare(String(b.id ?? '')));
const solved = allLevels.filter(l => l.ok);
const deadlineTruncatedIds = allLevels.filter(l => l.deadlineTruncated).map(l => l.id);
const deterministicWorkMode = meta?.workBudget != null;
const validDeterministicEvidence = deterministicWorkMode && missing.length === 0 && deadlineTruncatedIds.length === 0;
const combined = {
    ...meta,
    totalTested: allLevels.length,
    totalSolved: solved.length,
    deterministicWorkMode,
    validDeterministicEvidence,
    deadlineTruncatedIds,
    missingShards: missing,
    levels: allLevels,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(path.join(OUT_DIR, 'combined.json'), JSON.stringify(combined, null, 1));
const solvedIds = solved.map(l => l.id).sort();
writeFileSync(path.join(OUT_DIR, 'solved-ids.txt'), solvedIds.join('\n') + '\n');

const summaryLines = [
    `# method-probe sweep: ${JSON.stringify(meta?.only)}`,
    '',
    `Corpus: \`${meta?.corpus}\` — tested ${allLevels.length}, solved ${solved.length}; work-budget=${meta?.workBudget ?? '(legacy wall-bounded)'}`,
    missing.length ? `\n**Missing worker results: ${missing.join(', ')}**` : '',
    deadlineTruncatedIds.length ? `\n**Deadline-truncated rows (invalid deterministic evidence): ${deadlineTruncatedIds.join(', ')}**` : '',
    '',
    '## Solved level IDs',
    '```',
    solvedIds.join('\n'),
    '```',
];
const summaryText = summaryLines.join('\n');
console.log(`Combined: ${allLevels.length} tested, ${solved.length} solved, ${missing.length} missing worker result(s)`);

if (process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, summaryText, { flag: 'a' });
} else {
    console.log(summaryText);
}

if (missing.length || deadlineTruncatedIds.length) process.exitCode = 2;
