#!/usr/bin/env node
/**
 * Compact, standardized longitudinal solver-health record. Appends ONE JSONL line per completed
 * capability run to reports/stress/solver-health-timeline.jsonl, derived entirely from data an
 * EXISTING dispatched run (solver-stress-refresh.yml) already produced in the same job -- the
 * per-run summary.json its own "Regenerate derived stress metadata" step already writes, plus the
 * corpus1/corpus2 combined reports that step already read. No new solver compute.
 *
 * In addition to scalar solve/work health, this records capability composition: population/solved
 * set hashes plus gain/loss churn against the most recent protocol-compatible tracked capability
 * run whose per-level snapshot is still available. The timeline keeps only compact churn counts and
 * set hashes; exact IDs remain recoverable from the referenced per-level run snapshots. Churn is
 * research/health evidence only and may not steer production by level identity.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { diffIdSets, hashIds, populationIds, reportRows, solvedIds } from './solver-capability-memory-lib.mjs';

function parseArgs(argv) {
    return new Map(argv.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
        const [k, ...v] = a.slice(2).split('=');
        return [k, v.join('=')];
    }));
}

function normalizeFlagList(value) {
    if (value == null || value === '') return [];
    if (Array.isArray(value)) return [...value].map(String).sort();
    return String(value).split(',').map(s => s.trim()).filter(Boolean).sort();
}

function normalizedBoolean(value) {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value ?? null;
}

function normalizeProtocol(summary) {
    const protocol = summary?.protocol;
    if (!protocol || typeof protocol !== 'object' || Array.isArray(protocol)) return null;
    return Object.fromEntries(
        Object.entries(protocol)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => [key, value == null ? '' : String(value)]),
    );
}

function protocolHash(summary) {
    const protocol = normalizeProtocol(summary);
    if (!protocol) return null;
    return createHash('sha256').update(JSON.stringify(protocol)).digest('hex');
}

function inferCorpusKey(file) {
    const base = path.basename(file).toLowerCase();
    if (base.includes('corpus1')) return 'corpus1';
    if (base.includes('corpus2')) return 'corpus2';
    return null;
}

function normalizeCombinedByCorpus(combinedByCorpus) {
    const out = {};
    for (const [key, value] of Object.entries(combinedByCorpus)) {
        const corpus = key === 'corpus1' || key === 'corpus2' ? key : inferCorpusKey(key);
        if (!corpus) continue;
        out[corpus] = reportRows(value);
    }
    return out;
}

/** Per-stage reach/attempts/solves/nodesExpanded/workSpent, aggregated from attempts[].stageId. */
export function summarizeStageParticipation(levels) {
    const stats = new Map();
    for (const level of levels) {
        const seenThisLevel = new Set();
        for (const attempt of level?.attempts ?? []) {
            const stageId = attempt?.stageId;
            if (!stageId) continue;
            if (!stats.has(stageId)) stats.set(stageId, { reach: 0, attempts: 0, solves: 0, nodesExpanded: 0, workSpent: 0 });
            const s = stats.get(stageId);
            if (!seenThisLevel.has(stageId)) { s.reach += 1; seenThisLevel.add(stageId); }
            s.attempts += 1;
            s.nodesExpanded += Number(attempt?.nodesExpanded) || 0;
            s.workSpent += Number(attempt?.workSpent) || 0;
            if (attempt?.ok) s.solves += 1;
        }
    }
    return Object.fromEntries(stats);
}

function protocolMatches(currentSummary, priorSummary) {
    if (!priorSummary) return false;
    if (normalizedBoolean(currentSummary?.levelBlind) !== normalizedBoolean(priorSummary?.levelBlind)) return false;
    if (normalizedBoolean(currentSummary?.deterministic) !== normalizedBoolean(priorSummary?.deterministic)) return false;
    if (JSON.stringify(normalizeFlagList(currentSummary?.enableFlags)) !== JSON.stringify(normalizeFlagList(priorSummary?.enableFlags))) return false;
    if (JSON.stringify(normalizeFlagList(currentSummary?.disableFlags)) !== JSON.stringify(normalizeFlagList(priorSummary?.disableFlags))) return false;
    const currentProtocol = normalizeProtocol(currentSummary);
    const priorProtocol = normalizeProtocol(priorSummary);
    // Legacy summaries do not establish enough budget/execution identity for solved-set churn.
    if (!currentProtocol || !priorProtocol) return false;
    if (JSON.stringify(currentProtocol) !== JSON.stringify(priorProtocol)) return false;
    for (const corpus of ['corpus1', 'corpus2']) {
        const current = currentSummary?.[corpus];
        const prior = priorSummary?.[corpus];
        if (!!current !== !!prior) return false;
        if (current && Number(current.total) !== Number(prior.total)) return false;
    }
    return true;
}

function readJsonIfPresent(file) {
    if (!existsSync(file)) return null;
    try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
}

function snapshotRowsForRun(capabilityRunsDir, runId, corpus) {
    const file = path.join(capabilityRunsDir, String(runId), `per-level-${corpus}.json`);
    const data = readJsonIfPresent(file);
    return data ? reportRows(data) : null;
}

function populationMatches(currentRowsByCorpus, priorRowsByCorpus) {
    for (const corpus of ['corpus1', 'corpus2']) {
        const current = currentRowsByCorpus[corpus];
        const prior = priorRowsByCorpus[corpus];
        if (!!current !== !!prior) return false;
        if (current && hashIds(populationIds(current)) !== hashIds(populationIds(prior))) return false;
    }
    return true;
}

