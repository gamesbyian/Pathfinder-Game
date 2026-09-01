#!/usr/bin/env node
/**
 * Join bounded equal-work isolated-action pricing to current production reach/work.
 *
 * Historical/canonical attempt, action, and stage identities are normalized at ingestion. The
 * result is development evidence for a production-shaped static repricing experiment, never a
 * production scheduler by itself.
 *
 * Usage:
 *   node scripts/stress/analyze-equal-work-production-reach.mjs
 *     --equal-work=<combined-cells.json>
 *     --production=<solver-report.json[,solver-report-2.json]>
 *     [--out=tmp/equal-work-production-reach.json]
 *     [--summary-out=tmp/equal-work-production-reach.md]
 *     [--require-current-head] [--check]
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { normalizeAttemptActionKey, normalizeAttemptIdentityKey } from '../../modules/solver/attempt-identity.mjs';
import { normalizeSolverStageId } from '../../modules/solver/stage-id-normalization.mjs';
import { attemptActionKey, canonicalAttemptConfigKey } from '../portfolio-solve-sweep-lib.mjs';

function canonicalCorpusName(value) {
    const raw = String(value ?? '');
    if (raw === 'published' || (/(?:^|\/)levels\.json$/u.test(raw) && !raw.includes('/stress/'))) return 'published';
    if (raw === 'corpus1' || /stress-levels\.json$/u.test(raw)) return 'corpus1';
    if (raw === 'corpus2' || /stress-levels-random\.json$/u.test(raw)) return 'corpus2';
    return raw || 'unknown';
}

const finite = value => Number.isFinite(Number(value)) ? Number(value) : null;
const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const median = values => {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

function canonicalActionOf(attempt) {
    if (attempt?.actionKey) {
        try { return normalizeAttemptActionKey(String(attempt.actionKey)); } catch { /* reconstruct below */ }
    }
    try { return attemptActionKey(attempt); } catch { return null; }
}

function canonicalStageOf(attempt, actionKey) {
    if (attempt?.stageId) {
        try { return normalizeSolverStageId(attempt.stageId); } catch { return String(attempt.stageId); }
    }
    return actionKey ? actionKey.slice(0, actionKey.indexOf('|')) : null;
}

function canonicalConfigOf(attempt) {
    try { return canonicalAttemptConfigKey(attempt); }
    catch {
        const raw = attempt?.configKey ?? attempt?.config;
        if (raw == null) return null;
        try { return normalizeAttemptIdentityKey(String(raw)); } catch { return String(raw); }
    }
}

const productionRows = document =>
    Array.isArray(document) ? document : Array.isArray(document?.levels) ? document.levels : [];

const equalWorkRows = document => {
    const rows = Array.isArray(document) ? document : document?.results ?? [];
    return rows.filter(row => row?.tier === 'EW1' && (row.techniqueKeys?.length ?? 0) === 1);
};

const levelIdOf = row => String(row?.levelId ?? row?.id ?? row?.level ?? '');

function summarizeEqualWork(rows) {
    const byTechnique = new Map();
    for (const row of rows) {
        let technique;
        try { technique = normalizeAttemptIdentityKey(row.techniqueKeys[0]); } catch { continue; }
        const bucket = byTechnique.get(technique) ?? [];
        bucket.push({ ...row, technique });
        byTechnique.set(technique, bucket);
    }
    return byTechnique;
}

