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
import { pathToFileURL } from 'node:url';

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

const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
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
    const separator = actionKey?.indexOf('|') ?? -1;
    return separator > 0 ? actionKey.slice(0, separator) : null;
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

function productionDocumentCommit(document) {
    const value = document?.commitSha ?? document?.summary?.commit;
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed && trimmed !== 'unknown' ? trimmed : null;
}

const productionDocumentCorpus = document =>
    document?.corpus ?? document?.summary?.corpus ?? null;

const equalWorkRows = document => {
    const rows = Array.isArray(document) ? document : document?.results ?? [];
    return rows.filter(row => row?.tier === 'EW1' && (row.techniqueKeys?.length ?? 0) === 1);
};

const levelIdOf = row => String(row?.levelId ?? row?.id ?? row?.level ?? '');

function equalWorkIntegrityMismatch(document, rows) {
    if (!document?.sourceIntegrity || typeof document.sourceIntegrity !== 'object') return null;
    const actual = {
        cells: rows.length,
        levels: new Set(rows.map(row => canonicalCorpusName(row.corpus) + '/' + levelIdOf(row))).size,
        techniques: new Set(rows.map(row => String(row.techniqueKeys?.[0] ?? ''))).size,
        solved: rows.filter(row => row.ok === true).length,
        deadlineTruncated: rows.filter(row => row.deadlineTruncated === true).length,
        errors: rows.filter(row => row.status === 'error').length,
        workBudgets: [...new Set(rows.map(row => finite(row.workBudget)).filter(value => value !== null))].sort((a, b) => a - b),
        maxWorkSpent: rows.length ? Math.max(...rows.map(row => finite(row.workSpent) ?? 0)) : 0,
    };
    const expected = document.sourceIntegrity;
    return JSON.stringify(actual) === JSON.stringify(expected) ? null : { expected, actual };
}

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
    let rowsWithUnknownCorpus = 0;
    let matchedAttempts = 0;
    const levelRows = new Map();
    let unmatchedAttemptIdentity = 0;
    const corpora = new Set();

    for (const document of documents) {
        const documentCorpus = productionDocumentCorpus(document);
        for (const row of productionRows(document)) {
            rows++;
            if (row?.stageLifecycle && typeof row.stageLifecycle === 'object') rowsWithLifecycle++;
            const corpus = canonicalCorpusName(row?.corpus ?? documentCorpus);
            if (corpus === 'unknown') rowsWithUnknownCorpus++;
            else corpora.add(corpus);
            const levelKey = corpus + '/' + levelIdOf(row);
            const levelDetail = {
                corpus,
                levelId: levelIdOf(row),
                ok: row?.ok === true,
                workSpent: finite(row?.workSpent),
                attempts: [],
            };
            levelRows.set(levelKey, levelDetail);
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
                levelDetail.attempts.push({
                    attemptConfigIdentity: config,
                    actionKey: action,
                    stageId: stage,
                    workSpent: work,
                    ok: attempt.ok === true,
                });
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
    return {
        byTechnique, rows, rowsWithLifecycle, rowsWithUnknownCorpus,
        matchedAttempts, unmatchedAttemptIdentity, corpora, levelRows,
    };
}

function summarizeLevelHeadroom(ewRows, productionLevels, capabilityDocument = null) {
    const capabilityRows = Array.isArray(capabilityDocument?.levels) ? capabilityDocument.levels : [];
    const capabilityByLevel = new Map(capabilityRows.map(row => [
        canonicalCorpusName(row.corpus) + '/' + levelIdOf(row),
        row,
    ]));
    const ewByLevel = new Map();
    for (const row of ewRows) {
        const key = canonicalCorpusName(row.corpus) + '/' + levelIdOf(row);
        const bucket = ewByLevel.get(key) ?? [];
        bucket.push(row);
        ewByLevel.set(key, bucket);
    }

    const levels = [...ewByLevel.entries()].map(([levelKey, rows]) => {
        const [corpus, ...idParts] = levelKey.split('/');
        const levelId = idParts.join('/');
        const production = productionLevels.get(levelKey) ?? null;
        const capability = capabilityByLevel.get(levelKey) ?? null;
        const solvedActions = rows.filter(row => row.ok === true).map(row => {
            let technique;
            try { technique = normalizeAttemptIdentityKey(row.techniqueKeys[0]); } catch { technique = String(row.techniqueKeys[0]); }
            const productionAttempts = (production?.attempts ?? []).filter(attempt =>
                attempt.attemptConfigIdentity === technique);
            const productionWork = productionAttempts.map(attempt => attempt.workSpent)
                .filter(value => value !== null);
            return {
                attemptConfigIdentity: technique,
                ew1SolveWork: finite(row.workSpent),
                productionAttempts: productionAttempts.length,
                productionSuccessfulAttempts: productionAttempts.filter(attempt => attempt.ok).length,
                productionMaxAttemptWork: productionWork.length ? Math.max(...productionWork) : null,
                productionStages: [...new Set(productionAttempts.map(attempt => attempt.stageId))].sort(),
            };
        }).sort((a, b) => a.attemptConfigIdentity.localeCompare(b.attemptConfigIdentity));

        let pricingComparison = 'no-ew1-solve';
        if (production?.ok) pricingComparison = 'production-solved';
        else if (solvedActions.length) {
            const offered = solvedActions.filter(action => action.productionAttempts > 0);
            const atOrAbove = offered.filter(action =>
                action.ew1SolveWork !== null
                && action.productionMaxAttemptWork !== null
                && action.productionMaxAttemptWork >= action.ew1SolveWork);
            pricingComparison = !offered.length
                ? 'ew1-solvers-not-offered'
                : atOrAbove.length
                    ? 'ew1-solver-offered-at-or-above-solve-work'
                    : 'ew1-solver-offered-below-solve-work';
        }

        return {
            corpus,
            levelId,
            productionPresent: Boolean(production),
            productionSolved: production?.ok ?? null,
            productionWorkSpent: production?.workSpent ?? null,
            ew1EligibleActions: rows.length,
            ew1SolvedActions: solvedActions,
            pricingComparison,
            frozenCapability: capability ? {
                frozenT1SupportClass: capability.frozenT1SupportClass ?? null,
                solverCount: capability.solverCount ?? null,
                singleton: capability.singleton ?? null,
                doubleton: capability.doubleton ?? null,
            } : null,
        };
    }).sort((a, b) => a.corpus.localeCompare(b.corpus) || a.levelId.localeCompare(b.levelId));

    const comparisonCounts = Object.entries(levels.reduce((counts, row) => {
        counts[row.pricingComparison] = (counts[row.pricingComparison] ?? 0) + 1;
        return counts;
    }, {})).sort(([a], [b]) => a.localeCompare(b)).map(([key, count]) => ({ key, count }));

    return {
        levels,
        summary: {
            levels: levels.length,
            ew1SolvableLevels: levels.filter(row => row.ew1SolvedActions.length > 0).length,
            productionSolvedLevels: levels.filter(row => row.productionSolved === true).length,
            missingProductionLevels: levels.filter(row => !row.productionPresent).length,
            productionMissEw1SolvableLevels: levels.filter(row =>
                row.productionSolved === false && row.ew1SolvedActions.length > 0).length,
            comparisonCounts,
            capabilityRowsProvided: capabilityRows.length,
            missingCapabilityLevels: capabilityRows.length
                ? levels.filter(row => row.frozenCapability === null).length
                : null,
        },
    };
}

export function analyzeEqualWorkProductionReach(equalWorkDocument, productionDocuments, {
    currentHead = null,
    requireCurrentHead = false,
    capabilityDocument = null,
} = {}) {
    const ewRows = equalWorkRows(equalWorkDocument);
    const ewByTechnique = summarizeEqualWork(ewRows);
    const production = summarizeProduction(productionDocuments, new Set(ewByTechnique.keys()));
    const levelHeadroom = summarizeLevelHeadroom(ewRows, production.levelRows, capabilityDocument);
    const documentCommits = productionDocuments.map(productionDocumentCommit);
    const commits = [...new Set(documentCommits.filter(Boolean))].sort();
    const missingCommitDocuments = documentCommits.filter(commit => commit === null).length;
    const blockers = [];

    if (!ewRows.length) blockers.push('equal-work input contains no EW1 singleton rows');
    const integrityMismatch = equalWorkIntegrityMismatch(equalWorkDocument, ewRows);
    if (integrityMismatch) blockers.push('equal-work sourceIntegrity does not match the supplied EW1 rows');
    if (!production.rows) blockers.push('production input contains no level rows');
    if (production.rowsWithLifecycle !== production.rows) {
        blockers.push('production rows are missing stageLifecycle; rerun current production sweep with --lifecycle-telemetry');
    }
    const missingAttemptWork = [...production.byTechnique.values()]
        .reduce((sum, row) => sum + row.missingWorkAttempts, 0);
    if (missingAttemptWork) blockers.push('matched production attempts are missing per-attempt workSpent');
    if (!production.matchedAttempts) blockers.push('production evidence contains no attempts matching EW1 action identities');
    if (production.rowsWithUnknownCorpus) {
        blockers.push('production rows are missing corpus identity; preserve row corpus or the current report wrapper summary.corpus');
    }
    if (missingCommitDocuments) {
        blockers.push('production evidence contains report(s) without a solver commit; preserve commitSha or the current report wrapper summary.commit');
    }
    if (commits.length !== 1) blockers.push('production evidence does not identify exactly one solver commit');
    if (requireCurrentHead && (!currentHead || commits[0] !== currentHead)) {
        blockers.push('production solver commit does not match current HEAD');
    }
    const invalidEqualWork = ewRows.filter(row =>
        row?.deadlineTruncated === true || row?.status === 'error' || finite(row?.workSpent) === null);
    if (invalidEqualWork.length) blockers.push('EW1 rows contain errors, deadline truncation, or missing workSpent');
    if (levelHeadroom.summary.missingProductionLevels) {
        blockers.push('production evidence is missing ' + levelHeadroom.summary.missingProductionLevels + ' EW1 level(s)');
    }
    if (capabilityDocument && levelHeadroom.summary.missingCapabilityLevels) {
        blockers.push('capability input is missing ' + levelHeadroom.summary.missingCapabilityLevels + ' EW1 level(s)');
    }

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
            documents: productionDocuments.length,
            rows: production.rows,
            rowsWithLifecycle: production.rowsWithLifecycle,
            rowsWithUnknownCorpus: production.rowsWithUnknownCorpus,
            corpora: [...production.corpora].sort(),
            commits,
            missingCommitDocuments,
            currentHead: currentHead ?? null,
            currentHeadRequired: requireCurrentHead,
            matchedAttempts: production.matchedAttempts,
            unmatchedAttemptIdentity: production.unmatchedAttemptIdentity,
            missingMatchedAttemptWork: missingAttemptWork,
        },
        techniques,
        levelHeadroom,
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
        'Production: ' + result.production.rows + ' rows across '
            + (result.production.corpora.join(', ') || '(unknown corpus)') + ', '
            + result.production.matchedAttempts + ' matching attempts, commits '
            + (result.production.commits.join(', ') || '(unknown)') + '.',
    ];
    if (result.blockers.length) {
        lines.push('', '## Blockers', '', ...result.blockers.map(item => '- ' + item));
    }
    lines.push('', '## Level-local EW1 pricing headroom', '',
        'EW1-solvable levels: ' + result.levelHeadroom.summary.ew1SolvableLevels
            + '; current production misses among them: ' + result.levelHeadroom.summary.productionMissEw1SolvableLevels + '.',
        ...result.levelHeadroom.summary.comparisonCounts.map(row => '- ' + row.key + ': ' + row.count),
        '',
        '> EW1 solve-work is historical development evidence. Current-attempt work below/above that value is a pricing/reach comparison, not proof that identical work would reproduce the historical solve across revisions or stage contexts.',
        '',
        '| corpus/level | production | EW1 solves | comparison | frozen capability |',
        '|---|---:|---:|---|---|',
        ...result.levelHeadroom.levels
            .filter(row => row.ew1SolvedActions.length > 0)
            .map(row => '| ' + row.corpus + '/' + row.levelId + ' | '
                + (row.productionSolved === true ? 'solved' : row.productionSolved === false ? 'miss' : 'missing') + ' | '
                + row.ew1SolvedActions.length + ' | ' + row.pricingComparison + ' | '
                + (row.frozenCapability?.frozenT1SupportClass ?? 'unjoined') + ' |'),
        '', '## Joined action view', '',
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

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    const { values, flags } = parseArgs(process.argv.slice(2));
    const equalWorkPath = values.get('--equal-work');
    const productionPaths = (values.get('--production') ?? '').split(',').filter(Boolean);
    const capabilityPath = values.get('--capability');
    if (!equalWorkPath || !productionPaths.length) {
        throw new Error('--equal-work=<combined-cells.json> and --production=<report.json[,report2.json]> are required');
    }
    const read = file => JSON.parse(readFileSync(path.resolve(file), 'utf8'));
    const requireCurrentHead = flags.has('--require-current-head');
    const currentHead = requireCurrentHead
        ? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
        : null;
    const result = analyzeEqualWorkProductionReach(read(equalWorkPath), productionPaths.map(read), {
        currentHead,
        requireCurrentHead,
        capabilityDocument: capabilityPath ? read(capabilityPath) : null,
    });
    const out = values.get('--out') ?? 'tmp/equal-work-production-reach.json';
    const summaryOut = values.get('--summary-out') ?? out.replace(/\.json$/u, '.md');
    mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    mkdirSync(path.dirname(path.resolve(summaryOut)), { recursive: true });
    writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
    writeFileSync(summaryOut, renderEqualWorkProductionReachSummary(result));
    console.log(JSON.stringify({
        out, summaryOut, decisionBearing: result.decisionBearing, blockers: result.blockers,
        techniques: result.equalWork.techniques,
        matchedAttempts: result.production.matchedAttempts,
        productionMissEw1SolvableLevels: result.levelHeadroom.summary.productionMissEw1SolvableLevels,
    }, null, 2));
    if (flags.has('--check') && !result.decisionBearing) process.exitCode = 1;
}
