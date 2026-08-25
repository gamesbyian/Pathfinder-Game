#!/usr/bin/env node
/** Harvest referee-valid paths from method-probe and technique-census artifacts.
 *
 * These tools deliberately bypass the production ladder. Their discoveries are still useful hints,
 * but provenance MUST carry context.isolatedTechnique=true. The canonical hint-capture helper owns
 * that distinction, so this importer reconstructs a SolveResult-like shape from persisted output and
 * feeds it through the same helper rather than hand-writing provenance.
 */
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
const sourceSha = args.get('--source-sha') || process.env.SOURCE_SHA || null;
const sourceRunId = args.get('--source-run-id') || process.env.SOURCE_RUN_ID || 'unknown';
const sourceWorkflow = args.get('--source-workflow') || process.env.SOURCE_WORKFLOW || 'unknown';
if (!existsSync(stagingDir)) throw new Error(`staging directory does not exist: ${stagingDir}`);

const CORPUS_BY_LABEL = {
    published: 'data/levels.json',
    corpus1: 'data/stress/stress-levels.json',
    corpus2: 'data/stress/stress-levels-random.json',
};
const ALLOWED = new Set(Object.values(CORPUS_BY_LABEL));
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
function normalizeCorpus(value) {
    if (typeof value !== 'string') return null;
    const normalized = value.replaceAll('\\', '/').replace(/^\.\//u, '');
    const marker = normalized.indexOf('data/');
    return marker >= 0 ? normalized.slice(marker) : normalized;
}
const states = new Map();
function stateFor(corpusRel) {
    if (states.has(corpusRel)) return states.get(corpusRel);
    const corpusPath = path.join(root, corpusRel);
    const levels = readLevelsWithHints(corpusPath);
    const byId = new Map(levels.map((level, i) => [String(level.id ?? i + 1), { level, index: i }]));
    const state = { corpusPath, levels, byId };
    states.set(corpusRel, state);
    return state;
}

const pending = [];
let documentsSeen = 0;
let solvedSeen = 0;
let changes = 0;
const seenDocument = new Set();

async function harvestRows({ corpusRel, rows, budgetMs = null, identity }) {
    if (!ALLOWED.has(corpusRel) || !Array.isArray(rows)) return;
    const solved = rows.filter(r => r?.ok && Array.isArray(r.solution) && r.solution.length > 0);
    if (!solved.length) return;
    const dedupeKey = `${identity}|${corpusRel}|${JSON.stringify(solved.map(r => [r.id ?? r.levelId ?? r.levelPos, r.solution]))}`;
    if (seenDocument.has(dedupeKey)) return;
    seenDocument.add(dedupeKey);
    documentsSeen += 1;
    solvedSeen += solved.length;

    const state = stateFor(corpusRel);
    const capture = await createHintCapture({ solverVersion: sourceSha, budgetMs, enabled: true, isolatedTechnique: true });
    const resolved = [];
    for (const row of solved) {
        const id = row.id ?? row.levelId ?? null;
        const pos = Number(row.levelPos ?? row.level ?? 0);
        const entry = id != null ? state.byId.get(String(id)) : (pos > 0 ? { level: state.levels[pos - 1], index: pos - 1 } : null);
        if (!entry?.level) {
            pending.push({ corpus: corpusRel, reason: 'level-not-found-on-main', row });
            continue;
        }
        const parsed = parseRawLevel(entry.level, entry.index);
        const verdict = parsed ? validateCandidatePath(parsed, row.solution) : { ok: false, reason: 'level-parse-failed' };
        if (!verdict.ok) {
            pending.push({ corpus: corpusRel, reason: `main-referee-rejected:${verdict.reason}`, row });
            continue;
        }
        resolved.push({ row, entry });
    }
    if (!resolved.length) return;
    await capture.prepare(resolved.map(x => x.entry.level));
    for (const { row, entry } of resolved) {
        const result = {
            ok: true,
            status: 'success',
            solution: row.solution,
            attempts: Array.isArray(row.attempts) ? row.attempts : [],
            nodesExpanded: row.nodesExpanded ?? undefined,
            totalMs: row.totalMs ?? row.elapsedMs ?? undefined,
            workSpent: row.workSpent ?? undefined,
        };
        if (capture.record(entry.level, result)) changes += 1;
    }
    capture.flush(state.corpusPath, state.levels);
}

for (const file of walk(stagingDir).sort()) {
    let doc;
    try { doc = JSON.parse(readFileSync(file, 'utf8')); } catch { continue; }

    // method-probe shard/combined result.
    const methodCorpus = normalizeCorpus(doc?.corpus);
    if (ALLOWED.has(methodCorpus) && Array.isArray(doc?.levels) && Array.isArray(doc?.only)) {
        await harvestRows({
            corpusRel: methodCorpus,
            rows: doc.levels,
            budgetMs: doc.budgetMs ?? null,
            identity: `method-probe:${JSON.stringify(doc.only)}`,
        });
        continue;
    }

    // technique-census combined-cells.json. One file can span all three corpora.
    if (Array.isArray(doc?.results) && doc.results.some(r => r?.cellId && r?.corpus && r?.techniqueKeys)) {
        for (const [label, corpusRel] of Object.entries(CORPUS_BY_LABEL)) {
            const rows = doc.results.filter(r => r.corpus === label);
            await harvestRows({ corpusRel, rows, budgetMs: null, identity: `technique-census:${sourceRunId}:${label}` });
        }
    }
}

if (pending.length) {
    const dir = path.join(root, 'reports/stress/pending-solver-evidence');
    mkdirSync(dir, { recursive: true });
    const out = path.join(dir, `run-${sourceRunId}-isolated.json`);
    writeFileSync(out, `${JSON.stringify({ schemaVersion: 1, sourceRunId, sourceWorkflow, sourceSha, pending }, null, 2)}\n`);
    console.log(`Quarantined ${pending.length} isolated solve(s) that could not be safely merged to ${path.relative(root, out)}.`);
}
console.log(`Isolated evidence harvest: ${documentsSeen} report group(s), ${solvedSeen} solved row(s), ${changes} canonical hint/provenance change(s), ${pending.length} pending row(s).`);
