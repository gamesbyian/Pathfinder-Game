#!/usr/bin/env node
/**
 * Phase-7 mutation companion to hint-historical-enrichment-plan.mjs.
 *
 * Applies ONLY the proved-safe occurrence-lineage additions that plan already identifies as an
 * unambiguous exact match (one path hash match, one semantic-event match, not already enriched).
 * Never fabricates solver-request/protocol/stage identity -- those stay exactly as unresolved as the
 * read-only planner already declares them. The real historical observation time
 * (run.resultContext.timestamp) is used for the new occurrence's observedAt, never "now": these are
 * physical acquisitions that happened in September 2026, not today.
 *
 * Reuses the exact same canonical merge path every other occurrence-lineage addition in this program
 * uses (dedupeProvenanceEntries), rather than splicing the occurrences array by hand, so idempotency
 * and occurrence-key deduplication come from the one shared implementation.
 *
 * Usage:
 *   node scripts/stress/hint-historical-enrichment-apply.mjs --apply [--rescue=<path>] [--out=<path>]
 * Without --apply, runs as a dry run: computes and reports what WOULD be applied, mutates nothing.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { dedupeProvenanceEntries, setLevelHintRecords } from '../../modules/domain/hint-runtime.mjs';
import { readLevelCorpusDocumentWithHints, writeLevelCorpusDocumentWithHints } from '../level-data-io.mjs';
import {
    classifyRescuedObservation,
    provenanceMatchesRescuedObservation,
    sha256Canonical,
} from './hint-historical-enrichment-plan.mjs';

/**
 * Pure core: mutates the in-memory corpus documents (when apply=true) and returns the application
 * summary. Kept file-I/O-free so it can be unit-tested against in-memory fixtures, matching
 * hint-historical-enrichment-plan.mjs's own buildHistoricalEnrichmentPlan()/CLI split.
 */
export function applyHistoricalEnrichment(rescue, corpusDocuments, { apply = false } = {}) {
    const results = [];
    const changedLevelsByCorpus = new Map();

    for (const run of rescue?.runs ?? []) {
        const corpus = run?.resultContext?.corpus;
        const document = corpusDocuments.get(corpus);
        const byId = new Map((document?.levels ?? []).map((level, index) => [String(level.id ?? index + 1), level]));
        for (const row of run?.affectedSolvedRows ?? []) {
            const level = byId.get(String(row.id));
            const classification = level
                ? classifyRescuedObservation({ run, row, level })
                : { status: 'level-not-present-current-corpus' };
            if (classification.status !== 'exact-occurrence-enrichment-candidate') {
                results.push({ runId: String(run.runId), levelId: row.id, status: classification.status, applied: false });
                continue;
            }

            // Re-locate the exact same unique hint/event this status already proved unique -- reusing
            // the exported predicate rather than re-deriving the matching rule.
            const hint = level.hintRecords.find(h => sha256Canonical(h.path) === row.solutionSha256);
            const matchedEntry = hint.provenance.find(event => provenanceMatchesRescuedObservation(event, run, row));

            const newOccurrence = {
                schemaVersion: 1,
                runId: String(run.runId),
                runAttempt: run.runAttempt == null ? null : String(run.runAttempt),
                contractRef: null,
                observedAt: run?.resultContext?.timestamp ?? null,
                sourceRuns: null,
            };
            const syntheticEntry = { ...structuredClone(matchedEntry), occurrences: [newOccurrence] };
            const merged = dedupeProvenanceEntries([...hint.provenance, syntheticEntry]);

            if (apply) {
                hint.provenance = merged;
                setLevelHintRecords(level, level.hintRecords);
                if (!changedLevelsByCorpus.has(corpus)) changedLevelsByCorpus.set(corpus, new Set());
                changedLevelsByCorpus.get(corpus).add(level);
            }
            results.push({
                runId: String(run.runId), runAttempt: newOccurrence.runAttempt, levelId: row.id, corpus,
                status: 'exact-occurrence-enrichment-candidate', applied: apply,
                occurrenceObservedAt: newOccurrence.observedAt,
            });
        }
    }

    return {
        summary: {
            schemaVersion: 1,
            kind: 'pathfinder-historical-hint-enrichment-application',
            mode: apply ? 'applied' : 'dry-run',
            totalObservations: results.length,
            candidatesFound: results.filter(r => r.status === 'exact-occurrence-enrichment-candidate').length,
            applied: results.filter(r => r.applied).length,
            counts: Object.fromEntries(
                Object.entries(
                    results.reduce((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {}),
                ).sort(),
            ),
            rows: results,
        },
        changedLevelsByCorpus,
    };
}

const isMain = process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href;
if (isMain) {
    const DEFAULT_RESCUE = 'docs/hint-evidence-phase0-sept9-determinism-collision-authority-rescue.json';
    const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--')).map(arg => {
        const [key, ...rest] = arg.split('=');
        return [key, rest.join('=')];
    }));
    const rescuePath = String(args.get('--rescue') || DEFAULT_RESCUE);
    const outPath = args.get('--out') ? String(args.get('--out')) : null;
    const apply = process.argv.includes('--apply');

    const rescue = JSON.parse(readFileSync(rescuePath, 'utf8'));
    const corpusPaths = [...new Set((rescue.runs ?? []).map(run => run?.resultContext?.corpus).filter(Boolean))];
    const corpusDocuments = new Map(corpusPaths.map(corpus => [corpus, readLevelCorpusDocumentWithHints(corpus)]));

    const { summary, changedLevelsByCorpus } = applyHistoricalEnrichment(rescue, corpusDocuments, { apply });

    let filesChanged = 0;
    if (apply) {
        for (const [corpus, changedLevels] of changedLevelsByCorpus) {
            const document = corpusDocuments.get(corpus);
            const result = writeLevelCorpusDocumentWithHints(corpus, document, { changedHintLevels: changedLevels });
            filesChanged += result.hintFilesChanged ?? 0;
        }
    }

    const output = { ...summary, rescueSource: rescuePath, filesChanged };
    const json = JSON.stringify(output, null, 2);
    if (outPath) writeFileSync(outPath, json + '\n');
    console.log(json);
}
