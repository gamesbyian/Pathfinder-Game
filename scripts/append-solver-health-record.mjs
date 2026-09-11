#!/usr/bin/env node
/**
 * Compact longitudinal solver-health record. Appends one JSONL line per completed capability run
 * from artifacts the existing solver-stress-refresh workflow already produced. No solver compute.
 *
 * Capability churn is compared only with the most recent protocol-compatible tracked run whose
 * per-level snapshots still exist. Exact changed IDs stay in those snapshots; the timeline stores
 * counts and hashes. Historical health information is research evidence only and may not steer
 * production by level identity.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { diffIdSets, hashIds, populationIds, reportRows, solvedIds } from './solver-capability-memory-lib.mjs';

const WORKFLOW_PROTOCOL_DEFAULTS = Object.freeze({
    corpus2_budget_ms: '86400000',
    corpus2_node_budget: '50000000',
    strict_total_work_budget: 'false',
    corpus2_workers: '4',
    enable_flags: '',
    disable_flags: '',
    main_loop_late_reserve_fraction: '',
    main_loop_late_reserve_config_count: '',
    repair_late_probe_node_budget: '',
    corpus1_budget_ms: '86400000',
    corpus1_node_budget: '50000000',
    corpus1_workers: '4',
    deterministic: 'false',
    lifecycle_telemetry: 'false',
    shard_count: '60',
    max_parallel: '20',
});

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

function normalizeProtocolObject(protocol) {
    if (!protocol || typeof protocol !== 'object' || Array.isArray(protocol)) return null;
    return Object.fromEntries(
        Object.entries(protocol)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => [key, value == null ? '' : String(value)]),
    );
}

function protocolFromEvent() {
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventPath || !existsSync(eventPath)) return null;
    try {
        const event = JSON.parse(readFileSync(eventPath, 'utf8'));
        const inputs = event?.inputs;
        if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) return null;
        return normalizeProtocolObject({ ...WORKFLOW_PROTOCOL_DEFAULTS, ...inputs });
    } catch {
        return null;
    }
}

function resolveProtocol(summary) {
    return normalizeProtocolObject(summary?.protocol) ?? protocolFromEvent();
}

function hashProtocol(protocol) {
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

function healthRecordMatchesProtocol(currentSummary, currentProtocolHash, record) {
    if (!record || !currentProtocolHash || record.protocolHash !== currentProtocolHash) return false;
    if (normalizedBoolean(currentSummary?.levelBlind) !== normalizedBoolean(record?.levelBlind)) return false;
    if (normalizedBoolean(currentSummary?.deterministic) !== normalizedBoolean(record?.deterministic)) return false;
    if (JSON.stringify(normalizeFlagList(currentSummary?.enableFlags)) !== JSON.stringify(normalizeFlagList(record?.enableFlags))) return false;
    if (JSON.stringify(normalizeFlagList(currentSummary?.disableFlags)) !== JSON.stringify(normalizeFlagList(record?.disableFlags))) return false;
    for (const corpus of ['corpus1', 'corpus2']) {
        const current = currentSummary?.[corpus];
        const prior = record?.[corpus];
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
    const currentProtocolHash = hashProtocol(resolveProtocol(currentSummary));
    if (!currentProtocolHash) return null;
    const lines = readFileSync(timelineFile, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
    const currentRowsByCorpus = normalizeCombinedByCorpus(currentCombinedByCorpus);
    for (let i = lines.length - 1; i >= 0; i--) {
        let record;
        try { record = JSON.parse(lines[i]); } catch { continue; }
        if (!record?.runId || String(record.runId) === String(currentSummary?.runId)) continue;
        if (!healthRecordMatchesProtocol(currentSummary, currentProtocolHash, record)) continue;
        const priorRowsByCorpus = {};
        for (const corpus of ['corpus1', 'corpus2']) {
            const rows = snapshotRowsForRun(capabilityRunsDir, record.runId, corpus);
            if (rows) priorRowsByCorpus[corpus] = rows;
        }
        if (!populationMatches(currentRowsByCorpus, priorRowsByCorpus)) continue;
        return { runId: String(record.runId), rowsByCorpus: priorRowsByCorpus };
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
    const protocol = resolveProtocol(summary);
    return {
        recordedAt: new Date().toISOString(),
        runId: summary?.runId ?? null,
        commit: summary?.solverRef ?? summary?.commit ?? null,
        levelBlind: summary?.levelBlind ?? null,
        deterministic: normalizedBoolean(summary?.deterministic),
        enableFlags: summary?.enableFlags || null,
        disableFlags: summary?.disableFlags || null,
        protocol,
        protocolHash: hashProtocol(protocol),
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
