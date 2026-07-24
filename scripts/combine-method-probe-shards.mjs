#!/usr/bin/env node
/**
 * Combines method-probe-sweep.yml's per-shard result files (downloaded artifacts, one
 * `shard-NN.json` per subdirectory under --staging-dir) into a single combined JSON + a plain-text
 * solved-ID list. A real, locally-testable script rather than an inline YAML `node -e` heredoc —
 * see this workflow's own comment for why (an earlier inline version used `require()`, which fails
 * under this repo's `"type": "module"` package.json even via `node -e`; caught by testing this
 * script against fake shard data before ever running it in CI).
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
    const files = readdirSync(shardPath).filter(f => f.endsWith('.json') && !f.includes('summary'));
    if (files.length === 0) { missing.push(d); continue; }
    const data = JSON.parse(readFileSync(path.join(shardPath, files[0]), 'utf8'));
    if (!meta) meta = { corpus: data.corpus, only: data.only, budgetMs: data.budgetMs, nodeBudget: data.nodeBudget };
    allLevels = allLevels.concat(data.levels || []);
}

const solved = allLevels.filter(l => l.ok);
const combined = { ...meta, totalTested: allLevels.length, totalSolved: solved.length, missingShards: missing, levels: allLevels };

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(path.join(OUT_DIR, 'combined.json'), JSON.stringify(combined, null, 1));
const solvedIds = solved.map(l => l.id).sort();
writeFileSync(path.join(OUT_DIR, 'solved-ids.txt'), solvedIds.join('\n') + '\n');

const summaryLines = [
    `# method-probe sweep: ${JSON.stringify(meta?.only)}`,
    '',
    `Corpus: \`${meta?.corpus}\` — tested ${allLevels.length}, solved ${solved.length}`,
    missing.length ? `\n**Missing shards: ${missing.join(', ')}**` : '',
    '',
    '## Solved level IDs',
    '```',
    solvedIds.join('\n'),
    '```',
];
const summaryText = summaryLines.join('\n');
console.log(`Combined: ${allLevels.length} tested, ${solved.length} solved, ${missing.length} missing shards`);

if (process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, summaryText, { flag: 'a' });
} else {
    console.log(summaryText);
}
