#!/usr/bin/env node
/** Execute exact prefix-feasibility cases through the existing cpsat-full-probe.py model.
 * This is an execution seam, not a new oracle: it supplies explicit --prefix cases, preserves
 * live/dead/timeout labels, and referee-checks every SAT witness before reporting it live.
 *
 * --shard-index/--shard-count (1-based) partition the already-selected --max-cases population by
 * stable round-robin index. This lets GitHub Actions distribute independent CP-SAT cases across
 * runners without changing which cases belong to the experiment or duplicating work. */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { classifyProbeProcess, extractExplicitPrefixCases, parseEmittedPath } from './cpsat-explicit-prefix-oracle-lib.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const [key, ...rest] = x.split('='); return [key, rest.join('=')];
}));
const required = key => { const value = args.get(key); if (!value) throw new Error(`missing ${key}`); return value; };
const casesFile = required('--cases');
const format = args.get('--format') ?? 'cases';
const cliCorpus = args.get('--corpus') ?? null;
const timeLimit = Number(args.get('--time-limit') ?? 60);
const maxCases = Number(args.get('--max-cases') ?? Number.POSITIVE_INFINITY);
const shardIndex = Number(args.get('--shard-index') ?? 1);
const shardCount = Number(args.get('--shard-count') ?? 1);
const outFile = args.get('--out') ?? 'reports/stress/cpsat-explicit-prefix-oracle.json';
if (!(timeLimit > 0)) throw new Error('--time-limit must be positive');
if (!(maxCases > 0)) throw new Error('--max-cases must be positive');
if (!Number.isInteger(shardCount) || shardCount < 1) throw new Error('--shard-count must be a positive integer');
if (!Number.isInteger(shardIndex) || shardIndex < 1 || shardIndex > shardCount) {
    throw new Error('--shard-index must be an integer between 1 and --shard-count');
}

const sourceDocument = JSON.parse(readFileSync(casesFile, 'utf8'));
const selectedCases = extractExplicitPrefixCases(sourceDocument, { format, corpus: cliCorpus }).slice(0, maxCases);
if (!selectedCases.length) throw new Error(`no explicit prefix cases selected from ${casesFile}`);
const cases = selectedCases.filter((_, index) => index % shardCount === shardIndex - 1);
console.log(`Explicit-prefix oracle shard ${shardIndex}/${shardCount}: ${cases.length}/${selectedCases.length} selected case(s).`);

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/Solver.ts');
const Solver = createSolver();
const probePath = 'scripts/stress/cpsat-full-probe.py';
const git = (...gitArgs) => execFileSync('git', gitArgs, { encoding: 'utf8' }).trim();
const solverRef = git('rev-parse', 'HEAD');
const corpusCache = new Map();
const levelCache = new Map();
const prepCache = new Map();
const loadRawLevel = (corpus, levelId) => {
    if (!corpusCache.has(corpus)) {
        const document = JSON.parse(readFileSync(corpus, 'utf8'));
        const levels = Array.isArray(document) ? document : document.levels;
        corpusCache.set(corpus, new Map(levels.map(level => [String(level.id), level])));
    }
    const raw = corpusCache.get(corpus).get(String(levelId));
    if (!raw) throw new Error(`${levelId} not found in ${corpus}`);
    return raw;
};
const prepareLevel = (corpus, levelId) => {
    const key = `${corpus}\0${levelId}`;
    if (!levelCache.has(key)) levelCache.set(key, Solver.prepareLevelForSolver(loadRawLevel(corpus, levelId), { source: 'raw' }));
    return levelCache.get(key);
};
const prepareReplay = (corpus, levelId) => {
    const key = `${corpus}\0${levelId}`;
    const level = prepareLevel(corpus, levelId);
    if (!prepCache.has(key)) { const prep = api.prepLevel(level); prep._cfg = null; prepCache.set(key, prep); }
    return { level, prep: prepCache.get(key) };
};
// The case/CP-SAT representation is raw level coordinates (1-based); native solver keys are 0-based.
const packRaw = ([x, y]) => (((x - 1) & 0xffff) | (((y - 1) & 0xffff) << 16));
const replayPrefix = item => {
    const { level, prep } = prepareReplay(item.corpus, item.levelId);
    for (let i = 0; i < item.prefix.length; i++) {
        const [x, y] = item.prefix[i];
        if (x < 1 || x > level.grid.w || y < 1 || y > level.grid.h) return { ok: false, reason: 'out-of-grid', invalidAt: i };
    }
    const keys = item.prefix.map(packRaw);
    if (!prep.gateFlags[keys[0]]) return { ok: false, reason: 'prefix-does-not-start-at-gate', invalidAt: 0, next: keys[0] };
    const state = api.createState(keys[0], level, prep);
    for (let i = 1; i < keys.length; i++) {
        const from = state.path.at(-1), next = keys[i];
        if (!api.getNeighbors(from, state, level, prep).includes(next)) return { ok: false, reason: 'illegal-native-step', invalidAt: i, from, next };
        const portal = level.portalMap.get(from);
        api.applyMove(next, state, level, prep, !!(portal && portal.dest === next));
    }
    return { ok: true };
};