function summarizeProduction(documents, equalWorkTechniques) {
    const byTechnique = new Map([...equalWorkTechniques].map(key => [key, {
        levels: new Set(), winningLevels: new Set(), attempts: 0, successfulAttempts: 0,
        work: 0, workSamples: [], missingWorkAttempts: 0, stages: new Map(),
    }]));
    let rows = 0;
    let rowsWithLifecycle = 0;
    let matchedAttempts = 0;
    let unmatchedAttemptIdentity = 0;

    for (const document of documents) {
        for (const row of productionRows(document)) {
            rows++;
            if (row?.stageLifecycle && typeof row.stageLifecycle === 'object') rowsWithLifecycle++;
            const corpus = canonicalCorpusName(row?.corpus ?? document?.corpus);
            const levelKey = corpus + '/' + levelIdOf(row);
            for (const attempt of Array.isArray(row?.attempts) ? row.attempts : []) {
                const config = canonicalConfigOf(attempt);
                if (!config) {
                    unmatchedAttemptIdentity++;
                    continue;
                }
                if (!byTechnique.has(config)) continue;
                matchedAttempts++;
                const action = canonicalActionOf(attempt);
                const stage = canonicalStageOf(attempt, action) ?? 'unknown';
                const work = finite(attempt.workSpent);
                const target = byTechnique.get(config);
                target.levels.add(levelKey);
                target.attempts++;
                if (attempt.ok === true) {
                    target.successfulAttempts++;
                    target.winningLevels.add(levelKey);
                }
                if (work === null) target.missingWorkAttempts++;
                else {
                    target.work += work;
                    target.workSamples.push(work);
                }
                const stageRow = target.stages.get(stage) ?? {
                    stageId: stage, attempts: 0, successfulAttempts: 0, work: 0,
                    missingWorkAttempts: 0, actionKeys: new Set(),
                };
                stageRow.attempts++;
                if (attempt.ok === true) stageRow.successfulAttempts++;
                if (work === null) stageRow.missingWorkAttempts++;
                else stageRow.work += work;
                if (action) stageRow.actionKeys.add(action);
                target.stages.set(stage, stageRow);
            }
        }
    }
    return { byTechnique, rows, rowsWithLifecycle, matchedAttempts, unmatchedAttemptIdentity };
}

export function analyzeEqualWorkProductionReach(equalWorkDocument, productionDocuments, {
    currentHead = null,
    requireCurrentHead = false,
} = {}) {
    const ewRows = equalWorkRows(equalWorkDocument);
    const ewByTechnique = summarizeEqualWork(ewRows);
    const production = summarizeProduction(productionDocuments, new Set(ewByTechnique.keys()));
    const commits = [...new Set(productionDocuments.map(document => document?.commitSha).filter(Boolean))].sort();
    const blockers = [];

    if (!ewRows.length) blockers.push('equal-work input contains no EW1 singleton rows');
    if (!production.rows) blockers.push('production input contains no level rows');
    if (production.rowsWithLifecycle !== production.rows) {
        blockers.push('production rows are missing stageLifecycle; rerun current production sweep with --lifecycle-telemetry');
    }
    const missingAttemptWork = [...production.byTechnique.values()]
        .reduce((sum, row) => sum + row.missingWorkAttempts, 0);
    if (missingAttemptWork) blockers.push('matched production attempts are missing per-attempt workSpent');
    if (!production.matchedAttempts) blockers.push('production evidence contains no attempts matching EW1 action identities');
    if (commits.length !== 1) blockers.push('production evidence does not identify exactly one solver commit');
    if (requireCurrentHead && (!currentHead || commits[0] !== currentHead)) {
        blockers.push('production solver commit does not match current HEAD');
    }
    const invalidEqualWork = ewRows.filter(row =>
        row?.deadlineTruncated === true || row?.status === 'error' || finite(row?.workSpent) === null);
    if (invalidEqualWork.length) blockers.push('EW1 rows contain errors, deadline truncation, or missing workSpent');

    const techniques = [...ewByTechnique.entries()].map(([technique, rows]) => {
        const work = rows.map(row => finite(row.workSpent)).filter(value => value !== null);
        const solved = rows.filter(row => row.ok === true);
        const productionRow = production.byTechnique.get(technique);
        return {
            attemptConfigIdentity: technique,
            equalWork: {
                eligibleCells: rows.length,
                solvedCells: solved.length,
                solvedLevels: [...new Set(solved.map(row =>
                    canonicalCorpusName(row.corpus) + '/' + levelIdOf(row)))].length,
                meanWork: mean(work),
                medianWork: median(work),
                workBudgetReached: rows.filter(row => row.status === 'work-budget-reached').length,
                naturallyExhausted: rows.filter(row => row.status === 'exhausted').length,
            },
            production: {
                reachedLevels: productionRow.levels.size,
                winningLevels: productionRow.winningLevels.size,
                attempts: productionRow.attempts,
                successfulAttempts: productionRow.successfulAttempts,
                work: productionRow.work,
                meanAttemptWork: mean(productionRow.workSamples),
                missingWorkAttempts: productionRow.missingWorkAttempts,
                stages: [...productionRow.stages.values()]
                    .map(stage => ({ ...stage, actionKeys: [...stage.actionKeys].sort() }))
                    .sort((a, b) => a.stageId.localeCompare(b.stageId)),
            },
        };
    }).sort((a, b) =>
        (b.production.reachedLevels - a.production.reachedLevels)
        || (b.equalWork.solvedCells - a.equalWork.solvedCells)
        || a.attemptConfigIdentity.localeCompare(b.attemptConfigIdentity));

    return {
        schemaVersion: 1,
        evidenceRole: 'development equal-work pricing to production-reach join',
        identityContract: 'historical/current attempt, action, and stage identities canonicalized at ingestion',
        decisionBearing: blockers.length === 0,
        blockers,
        equalWork: {
            rows: ewRows.length,
            levels: new Set(ewRows.map(row =>
                canonicalCorpusName(row.corpus) + '/' + levelIdOf(row))).size,
            techniques: ewByTechnique.size,
        },
        production: {
            rows: production.rows,
            rowsWithLifecycle: production.rowsWithLifecycle,
            commits,
            currentHead: currentHead ?? null,
            currentHeadRequired: requireCurrentHead,
            matchedAttempts: production.matchedAttempts,
            unmatchedAttemptIdentity: production.unmatchedAttemptIdentity,
            missingMatchedAttemptWork: missingAttemptWork,
        },
        techniques,
    };
}

