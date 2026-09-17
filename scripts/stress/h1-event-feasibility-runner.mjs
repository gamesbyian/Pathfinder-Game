#!/usr/bin/env node
/**
 * Executes the frozen H1 event-feasibility query list (scripts/stress/h1-event-feasibility-query-
 * builder.mjs's output) through cpsat-reference-probe.py's new --pin hook, one extra CP-SAT solve
 * per query on top of the already-validated full-mechanic feasibility model. Every claimed-live
 * (SAT) result is referee-validated via Solver.validateCandidatePath before being trusted, exactly
 * as scripts/stress/cpsat-explicit-prefix-reference.mjs's base LIVE/DEAD labelling already
 * requires -- this script reuses that file's own classifyProbeProcess/parseEmittedPath helpers
 * rather than re-deriving the parsing contract.
 *
 * Queries are independent CP-SAT solves, so a small bounded worker pool runs them concurrently.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { classifyProbeProcess, parseEmittedPath } from './cpsat-explicit-prefix-reference-lib.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => { const [k, ...v] = x.split('='); return [k, v.join('=')]; }));
const queriesFile = args.get('--queries') ?? 'reports/stress/h1-event-feasibility-queries.json';
const outFile = args.get('--out') ?? 'reports/stress/h1-event-feasibility-results.json';
const timeLimit = Number(args.get('--time-limit') ?? 45);
const concurrency = Number(args.get('--concurrency') ?? 3);
const startIndex = Number(args.get('--start') ?? 0);
const endIndex = args.has('--end') ? Number(args.get('--end')) : Infinity;

installBrowserStubs();
const { createSolver } = await import('../../modules/solver.js');
const Solver = createSolver();
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const solverRef = git('rev-parse', 'HEAD');

const doc = JSON.parse(readFileSync(queriesFile, 'utf8'));
const preparedCache = new Map();
function preparedLevel(corpus, levelId) {
    const key = `${corpus}\0${levelId}`;
    if (!preparedCache.has(key)) {
        const rawDoc = JSON.parse(readFileSync(corpus, 'utf8'));
        const rawLevels = Array.isArray(rawDoc) ? rawDoc : rawDoc.levels;
        const raw = rawLevels.find(l => String(l.id) === String(levelId));
        preparedCache.set(key, Solver.prepareLevelForSolver(raw, { source: 'raw' }));
    }
    return preparedCache.get(key);
}

const rows = [];
for (const state of doc.states) {
    state.queries.forEach((query, queryIndex) => {
        rows.push({
            caseId: state.caseId, levelId: state.levelId, role: state.role, exactLabel: state.exactLabel,
            corpus: state.corpus, prefixXY: state.prefixXY, queryIndex, query,
            queryId: `${state.caseId}::q${queryIndex}:${query.type}`,
        });
    });
}
const selected = rows.slice(startIndex, Number.isFinite(endIndex) ? endIndex : rows.length);
console.log(`H1 event-feasibility runner: ${selected.length}/${rows.length} queries selected (start=${startIndex}), concurrency=${concurrency}, timeLimit=${timeLimit}s`);

function runOne(row) {
    return new Promise(resolve => {
        const prefixJson = JSON.stringify(row.prefixXY);
        const pinJson = JSON.stringify(row.query);
        const child = spawn('python3', [
            'scripts/stress/cpsat-reference-probe.py', row.levelId, String(timeLimit),
            '--emit-path', `--corpus=${row.corpus}`, `--prefix=${prefixJson}`, `--pin=${pinJson}`,
        ], { stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '', stderr = '';
        child.stdout.on('data', d => { stdout += d; });
        child.stderr.on('data', d => { stderr += d; });
        child.on('close', exitCode => resolve({ stdout, stderr, exitCode }));
        child.on('error', error => resolve({ stdout, stderr: String(error), exitCode: -1 }));
    });
}

async function worker(queue, results) {
    while (queue.length) {
        const row = queue.shift();
        const result = await runOne(row);
        const classified = classifyProbeProcess(result);
        const outRow = {
            queryId: row.queryId, caseId: row.caseId, levelId: row.levelId, role: row.role, exactLabel: row.exactLabel,
            query: row.query, referenceLabel: classified.label, referenceReason: classified.reason, cpSatStatus: classified.status ?? null,
            timeLimitSec: timeLimit, exitCode: result.exitCode,
        };
        if (classified.label === 'live') {
            const emitted = parseEmittedPath(result.stdout ?? '');
            if (!emitted) {
                outRow.referenceLabel = 'timeout/abstain'; outRow.referenceReason = 'sat-without-emitted-path'; outRow.correctnessAlarm = true;
            } else {
                const level = preparedLevel(row.corpus, row.levelId);
                const packRaw = ([x, y]) => (((x - 1) & 0xffff) | (((y - 1) & 0xffff) << 16));
                const verdict = Solver.validateCandidatePath(level, emitted.map(packRaw));
                outRow.refereeValid = verdict.ok;
                if (!verdict.ok) { outRow.referenceLabel = 'timeout/abstain'; outRow.referenceReason = 'sat-witness-referee-rejected'; outRow.correctnessAlarm = true; }
            }
        }
        results.push(outRow);
        console.log(`[${results.length}/${queue.length + results.length}] ${row.queryId}: ${outRow.referenceLabel} (${outRow.referenceReason})`);
    }
}

const queue = [...selected];
const results = [];
await Promise.all(Array.from({ length: Math.min(concurrency, queue.length || 1) }, () => worker(queue, results)));

const byLabel = label => results.filter(r => r.referenceLabel === label).length;
const document = {
    schemaVersion: 1,
    kind: 'h1-event-feasibility-results',
    generatedAt: new Date().toISOString(),
    solverRef,
    sourceQueries: queriesFile,
    requestedRange: { startIndex, endIndex: Number.isFinite(endIndex) ? endIndex : rows.length, totalRows: rows.length },
    timeLimitSec: timeLimit,
    summary: { total: results.length, live: byLabel('live'), dead: byLabel('dead'), abstain: byLabel('timeout/abstain'), correctnessAlarms: results.filter(r => r.correctnessAlarm).length },
    rows: results,
};
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
console.log(JSON.stringify(document.summary, null, 2));
