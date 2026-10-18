#!/usr/bin/env node
/**
 * PG-I disposable 12-parent current-code exposure, using the maintained technique-census cell
 * executor. Selection is historical nomination only, never a legal cold search input.
 *
 *   node scripts/stress/pg-i-resistant-parent-exposure.mjs --self-test
 *   node scripts/stress/pg-i-resistant-parent-exposure.mjs --mode=plan --out=tmp/pg-i/plan.json
 *   node scripts/stress/pg-i-resistant-parent-exposure.mjs --mode=combine \
 *     --plan=tmp/pg-i/plan.json --input-dir=tmp/pg-i/shards --out=tmp/pg-i/verdict.json
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const FREEZE_FILE = 'reports/stress/pg-i-resistant-parent-20261018-frozen-selection.json';
const assert = (value, message) => { if (!value) throw Error(message); };
const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--') && x.includes('='))
    .map(x => { const index = x.indexOf('='); return [x.slice(0, index), x.slice(index + 1)]; }));
const json = file => JSON.parse(readFileSync(file, 'utf8'));
const emit = (file, value) => {
    mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
};
function historicalRank(seed, id) {
    let h = 0x811c9dc5;
    for (const c of seed + ':' + id) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0;
    h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
    h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
    h ^= h >>> 16;
    return h >>> 0;
}
function candidates(coverage, freeze) {
    const exclusions = new Set(freeze.exclusions);
    return coverage.filter(r => r.corpus === 'corpus2'
        && r.wasSolvedByProduction === false && Array.isArray(r.solvedByT1)
        && r.solvedByT1.length === 0 && !exclusions.has(r.levelId))
        .map(r => ({ id: r.levelId, hash: historicalRank(freeze.selectionSeed, r.levelId) }))
        .sort((a, b) => a.hash - b.hash || a.id.localeCompare(b.id));
}
function validateSelection(freeze, coverage) {
    const pool = candidates(coverage, freeze);
    assert(pool.length === freeze.eligibleAfterExclusion,
        'historical candidate count drift; do not silently reseed');
    assert(new Set(pool.map(x => x.id)).size === pool.length, 'duplicate historical parent IDs');
    assert(freeze.selected.length === 12, 'selection size drift');
    const selected = pool.slice(0, freeze.selected.length);
    for (let i = 0; i < selected.length; i++) {
        const frozen = freeze.selected[i];
        assert(frozen.rank === i + 1 && frozen.id === selected[i].id && frozen.hash === selected[i].hash,
            'outcome-blind historical selection differs from frozen ID/hash at rank ' + (i + 1));
    }
    return selected;
}
function makePlan() {
    const freeze = json(FREEZE_FILE);
    const coverageBytes = readFileSync(freeze.sourceCoverageFile);
    const sha = createHash('sha1').update('blob ' + coverageBytes.length + '\0')
        .update(coverageBytes).digest('hex');
    assert(sha === freeze.sourceCoverageGitBlobSha1, 'source historical projection blob changed');
    const selected = validateSelection(freeze, JSON.parse(coverageBytes));
    const corpusBytes = readFileSync(freeze.corpusFile);
    const corpusSha256 = createHash('sha256').update(corpusBytes).digest('hex');
    assert(corpusSha256 === freeze.corpusSha256, 'source corpus changed; frozen parent positions invalid');
    const parsed = JSON.parse(corpusBytes);
    const levels = Array.isArray(parsed) ? parsed : parsed.levels;
    assert(Array.isArray(levels), 'corpus levels missing');
    const byId = new Map();
    for (let i = 0; i < levels.length; i++) {
        const id = levels[i]?.id;
        assert(id && !byId.has(id), 'absent or duplicate corpus ID at position ' + (i + 1));
        byId.set(id, i + 1);
    }
    const parentSelection = selected.map((row, i) => {
        const position = byId.get(row.id);
        assert(Number.isInteger(position), 'frozen parent absent in corpus: ' + row.id);
        return { ...row, rank: i + 1, corpus: 'corpus2', levelPos: position };
    });
    const keys = freeze.protocol.methodKeys;
    assert(keys.length === 5 && new Set(keys).size === 5, 'five unique existing method keys required');
    // Interleave technique families within each parent: 3 shards preserve whole-parent comparisons.
    const cells = parentSelection.flatMap(parent => keys.map((key, i) => ({
        cellId: 'PGI3::' + parent.id + '::t' + String(i + 1).padStart(2, '0'),
        tier: 'PGI3', corpus: parent.corpus, levelId: parent.id, levelPos: parent.levelPos,
        techniqueKeys: [key], workBudget: freeze.protocol.workBudgetPerIsolatedTechnique,
        budgetMs: freeze.protocol.budgetMs,
    })));
    assert(cells.length === 60 && new Set(cells.map(c => c.cellId)).size === 60, 'cell population drift');
    return {
        schema: 'pathfinder.pg-i-parent-equal-work-plan/v1', sourceCoverageGitBlobSha1: sha,
        corpusSha256, selectionSource: FREEZE_FILE, independentParentCount: parentSelection.length,
        equalWorkBudgetPerTechnique: freeze.protocol.workBudgetPerIsolatedTechnique,
        methods: keys, parentSelection, expectedCells: cells.length, cells,
        inference: '12 historically nominated independent parents; current isolated five-method exposure only. No technique-vector-based production routing.',
    };
}
function collectShardFiles(dir) {
    const files = [];
    function walk(root) {
        for (const entry of readdirSync(root, { withFileTypes: true })) {
            const file = path.join(root, entry.name);
            if (entry.isDirectory()) walk(file);
            else if (/^shard-[0-9]+\.json$/.test(entry.name) && statSync(file).isFile()) files.push(file);
        }
    }
    walk(dir);
    return files.sort();
}
function combine(plan, inputDir) {
    assert(plan.schema === 'pathfinder.pg-i-parent-equal-work-plan/v1', 'unknown plan schema');
    const expected = new Map(plan.cells.map(c => [c.cellId, c]));
    assert(expected.size === 60 && plan.parentSelection.length === 12, 'unexpected frozen population');
    const files = collectShardFiles(inputDir);
    assert(files.length === 3, 'need exactly three shard result files, found ' + files.length);
    const rows = [];
    for (const file of files) {
        const shard = json(file);
        assert(shard.partial === false, 'shard ended partial: ' + file);
        rows.push(...(shard.results ?? []));
    }
    const observed = new Map();
    for (const r of rows) {
        const cell = expected.get(r.cellId);
        assert(cell && !observed.has(r.cellId), 'unexpected/duplicate cell ' + r.cellId);
        assert(r.levelId === cell.levelId && r.levelPos === cell.levelPos
            && r.corpus === cell.corpus, 'source mismatch for ' + r.cellId);
        assert(r.workBudget === cell.workBudget && r.budgetMs === cell.budgetMs
            && r.techniqueKeys?.length === 1 && r.techniqueKeys[0] === cell.techniqueKeys[0],
            'execution/config mismatch for ' + r.cellId);
        observed.set(r.cellId, r);
    }
    assert(observed.size === expected.size, 'missing cells: ' +
        [...expected.keys()].filter(k => !observed.has(k)).join(','));
    const parents = plan.parentSelection.map(p => {
        const methodRows = plan.cells.filter(c => c.levelId === p.id)
            .map(c => observed.get(c.cellId));
        const methods = methodRows.map(r => {
            const success = r.ok === true && r.status === 'success' && r.refereeValid === true
                && Array.isArray(r.solution);
            const measuredFailure = r.ok === false
                && ['exhausted', 'work-budget-reached'].includes(r.status)
                && Number.isFinite(r.workSpent) && r.workSpent > 0
                && Array.isArray(r.compactAttempts) && r.compactAttempts.length > 0
                && r.deadlineTruncated !== true;
            const classification = success ? 'SOLVED'
                : measuredFailure ? 'MEASURED-NON-SUCCESS' : 'UNOBSERVED-OR-CENSORED';
            return {
                configKey: r.techniqueKeys[0], classification, status: r.status,
                workSpent: r.workSpent ?? null, nodesExpanded: r.nodesExpanded ?? null,
                refereeValid: r.refereeValid ?? null, deadlineTruncated: r.deadlineTruncated ?? null,
                path: success ? r.solution : null, cellId: r.cellId,
                error: r.error ?? null,
            };
        });
        const solvedCount = methods.filter(m => m.classification === 'SOLVED').length;
        const censoredCount = methods.filter(m => m.classification === 'UNOBSERVED-OR-CENSORED').length;
        return {
            parentId: p.id, rank: p.rank, levelPos: p.levelPos, methodRows: methods,
            solvedCount, censoredCount, complete: censoredCount === 0,
            robustNonSuccessAtMeasuredDose: solvedCount === 0 && censoredCount === 0,
        };
    });
    const summary = {
        independentParents: parents.length, expectedCells: expected.size, observedCells: rows.length,
        solvedCells: parents.reduce((sum, p) => sum + p.solvedCount, 0),
        refereeValidatedSolutions: parents.reduce((sum, p) =>
            sum + p.methodRows.filter(r => r.classification === 'SOLVED' && r.refereeValid).length, 0),
        parentsWithAtLeastOneSolve: parents.filter(p => p.solvedCount > 0).length,
        allFiveMeasuredNonSuccessParents: parents.filter(p => p.robustNonSuccessAtMeasuredDose).length,
        fullyObservedParents: parents.filter(p => p.complete).length,
        censoredCells: parents.reduce((sum, p) => sum + p.censoredCount, 0),
    };
    return {
        schema: 'pathfinder.pg-i-parent-equal-work-exposure-result/v1',
        population: plan.parentSelection, sourceCoverageGitBlobSha1: plan.sourceCoverageGitBlobSha1,
        corpusSha256: plan.corpusSha256, workBudgetPerTechnique: plan.equalWorkBudgetPerTechnique,
        methods: plan.methods, sourcePlan: plan.selectionSource,
        summary, parents, rows: [...observed.values()].sort((a, b) => a.cellId.localeCompare(b.cellId)),
        interpretation: {
            discoveryOnly: true, independentUnit: 'parentId',
            historicalNomination: 'old 50M-node no-recorded-T1-success source; unknown old attempted-cell completeness',
            newColdSolve: 'A new current-code successful isolated cell is a referee-valid cold method solve on a historically baseline-unsolved parent, NOT automatically a production 250k ladder rescue or a first-ever Hint discovery.',
            nonSuccess: 'Only actual positive-work non-success with all five techniques observed counts as robust-hard at the measured 10M-work dose.',
        },
    };
}
if (process.argv.includes('--self-test')) {
    const seed = 'PG-I-20261018-parent-exposure-v1';
    assert(historicalRank(seed, 'R03031') === 9406317, 'hash contract mismatch');
    assert(historicalRank(seed, 'R02108') === 73193031, 'hash contract mismatch (tail)');
    const frozen = json(FREEZE_FILE);
    assert(frozen.selected.length === 12 && frozen.protocol.methodKeys.length === 5, 'frozen shape drift');
    const fake = [
        { corpus: 'corpus2', levelId: 'X', wasSolvedByProduction: false, solvedByT1: [] },
        { corpus: 'corpus2', levelId: 'Y', wasSolvedByProduction: false, solvedByT1: ['dfs'] },
        { corpus: 'corpus2', levelId: 'Z', wasSolvedByProduction: true, solvedByT1: [] },
    ];
    const probe = candidates(fake, { exclusions: [], selectionSeed: seed });
    assert(probe.length === 1 && probe[0].id === 'X', 'candidate filter contract mismatch');
    console.log('PG-I selection and method-plan self-test passed');
} else if (args.get('--mode') === 'plan') {
    assert(args.get('--out'), '--out required');
    const plan = makePlan();
    emit(args.get('--out'), plan);
    console.log('PG-I PLAN ' + JSON.stringify({ parents: plan.independentParentCount,
        cells: plan.expectedCells, budget: plan.equalWorkBudgetPerTechnique,
        ids: plan.parentSelection.map(p => p.id) }));
} else if (args.get('--mode') === 'combine') {
    assert(args.get('--plan') && args.get('--input-dir') && args.get('--out'),
        '--plan, --input-dir, --out required');
    const verdict = combine(json(args.get('--plan')), args.get('--input-dir'));
    emit(args.get('--out'), verdict);
    console.log('PG-I VERDICT ' + JSON.stringify(verdict.summary));
} else throw Error('use --self-test, --mode=plan, or --mode=combine');