export function renderEqualWorkProductionReachSummary(result) {
    const lines = [
        '# Equal-work pricing × production reach',
        '',
        'Decision-bearing integration status: **' + (result.decisionBearing ? 'READY' : 'BLOCKED') + '**.',
        '',
        'EW1: ' + result.equalWork.rows + ' cells, ' + result.equalWork.levels + ' levels, '
            + result.equalWork.techniques + ' techniques.',
        'Production: ' + result.production.rows + ' rows, ' + result.production.matchedAttempts
            + ' matching attempts, commits ' + (result.production.commits.join(', ') || '(unknown)') + '.',
    ];
    if (result.blockers.length) {
        lines.push('', '## Blockers', '', ...result.blockers.map(item => '- ' + item));
    }
    lines.push('', '## Joined action view', '',
        '| attempt config | EW1 solves/cells | EW1 mean work | production reached levels | production wins | production work | missing attempt work |',
        '|---|---:|---:|---:|---:|---:|---:|');
    for (const row of result.techniques) {
        lines.push('| `' + row.attemptConfigIdentity + '` | '
            + row.equalWork.solvedCells + '/' + row.equalWork.eligibleCells + ' | '
            + Math.round(row.equalWork.meanWork ?? 0).toLocaleString() + ' | '
            + row.production.reachedLevels + ' | ' + row.production.winningLevels + ' | '
            + Math.round(row.production.work).toLocaleString() + ' | '
            + row.production.missingWorkAttempts + ' |');
    }
    lines.push('', '> This join prices and locates existing actions. It does not simulate predecessor-conditioned displacement or constitute a scheduler policy.');
    return lines.join('\n') + '\n';
}

function parseArgs(argv) {
    const values = new Map(argv.filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
        const [key, ...rest] = arg.split('=');
        return [key, rest.join('=')];
    }));
    const flags = new Set(argv.filter(arg => arg.startsWith('--') && !arg.includes('=')));
    return { values, flags };
}

if (import.meta.url === 'file://' + process.argv[1]) {
    const { values, flags } = parseArgs(process.argv.slice(2));
    const equalWorkPath = values.get('--equal-work');
    const productionPaths = (values.get('--production') ?? '').split(',').filter(Boolean);
    if (!equalWorkPath || !productionPaths.length) {
        throw new Error('--equal-work=<combined-cells.json> and --production=<report.json[,report2.json]> are required');
    }
    const read = file => JSON.parse(readFileSync(path.resolve(file), 'utf8'));
    const requireCurrentHead = flags.has('--require-current-head');
    const currentHead = requireCurrentHead
        ? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
        : null;
    const result = analyzeEqualWorkProductionReach(read(equalWorkPath), productionPaths.map(read), {
        currentHead, requireCurrentHead,
    });
    const out = values.get('--out') ?? 'tmp/equal-work-production-reach.json';
    const summaryOut = values.get('--summary-out') ?? out.replace(/\.json$/u, '.md');
    mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    mkdirSync(path.dirname(path.resolve(summaryOut)), { recursive: true });
    writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
    writeFileSync(summaryOut, renderEqualWorkProductionReachSummary(result));
    console.log(JSON.stringify({
        out, summaryOut, decisionBearing: result.decisionBearing, blockers: result.blockers,
        techniques: result.equalWork.techniques, matchedAttempts: result.production.matchedAttempts,
    }, null, 2));
    if (flags.has('--check') && !result.decisionBearing) process.exitCode = 1;
}
