#!/usr/bin/env node
/**
 * Read-only historical-enrichment planner for the rescued September-9 determinism-collision authority.
 *
 * It never mutates Hint evidence. It uses exact path hash + immutable solver ref + persisted winning
 * attempt/work facts to identify whether one current semantic provenance event is the unique target
 * for a rescued physical source-run occurrence. Canonical solver-request identity is NOT fabricated:
 * the rescue bundle predates that projection and remains a separate future reconstruction question.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { readLevelCorpusDocumentWithHints } from '../level-data-io.mjs';
import { stableStringify } from '../../modules/canonical-json.mjs';

const DEFAULT_RESCUE = 'docs/hint-evidence-phase0-sept9-determinism-collision-authority-rescue.json';
const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--')).map(arg => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=')];
}));
const rescuePath = String(args.get('--rescue') || DEFAULT_RESCUE);
const outPath = args.get('--out') ? String(args.get('--out')) : null;

export function sha256Canonical(value) {
    return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function techniqueFromWinner(winner) {
    if (winner?.repair === true) return 'repair';
    if (winner?.admissibleOrder === true) return 'admissible-order-fallback';
    if (Number.isFinite(winner?.beamWidth) && winner.beamWidth > 0) return 'beam';
    return 'dfs';
}

function equalNullable(a, b) {
    return (a ?? null) === (b ?? null);
}

export function provenanceMatchesRescuedObservation(event, run, row) {
    const winner = Array.isArray(row?.winningAttempts)
        ? row.winningAttempts.find(attempt => attempt?.ok === true || attempt?.outcome === 'success')
        : null;
    if (!winner || !event?.solver || !event?.search) return false;
    if (event.solver.version !== run.solverRef) return false;
    if (event.solver.technique !== techniqueFromWinner(winner)) return false;
    if (!equalNullable(event.solver.gateKey, winner.gateKey)) return false;
    if (!equalNullable(event.solver.scoringProfileId, winner.scoringProfileId)) return false;
    if (!equalNullable(event.solver.orderingBiasId, winner.orderingBiasId)) return false;
    if (!equalNullable(event.solver.beamWidth, winner.beamWidth)) return false;
    if (winner.beamWidth != null
        && !equalNullable(event.solver.mechanicBucketRetention, winner.mechanicBucketRetention ?? false)) return false;
    if (winner.randomSeed != null && !equalNullable(event.search.randomSeed, winner.randomSeed)) return false;
    if (winner.seedSalt != null && !equalNullable(event.search.seedSalt, winner.seedSalt)) return false;
    if (winner.nodesExpanded != null && !equalNullable(event.search.nodesExpanded, winner.nodesExpanded)) return false;
    if (row.workSpent != null && !equalNullable(event.search.workSpent, row.workSpent)) return false;
    return true;
}

export function classifyRescuedObservation({ run, row, level }) {
    const hints = level?.hintRecords ?? [];
    const pathMatches = hints.filter(hint => sha256Canonical(hint.path) === row.solutionSha256);
    if (pathMatches.length === 0) {
        return { status: 'path-not-present-current-store', pathMatches: 0, eventMatches: 0 };
    }
    if (pathMatches.length > 1) {
        return { status: 'ambiguous-path-hash', pathMatches: pathMatches.length, eventMatches: 0 };
    }

    const eventMatches = (pathMatches[0].provenance ?? [])
        .filter(event => provenanceMatchesRescuedObservation(event, run, row));
    if (eventMatches.length === 0) {
        return { status: 'path-match-no-event-match', pathMatches: 1, eventMatches: 0 };
    }
    if (eventMatches.length > 1) {
        return { status: 'ambiguous-event-match', pathMatches: 1, eventMatches: eventMatches.length };
    }

    const occurrences = Array.isArray(eventMatches[0].occurrences) ? eventMatches[0].occurrences : [];
    const already = occurrences.some(occurrence =>
        occurrence?.runId === String(run.runId)
        && String(occurrence?.runAttempt ?? '') === String(run.runAttempt ?? ''));

    return {
        status: already ? 'already-enriched' : 'exact-occurrence-enrichment-candidate',
        pathMatches: 1,
        eventMatches: 1,
        existingOccurrenceCount: occurrences.length,
        safeProvedAddition: already ? null : {
            runId: String(run.runId),
            runAttempt: run.runAttempt == null ? null : String(run.runAttempt),
        },
        deliberatelyUnresolved: {
            solverRequestIdentity: 'not reconstructed by this planner',
            protocolHash: 'not reconstructed by this planner',
            solverStagePersistence: 'stage exists in rescued winning action but is intentionally not intrinsic to Hint provenance; consumers requiring it must use an exact sibling-evidence/source-run join',
        },
    };
}

export function buildHistoricalEnrichmentPlan(rescue, corpusDocuments) {
    const rows = [];
    const counts = {};
    for (const run of rescue?.runs ?? []) {
        const corpus = run?.resultContext?.corpus;
        const document = corpusDocuments.get(corpus);
        const byId = new Map((document?.levels ?? []).map((level, index) => [
            String(level.id ?? index + 1),
            level,
        ]));
        for (const row of run?.affectedSolvedRows ?? []) {
            const level = byId.get(String(row.id));
            const classification = level
                ? classifyRescuedObservation({ run, row, level })
                : { status: 'level-not-present-current-corpus', pathMatches: 0, eventMatches: 0 };
            counts[classification.status] = (counts[classification.status] ?? 0) + 1;
            rows.push({
                runId: String(run.runId),
                runAttempt: run.runAttempt == null ? null : String(run.runAttempt),
                workflow: run.workflow,
                solverRef: run.solverRef,
                corpus,
                levelId: row.id,
                solutionSha256: row.solutionSha256,
                winningActionKey: row.winningActionKey,
                ...classification,
            });
        }
    }
    return {
        schemaVersion: 1,
        kind: 'pathfinder-historical-hint-enrichment-plan',
        sourceAuthorityKind: rescue?.kind ?? null,
        observations: rows.length,
        counts: Object.fromEntries(Object.entries(counts).sort()),
        rows,
        semantics: {
            readOnly: true,
            exactPathJoin: 'SHA-256 of canonical JSON path array from rescued authority',
            eventJoin: 'immutable solver ref + winning technique/config/gate/seed/nodes + cumulative work when recorded',
            safeMutationScope: 'this plan only proves candidate physical occurrence lineage; it does not itself mutate evidence',
            unknownPreservation: 'request/protocol/stage fields remain unresolved unless another exact authority proves them',
        },
    };
}

// Guarded so importing this module's exported functions (classifyRescuedObservation,
// provenanceMatchesRescuedObservation, sha256Canonical, buildHistoricalEnrichmentPlan -- e.g. from
// hint-historical-enrichment-apply.mjs, or a test) never triggers a real file read plus a full plan
// dump to stdout as an unwanted import side effect.
const isMain = process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href;
if (isMain) {
    const rescue = JSON.parse(readFileSync(rescuePath, 'utf8'));
    const corpusPaths = [...new Set((rescue.runs ?? []).map(run => run?.resultContext?.corpus).filter(Boolean))];
    const corpusDocuments = new Map(corpusPaths.map(corpus => [
        corpus,
        readLevelCorpusDocumentWithHints(corpus),
    ]));
    const plan = buildHistoricalEnrichmentPlan(rescue, corpusDocuments);
    const json = JSON.stringify(plan, null, 2);
    if (outPath) writeFileSync(outPath, json + '\n');
    console.log(json);
}
