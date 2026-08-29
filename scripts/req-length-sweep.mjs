#!/usr/bin/env node
/**
 * Observational reqLen sweep. This never edits level or hint artifacts.
 *
 * npm run solver:req-length-sweep -- --levels=pos:1 --min=4 --max=20 --budget-ms=1000
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';

import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { parseLevelPositions, readLevelsWithHints } from './level-data-io.mjs';
import { validateRawLevel } from '../modules/domain/level-schema.js';
import { buildReqLengths, classifyFeasibility, classifyRuns, parseInteger, portalFreeParityReason, summarizePoints, summarizeRuns } from './req-length-sweep-lib.mjs';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--')).map(arg => {
    const [key, ...parts] = arg.split('=');
    return [key, parts.join('=')];
}));
const root = new URL('..', import.meta.url).pathname;
const levelsPath = path.resolve(args.get('--levels-json') || path.join(root, 'data', 'levels.json'));
const outputPath = path.resolve(args.get('--output') || path.join(root, 'logs', 'req-length-sweep', 'latest.json'));
const budgetMs = parseInteger(args.get('--budget-ms') || 1000, '--budget-ms', { min: 1 });
const repeats = parseInteger(args.get('--repeats') || 1, '--repeats', { min: 1 });
const nodeBudget = args.has('--node-budget') ? parseInteger(args.get('--node-budget'), '--node-budget', { min: 1 }) : null;
// THE machine-independent cap (modules/solver/work-meter.ts). Preferred over --node-budget for any
// cross-machine or cross-technique comparison: a work unit costs the same in dfs/beam/repair, which
// count 11-17x different real work per "node". See docs/solver-budget-determinism.md.
const workBudget = args.has('--work-budget') ? parseInteger(args.get('--work-budget'), '--work-budget', { min: 1 }) : null;
const repairBudgetFraction = args.has('--repair-budget-fraction') ? Number(args.get('--repair-budget-fraction')) : null;
if (repairBudgetFraction !== null && (!Number.isFinite(repairBudgetFraction) || repairBudgetFraction < 0)) {
    throw new Error('--repair-budget-fraction must be a finite number >= 0');
}
// Accept both the canonical scheduler-mode names and their legacy aliases (live workflows still
// pass `legacy`); normalize to the canonical spelling so the solver call and this tool's own
// output metadata single-write only the current vocabulary.
const SCHEDULER_MODE_ALIASES = Object.freeze({ legacy: 'production', 'portfolio-experiment': 'legacy-latency-portfolio-experiment' });
const CANONICAL_SCHEDULER_MODES = ['production', 'legacy-latency-portfolio-experiment'];
const rawSchedulerMode = args.get('--scheduler-mode') || 'legacy';
if (!Object.keys(SCHEDULER_MODE_ALIASES).includes(rawSchedulerMode) && !CANONICAL_SCHEDULER_MODES.includes(rawSchedulerMode)) {
    throw new Error('--scheduler-mode must be one of: production, legacy-latency-portfolio-experiment (legacy aliases: legacy, portfolio-experiment)');
}
const schedulerMode = SCHEDULER_MODE_ALIASES[rawSchedulerMode] ?? rawSchedulerMode;
const levelFilter = parseLevelPositions(args.get('--levels') || 'pos:1');

installBrowserStubs();
const { createSolver } = await import('../modules/solver.js');
const Solver = createSolver();
const rawLevels = readLevelsWithHints(levelsPath);
const positions = [...levelFilter].filter(position => position >= 1 && position <= rawLevels.length).sort((a, b) => a - b);
if (positions.length === 0) throw new Error('No selected level positions exist in the input corpus');

const levels = [];
for (const position of positions) {
    const source = rawLevels[position - 1];
    const originalReqLen = Number(source.reqLen) || 0;
    const reqLengths = buildReqLengths(originalReqLen, {
        min: args.has('--min') ? args.get('--min') : undefined,
        max: args.has('--max') ? args.get('--max') : undefined,
        step: args.get('--step') || 1,
    });
    const points = [];
    console.log(`L${position} (${source.id || 'no-id'}): reqLen ${reqLengths[0]}..${reqLengths.at(-1)} (${reqLengths.length} points)`);

    for (const reqLen of reqLengths) {
        const raw = { ...source, reqLen };
        const schema = validateRawLevel(raw);
        if (!schema.ok) throw new Error(`L${position} reqLen=${reqLen} is schema-invalid: ${schema.errors.join('; ')}`);
        const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber: position });
        const staticReason = portalFreeParityReason(level);
        const validKnownWitnesses = (source.hints || []).reduce((count, hint) => count + Number(Solver.validateCandidatePath(level, hint).ok), 0);
        const runs = [];
        for (let repeat = 1; repeat <= repeats; repeat++) {
            const started = performance.now();
            const result = await Solver.solveLevel(level, {
                timeBudgetMs: budgetMs,
                nodeBudget: nodeBudget ?? undefined,
                workBudget: workBudget ?? undefined,
                repairBudgetFractionOverride: repairBudgetFraction ?? undefined,
                schedulerMode,
            });
            const referee = result.solution ? Solver.validateCandidatePath(level, result.solution) : null;
            if (result.ok && !referee?.ok) {
                throw new Error(`L${position} reqLen=${reqLen} solver returned an invalid solution: ${referee?.reason || 'missing path'}`);
            }
            const winningAttempt = result.attempts?.find(attempt => attempt.ok);
            runs.push({
                repeat, ok: result.ok, status: result.status,
                elapsedMs: Math.round(performance.now() - started),
                solverReportedMs: result.totalMs,
                nodesExpanded: result.nodesExpanded,
                solvedBy: winningAttempt?.configKey || winningAttempt?.profile || null,
                refereeValid: referee?.ok ?? null,
                attempts: result.attempts,
            });
        }
        const point = {
            reqLen, offsetFromOriginal: reqLen - originalReqLen, staticReason,
            schemaValid: true, validKnownWitnesses,
            feasibility: classifyFeasibility(runs, validKnownWitnesses, staticReason),
            classification: classifyRuns(runs, staticReason),
            ...summarizeRuns(runs), runs,
        };
        points.push(point);
        console.log(`  ${String(reqLen).padStart(4)}  ${point.classification.padEnd(23)} ${point.solvedRuns}/${repeats}  ${point.medianElapsedMs}ms  ${point.medianNodesExpanded ?? 0} nodes  feasibility=${point.feasibility}`);
    }
    const normalized = Solver.prepareLevelForSolver(source, { source: 'raw', levelNumber: position });
    const openArea = normalized.grid.w * normalized.grid.h - normalized.blockSet.size;
    const unpack = key => ({ x: key & 0xffff, y: (key >>> 16) & 0xffff });
    const goal = unpack(normalized.goalKey);
    const endpointManhattan = Math.min(...normalized.gateKeys.map(key => {
        const gate = unpack(key);
        return Math.abs(gate.x - goal.x) + Math.abs(gate.y - goal.y);
    }));
    levels.push({
        position, id: source.id || null, originalReqLen, reqInt: Number(source.reqInt) || 0,
        levelMetrics: { openArea, endpointManhattan, originalLengthDensity: originalReqLen / openArea, originalDetourFactor: endpointManhattan ? originalReqLen / endpointManhattan : null },
        summary: summarizePoints(points, Number(args.get('--step') || 1)), points,
    });
}

const report = {
    schemaVersion: 2, generatedAt: new Date().toISOString(),
    commitSha: (() => { try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return 'unknown'; } })(),
    levelsPath,
    settings: {
        budgetMs, nodeBudget, workBudget, repairBudgetFraction, schedulerMode, repeats,
        min: args.get('--min') ?? null, max: args.get('--max') ?? null, step: Number(args.get('--step') || 1),
    },
    terminology: {
        'observed-solved': 'At least one run found a solution.',
        'statically-infeasible': 'A sound static check proves this target impossible.',
        'unknown-within-budget': 'No run solved it; this is not proof of infeasibility.',
        feasibility: 'Separate evidence axis: solver-witnessed, stored-witnessed, proven-infeasible, or unknown.',
    },
    levels,
};
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Report: ${outputPath}`);
