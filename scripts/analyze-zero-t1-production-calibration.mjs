#!/usr/bin/env node
/**
 * Cross-revision calibration for the small frozen population that production solved
 * even though the isolated T1 census observed no winner.
 *
 * This is observational development evidence only. It compares historical/frozen
 * classification to a later compiled production baseline and must not be read as a
 * current-head capability oracle.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const tally = (values) => Object.entries(values.reduce((counts, value) => {
    const key = value ?? 'none';
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
}, {}))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => ({ key, count }));

export function analyzeCalibration({ capability, laterBaseline, corpus = 'corpus2' }) {
    if (!Array.isArray(capability?.levels)) throw new Error('Capability artifact must contain levels[]');
    if (!Array.isArray(laterBaseline?.levels)) throw new Error('Later baseline must contain levels[]');

    const laterById = new Map(laterBaseline.levels.map((row) => [row.id, row]));
    const frozenCases = capability.levels.filter((row) =>
        row.corpus === corpus && row.productionSolved && !row.isolatedOracleSolved);

    const rows = frozenCases.map((row) => {
        const later = laterById.get(row.levelId);
        const winningAttempt = later?.attempts?.find((attempt) => attempt.ok) ?? null;
        return {
            corpus: row.corpus,
            levelId: row.levelId,
            frozenProductionSolved: true,
            frozenT1WinnerCount: row.solverCount,
            laterBaselinePresent: Boolean(later),
            laterProductionSolved: later?.ok ?? null,
            laterWinningConfig: later?.winningConfig ?? null,
            laterWinningActionKey: later?.winningActionKey ?? null,
            laterWinningStageId: winningAttempt?.stageId ?? null,
            laterWinningNodesExpanded: winningAttempt?.nodesExpanded ?? null,
            laterAttemptCount: later?.attemptCount ?? null,
        };
    });

    const laterSolved = rows.filter((row) => row.laterProductionSolved === true);
    const laterUnsolved = rows.filter((row) => row.laterProductionSolved === false);
    const laterMissing = rows.filter((row) => row.laterProductionSolved == null);

    return {
        schemaVersion: 1,
        evidenceRole: 'observational-development-cross-revision-calibration',
        frozenCaseDefinition: `${corpus}: frozen production solved && zero frozen T1 isolated winners`,
        interpretationGuardrail: 'A later solve/fail outcome does not establish current-head technique capability or causality.',
        laterBaseline: {
            compiledAt: laterBaseline.compiledAt ?? null,
            corpus: laterBaseline.corpus ?? null,
            solved: laterBaseline.solved ?? null,
            total: laterBaseline.total ?? null,
            primarySource: laterBaseline.sources?.[0] ?? null,
        },
        summary: {
            frozenCases: rows.length,
            laterSolved: laterSolved.length,
            laterUnsolved: laterUnsolved.length,
            laterMissing: laterMissing.length,
            laterSolvedStageCounts: tally(laterSolved.map((row) => row.laterWinningStageId)),
            laterSolvedConfigCounts: tally(laterSolved.map((row) => row.laterWinningConfig)),
        },
        rows,
    };
}

async function main() {
    const args = new Map(process.argv.slice(2).map((arg) => arg.split('=', 2)));
    const capabilityPath = args.get('--capability') ?? 'reports/stress/technique-niches/2026-09-01/level-capability.json';
    const baselinePath = args.get('--baseline') ?? 'logs/stress-corpus2-baseline.json';
    const corpus = args.get('--corpus') ?? 'corpus2';
    const outPath = args.get('--out') ?? 'reports/stress/technique-niches/2026-09-01/zero-t1-production-calibration.json';

    const result = analyzeCalibration({
        capability: JSON.parse(readFileSync(capabilityPath, 'utf8')),
        laterBaseline: JSON.parse(readFileSync(baselinePath, 'utf8')),
        corpus,
    });
    writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`Wrote ${outPath}: ${result.summary.laterSolved}/${result.summary.frozenCases} later solved; ${result.summary.laterMissing} missing`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
