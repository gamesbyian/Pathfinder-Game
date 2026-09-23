#!/usr/bin/env node
/**
 * Central semantic adapter for pathfinder-cpsat-hint-discovery-report artifacts.
 *
 * CP-SAT remains an external/specialist producer. This adapter does not reinterpret it as native
 * Pathfinder capability; it projects referee-valid exact successful observations into canonical
 * Hint provenance while preserving EXTERNAL_SOLVER_ID and physical source-run occurrence lineage.
 *
 * Direct captured-hint transport remains in place during Phase-6 parity. Because occurrence lineage
 * is excluded from semantic provenance-event identity, re-harvesting the same semantic CP-SAT
 * discovery from this report should merge the source-run occurrence rather than manufacture a
 * duplicate discovery event.
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
import { parseRawLevel } from '../modules/domain/level-codec.js';
import { validateCandidatePath } from '../modules/domain/path-validator.ts';
import { getLevelFingerprint } from '../modules/domain/level-fingerprint.ts';
import {
    EXTERNAL_SOLVER_ID,
    makeProvenanceEntry,
    mergeHints,
    setLevelHintRecords,
} from '../modules/domain/hint-types.ts';
import {
    buildHintDiscoveryIngestionObservation,
    hintFromDiscoveryIngestionObservation,
} from './hint-discovery-ingestion-projection-lib.mjs';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--')).map(arg => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=')];
}));
const root = path.resolve(new URL('..', import.meta.url).pathname);
const stagingDir = path.resolve(args.get('--staging-dir') || 'artifact-staging');
const sourceRunId = args.get('--source-run-id') || process.env.SOURCE_RUN_ID || 'unknown';
const sourceRunAttempt = args.get('--source-run-attempt') || process.env.SOURCE_RUN_ATTEMPT || null;
const sourceWorkflow = args.get('--source-workflow') || process.env.SOURCE_WORKFLOW || 'unknown';
const ingestionReceiptArg = args.get('--ingestion-receipt-out');
const ingestionReceiptOut = ingestionReceiptArg ? path.resolve(ingestionReceiptArg) : null;
if (!existsSync(stagingDir)) throw new Error(`staging directory does not exist: ${stagingDir}`);

const ALLOWED = new Set([
    'data/levels.json',
    'data/stress/stress-levels-random.json',
]);

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) walk(full, out);
        else out.push(full);
    }
    return out;
}

function normalizeCorpus(value) {
    const rel = String(value ?? '').replaceAll('\\', '/').replace(/^\.\//u, '');
    return ALLOWED.has(rel) ? rel : null;
}

const states = new Map();
function stateFor(corpusRel) {
    let state = states.get(corpusRel);
    if (state) return state;
    const corpusPath = path.join(root, corpusRel);
    const document = readLevelCorpusDocumentWithHints(corpusPath);
    const byId = new Map(document.levels.map((level, index) => [
        String(level.id ?? index + 1),
        { level, index },
    ]));
    state = { corpusRel, corpusPath, document, byId, changedHintLevels: new Set() };
    states.set(corpusRel, state);
    return state;
}

const pending = [];
const seenReports = new Set();
let documentsSeen = 0;
let candidateObservations = 0;
let eligibleObservations = 0;
let refereeAcceptedObservations = 0;
let acceptedAlreadyRepresented = 0;
let semanticRecordChanges = 0;
let pathAdditions = 0;
let provenanceEventAdditions = 0;
let occurrenceAdditions = 0;

for (const file of walk(stagingDir).sort()) {
    let doc;
    try { doc = JSON.parse(readFileSync(file, 'utf8')); } catch { continue; }
    if (doc?.kind !== 'pathfinder-cpsat-hint-discovery-report'
        || doc?.producer !== 'cpsat-hint-harvest'
        || !Array.isArray(doc?.levels)) continue;

    const corpusRel = normalizeCorpus(doc.corpus);
    if (!corpusRel) {
        pending.push({
            sourceFile: path.relative(stagingDir, file),
            reason: 'unsupported-or-missing-corpus',
            corpus: doc.corpus ?? null,
        });
        continue;
    }

    const reportIdentity = `${corpusRel}|${JSON.stringify(doc.levels
        .filter(row => Array.isArray(row?.solution))
        .map(row => [row.id, row.label, row.solutionSignature ?? row.solution]))}`;
    if (seenReports.has(reportIdentity)) continue;
    seenReports.add(reportIdentity);
    documentsSeen += 1;

    const state = stateFor(corpusRel);
    for (const row of doc.levels) {
        if (!row?.solved || row?.refereeValid !== true || !Array.isArray(row?.solution) || row.solution.length === 0) {
            continue;
        }
        candidateObservations += 1;

        const entry = state.byId.get(String(row.id ?? ''));
        if (!entry?.level) {
            pending.push({
                corpus: corpusRel,
                sourceFile: path.relative(stagingDir, file),
                reason: 'level-not-found-on-main',
                row,
            });
            continue;
        }
        if (typeof row.levelRevision !== 'string' || row.levelRevision.length === 0) {
            pending.push({
                corpus: corpusRel,
                sourceFile: path.relative(stagingDir, file),
                reason: 'missing-source-level-revision',
                row,
            });
            continue;
        }
        const currentRevision = await getLevelFingerprint(entry.level);
        if (currentRevision !== row.levelRevision) {
            pending.push({
                corpus: corpusRel,
                sourceFile: path.relative(stagingDir, file),
                reason: 'level-revision-mismatch',
                sourceLevelRevision: row.levelRevision,
                mainLevelRevision: currentRevision,
                row,
            });
            continue;
        }
        if (typeof row.foundAt !== 'string' || !Number.isFinite(Date.parse(row.foundAt))) {
            pending.push({
                corpus: corpusRel,
                sourceFile: path.relative(stagingDir, file),
                reason: 'missing-or-invalid-discovery-time',
                row,
            });
            continue;
        }

        const parsed = parseRawLevel(entry.level, entry.index);
        if (!parsed) {
            pending.push({
                corpus: corpusRel,
                sourceFile: path.relative(stagingDir, file),
                reason: 'canonical-level-parse-failed',
                row,
            });
            continue;
        }
        eligibleObservations += 1;

        const verdict = validateCandidatePath(parsed, row.solution);
        if (!verdict.ok) {
            pending.push({
                corpus: corpusRel,
                sourceFile: path.relative(stagingDir, file),
                reason: `main-referee-rejected:${verdict.reason}`,
                row,
            });
            continue;
        }
        refereeAcceptedObservations += 1;

        const provenance = makeProvenanceEntry('cpsat-reference-probe', {
            solverId: EXTERNAL_SOLVER_ID,
            elapsedMs: Number.isFinite(row.elapsedMs) ? row.elapsedMs : undefined,
            budgetMs: Number.isFinite(row.budgetMs) ? row.budgetMs : undefined,
            termination: 'solved',
            usedExistingHints: false,
            hintGuided: false,
            levelRevision: row.levelRevision,
            foundAt: row.foundAt,
            ...(row.forcing && typeof row.forcing === 'object' ? row.forcing : {}),
            ...(sourceRunId !== 'unknown'
                ? {
                    occurrenceRunId: sourceRunId,
                    ...(sourceRunAttempt ? { occurrenceRunAttempt: sourceRunAttempt } : {}),
                    occurrenceObservedAt: row.foundAt,
                }
                : {}),
        });

        const observation = buildHintDiscoveryIngestionObservation({
            producer: 'cpsat-hint-harvest',
            sourceArtifact: path.relative(stagingDir, file),
            sourceRunId: sourceRunId !== 'unknown' ? sourceRunId : null,
            sourceRunAttempt,
            corpus: corpusRel,
            levelId: String(row.id),
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
for (const state of states.values()) {
    if (state.changedHintLevels.size === 0) continue;
    const result = writeLevelCorpusDocumentWithHints(state.corpusPath, state.document, {
        changedHintLevels: state.changedHintLevels,
    });
    filesChanged += result.hintFilesChanged ?? 0;
}

if (pending.length) {
    const pendingDir = path.join(root, 'reports/stress/pending-solver-evidence');
    mkdirSync(pendingDir, { recursive: true });
    const out = path.join(pendingDir, `run-${sourceRunId}-cpsat-discoveries.json`);
    writeFileSync(out, `${JSON.stringify({
        schemaVersion: 1,
        sourceRunId,
        sourceRunAttempt,
        sourceWorkflow,
        pending,
    }, null, 2)}\n`);
    console.log(`Quarantined ${pending.length} CP-SAT discovery observation(s) to ${path.relative(root, out)}.`);
}

if (ingestionReceiptOut) {
    const receipt = buildHintIngestionReceipt({
        producer: 'harvest-cpsat-discovery-reports',
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
        corpusScope: [...ALLOWED].sort(),
        notes: 'external CP-SAT specialist discovery projection; canonical Hint provenance preserves EXTERNAL_SOLVER_ID and exact source level revision, forcing, discovery time, and acquisition occurrence',
    });
    validateHintIngestionReceipt(receipt);
    mkdirSync(path.dirname(ingestionReceiptOut), { recursive: true });
    writeFileSync(ingestionReceiptOut, `${JSON.stringify(receipt, null, 2)}\n`);
    console.log(`Wrote hint-ingestion receipt to ${path.relative(root, ingestionReceiptOut)}.`);
}

console.log(
    `CP-SAT discovery harvest: ${documentsSeen} report(s), ${candidateObservations} candidate(s), `
    + `${eligibleObservations} eligible, ${refereeAcceptedObservations} referee-accepted, `
    + `${semanticRecordChanges} semantic change(s), ${pathAdditions} path / `
    + `${provenanceEventAdditions} provenance-event / ${occurrenceAdditions} occurrence addition(s), `
    + `${filesChanged} file(s) changed, ${pending.length} pending.`,
);
