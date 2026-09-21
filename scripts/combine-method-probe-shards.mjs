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
import { writeResearchWorkflowOutcome } from './research-workflow-outcome.mjs';
import { resolveMethodProbeShardDirs } from './method-probe-staging-lib.mjs';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const STAGING_DIR = args.get('--staging-dir') || 'artifact-staging';
const OUT_DIR = args.get('--out-dir') || 'logs/method-probe-shards';
const OUTCOME_OUT = args.get('--outcome-out') || null;
const DETERMINISTIC_WORK_MODE_ARG = args.get('--deterministic-work-mode');
const EXPECTED_SHARDS_ARG = args.get('--expected-shards');
const expectedOuterShards = EXPECTED_SHARDS_ARG == null ? null : Number(EXPECTED_SHARDS_ARG);
if (expectedOuterShards != null && (!Number.isSafeInteger(expectedOuterShards) || expectedOuterShards < 1)) {
    throw new Error('--expected-shards must be a positive integer when supplied');
}
const TIMEOUT_EXIT_CODES = new Set([124, 143]);

const dirs = resolveMethodProbeShardDirs(STAGING_DIR);
const observedOuterShardIndexes = new Set();
function outerShardIndex(dir) {
    if (dir === '.') return 1;
    const match = /^method-probe-shard-(\d+)$/u.exec(dir);
    if (!match) throw new Error(`unrecognized method-probe outer shard artifact directory ${dir}`);
    return Number(match[1]);
}
for (const dir of dirs) {
    const index = outerShardIndex(dir);
    if (!Number.isSafeInteger(index) || index < 1) throw new Error(`invalid outer shard index in ${dir}`);
    if (expectedOuterShards != null && index > expectedOuterShards) {
        throw new Error(`outer shard ${index} exceeds authored shard count ${expectedOuterShards}`);
    }
    if (observedOuterShardIndexes.has(index)) {
        throw new Error(`duplicate outer shard identity ${index}; artifact directory spelling/order cannot create a second scientific shard`);
    }
    observedOuterShardIndexes.add(index);
}
const observedOuterShards = observedOuterShardIndexes.size;
const missingOuterShardIds = expectedOuterShards == null
    ? []
    : Array.from({ length: expectedOuterShards }, (_, i) => i + 1).filter(index => !observedOuterShardIndexes.has(index));
const missingOuterShardCount = missingOuterShardIds.length;
let allLevels = [];
let meta = null;
const missing = [];
const timedOutWithoutResult = [];

for (const d of dirs.sort()) {
    const shardPath = path.join(STAGING_DIR, d);
    const outerIndex = outerShardIndex(d);
    const names = readdirSync(shardPath);
    const files = names.filter(f => /^shard-\d+-w\d+\.json$/u.test(f)).sort();
    const logs = names.filter(f => /^shard-\d+-w\d+\.console\.log$/u.test(f));
    for (const name of [...files, ...logs]) {
        const fileOuterIndex = Number(/^shard-(\d+)-w\d+\./u.exec(name)?.[1]);
        if (fileOuterIndex !== outerIndex) {
            throw new Error(`outer shard identity mismatch: artifact ${d} contains ${name}`);
        }
    }
    if (files.length === 0 && logs.length === 0) { missing.push(d); continue; }

    // Every launched worker writes a console log immediately, while its JSON appears only if the
    // probe reaches normal report-writing. Use that pairing to expose partial outer shards.
    for (const log of logs) {
        const expectedJson = log.replace(/\.console\.log$/u, '.json');
        if (!names.includes(expectedJson)) {
            const statusName = log.replace(/\.console\.log$/u, '.exit-status');
            const status = names.includes(statusName)
                ? Number(readFileSync(path.join(shardPath, statusName), 'utf8').trim())
                : null;
            const label = `${d}/${expectedJson}`;
            if (TIMEOUT_EXIT_CODES.has(status)) timedOutWithoutResult.push(label);
            else missing.push(label);
        }
    }

    for (const file of files) {
        const data = JSON.parse(readFileSync(path.join(shardPath, file), 'utf8'));
        const thisMeta = {
            commit: data.commit ?? null,
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
const deterministicWorkMode = DETERMINISTIC_WORK_MODE_ARG == null
    ? meta?.workBudget != null
    : DETERMINISTIC_WORK_MODE_ARG === 'true';
const validDeterministicEvidence = deterministicWorkMode
    && missing.length === 0
    && missingOuterShardCount === 0
    && deadlineTruncatedIds.length === 0;
const combined = {
    ...meta,
    totalTested: allLevels.length,
    totalSolved: solved.length,
    deterministicWorkMode,
    validDeterministicEvidence,
    deadlineTruncatedIds,
    missingShards: missing,
    expectedOuterShards,
    observedOuterShards,
    missingOuterShardCount,
    missingOuterShardIds,
    levels: allLevels,
};

const timeoutCount = deadlineTruncatedIds.length + timedOutWithoutResult.length;
const researchOutcome = missingOuterShardCount > 0
    ? { outcome: 'harness-error', reason: `${missingOuterShardCount} outer shard artifact(s) were missing.` }
    : missing.length
    ? { outcome: 'harness-error', reason: `${missing.length} launched worker result(s) were missing.` }
    : timeoutCount
        ? { outcome: 'timeout', reason: `${timeoutCount} probe worker(s) or row(s) reached a deadline.` }
        : solved.length
            ? { outcome: 'completed-positive', reason: `${solved.length} level(s) were solved by the probed method.` }
            : { outcome: 'completed-negative', reason: 'The probe completed without solving a level.' };
combined.researchOutcome = researchOutcome;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(path.join(OUT_DIR, 'combined.json'), JSON.stringify(combined, null, 1));
const solvedIds = solved.map(l => l.id).sort();
writeFileSync(path.join(OUT_DIR, 'solved-ids.txt'), solvedIds.join('\n') + '\n');
if (OUTCOME_OUT) writeResearchWorkflowOutcome(OUTCOME_OUT, researchOutcome);

const summaryLines = [
    `# method-probe sweep: ${JSON.stringify(meta?.only)}`,
    '',
    `Corpus: \`${meta?.corpus}\` — tested ${allLevels.length}, solved ${solved.length}; work-budget=${meta?.workBudget ?? '(legacy wall-bounded)'}`,
    missing.length ? `\n**Missing worker results: ${missing.join(', ')}**` : '',
    timedOutWithoutResult.length ? `\n**Workers timed out before writing a result: ${timedOutWithoutResult.join(', ')}**` : '',
    deadlineTruncatedIds.length ? `\n**Deadline-truncated rows (invalid deterministic evidence): ${deadlineTruncatedIds.join(', ')}**` : '',
    '',
    '## Solved level IDs',
    '```',
    solvedIds.join('\n'),
    '```',
];
const summaryText = summaryLines.join('\n');
console.log(`Combined: ${allLevels.length} tested, ${solved.length} solved, ${missing.length} missing worker result(s), ${missingOuterShardCount} missing outer shard artifact(s)`);

if (process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, summaryText, { flag: 'a' });
} else {
    console.log(summaryText);
}

// A deadline in deterministic work mode invalidates the intended equal-work evidence and remains
// red. In legacy wall-bounded mode it is the probe's expected bounded stopping condition: publish
// `timeout`, preserve the partial evidence, and leave the workflow green.
if (missingOuterShardCount > 0 || missing.length || (deterministicWorkMode && timeoutCount)) process.exitCode = 2;
