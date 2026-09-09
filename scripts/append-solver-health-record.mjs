#!/usr/bin/env node
/**
 * Compact, standardized longitudinal solver-health record. Appends ONE JSONL line per completed
 * capability run to reports/stress/solver-health-timeline.jsonl, derived entirely from data an
 * EXISTING dispatched run (solver-stress-refresh.yml) already produced in the same job -- the
 * per-run summary.json its own "Regenerate derived stress metadata" step already writes, plus the
 * corpus1/corpus2 combined reports that step already read. No new solver compute: this is pure
 * aggregation over already-in-memory-shaped data (2026-09-09 solver-development-operating-loop
 * audit item #5 -- "determine whether existing large runs can emit a compact standardized
 * longitudinal summary... at negligible extra compute cost... only if it can mostly piggyback on
 * data already produced").
 *
 * Usage:
 *   node scripts/append-solver-health-record.mjs \
 *     --summary=reports/stress/capability-runs/<run>/summary.json \
 *     --combined=reports/stress/solver-corpus1-latest.json,reports/stress/solver-corpus2-latest.json \
 *     [--out=reports/stress/solver-health-timeline.jsonl]
 */
import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

function parseArgs(argv) {
    return new Map(argv.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
        const [k, ...v] = a.slice(2).split('=');
        return [k, v.join('=')];
    }));
}

/** Per-stage reach/attempts/solves/nodesExpanded, aggregated from attempts[].stageId across a
 *  population -- the same shape scripts/summarize-targeted-sweep-work.mjs prints to a job log,
 *  computed here instead into a compact machine-readable record. */
export function summarizeStageParticipation(levels) {
    const stats = new Map();
    for (const level of levels) {
        const seenThisLevel = new Set();
        for (const attempt of level?.attempts ?? []) {
            const stageId = attempt?.stageId;
            if (!stageId) continue;
            if (!stats.has(stageId)) stats.set(stageId, { reach: 0, attempts: 0, solves: 0, nodesExpanded: 0 });
            const s = stats.get(stageId);
            if (!seenThisLevel.has(stageId)) { s.reach += 1; seenThisLevel.add(stageId); }
            s.attempts += 1;
            s.nodesExpanded += Number(attempt?.nodesExpanded) || 0;
            if (attempt?.ok) s.solves += 1;
        }
    }
    return Object.fromEntries(stats);
}

export function buildHealthRecord(summary, combinedByCorpus) {
    let truncated = 0;
    let errored = 0;
    const stageParticipation = {};
    for (const [corpusKey, levels] of Object.entries(combinedByCorpus)) {
        truncated += levels.filter(l => l?.deadlineTruncated).length;
        errored += levels.filter(l => l?.status === 'error' || l?.hadAttemptError || l?.error).length;
        stageParticipation[corpusKey] = summarizeStageParticipation(levels);
    }
    const corpusSummary = key => summary?.[key]
        ? { total: summary[key].total, solved: summary[key].solved, nodes: summary[key].nodes, work: summary[key].work }
        : null;
    return {
        recordedAt: new Date().toISOString(),
        runId: summary?.runId ?? null,
        commit: summary?.solverRef ?? summary?.commit ?? null,
        levelBlind: summary?.levelBlind ?? null,
        enableFlags: summary?.enableFlags || null,
        disableFlags: summary?.disableFlags || null,
        corpus1: corpusSummary('corpus1'),
        corpus2: corpusSummary('corpus2'),
        truncated,
        errored,
        stageParticipation,
    };
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const summaryFile = args.get('summary');
    const combinedSpec = args.get('combined');
    if (!summaryFile || !combinedSpec) {
        console.error('Usage: node scripts/append-solver-health-record.mjs --summary=<summary.json> --combined=<combined1.json>[,<combined2.json>...] [--out=<path.jsonl>]');
        process.exit(2);
    }
    const outFile = args.get('out') || 'reports/stress/solver-health-timeline.jsonl';
    const summary = JSON.parse(readFileSync(summaryFile, 'utf8'));
    const combinedByCorpus = {};
    for (const file of combinedSpec.split(',').map(s => s.trim()).filter(Boolean)) {
        const data = JSON.parse(readFileSync(file, 'utf8'));
        combinedByCorpus[path.basename(file)] = data.levels ?? [];
    }
    const record = buildHealthRecord(summary, combinedByCorpus);
    mkdirSync(path.dirname(outFile), { recursive: true });
    appendFileSync(outFile, `${JSON.stringify(record)}\n`);
    console.log(`Appended solver-health record for run ${record.runId ?? '(unknown)'} to ${outFile}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try { main(); } catch (error) { console.error(`append-solver-health-record: ${error.message}`); process.exit(2); }
}
