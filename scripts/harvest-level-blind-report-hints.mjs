#!/usr/bin/env node
/** Recover canonical hint/provenance evidence from level-blind solver report artifacts.
 *
 * Some diagnostic/A-B workflows intentionally omitted --save-hints even though their shard reports
 * contain the solved path and persisted winning-attempt metadata. This harvester runs later on main,
 * reconstructs the same canonical provenance shape, referee-validates each path, and merges it into
 * data/stress/hints*. Thus experiment input isolation and evidence retention are separate concerns.
 *
 * If the source report's corpus hash differs from current main, the solve is not discarded or
 * misattributed. Its solved rows are written to a compact run-id evidence file under
 * reports/stress/pending-solver-evidence/ for later reconciliation against the source level shape.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createHintCapture } from './hint-capture-lib.mjs';
import { readLevelsWithHints } from './level-data-io.mjs';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [key, ...rest] = a.split('=');
    return [key, rest.join('=')];
}));
const root = path.resolve(new URL('..', import.meta.url).pathname);
const stagingDir = path.resolve(args.get('--staging-dir') || 'artifact-staging');
const sourceRunId = args.get('--source-run-id') || process.env.SOURCE_RUN_ID || 'unknown';
const sourceWorkflow = args.get('--source-workflow') || process.env.SOURCE_WORKFLOW || 'unknown';
if (!existsSync(stagingDir)) throw new Error(`staging directory does not exist: ${stagingDir}`);

const ALLOWED_CORPORA = new Set([
    'data/stress/stress-levels.json',
    'data/stress/stress-levels-random.json',
]);

const { parseRawLevel } = await import('../modules/domain/level-codec.js');
const { validateCandidatePath } = await import('../modules/domain/path-validator.js');

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (name.endsWith('.json')) out.push(full);
    }
    return out;
}
function sha256(file) {
    return createHash('sha256').update(readFileSync(file)).digest('hex');
}
function normalizeCorpus(value) {
    if (typeof value !== 'string') return null;
    const normalized = value.replaceAll('\\', '/').replace(/^\.\//u, '');
    const marker = normalized.indexOf('data/stress/');
    return marker >= 0 ? normalized.slice(marker) : normalized;
}

const corpusState = new Map();
function stateFor(corpusRel) {
    if (corpusState.has(corpusRel)) return corpusState.get(corpusRel);
    const corpusPath = path.join(root, corpusRel);
    const levels = readLevelsWithHints(corpusPath);
    const byId = new Map(levels.map((level, i) => [String(level.id ?? i + 1), { level, index: i }]));
    const state = { corpusPath, corpusSha256: sha256(corpusPath), levels, byId };
    corpusState.set(corpusRel, state);
    return state;
}

let reportsSeen = 0;
let reportsHarvested = 0;
let solvedRowsSeen = 0;
let recordChanges = 0;
const pending = [];
const seenReport = new Set();

for (const file of walk(stagingDir).sort()) {
    let document;
    try { document = JSON.parse(readFileSync(file, 'utf8')); } catch { continue; }
    const summary = document?.summary;
    const rows = document?.levels;
    if (!summary || summary.levelBlind !== true || !Array.isArray(rows)) continue;
    const corpusRel = normalizeCorpus(summary.corpus);
    if (!ALLOWED_CORPORA.has(corpusRel)) continue;

    const reportIdentity = JSON.stringify([
        summary.commit ?? null, corpusRel, summary.corpusSha256 ?? null, summary.sampleSha256 ?? null,
        summary.budgetMs ?? null, summary.nodeBudget ?? null, summary.workBudget ?? null,
        summary.enableFlags ?? [], summary.disableFlags ?? [], rows.map(r => r?.id ?? r?.level ?? null),
    ]);
    if (seenReport.has(reportIdentity)) continue;
    seenReport.add(reportIdentity);
    reportsSeen += 1;

    const solved = rows.filter(row => row?.ok && Array.isArray(row.solution) && row.solution.length > 0);
    solvedRowsSeen += solved.length;
    if (solved.length === 0) continue;

    const state = stateFor(corpusRel);
    if (summary.corpusSha256 && summary.corpusSha256 !== state.corpusSha256) {
        pending.push({
            sourceRunId, sourceWorkflow, artifactFile: path.relative(stagingDir, file),
            solverRef: summary.commit ?? null, corpus: corpusRel,
            sourceCorpusSha256: summary.corpusSha256, mainCorpusSha256: state.corpusSha256,
            budgetMs: summary.budgetMs ?? null, nodeBudget: summary.nodeBudget ?? null,
            workBudget: summary.workBudget ?? null, enableFlags: summary.enableFlags ?? [],
            disableFlags: summary.disableFlags ?? [], solvedRows: solved,
        });
        continue;
    }

    const capture = await createHintCapture({
        solverVersion: summary.commit ?? null,
        budgetMs: summary.budgetMs ?? null,
        enabled: true,
    });
    const targets = [];
    for (const row of solved) {
        const entry = row.id != null ? state.byId.get(String(row.id)) : state.levels[row.level - 1] ? { level: state.levels[row.level - 1], index: row.level - 1 } : null;
        if (!entry) throw new Error(`${file}: solved row ${row.id ?? row.level} not found in ${corpusRel}`);
        targets.push(entry.level);
    }
    await capture.prepare(targets);

    for (const row of solved) {
        const entry = row.id != null ? state.byId.get(String(row.id)) : { level: state.levels[row.level - 1], index: row.level - 1 };
        const parsed = parseRawLevel(entry.level, entry.index);
        if (!parsed) throw new Error(`${file}: cannot parse canonical level ${row.id ?? row.level}`);
        const verdict = validateCandidatePath(parsed, row.solution);
        if (!verdict.ok) throw new Error(`${file}: referee rejected ${row.id ?? row.level}: ${verdict.reason}`);
        const syntheticResult = {
            ok: true,
            status: row.status === 'success' ? 'success' : 'success',
            solution: row.solution,
            attempts: Array.isArray(row.attempts) ? row.attempts : [],
            nodesExpanded: row.nodesExpanded ?? undefined,
            totalMs: row.totalMs ?? row.elapsedMs ?? undefined,
            workSpent: row.workSpent ?? undefined,
            workBudget: summary.workBudget ?? undefined,
        };
        if (capture.record(entry.level, syntheticResult)) recordChanges += 1;
    }
    capture.flush(state.corpusPath, state.levels);
    reportsHarvested += 1;
}

if (pending.length > 0) {
    const pendingDir = path.join(root, 'reports/stress/pending-solver-evidence');
    mkdirSync(pendingDir, { recursive: true });
    const out = path.join(pendingDir, `run-${sourceRunId}.json`);
    writeFileSync(out, `${JSON.stringify({ schemaVersion: 1, sourceRunId, sourceWorkflow, reports: pending }, null, 2)}\n`);
    console.log(`Quarantined ${pending.length} corpus-mismatched report(s) to ${path.relative(root, out)}.`);
}

console.log(`Level-blind evidence harvest: ${reportsSeen} report(s), ${reportsHarvested} merged, ${solvedRowsSeen} solved row(s), ${recordChanges} new hint/provenance record change(s), ${pending.length} pending report(s).`);
