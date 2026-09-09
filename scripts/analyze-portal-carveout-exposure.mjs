#!/usr/bin/env node
/**
 * Quantify how much of the current stress-corpus capability gap sits on levels where a
 * production search mechanism is switched off by a portal carve-out.
 *
 * Four production mechanisms are gated on `level.portalMap.size === 0` (or `> 0`):
 *
 *   1. beam coarse-state merge          modules/solver/search.ts       (`useCoarseStateMerge`)
 *   2. connectivity volume check        modules/solver/topology.ts     (`isConnected` tail)
 *   3. must-cross neighbour-budget      modules/solver/lower-bounds.ts (`mustCrossNeighborBudgetDeadlocked`)
 *   4. parity prune / parity gate filter modules/solver/hard-prune-pipeline.ts, orchestration.ts
 *
 * Two default-ON retry tiers toggle mechanisms 1 and 3, so on a portal-bearing level they re-run
 * the ladder under a flag change that cannot alter search behaviour. This script measures the
 * work those dispatches consume and the solves they still produce (extra budget, not the named
 * mechanism), plus the portal/portal-free split of the production boundary and of isolated
 * technique capability.
 *
 * Observational only: level IDs are join keys, never solver inputs. Portal counts and cell parity
 * are read from committed corpus wire data; production status comes from a frozen run report.
 *
 * Usage:
 *   node scripts/analyze-portal-carveout-exposure.mjs
 *   node scripts/analyze-portal-carveout-exposure.mjs --levels=... --production=... --out=...
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const DEFAULT_LEVELS = 'data/stress/stress-levels-random.json';
const DEFAULT_PRODUCTION = 'reports/stress/solver-corpus2-latest.json';
const DEFAULT_CAPABILITY = 'reports/stress/technique-niches/2026-09-03/level-capability.json';
const DEFAULT_OUTPUT = 'reports/stress/portal-carveout-exposure-2026-09-09.json';

/** Retry tiers whose toggled mechanism is already inert on a portal-bearing level. */
const PORTAL_INERT_TIERS = [
    {
        stage: 'must-cross-neighbor-prune-disabled-retry',
        toggles: 'PRUNE_MC_NEIGHBOR_BUDGET',
        inertBecause: 'mustCrossNeighborBudgetDeadlocked returns false when level.portalMap.size > 0',
        eligibility: 'initialMustCrossMask !== 0 (stage-budget.ts) — no portal term',
    },
    {
        stage: 'coarse-state-near-tie-retention-disabled-retry',
        toggles: 'STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION',
        inertBecause: 'coarse-state merge (and therefore its near-tie runner-up) is off when level.portalMap.size > 0',
        eligibility: 'any level with main-search configs — no portal term',
    },
];

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

const cellParity = (x, y) => (x + y) & 1;
const median = (values) => (values.length ? [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] : null);
const rate = (part, whole) => (whole ? Number((part / whole).toFixed(4)) : null);

/** Per-level join of committed wire features, frozen production status, and isolated capability. */
function buildRows({ levels, production, capability }) {
    const productionById = new Map(production.levels.map(row => [row.id, row]));
    const capabilityById = new Map((capability?.levels ?? []).map(row => [row.levelId, row]));
    return levels.map(level => {
        const productionRow = productionById.get(level.id);
        assert(productionRow, `production report has no row for ${level.id}`);
        const portals = level.portals ?? [];
        const twistPairs = portals.filter(p => cellParity(p.x1, p.y1) !== cellParity(p.x2, p.y2)).length;
        const capabilityRow = capabilityById.get(level.id) ?? null;
        return {
            id: level.id,
            portalPairs: portals.length,
            twistPairs,
            mustCross: (level.mustCross ?? []).length,
            productionSolved: productionRow.ok === true,
            winningStage: productionRow.ok ? String(productionRow.winningActionKey ?? '').split('|')[0] : null,
            stageLifecycle: productionRow.stageLifecycle ?? {},
            isolatedOracleSolved: capabilityRow ? capabilityRow.isolatedOracleSolved === true : null,
            solverCount: capabilityRow ? capabilityRow.solverCount : null,
        };
    });
}

function summarizePopulation(rows, label) {
    const misses = rows.filter(row => !row.productionSolved);
    const scored = rows.filter(row => row.solverCount !== null).map(row => row.solverCount);
    return {
        label,
        levels: rows.length,
        productionSolved: rows.length - misses.length,
        productionSolveRate: rate(rows.length - misses.length, rows.length),
        misses: misses.length,
        missesWithIsolatedWinner: misses.filter(row => row.isolatedOracleSolved === true).length,
        missesWithoutIsolatedWinner: misses.filter(row => row.isolatedOracleSolved === false).length,
        medianSolverCount: median(scored),
    };
}

/** Work spent and solves won per stage across the whole population — the marginal-value ladder. */
function stageLadder(rows) {
    const work = new Map();
    const wins = new Map();
    for (const row of rows) {
        for (const [stage, lifecycle] of Object.entries(row.stageLifecycle)) {
            work.set(stage, (work.get(stage) ?? 0) + Number(lifecycle.actualWork ?? 0));
        }
        if (row.winningStage) wins.set(row.winningStage, (wins.get(row.winningStage) ?? 0) + 1);
    }
    // The main ladder's attempts are labelled `main-search` in winningActionKey and `main-ladder`
    // in stageLifecycle; keep the lifecycle name so work and wins land on one row.
    if (wins.has('main-search')) wins.set('main-ladder', (wins.get('main-ladder') ?? 0) + wins.get('main-search'));
    wins.delete('main-search');
    const total = [...work.values()].reduce((sum, value) => sum + value, 0);
    return {
        totalWorkSpent: total,
        stages: [...work.entries()]
            .map(([stage, workSpent]) => ({
                stage,
                workSpent,
                shareOfCorpusWork: rate(workSpent, total),
                wins: wins.get(stage) ?? 0,
                workPerWin: wins.get(stage) ? Math.round(workSpent / wins.get(stage)) : null,
            }))
            .sort((a, b) => (b.workPerWin ?? Infinity) - (a.workPerWin ?? Infinity)),
    };
}