const rows = [];
let correctnessAlarms = 0, inputAlarms = 0;
for (const item of cases) {
    const legality = replayPrefix(item);
    if (!legality.ok) {
        inputAlarms++;
        rows.push({
            schemaVersion: 1, caseId: item.id, levelId: item.levelId, corpus: item.corpus, prefix: item.prefix,
            depth: item.depth, sourceLabel: item.sourceLabel, oracleLabel: 'timeout/abstain', oracleReason: 'native-prefix-illegal',
            inputAlarm: true, inputReason: legality.reason, invalidAt: legality.invalidAt, from: legality.from, next: legality.next,
            timeLimitSec: timeLimit,
        });
        console.log(`${item.id}: timeout/abstain (native-prefix-illegal:${legality.reason})`);
        continue;
    }

    const prefixJson = JSON.stringify(item.prefix);
    const result = spawnSync('python3', [probePath, item.levelId, String(timeLimit), '--emit-path', `--corpus=${item.corpus}`, `--prefix=${prefixJson}`], {
        encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    });
    const exitCode = result.status ?? (result.error ? -1 : 0);
    const classified = classifyProbeProcess({ stdout: result.stdout ?? '', stderr: result.stderr ?? '', exitCode });
    const row = {
        schemaVersion: 1, caseId: item.id, levelId: item.levelId, corpus: item.corpus, prefix: item.prefix,
        depth: item.depth, sourceLabel: item.sourceLabel, oracleLabel: classified.label, oracleReason: classified.reason,
        cpSatStatus: classified.status ?? null, timeLimitSec: timeLimit, exitCode,
    };
    if (classified.label === 'live') {
        const emitted = parseEmittedPath(result.stdout ?? '');
        if (!emitted) {
            row.oracleLabel = 'timeout/abstain'; row.oracleReason = 'sat-without-emitted-path';
            correctnessAlarms++;
            row.correctnessAlarm = true;
        } else {
            const level = prepareLevel(item.corpus, item.levelId);
            const verdict = Solver.validateCandidatePath(level, emitted.map(packRaw));
            row.refereeValid = verdict.ok;
            row.refereeReason = verdict.ok ? null : verdict.reason;
            row.emittedPath = emitted;
            if (!verdict.ok) {
                row.oracleLabel = 'timeout/abstain'; row.oracleReason = 'sat-witness-referee-rejected';
                row.correctnessAlarm = true; correctnessAlarms++;
            }
        }
    }
    if (result.error) row.processError = String(result.error.message ?? result.error);
    if (row.oracleLabel === 'timeout/abstain' && result.stderr) row.stderrTail = result.stderr.slice(-2000);
    rows.push(row);
    console.log(`${item.id}: ${row.oracleLabel} (${row.oracleReason})`);
}

const count = label => rows.filter(row => row.oracleLabel === label).length;
const document = {
    schemaVersion: 1, generatedAt: new Date().toISOString(), solverRef, technique: 'cpsat-full-probe-explicit-prefix',
    sourceCases: casesFile, sourceFormat: format, coordinateConvention: 'raw-level-1-based', requestedTimeLimitSec: timeLimit,
    shardIndex, shardCount, selectedCaseCount: selectedCases.length,
    summary: { cases: rows.length, live: count('live'), dead: count('dead'), abstain: count('timeout/abstain'), correctnessAlarms, inputAlarms },
    rows,
    caution: 'CP-SAT labels are oracle/reference evidence, not native-solver solves. Illegal prefixes, timeouts, unsupported mechanics, model errors, and referee-rejected SAT witnesses remain abstentions.',
};
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Wrote ${outFile}: ${document.summary.live} live / ${document.summary.dead} dead / ${document.summary.abstain} abstain`);
if (correctnessAlarms || inputAlarms) process.exitCode = 2;
