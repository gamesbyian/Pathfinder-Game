#!/usr/bin/env node
/**
 * Additive-tier participation audit (docs/solver-optimization-current-queue.md item #2, step 3:
 * "one additive tier at a time"; reports/2026-08-27-solver-budget-model-rationalization.md's "Nine
 * ms-shaped additive allocation sites").
 *
 * Two questions this answers, both purely by reading existing production telemetry
 * (Attempt.stageId/workSpent/nodesExpanded -- "diagnostic-only... not read by any solving logic",
 * see orchestration.ts's own Attempt interface) from real, UNMODIFIED Solver.solveLevel() calls. No
 * production code is touched or observed via a new hook; this only aggregates fields the solver
 * already returns.
 *
 * 1. Static fact (see the accompanying report, not measured by this script): both real interactive
 *    production callers (modules/input/solver-controller.ts, review-controller.ts) pass
 *    `disableExtraBudgetPasses: true`, which zeroes every one of the 9 CI-ratchet-approved ms-shaped
 *    additive tiers' own budget fraction (stage-budget.ts, `opts.disableExtraBudgetPasses ? 0 : ...`
 *    at each site) plus the repair-late-probe tier and its multi-seed-retry sibling. None of them
 *    ever run in the live interactive game path.
 * 2. Empirical: in the OTHER shape that does exercise them -- an offline/batch/capability-sweep-style
 *    call (no disableExtraBudgetPasses, a generous node/work budget, matching
 *    level-blind-capability-sweep.mjs / the confirmation workflows) -- how often does each additive
 *    tier actually produce an attempt, and how often is that attempt the one that WINS (produces the
 *    accepted solution) versus pure additive cost that never pays off on this sample?
 *
 * Usage:
 *   node scripts/additive-tier-participation-audit.mjs --corpus=data/stress/stress-levels-random.json \
 *     --levels=pos:1-40 --node-budget=2000000 --out=reports/stress/additive-tier-participation-audit.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';

installBrowserStubs();
const { createSolver } = await import('../modules/solver.js');
const Solver = createSolver();

const argv = process.argv.slice(2);
const args = new Map(argv.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));

const CORPUS_FILE = args.get('--corpus') || 'data/stress/stress-levels-random.json';
const LEVEL_SPEC = args.get('--levels') || 'pos:1-40';
// Mirrors level-blind-capability-sweep.mjs / the confirmation workflows' own shape: a generous,
// deterministic nodeBudget as the real ceiling, workBudget scaled the same 1.34x the confirmation
// workflows use, and a large non-binding timeBudgetMs. Deliberately NOT strictTotalWorkBudget and
// NOT disableExtraBudgetPasses -- this audit's whole point is to observe these tiers' ORGANIC
// participation, the same shape a real capability sweep or confirmation A/B actually runs.
const NODE_BUDGET = Number(args.get('--node-budget') || 2_000_000);
const WORK_BUDGET = Number(args.get('--work-budget') || Math.floor(NODE_BUDGET * 1.34));
const TIME_BUDGET_MS = Number(args.get('--time-budget-ms') || 86_400_000);
const OUT_FILE = args.get('--out') || 'reports/stress/additive-tier-participation-audit.json';
const SUMMARY_OUT_FILE = args.get('--summary-out') || OUT_FILE.replace(/\.json$/u, '-summary.md');

// The 12 non-primary stages (excludes prime/repair-probe/main-loop, which are not additive-fallback
// tiers, and portfolio-pass/portfolio-fallback, which belong to the separate, already-quarantined
// legacy wall-clock portfolio scheduler -- see stage-policy.ts's SOLVER_STAGE_IDS for the full list
// this is filtered from).
const ADDITIVE_TIER_STAGE_IDS = [
    'repair-fallback', 'attraction-diversity', 'repair-probe-shrink-recovery', 'admissible-order',
    'dedup-near-tie-retry', 'admissible-order-non-default-retry', 'connectivity-axis-exhausted-retry',
    'repair-elite-prefix-dfs-retry', 'mc-neighbor-budget-retry', 'repair-late-probe',
    'goal-attraction-legacy-distance-retry', 'repair-late-probe-multi-seed-retry',
];

function selectLevelsBySpec(levels, spec) {
    if (!spec) return levels.map((entry, i) => ({ entry, pos: i + 1 }));
    const tokens = spec.split(',').map(t => t.trim()).filter(Boolean);
    const out = [];
    for (const token of tokens) {
        const body = token.startsWith('pos:') ? token.slice(4) : token;
        const range = body.match(/^(\d+)-(\d+)$/);
        if (range) {
            const start = Number(range[1]), end = Number(range[2]);
            for (let p = start; p <= end; p++) out.push({ entry: levels[p - 1], pos: p });
        } else {
            const p = Number(body);
            out.push({ entry: levels[p - 1], pos: p });
        }
    }
    return out.filter(({ entry }) => entry != null);
}

const corpus = JSON.parse(readFileSync(path.resolve(CORPUS_FILE), 'utf8'));
const corpusLevels = Array.isArray(corpus) ? corpus : corpus.levels;
const sample = selectLevelsBySpec(corpusLevels, LEVEL_SPEC);

console.log(`additive-tier-participation-audit: ${sample.length} level(s) from ${CORPUS_FILE}, node-budget=${NODE_BUDGET}, work-budget=${WORK_BUDGET}, time-budget-ms=${TIME_BUDGET_MS}`);

const levelSummaries = [];
const stageRows = new Map(ADDITIVE_TIER_STAGE_IDS.map(id => [id, {
    stageId: id, levelsParticipated: 0, totalAttempts: 0, totalWorkSpent: 0, totalNodesExpanded: 0,
    levelsWon: 0,
}]));

for (const { entry, pos } of sample) {
    const { id, stressMeta: _sm, ...rawLevel } = entry;
    const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    let result;
    const t0 = Date.now();
    try {
        // attemptBudgetTelemetry: opt-in diagnostic flag (orchestration.ts) -- without it, each
        // Attempt's workSpent/allocatedWorkCeiling fields are omitted entirely (nodesExpanded is
        // still always present). Read-only telemetry, changes no search decision.
        result = await Solver.solveLevel(level, {
            nodeBudget: NODE_BUDGET, workBudget: WORK_BUDGET, timeBudgetMs: TIME_BUDGET_MS,
            attemptBudgetTelemetry: true,
        });
    } catch (err) {
        console.log(`  [${pos}] ${id ?? 'unknown'} ERROR ${err?.message ?? err}`);
        continue;
    }
    const elapsedMs = Date.now() - t0;
    const attempts = result?.attempts ?? [];
    const winningAttempt = attempts.find(a => a.ok) ?? null;
    const participatingStages = new Set();
    for (const a of attempts) {
        const row = stageRows.get(a.stageId);
        if (!row) continue;
        row.totalAttempts += 1;
        row.totalWorkSpent += a.workSpent ?? 0;
        row.totalNodesExpanded += a.nodesExpanded ?? 0;
        participatingStages.add(a.stageId);
    }
    for (const stageId of participatingStages) stageRows.get(stageId).levelsParticipated += 1;
    if (winningAttempt && stageRows.has(winningAttempt.stageId)) stageRows.get(winningAttempt.stageId).levelsWon += 1;
    levelSummaries.push({
        levelId: id ?? null, levelPos: pos, ok: !!result?.ok, status: result?.status ?? null,
        nodesExpanded: result?.nodesExpanded ?? null, workSpent: result?.workSpent ?? null,
        elapsedMs, totalAttempts: attempts.length, winningStageId: winningAttempt?.stageId ?? null,
        additiveTierAttempts: attempts.filter(a => stageRows.has(a.stageId)).length,
    });
    console.log(`  [${pos}] ${id ?? 'unknown'} ${result?.ok ? 'SOLVED' : (result?.status ?? 'unsolved')} attempts=${attempts.length} winner=${winningAttempt?.stageId ?? '(none)'} ${elapsedMs}ms`);
}

// ─── Aggregation ────────────────────────────────────────────────────────────────────────────────

const totalLevels = levelSummaries.length;
const solvedLevels = levelSummaries.filter(l => l.ok).length;
const levelsWithAnyAdditiveTierAttempt = levelSummaries.filter(l => l.additiveTierAttempts > 0).length;
const levelsWonByAdditiveTier = levelSummaries.filter(l => l.winningStageId && stageRows.has(l.winningStageId)).length;

const stageSummary = [...stageRows.values()].map(row => ({
    ...row,
    participationRate: totalLevels ? +(100 * row.levelsParticipated / totalLevels).toFixed(1) : 0,
    winRate: totalLevels ? +(100 * row.levelsWon / totalLevels).toFixed(1) : 0,
}));

const summary = {
    population: { levels: sample.length, corpus: CORPUS_FILE, levelSpec: LEVEL_SPEC, nodeBudget: NODE_BUDGET, workBudget: WORK_BUDGET, timeBudgetMs: TIME_BUDGET_MS },
    totalLevels, solvedLevels,
    levelsWithAnyAdditiveTierAttempt,
    levelsWithAnyAdditiveTierAttemptRate: totalLevels ? +(100 * levelsWithAnyAdditiveTierAttempt / totalLevels).toFixed(1) : 0,
    levelsWonByAdditiveTier,
    levelsWonByAdditiveTierRate: totalLevels ? +(100 * levelsWonByAdditiveTier / totalLevels).toFixed(1) : 0,
    stageSummary,
};

console.log('\n=== additive-tier-participation summary ===');
console.log(JSON.stringify(summary, null, 2));

mkdirSync(path.dirname(path.resolve(OUT_FILE)), { recursive: true });
writeFileSync(path.resolve(OUT_FILE), JSON.stringify({ summary, levelSummaries }));
console.log(`\nWrote ${OUT_FILE} (${levelSummaries.length} levels)`);

const summaryMd = `# Additive-tier participation audit

Population: ${sample.length} levels from \`${CORPUS_FILE}\` (${LEVEL_SPEC}), node budget ${NODE_BUDGET.toLocaleString()}, work budget ${WORK_BUDGET.toLocaleString()}, time budget ${TIME_BUDGET_MS.toLocaleString()}ms. No \`disableExtraBudgetPasses\`, no \`strictTotalWorkBudget\` -- matches a real capability-sweep/confirmation-workflow call shape, not the interactive game path (which disables every tier below).

${solvedLevels}/${totalLevels} levels solved. ${levelsWithAnyAdditiveTierAttempt}/${totalLevels} levels (${summary.levelsWithAnyAdditiveTierAttemptRate}%) produced at least one additive-tier attempt. ${levelsWonByAdditiveTier}/${totalLevels} levels (${summary.levelsWonByAdditiveTierRate}%) were solved BY an additive tier (i.e. main-loop/repair-probe alone would not have found this solution within this budget).

## Per-tier participation and win rate

| Stage | Levels participated | Participation rate | Levels won | Win rate | Total attempts | Total workSpent |
|---|---:|---:|---:|---:|---:|---:|
${stageSummary.map(s => `| ${s.stageId} | ${s.levelsParticipated} | ${s.participationRate}% | ${s.levelsWon} | ${s.winRate}% | ${s.totalAttempts} | ${s.totalWorkSpent.toLocaleString()} |`).join('\n')}
`;
writeFileSync(path.resolve(SUMMARY_OUT_FILE), summaryMd);
console.log(`Wrote ${SUMMARY_OUT_FILE}`);
