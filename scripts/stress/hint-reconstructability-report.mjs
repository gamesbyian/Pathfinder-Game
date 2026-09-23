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
import { writeFileSync } from 'node:fs';
import process from 'node:process';
import { readLevelCorpusDocumentWithHints } from '../level-data-io.mjs';
import {
    classifyHintDiscoveryReplayability,
    effectiveSolverInputIdentityStatus,
} from '../hint-discovery-replayability-lib.mjs';

const CORPORA = [
    { name: 'published', levels: 'data/levels.json' },
    { name: 'corpus1', levels: 'data/stress/stress-levels.json' },
    { name: 'corpus2', levels: 'data/stress/stress-levels-random.json' },
];

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

    for (const hint of hints ?? []) {
        const provenance = Array.isArray(hint?.provenance) ? hint.provenance : [];
        if (provenance.length > 0) hintsWithProvenance += 1;
        for (const entry of provenance) {
            events += 1;
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
        replayBasisCounts: Object.fromEntries(Object.entries(replayBasisCounts).sort()),
        replayReasons: Object.fromEntries(
            Object.entries(replayReasons).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
        ),
        missingDimensions: Object.fromEntries(
            Object.entries(missingDimensions).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
        ),
    };
}

export function buildReport() {
    const corpora = CORPORA.map(({ name, levels }) => {
        const document = readLevelCorpusDocumentWithHints(levels);
        const hints = document.levels.flatMap(level => level?.hintRecords ?? []);
        return { corpus: name, levelsPath: levels, ...summarizeReconstructability(hints) };
    });
    const totals = {
        hints: 0,
        hintsWithProvenance: 0,
        events: 0,
        effectiveInputReconstructable: 0,
        effectiveInputNotReconstructable: 0,
        replayBasisCounts: {},
        replayReasons: {},
        missingDimensions: {},
    };
    for (const row of corpora) {
        for (const key of ['hints', 'hintsWithProvenance', 'events', 'effectiveInputReconstructable',
            'effectiveInputNotReconstructable']) totals[key] += row[key];
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

if (import.meta.url === `file://${process.argv[1]}`) main();
