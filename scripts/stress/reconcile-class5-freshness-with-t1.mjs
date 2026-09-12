#!/usr/bin/env node
/**
 * Join class-5 freshness nominations against the frozen base-T1 technique census.
 *
 * This does no solving. It distinguishes two materially different reasons a current isolated
 * success can coexist with a frozen class-5 atlas row:
 *   1. coverage gap: the exact level+attempt identity was absent from base T1; or
 *   2. evidence drift: the exact T1 cell existed but did not solve at the frozen census boundary.
 *
 * Usage:
 *   node scripts/stress/reconcile-class5-freshness-with-t1.mjs \
 *     --freshness=tmp/class5-hint-capability-freshness.json \
 *     --census=reports/stress/technique-census/33717910218/combined-cells.json \
 *     --corpus=data/stress/stress-levels-random.json \
 *     --out=tmp/class5-freshness-t1-reconciliation.json
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { normalizeAttemptIdentityKey } from '../../modules/solver/attempt-identity.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const [key, ...rest] = x.split('='); return [key, rest.join('=')];
}));
const required = key => {
    const value = args.get(key);
    if (!value) throw new Error(`missing ${key}`);
    return value;
};
const freshnessFile = required('--freshness');
const censusFile = required('--census');
const corpusFile = args.get('--corpus') ?? 'data/stress/stress-levels-random.json';
const outFile = args.get('--out') ?? 'tmp/class5-freshness-t1-reconciliation.json';
const readJson = file => JSON.parse(readFileSync(path.resolve(file), 'utf8'));

const freshness = readJson(freshnessFile);
const census = readJson(censusFile);
const corpusDoc = readJson(corpusFile);
const corpusRows = Array.isArray(corpusDoc) ? corpusDoc : corpusDoc.levels;
const censusRows = census.results ?? [];

function isBaseT1(row) {
    return row?.corpus === 'corpus2'
        && row.tier === 'T1'
        && row.techniqueKeys?.length === 1
        && !row.flagExperiment
        && !row.pairLabel
        && !row.ablation;
}
const keyOf = (levelId, identity) => `${levelId}\u0000${identity}`;
const t1ByLevelIdentity = new Map();
for (const row of censusRows) {
    if (!isBaseT1(row)) continue;
    const levelId = row.levelId ?? corpusRows[(row.levelPos ?? 0) - 1]?.id;
    if (!levelId) continue;
    let identity;
    try { identity = normalizeAttemptIdentityKey(row.techniqueKeys[0]); } catch { continue; }
    const key = keyOf(String(levelId), identity);
    if (!t1ByLevelIdentity.has(key)) t1ByLevelIdentity.set(key, []);
    t1ByLevelIdentity.get(key).push(row);
}

const rows = [];
for (const nomination of freshness.nominatedRows ?? []) {
    const byIdentity = new Map();
    for (const evidence of nomination.evidence ?? []) {
        const identity = evidence.attemptIdentity;
        if (!identity) continue;
        if (!byIdentity.has(identity)) byIdentity.set(identity, []);
        byIdentity.get(identity).push(evidence);
    }
    const identities = [];
    for (const [identity, evidence] of [...byIdentity].sort(([a], [b]) => a.localeCompare(b))) {
        const t1Cells = t1ByLevelIdentity.get(keyOf(nomination.levelId, identity)) ?? [];
        const solvedCells = t1Cells.filter(cell => cell.ok === true && cell.refereeValid !== false);
        const currentNodes = evidence.map(item => item.nodesExpanded).filter(Number.isFinite);
        identities.push({
            identity,
            currentEvidenceCount: evidence.length,
            latestCurrentFoundAt: evidence.map(item => item.foundAt).filter(Boolean).sort().at(-1) ?? null,
            bestCurrentNodes: currentNodes.length ? Math.min(...currentNodes) : null,
            currentBudgetMs: [...new Set(evidence.map(item => item.budgetMs).filter(value => value != null))].sort((a, b) => a - b),
            frozenBaseT1CellPresent: t1Cells.length > 0,
            frozenBaseT1CellCount: t1Cells.length,
            frozenBaseT1Solved: solvedCells.length > 0,
            frozenBaseT1Cells: t1Cells.map(cell => ({
                ok: cell.ok ?? null,
                refereeValid: cell.refereeValid ?? null,
                nodesExpanded: cell.nodesExpanded ?? null,
                workSpent: cell.workSpent ?? null,
                workBudget: cell.workBudget ?? null,
                budgetMs: cell.budgetMs ?? null,
                winningGate: cell.winningGate ?? null,
                solverRef: cell.solverRef ?? cell.solverSha ?? null,
            })),
        });
    }
    rows.push({
        levelId: nomination.levelId,
        routingRegime: nomination.routingRegime ?? null,
        identities,
        hasCoverageGap: identities.some(item => !item.frozenBaseT1CellPresent),
        hasFrozenFailureNowCurrentSuccess: identities.some(item => item.frozenBaseT1CellPresent && !item.frozenBaseT1Solved),
        hasUnexpectedFrozenT1Success: identities.some(item => item.frozenBaseT1Solved),
    });
}

const identityPairs = rows.flatMap(row => row.identities.map(item => ({ levelId: row.levelId, ...item })));
const coverageGapPairs = identityPairs.filter(item => !item.frozenBaseT1CellPresent);
const driftPairs = identityPairs.filter(item => item.frozenBaseT1CellPresent && !item.frozenBaseT1Solved);
const unexpectedSuccessPairs = identityPairs.filter(item => item.frozenBaseT1Solved);
const summary = {
    nominatedLevels: rows.length,
    nominatedLevelIdentityPairs: identityPairs.length,
    levelsWithAnyCoverageGap: rows.filter(row => row.hasCoverageGap).length,
    coverageGapPairs: coverageGapPairs.length,
    levelsWithFrozenFailureNowCurrentSuccess: rows.filter(row => row.hasFrozenFailureNowCurrentSuccess).length,
    frozenFailureNowCurrentSuccessPairs: driftPairs.length,
    levelsWithUnexpectedFrozenT1Success: rows.filter(row => row.hasUnexpectedFrozenT1Success).length,
    unexpectedFrozenT1SuccessPairs: unexpectedSuccessPairs.length,
    interpretation: 'Coverage gaps nominate missing T1 comparison coverage. Frozen-failure/current-success pairs nominate solver/protocol/evidence drift. Neither category is an automatic production promotion.',
};
const result = { schemaVersion: 1, generatedAt: new Date().toISOString(), freshnessFile, censusFile, corpusFile, summary, rows };
mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
writeFileSync(path.resolve(outFile), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
console.log(`COVERAGE_GAP_LEVELS=${rows.filter(row => row.hasCoverageGap).map(row => row.levelId).join(',')}`);
console.log(`DRIFT_LEVELS=${rows.filter(row => row.hasFrozenFailureNowCurrentSuccess).map(row => row.levelId).join(',')}`);
console.log(`Wrote ${outFile}`);
