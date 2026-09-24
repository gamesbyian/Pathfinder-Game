#!/usr/bin/env node
/**
 * Central semantic adapter for pathfinder-solver-diagnostics-report artifacts.
 *
 * Solver diagnostics remains dual-path during Phase 6: the source workflow still writes canonical
 * hints directly, while this adapter reconstructs the same successful observations from the durable
 * diagnostics artifact. Real parity/reharvest evidence is required before retiring that direct route.
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
import { provenanceFromHistoricalSolveResult } from '../modules/solver/hint-provenance.ts';
import {
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
const workspaceRootArg = args.get('--workspace-root');
const workspaceRoot = workspaceRootArg ? path.resolve(workspaceRootArg) : root;
const stagingDir = path.resolve(args.get('--staging-dir') || 'artifact-staging');
const sourceRunId = args.get('--source-run-id') || process.env.SOURCE_RUN_ID || 'unknown';
const sourceRunAttempt = args.get('--source-run-attempt') || process.env.SOURCE_RUN_ATTEMPT || null;
const sourceWorkflow = args.get('--source-workflow') || process.env.SOURCE_WORKFLOW || 'unknown';
const ingestionReceiptArg = args.get('--ingestion-receipt-out');
const ingestionReceiptOut = ingestionReceiptArg ? path.resolve(ingestionReceiptArg) : null;
if (!existsSync(stagingDir)) throw new Error(`staging directory does not exist: ${stagingDir}`);

const CORPUS = 'data/levels.json';

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (name.endsWith('.json')) out.push(full);
    }
    return out;
}

const corpusPath = path.join(workspaceRoot, CORPUS);
const document = readLevelCorpusDocumentWithHints(corpusPath);
const byId = new Map(document.levels.map((level, index) => [
    String(level.id ?? index + 1),
    { level, index },
]));
const changedHintLevels = new Set();
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
    if (doc?.kind !== 'pathfinder-solver-diagnostics-report'
        || doc?.producer !== 'solver-diagnostics'
        || doc?.corpus !== CORPUS
        || !Array.isArray(doc?.levels)) continue;

    const solvedRows = doc.levels.filter(row => row?.status === 'success'
        && Array.isArray(row?.solution) && row.solution.length > 0);
    const reportIdentity = JSON.stringify([
        doc.commitSha ?? null,
        doc.solverRequestIdentity ?? null,
        solvedRows.map(row => [row.levelId ?? row.level, row.levelRevision, row.solution]),
    ]);
    if (seenReports.has(reportIdentity)) continue;
    seenReports.add(reportIdentity);
    documentsSeen += 1;

    for (const row of solvedRows) {
        candidateObservations += 1;

        const key = row.levelId != null ? String(row.levelId) : null;
        const position = Number(row.level ?? 0);
        const entry = key ? byId.get(key)
            : (position > 0 && document.levels[position - 1]
                ? { level: document.levels[position - 1], index: position - 1 }
                : null);
        if (!entry?.level) {
            pending.push({
                sourceFile: path.relative(stagingDir, file),
                reason: 'level-not-found-on-main',
                row,
            });
            continue;
        }
        if (typeof row.levelRevision !== 'string' || row.levelRevision.length === 0) {
            pending.push({
                sourceFile: path.relative(stagingDir, file),
                reason: 'missing-source-level-revision',
                row,
            });
            continue;
        }
        const currentRevision = await getLevelFingerprint(entry.level);
        if (currentRevision !== row.levelRevision) {
            pending.push({
                sourceFile: path.relative(stagingDir, file),
                reason: 'level-revision-mismatch',
                sourceLevelRevision: row.levelRevision,
                mainLevelRevision: currentRevision,
                row,
            });
            continue;
        }
        if (typeof row.discoveryObservedAt !== 'string' || !Number.isFinite(Date.parse(row.discoveryObservedAt))) {
            pending.push({
                sourceFile: path.relative(stagingDir, file),
                reason: 'missing-or-invalid-discovery-time',
                row,
            });
            continue;
        }

        const parsed = parseRawLevel(entry.level, entry.index);
        if (!parsed) {
            pending.push({
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
                sourceFile: path.relative(stagingDir, file),
                reason: `main-referee-rejected:${verdict.reason}`,
                row,
            });
            continue;
        }
        refereeAcceptedObservations += 1;

        const provenance = provenanceFromHistoricalSolveResult({
            attempts: Array.isArray(row.attempts) ? row.attempts : [],
            nodesExpanded: Number.isFinite(row.nodesExpanded) ? row.nodesExpanded : undefined,
            // The diagnostics report row has no `elapsedMs` field -- analyze-solver-diagnostics.mjs's
            // convertDirectToRawPayload() writes the real solve's elapsedMs into `timeMs` (and its
            // `totalSolveTimeMs`/`ladderTotal*` siblings, all equal for a direct-solver row), never
            // under the key `elapsedMs` itself. Reading `row.elapsedMs` here was always undefined,
            // silently dropping every reconstructed observation's cumulativeElapsedMs to null --
            // found via a real local dual-path parity canary comparing this adapter's output against
            // the direct-write route's actual provenance for the same solve.
            totalMs: Number.isFinite(row.timeMs) ? row.timeMs : undefined,
            status: 'success',
            workSpent: Number.isFinite(row.workSpent) ? row.workSpent : undefined,
            workBudget: Number.isFinite(row.workBudget) ? row.workBudget : undefined,
        }, {
            solverVersion: typeof doc.commitSha === 'string' ? doc.commitSha : null,
            foundAt: row.discoveryObservedAt,
            budgetMs: Number.isFinite(doc.budgetMs) ? doc.budgetMs : null,
            usedExistingHints: false,
            levelRevision: row.levelRevision,
            ...(typeof doc.solverRequestIdentity === 'string' && doc.solverRequestIdentity
                ? { solverRequestIdentity: doc.solverRequestIdentity } : {}),
            ...(typeof doc.reproducibilityMode === 'string' && doc.reproducibilityMode
                ? { reproducibilityMode: doc.reproducibilityMode } : {}),
            ...(sourceRunId !== 'unknown'
                ? {
                    occurrenceRunId: sourceRunId,
                    ...(sourceRunAttempt ? { occurrenceRunAttempt: sourceRunAttempt } : {}),
                }
                : {}),
        });

        const observation = buildHintDiscoveryIngestionObservation({
            producer: 'solver-diagnostics',
            sourceArtifact: path.relative(stagingDir, file),
            sourceRunId: sourceRunId !== 'unknown' ? sourceRunId : null,
            sourceRunAttempt,
            corpus: CORPUS,
            levelId: String(entry.level.id ?? row.levelId ?? row.level),
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
            changedHintLevels.add(entry.level);
        } else {
            acceptedAlreadyRepresented += 1;
        }
    }
}

let filesChanged = 0;
if (changedHintLevels.size > 0) {
    const result = writeLevelCorpusDocumentWithHints(corpusPath, document, { changedHintLevels });
    filesChanged = result.hintFilesChanged ?? 0;
}

if (pending.length) {
    const pendingDir = path.join(workspaceRoot, 'reports/stress/pending-solver-evidence');
    mkdirSync(pendingDir, { recursive: true });
    const out = path.join(pendingDir, `run-${sourceRunId}-diagnostics-discoveries.json`);
    writeFileSync(out, `${JSON.stringify({
        schemaVersion: 1,
        sourceRunId,
        sourceRunAttempt,
        sourceWorkflow,
        pending,
    }, null, 2)}\n`);
    console.log(`Quarantined ${pending.length} diagnostics discovery observation(s) to ${path.relative(workspaceRoot, out)}.`);
}

if (ingestionReceiptOut) {
    const receipt = buildHintIngestionReceipt({
        producer: 'harvest-solver-diagnostics-reports',
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
        corpusScope: CORPUS,
        notes: 'native Pathfinder diagnostics successful-discovery projection reconstructed from the durable diagnostics artifact; direct source-workflow mutation remains during Phase-6 parity',
    });
    validateHintIngestionReceipt(receipt);
    mkdirSync(path.dirname(ingestionReceiptOut), { recursive: true });
    writeFileSync(ingestionReceiptOut, `${JSON.stringify(receipt, null, 2)}\n`);
    console.log(`Wrote hint-ingestion receipt to ${path.relative(workspaceRoot, ingestionReceiptOut)}.`);
}

console.log(
    `Diagnostics discovery harvest: ${documentsSeen} report(s), ${candidateObservations} candidate(s), `
    + `${eligibleObservations} eligible, ${refereeAcceptedObservations} referee-accepted, `
    + `${semanticRecordChanges} semantic change(s), ${pathAdditions} path / `
    + `${provenanceEventAdditions} provenance-event / ${occurrenceAdditions} occurrence addition(s), `
    + `${filesChanged} file(s) changed, ${pending.length} pending.`,
);