function inertTierExposure(rows) {
    return PORTAL_INERT_TIERS.map(tier => {
        const slice = (selector) => {
            const selected = rows.filter(selector);
            let workSpent = 0;
            let dispatched = 0;
            for (const row of selected) {
                const lifecycle = row.stageLifecycle[tier.stage];
                if (lifecycle?.reached) {
                    dispatched++;
                    workSpent += Number(lifecycle.actualWork ?? 0);
                }
            }
            return {
                levels: selected.length,
                dispatched,
                workSpent,
                wins: selected.filter(row => row.winningStage === tier.stage).length,
            };
        };
        return {
            ...tier,
            portalBearing: slice(row => row.portalPairs > 0),
            portalFree: slice(row => row.portalPairs === 0),
        };
    });
}

export function analyzePortalCarveoutExposure({ levels, production, capability }) {
    const rows = buildRows({ levels, production, capability });
    const portalBearing = rows.filter(row => row.portalPairs > 0);
    const portalFree = rows.filter(row => row.portalPairs === 0);
    const inert = inertTierExposure(rows);
    const ladder = stageLadder(rows);
    const zeroTwist = portalBearing.filter(row => row.twistPairs === 0);
    return {
        schemaVersion: 1,
        evidenceRole: 'observational-discovery',
        sourceIdentities: {
            productionRun: {
                timestamp: production.timestamp,
                commitSha: production.commitSha,
                corpus: production.corpus,
                solved: production.solved,
                total: production.total,
                budgetMs: production.budgetMs,
                nodeBudget: production.nodeBudget,
                workBudget: production.workBudget,
            },
            capabilityMap: capability?.sourceIdentities ?? null,
        },
        populations: [
            summarizePopulation(rows, 'all'),
            summarizePopulation(portalFree, 'portal-free'),
            summarizePopulation(portalBearing, 'portal-bearing'),
            summarizePopulation(portalBearing.filter(row => row.mustCross > 0), 'portal-bearing with must-cross'),
            summarizePopulation(portalFree.filter(row => row.mustCross > 0), 'portal-free with must-cross'),
        ],
        missShare: {
            totalMisses: rows.filter(row => !row.productionSolved).length,
            portalBearingMisses: portalBearing.filter(row => !row.productionSolved).length,
            missesWithoutIsolatedWinner: rows.filter(row => !row.productionSolved && row.isolatedOracleSolved === false).length,
            portalBearingMissesWithoutIsolatedWinner:
                portalBearing.filter(row => !row.productionSolved && row.isolatedOracleSolved === false).length,
        },
        parityRestorable: {
            note: 'A portal pair whose two terminals share cell parity cannot repair a parity mismatch, '
                + 'so the ordinary parity prune argument survives on levels where every pair is same-parity.',
            portalBearingLevels: portalBearing.length,
            zeroTwistLevels: zeroTwist.length,
            zeroTwistProductionSolved: zeroTwist.filter(row => row.productionSolved).length,
        },
        inertRetryTiers: inert,
        stageLadder: ladder,
        rowMaterialization: 'Omitted from the committed artifact; rerun this script to rebuild joined per-level rows.',
    };
}

function parseArgs(argv) {
    return new Map(argv.map((raw) => {
        const separator = raw.indexOf('=');
        if (separator < 0) throw new Error(`Expected --key=value, received ${raw}`);
        return [raw.slice(0, separator), raw.slice(separator + 1)];
    }));
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const levelsPath = args.get('--levels') ?? DEFAULT_LEVELS;
    const productionPath = args.get('--production') ?? DEFAULT_PRODUCTION;
    const capabilityPath = args.get('--capability') ?? DEFAULT_CAPABILITY;
    const outputPath = args.get('--out') ?? DEFAULT_OUTPUT;
    const levelsFile = JSON.parse(readFileSync(levelsPath, 'utf8'));
    const result = analyzePortalCarveoutExposure({
        levels: Array.isArray(levelsFile) ? levelsFile : levelsFile.levels,
        production: JSON.parse(readFileSync(productionPath, 'utf8')),
        capability: JSON.parse(readFileSync(capabilityPath, 'utf8')),
    });
    writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`Wrote ${outputPath}`);
    for (const population of result.populations) {
        console.log(`${population.label.padEnd(30)} n=${String(population.levels).padStart(5)} `
            + `solved=${String(population.productionSolved).padStart(5)} (${population.productionSolveRate}) `
            + `misses=${String(population.misses).padStart(4)} `
            + `no-isolated-winner=${String(population.missesWithoutIsolatedWinner).padStart(4)} `
            + `medianSolverCount=${population.medianSolverCount}`);
    }
    for (const tier of result.inertRetryTiers) {
        console.log(`${tier.stage}: portal-bearing ${(tier.portalBearing.workSpent / 1e9).toFixed(1)}G work / `
            + `${tier.portalBearing.wins} wins (mechanism inert) vs portal-free `
            + `${(tier.portalFree.workSpent / 1e9).toFixed(1)}G / ${tier.portalFree.wins} wins`);
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
