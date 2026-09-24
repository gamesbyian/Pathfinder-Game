#!/usr/bin/env node
/**
 * Central semantic adapter for history-aware portfolio-solve-sweep reports.
 *
 * Important semantic point: these workflows are "history-aware" because baseline/prime/cache inputs
 * affect solver policy. The Pathfinder solver itself does not read persisted Hint paths during
 * solveLevel(); a same-path solution is therefore a legitimate rediscovery, not "hint-guided replay".
 *
 * Transitional Phase-6 posture: direct --save-hints files may still be merged first. This adapter
 * reconstructs the report observation independently and exact-merges it through canonical Hint
 * semantics so parity can be measured before retiring the direct route.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
    readLevelCorpusDocumentWithHints,
    writeLevelCorpusDocumentWithHints,
} from './level-data-io.mjs';
import {
    buildHintIngestionReceipt,
    countHintStoreSemanticUnits,
    validateHintIngestionReceipt,
} from './hint-ingestion-receipt-lib.mjs';
import {
    buildHintDiscoveryIngestionObservation,
    hintFromDiscoveryIngestionObservation,
} from './hint-discovery-ingestion-projection-lib.mjs';
import { parseRawLevel } from '../modules/domain/level-codec.js';
import { validateCandidatePath } from '../modules/domain/path-validator.js';
import { getLevelFingerprint } from '../modules/domain/level-fingerprint.js';
import { provenanceFromHistoricalSolveResult } from '../modules/solver/hint-provenance.js';
import { mergeHints, setLevelHintRecords } from '../modules/domain/hint-types.js';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(arg => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=')];
}));
const root = path.resolve(new URL('..', import.meta.url).pathname);
const stagingDir = path.resolve(args.get('--staging-dir') || 'artifact-staging');
const sourceRunId = args.get('--source-run-id') || process.env.SOURCE_RUN_ID || 'unknown';
const sourceRunAttempt = args.get('--source-run-attempt') || process.env.SOURCE_RUN_ATTEMPT || null;
const sourceWorkflow = args.get('--source-workflow') || process.env.SOURCE_WORKFLOW || 'unknown';
const receiptArg = args.get('--ingestion-receipt-out');
const ingestionReceiptOut = receiptArg ? path.resolve(receiptArg) : null;
if (!existsSync(stagingDir)) throw new Error(`staging directory does not exist: ${stagingDir}`);

const ALLOWED_CORPORA = new Set([
    'data/stress/stress-levels.json',
    'data/stress/stress-levels-random.json',
]);

function normalizeCorpus(value) {
    if (typeof value !== 'string') return null;
    const normalized = value.replaceAll('\\', '/').replace(/^\.\//u, '');
    const marker = normalized.indexOf('data/stress/');
    return marker >= 0 ? normalized.slice(marker) : normalized;
}

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (name.endsWith('.json')) out.push(full);
    }
    return out;
}

const corpusState = new Map();
function stateFor(corpusRel) {
    if (corpusState.has(corpusRel)) return corpusState.get(corpusRel);
    const corpusPath = path.join(root, corpusRel);
    const document = readLevelCorpusDocumentWithHints(corpusPath);
    const levels = document.levels;
    const byId = new Map(levels.map((level, index) => [String(level.id ?? index + 1), { level, index }]));
    const state = { corpusPath, document, levels, byId, changedHintLevels: new Set() };
    corpusState.set(corpusRel, state);
    return state;
}

let reportsSeen = 0;
let candidateObservations = 0;
let eligibleObservations = 0;
let refereeAcceptedObservations = 0;
let acceptedAlreadyRepresented = 0;
let semanticRecordChanges = 0;
let pathAdditions = 0;
let provenanceEventAdditions = 0;
let occurrenceAdditions = 0;
const pending = [];
const seenReports = new Set();

for (const file of walk(stagingDir).sort()) {
    let document;
    try { document = JSON.parse(readFileSync(file, 'utf8')); } catch { continue; }
    const summary = document?.summary;
    const rows = document?.levels;
    if (summary?.producer !== 'portfolio-solve-sweep'
        || summary?.levelBlind !== false
        || !Array.isArray(rows)) continue;

    const corpusRel = normalizeCorpus(summary.corpus);
    if (!ALLOWED_CORPORA.has(corpusRel)) continue;

    const reportIdentity = JSON.stringify([
        summary.commit ?? null,
        corpusRel,
        summary.solverRequestIdentity ?? null,
        summary.effectiveConfigDigest ?? null,
        summary.generatedAt ?? null,
        rows.map(row => [row?.id ?? row?.level ?? null, row?.levelRevision ?? null, row?.discoveryObservedAt ?? null]),
    ]);
    if (seenReports.has(reportIdentity)) continue;
    seenReports.add(reportIdentity);
    reportsSeen += 1;

    const solvedRows = rows.filter(row => row?.ok && Array.isArray(row.solution) && row.solution.length > 0);
    candidateObservations += solvedRows.length;
    const state = stateFor(corpusRel);

    for (const row of solvedRows) {
        const entry = row.id != null
            ? state.byId.get(String(row.id))
            : state.levels[row.level - 1]
                ? { level: state.levels[row.level - 1], index: row.level - 1 }
                : null;
        if (!entry) {
            pending.push({ sourceFile: path.relative(stagingDir, file), reason: 'level-not-found-on-main', corpus: corpusRel, row });
            continue;
        }
        if (typeof row.levelRevision !== 'string' || row.levelRevision.length === 0) {
            pending.push({ sourceFile: path.relative(stagingDir, file), reason: 'missing-source-level-revision', corpus: corpusRel, row });
            continue;
        }
        const currentRevision = await getLevelFingerprint(entry.level);
        if (currentRevision !== row.levelRevision) {
            pending.push({
                sourceFile: path.relative(stagingDir, file),
                reason: 'level-revision-mismatch',
                corpus: corpusRel,
                sourceLevelRevision: row.levelRevision,
                mainLevelRevision: currentRevision,
                row,
            });
            continue;
        }
        if (typeof row.discoveryObservedAt !== 'string' || !Number.isFinite(Date.parse(row.discoveryObservedAt))) {
            pending.push({ sourceFile: path.relative(stagingDir, file), reason: 'missing-or-invalid-discovery-time', corpus: corpusRel, row });
            continue;
        }

        const parsed = parseRawLevel(entry.level, entry.index);
        if (!parsed) {
            pending.push({ sourceFile: path.relative(stagingDir, file), reason: 'canonical-level-parse-failed', corpus: corpusRel, row });
            continue;
        }
        eligibleObservations += 1;
        const verdict = validateCandidatePath(parsed, row.solution);
        if (!verdict.ok) {
            pending.push({
                sourceFile: path.relative(stagingDir, file),
                reason: `main-referee-rejected:${verdict.reason}`,
                corpus: corpusRel,
                row,
            });
            continue;
        }
        refereeAcceptedObservations += 1;

        const provenance = provenanceFromHistoricalSolveResult({
            attempts: Array.isArray(row.attempts) ? row.attempts : [],
            nodesExpanded: Number.isFinite(row.nodesExpanded) ? row.nodesExpanded : undefined,
            totalMs: Number.isFinite(row.totalMs) ? row.totalMs
                : Number.isFinite(row.elapsedMs) ? row.elapsedMs : undefined,
            status: 'success',
            workSpent: Number.isFinite(row.workSpent) ? row.workSpent : undefined,
            workBudget: Number.isFinite(row.workBudget) ? row.workBudget : undefined,
        }, {
            solverVersion: typeof summary.commit === 'string' ? summary.commit : null,
            foundAt: row.discoveryObservedAt,
            budgetMs: Number.isFinite(summary.budgetMs) ? summary.budgetMs : null,
            usedExistingHints: false,
            levelRevision: row.levelRevision,
            ...(typeof summary.solverRequestIdentity === 'string' && summary.solverRequestIdentity
                ? { solverRequestIdentity: summary.solverRequestIdentity } : {}),
            ...(typeof summary.reproducibilityMode === 'string' && summary.reproducibilityMode
                ? { reproducibilityMode: summary.reproducibilityMode } : {}),
            ...(typeof summary.staticPortfolioArm === 'string' && summary.staticPortfolioArm
                ? { executionArm: summary.staticPortfolioArm } : {}),
            ...(sourceRunId !== 'unknown'
                ? {
                    occurrenceRunId: sourceRunId,
                    ...(sourceRunAttempt ? { occurrenceRunAttempt: sourceRunAttempt } : {}),
                }
                : {}),
        });

        const observation = buildHintDiscoveryIngestionObservation({
            producer: 'portfolio-solve-sweep',
            sourceArtifact: path.relative(stagingDir, file),
            sourceRunId: sourceRunId !== 'unknown' ? sourceRunId : null,
            sourceRunAttempt,
            corpus: corpusRel,
            levelId: String(entry.level.id ?? row.id ?? row.level),
            levelRevision: row.levelRevision,
            path: verdict.path,
            provenance,
        });

        const beforeHints = entry.level.hintRecords ?? [];
        const before = countHintStoreSemanticUnits(beforeHints);
        const merged = mergeHints(beforeHints, [hintFromDiscoveryIngestionObservation(observation)]);
        const after = countHintStoreSemanticUnits(merged);
        const pathDelta = after.paths - before.paths;
        const provenanceDelta = after.provenanceEvents - before.provenanceEvents;
        const occurrenceDelta = after.occurrences - before.occurrences;

        if (pathDelta || provenanceDelta || occurrenceDelta) {
            semanticRecordChanges += 1;
            pathAdditions += pathDelta;
            provenanceEventAdditions += provenanceDelta;
            occurrenceAdditions += occurrenceDelta;
            setLevelHintRecords(entry.level, merged);
            state.changedHintLevels.add(entry.level);
        } else {
            acceptedAlreadyRepresented += 1;
        }
    }
}

let filesChanged = 0;
for (const state of corpusState.values()) {
    if (state.changedHintLevels.size === 0) continue;
    const result = writeLevelCorpusDocumentWithHints(state.corpusPath, state.document, {
        changedHintLevels: state.changedHintLevels,
    });
    filesChanged += result.hintFilesChanged ?? 0;
}

if (pending.length) {
    const dir = path.join(root, 'reports/stress/pending-solver-evidence');
    mkdirSync(dir, { recursive: true });
    const out = path.join(dir, `run-${sourceRunId}-portfolio-discoveries.json`);
    writeFileSync(out, `${JSON.stringify({
        schemaVersion: 1,
        sourceRunId,
        sourceRunAttempt,
        sourceWorkflow,
        pending,
    }, null, 2)}\n`);
    console.log(`Quarantined ${pending.length} portfolio discovery observation(s) to ${path.relative(root, out)}.`);
}

if (ingestionReceiptOut) {
    const receipt = buildHintIngestionReceipt({
        producer: 'harvest-portfolio-solve-sweep-reports',
        sourceRunId,
        sourceRunAttempt,
        sourceWorkflow,
        candidateObservations,
        eligibleObservations,
        refereeAcceptedObservations,
        acceptedAlreadyRepresented,
        semanticRecordChanges,
        pathAdditions,
        provenanceEventAdditions,
        occurrenceAdditions,
        filesChanged,
        pending,
        corpusScope: [...ALLOWED_CORPORA].sort(),
        notes: 'history-aware policy reconstruction from portfolio-solve-sweep report; solver execution itself is not hint-guided and same-path results are retained as rediscovery evidence',
    });
    validateHintIngestionReceipt(receipt);
    mkdirSync(path.dirname(ingestionReceiptOut), { recursive: true });
    writeFileSync(ingestionReceiptOut, `${JSON.stringify(receipt, null, 2)}\n`);
    console.log(`Wrote hint-ingestion receipt to ${path.relative(root, ingestionReceiptOut)}.`);
}

console.log(
    `Portfolio evidence harvest: ${reportsSeen} report(s), ${candidateObservations} candidate(s), `
    + `${eligibleObservations} eligible, ${refereeAcceptedObservations} referee-accepted, `
    + `${semanticRecordChanges} semantic change(s), ${pathAdditions} path / `
    + `${provenanceEventAdditions} provenance-event / ${occurrenceAdditions} occurrence addition(s), `
    + `${filesChanged} file(s) changed, ${pending.length} pending.`,
);