export function findPreviousCompatibleRun({ timelineFile, currentSummary, currentCombinedByCorpus, capabilityRunsDir }) {
    if (!existsSync(timelineFile)) return null;
    const lines = readFileSync(timelineFile, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
    const currentRowsByCorpus = normalizeCombinedByCorpus(currentCombinedByCorpus);
    for (let i = lines.length - 1; i >= 0; i--) {
        let record;
        try { record = JSON.parse(lines[i]); } catch { continue; }
        if (!record?.runId || String(record.runId) === String(currentSummary?.runId)) continue;
        const priorSummary = readJsonIfPresent(path.join(capabilityRunsDir, String(record.runId), 'summary.json'));
        if (!protocolMatches(currentSummary, priorSummary)) continue;
        const priorRowsByCorpus = {};
        for (const corpus of ['corpus1', 'corpus2']) {
            const rows = snapshotRowsForRun(capabilityRunsDir, record.runId, corpus);
            if (rows) priorRowsByCorpus[corpus] = rows;
        }
        if (!populationMatches(currentRowsByCorpus, priorRowsByCorpus)) continue;
        return { runId: String(record.runId), summary: priorSummary, rowsByCorpus: priorRowsByCorpus };
    }
    return null;
}

export function buildHealthRecord(summary, combinedByCorpus, previousCompatible = null) {
    let truncated = 0;
    let errored = 0;
    const stageParticipation = {};
    const rowsByCorpus = normalizeCombinedByCorpus(combinedByCorpus);
    for (const [sourceKey, raw] of Object.entries(combinedByCorpus)) {
        const levels = reportRows(raw);
        truncated += levels.filter(l => l?.deadlineTruncated).length;
        errored += levels.filter(l => l?.status === 'error' || l?.hadAttemptError || l?.error).length;
        stageParticipation[sourceKey] = summarizeStageParticipation(levels);
    }
    const corpusSummary = key => {
        if (!summary?.[key]) return null;
        const levels = rowsByCorpus[key] ?? [];
        const currentSolvedIds = solvedIds(levels);
        return {
            total: summary[key].total,
            solved: summary[key].solved,
            nodes: summary[key].nodes,
            work: summary[key].work,
            populationIdHash: hashIds(populationIds(levels)),
            solvedIdHash: hashIds(currentSolvedIds),
        };
    };
    const capabilityChurn = {};
    for (const corpus of ['corpus1', 'corpus2']) {
        const currentRows = rowsByCorpus[corpus];
        const priorRows = previousCompatible?.rowsByCorpus?.[corpus];
        if (!currentRows || !priorRows) { capabilityChurn[corpus] = null; continue; }
        const churn = diffIdSets(solvedIds(currentRows), solvedIds(priorRows));
        capabilityChurn[corpus] = {
            comparedRunId: previousCompatible.runId,
            gained: churn.gained,
            lost: churn.lost,
            retained: churn.retained,
            gainedIdHash: hashIds(churn.gainedIds),
            lostIdHash: hashIds(churn.lostIds),
        };
    }
    return {
        recordedAt: new Date().toISOString(),
        runId: summary?.runId ?? null,
        commit: summary?.solverRef ?? summary?.commit ?? null,
        levelBlind: summary?.levelBlind ?? null,
        deterministic: normalizedBoolean(summary?.deterministic),
        enableFlags: summary?.enableFlags || null,
        disableFlags: summary?.disableFlags || null,
        protocolHash: protocolHash(summary),
        corpus1: corpusSummary('corpus1'),
        corpus2: corpusSummary('corpus2'),
        capabilityChurn,
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
        console.error('Usage: node scripts/append-solver-health-record.mjs --summary=<summary.json> --combined=<combined1.json>[,<combined2.json>...] [--out=<path.jsonl>] [--capability-runs-dir=<dir>]');
        process.exit(2);
    }
    const outFile = args.get('out') || 'reports/stress/solver-health-timeline.jsonl';
    const capabilityRunsDir = args.get('capability-runs-dir') || 'reports/stress/capability-runs';
    const summary = JSON.parse(readFileSync(summaryFile, 'utf8'));
    const combinedByCorpus = {};
    for (const file of combinedSpec.split(',').map(s => s.trim()).filter(Boolean)) {
        const data = JSON.parse(readFileSync(file, 'utf8'));
        combinedByCorpus[path.basename(file)] = data;
    }
    const previousCompatible = findPreviousCompatibleRun({ timelineFile: outFile, currentSummary: summary, currentCombinedByCorpus: combinedByCorpus, capabilityRunsDir });
    const record = buildHealthRecord(summary, combinedByCorpus, previousCompatible);
    mkdirSync(path.dirname(outFile), { recursive: true });
    appendFileSync(outFile, `${JSON.stringify(record)}\n`);
    const churn = record.capabilityChurn?.corpus2;
    const churnText = churn ? `; corpus2 churn +${churn.gained}/-${churn.lost} vs run ${churn.comparedRunId}` : '';
    console.log(`Appended solver-health record for run ${record.runId ?? '(unknown)'} to ${outFile}${churnText}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try { main(); } catch (error) { console.error(`append-solver-health-record: ${error.message}`); process.exit(2); }
}
