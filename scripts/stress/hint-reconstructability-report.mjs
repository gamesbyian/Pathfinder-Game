#!/usr/bin/env node
/**
 * Cheap query surface for Pathfinder hint-discovery replay/effective-input reconstructability.
 *
 * This report intentionally reads only durable canonical hint artifacts. It does not infer missing
 * solver-request/stage/source-run dimensions from filenames, timestamps, or current defaults.
 * Consequently the pre-enrichment baseline is expected to report many non-reconstructable events;
 * that is useful evidence about what Phase 2/3 enrichment still needs to make joinable.
 *
 * Usage:
 *   node scripts/stress/hint-reconstructability-report.mjs [--json=<path>]
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import path from 'node:path';
import { decodeHintArtifact } from '../../modules/domain/hint-runtime.mjs';
import { assertCompleteHintStoreDirs, discoverHintStoreDirs, hintStoreLabel } from '../hint-store-roots.mjs';
import {
    classifyHintDiscoveryReplayability,
    effectiveSolverInputIdentityStatus,
} from '../hint-discovery-replayability-lib.mjs';

const arg = name => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

function addCount(map, key) {
    map[key] = (map[key] ?? 0) + 1;
}

export function summarizeReconstructability(hints) {
    const replayBasisCounts = {};
    const replayReasons = {};
    const missingDimensions = {};
    let hintsWithProvenance = 0;
    let events = 0;
    let effectiveInputReconstructable = 0;
    let eventsWithExecution = 0;
    let eventsWithSolverRequestIdentity = 0;
    let eventsWithOccurrences = 0;
    let eventsWithMultipleOccurrences = 0;
    let occurrenceRecords = 0;
    let occurrencesWithContractRef = 0;
    let occurrenceSourceRunLinks = 0;

    for (const hint of hints ?? []) {
        const provenance = Array.isArray(hint?.provenance) ? hint.provenance : [];
        if (provenance.length > 0) hintsWithProvenance += 1;
        for (const entry of provenance) {
            events += 1;
            if (entry?.execution && typeof entry.execution === 'object') {
                eventsWithExecution += 1;
                if (typeof entry.execution.solverRequestIdentity === 'string' && entry.execution.solverRequestIdentity.length > 0) {
                    eventsWithSolverRequestIdentity += 1;
                }
            }
            const occurrences = Array.isArray(entry?.occurrences) ? entry.occurrences : [];
            if (occurrences.length > 0) {
                eventsWithOccurrences += 1;
                if (occurrences.length > 1) eventsWithMultipleOccurrences += 1;
                occurrenceRecords += occurrences.length;
                for (const occurrence of occurrences) {
                    if (typeof occurrence?.contractRef === 'string' && occurrence.contractRef.length > 0) {
                        occurrencesWithContractRef += 1;
                    }
                    if (Array.isArray(occurrence?.sourceRuns)) occurrenceSourceRunLinks += occurrence.sourceRuns.length;
                }
            }
            const replay = classifyHintDiscoveryReplayability(entry);
            addCount(replayBasisCounts, replay.replayBasis);
            addCount(replayReasons, replay.reason);

            // No external joins are supplied here by design. This is the durable-hint-store
            // baseline: dimensions absent from Hint provenance remain visibly absent.
            const effective = effectiveSolverInputIdentityStatus(entry);
            if (effective.reconstructable) effectiveInputReconstructable += 1;
            else for (const dimension of effective.missingDimensions) addCount(missingDimensions, dimension);
        }
    }

    return {
        hints: hints?.length ?? 0,
        hintsWithProvenance,
        events,
        effectiveInputReconstructable,
        effectiveInputNotReconstructable: events - effectiveInputReconstructable,
        eventsWithExecution,
        eventsWithSolverRequestIdentity,
        eventsWithOccurrences,
        eventsWithMultipleOccurrences,
        occurrenceRecords,
        occurrencesWithContractRef,
        occurrenceSourceRunLinks,
        replayBasisCounts: Object.fromEntries(Object.entries(replayBasisCounts).sort()),
        replayReasons: Object.fromEntries(
            Object.entries(replayReasons).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
        ),
        missingDimensions: Object.fromEntries(
            Object.entries(missingDimensions).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
        ),
    };
}

function hintsFromStore(relativeDir) {
    const absDir = path.join(process.cwd(), relativeDir);
    return readdirSync(absDir)
        .filter(name => name.endsWith('.json') && !name.startsWith('_'))
        .sort()
        .flatMap(name => decodeHintArtifact(JSON.parse(readFileSync(path.join(absDir, name), 'utf8'))));
}

export function buildReport() {
    const dirs = assertCompleteHintStoreDirs(
        discoverHintStoreDirs(process.cwd()),
        'Hint reconstructability report',
    );
    const corpora = dirs.map(relativeDir => ({
        corpus: hintStoreLabel(relativeDir),
        hintStoreDir: relativeDir,
        ...summarizeReconstructability(hintsFromStore(relativeDir)),
    }));
    const totals = {
        hints: 0,
        hintsWithProvenance: 0,
        events: 0,
        effectiveInputReconstructable: 0,
        effectiveInputNotReconstructable: 0,
        eventsWithExecution: 0,
        eventsWithSolverRequestIdentity: 0,
        eventsWithOccurrences: 0,
        eventsWithMultipleOccurrences: 0,
        occurrenceRecords: 0,
        occurrencesWithContractRef: 0,
        occurrenceSourceRunLinks: 0,
        replayBasisCounts: {},
        replayReasons: {},
        missingDimensions: {},
    };
    for (const row of corpora) {
        for (const key of ['hints', 'hintsWithProvenance', 'events', 'effectiveInputReconstructable',
            'effectiveInputNotReconstructable', 'eventsWithExecution', 'eventsWithSolverRequestIdentity',
            'eventsWithOccurrences', 'eventsWithMultipleOccurrences', 'occurrenceRecords',
            'occurrencesWithContractRef', 'occurrenceSourceRunLinks']) totals[key] += row[key];
        for (const [key, count] of Object.entries(row.replayBasisCounts)) totals.replayBasisCounts[key] = (totals.replayBasisCounts[key] ?? 0) + count;
        for (const [key, count] of Object.entries(row.replayReasons)) totals.replayReasons[key] = (totals.replayReasons[key] ?? 0) + count;
        for (const [key, count] of Object.entries(row.missingDimensions)) totals.missingDimensions[key] = (totals.missingDimensions[key] ?? 0) + count;
    }
    return { generatedAt: new Date().toISOString(), corpora, totals };
}

function main() {
    const report = buildReport();
    const header = ['corpus', 'hints', 'events', 'effective-input yes', 'effective-input no'];
    const rows = [...report.corpora, { corpus: 'TOTAL', ...report.totals }].map(row => [
        row.corpus,
        String(row.hints),
        String(row.events),
        String(row.effectiveInputReconstructable),
        String(row.effectiveInputNotReconstructable),
    ]);
    const widths = header.map((h, i) => Math.max(h.length, ...rows.map(row => row[i].length)));
    const format = cells => cells.map((cell, i) => cell.padEnd(widths[i])).join('  ');
    console.log(format(header));
    console.log(widths.map(width => '-'.repeat(width)).join('  '));
    for (const row of rows) console.log(format(row));

    console.log('\nExecution/occurrence coverage across durable Hint provenance:');
    console.log(`  events with execution capsule: ${report.totals.eventsWithExecution}`);
    console.log(`  events with solver-request identity: ${report.totals.eventsWithSolverRequestIdentity}`);
    console.log(`  events with occurrence lineage: ${report.totals.eventsWithOccurrences}`);
    console.log(`  events with multiple occurrences: ${report.totals.eventsWithMultipleOccurrences}`);
    console.log(`  occurrence records: ${report.totals.occurrenceRecords}`);
    console.log(`  occurrence records with contractRef: ${report.totals.occurrencesWithContractRef}`);
    console.log(`  constituent source-run links: ${report.totals.occurrenceSourceRunLinks}`);

    console.log('\nMissing dimensions across durable Hint provenance:');
    const missing = Object.entries(report.totals.missingDimensions)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (missing.length === 0) console.log('  (none)');
    else for (const [dimension, count] of missing) console.log(`  ${dimension}: ${count}`);

    console.log('\nThese are availability counts, not evidence-quality scores. Missing historical dimensions remain unknown.');

    const jsonPath = arg('json');
    if (jsonPath) {
        writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
        console.log(`\nWrote ${jsonPath}`);
    }
}

const isMain = process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href;
if (isMain) main();
