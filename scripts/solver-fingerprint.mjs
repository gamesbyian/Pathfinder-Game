#!/usr/bin/env node
/**
 * Solver determinism fingerprint runner.
 *
 * Records stable per-level solve fingerprints for the published corpus so runs can be diffed for
 * order-sensitive behavior that does not necessarily show up as solve/fail regressions.
 *
 * Run through the esbuild wrapper:
 *   node scripts/run-bundled.mjs scripts/solver-fingerprint.mjs --order=default --out=logs/solver-fingerprint/default.json
 *
 * Options:
 *   --order=default|reverse|random   Level traversal order (default: default)
 *   --seed=<n>                       Deterministic shuffle seed for --order=random (default: 42)
 *   --levels=all|pos:1,pos:2,pos:3|pos:1-10          Level list/ranges. Explicit comma order is preserved.
 *   --budget-ms=<n>                  Per-level DEADLINE (default: 30000); should never fire
 *   --work-budget=<n>                Per-level WORK budget (default: 100,000,000) — the actual
 *                                    bound. This tool exists to detect non-determinism, so it must
 *                                    itself be deterministic: a work budget is machine-independent
 *                                    (modules/solver/work-meter.ts), a wall-clock one is not.
 *   --fresh-solver-per-level         Create a new Solver instance for each level
 *   --out=<path>                     Output JSON (default: logs/solver-fingerprint/latest.json)
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { parseLevelPositions } from './level-data-io.mjs';
import { attemptConfigKey } from './portfolio-solve-sweep-lib.mjs';

const args = process.argv.slice(2);
const argMap = new Map(args.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const eq = a.indexOf('=');
    return [a.slice(0, eq), a.slice(eq + 1)];
}));
const flags = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')));

const orderMode = argMap.get('--order') || 'default';
// Zero is a valid deterministic seed; default only when the option is absent.
const seed = Number(argMap.get('--seed') ?? 42);
const budgetMs = Number(argMap.get('--budget-ms') || 30000);
const workBudget = Number(argMap.get('--work-budget') || 100_000_000);
const outFile = argMap.get('--out') || 'logs/solver-fingerprint/latest.json';
const freshSolverPerLevel = flags.has('--fresh-solver-per-level');

function rng(seedValue) {
    let state = seedValue >>> 0;
    return () => {
        state = (1664525 * state + 1013904223) >>> 0;
        return state / 2 ** 32;
    };
}

function applyOrder(levels) {
    const ordered = [...levels];
    if (orderMode === 'default') return ordered;
    if (orderMode === 'reverse') return ordered.reverse();
    if (orderMode === 'random') {
        const random = rng(seed);
        for (let i = ordered.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
        }
        return ordered;
    }
    console.error(`Unknown --order=${orderMode} (use default|reverse|random)`);
    process.exit(2);
}

const hashJson = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Use the same canonical key as persisted sweep reports. Hand-maintained label copies previously
// collapsed turn-biased repair and every admissible-order attempt onto unrelated configurations,
// allowing a fingerprint comparison to miss a real attempt-ladder change.
const attemptLabel = attempt => attempt ? attemptConfigKey(attempt) : null;

function normalizeAttempt(attempt) {
    return {
        gateKey: attempt?.gateKey ?? null,
        scoringProfileId: attempt?.scoringProfileId ?? attempt?.profile ?? null,
        orderingBiasId: attempt?.orderingBiasId ?? attempt?.template ?? null,
        beamWidth: attempt?.beamWidth ?? null,
        ok: !!attempt?.ok,
        status: attempt?.status ?? null,
        elapsedMs: Number.isFinite(attempt?.elapsedMs) ? attempt.elapsedMs : null,
        nodesExpanded: Number.isFinite(attempt?.nodesExpanded) ? attempt.nodesExpanded : null,
        mechanicBucketRetention: !!(attempt?.mechanicBucketRetention ?? attempt?.diverseBeam),
        repair: !!attempt?.repair,
        repairMustTurnBiased: !!attempt?.repairMustTurnBiased,
        repairTurnBiased: !!attempt?.repairTurnBiased,
        admissibleOrder: !!attempt?.admissibleOrder,
        admissibleOrderNoTieBreak: !!attempt?.admissibleOrderNoTieBreak,
        admissibleOrderLds: !!attempt?.admissibleOrderLds,
        label: attemptLabel(attempt),
    };
}

const getCommitSha = () => {
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
    try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); }
    catch { return 'local'; }
};

installBrowserStubs();
const { createSolver } = await import('../modules/solver.js');
const sharedSolver = createSolver();

const root = new URL('..', import.meta.url).pathname;
const rawLevels = JSON.parse(readFileSync(path.join(root, 'data', 'levels.json'), 'utf8'));
if (!Array.isArray(rawLevels) || rawLevels.length === 0) throw new Error('data/levels.json is empty or not an array');

const requestedLevels = parseLevelPositions(argMap.get('--levels'), { maxLevel: rawLevels.length, sorted: false });
const levelOrder = applyOrder(requestedLevels);

console.log(`solver-fingerprint: order=${orderMode}${orderMode === 'random' ? ` seed=${seed}` : ''} budget=${budgetMs}ms levels=${levelOrder.length}${freshSolverPerLevel ? ' fresh-solver-per-level' : ''}`);

const results = [];
const runStart = Date.now();
for (const levelNumber of levelOrder) {
    const raw = rawLevels[levelNumber - 1];
    const solver = freshSolverPerLevel ? createSolver() : sharedSolver;
    const started = Date.now();
    let record;
    try {
        const level = solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber });
        const result = await solver.solveLevel(level, { timeBudgetMs: Math.max(budgetMs, budgetMs * 4), workBudget });
        const attempts = (result?.attempts || []).map(normalizeAttempt);
        const winnerIndex = attempts.findIndex(a => a.ok);
        const solutionHash = result?.solution ? hashJson(result.solution) : null;
        let refereeValid = null;
        let refereeError = null;
        if (result?.solution && typeof solver.validateCandidatePath === 'function') {
            try {
                const check = solver.validateCandidatePath(level, result.solution);
                refereeValid = !!check?.ok;
                refereeError = check?.ok ? null : (check?.reason || check?.error || null);
            } catch (e) {
                refereeValid = false;
                refereeError = e?.message || String(e);
            }
        }
        record = {
            level: levelNumber,
            ok: !!result?.ok,
            status: result?.status ?? null,
            elapsedMs: Date.now() - started,
            nodesExpanded: Number.isFinite(result?.nodesExpanded) ? result.nodesExpanded : null,
            attemptCount: attempts.length,
            winnerIndex,
            winningStrategy: winnerIndex >= 0 ? attempts[winnerIndex].label : null,
            failedStrategies: attempts.filter(a => !a.ok).map(a => a.label),
            attemptHash: hashJson(attempts.map(a => ({ ...a, elapsedMs: null }))),
            attempts,
            solutionLength: Array.isArray(result?.solution) ? result.solution.length : null,
            solutionHash,
            refereeValid,
            refereeError,
        };
    } catch (e) {
        record = {
            level: levelNumber,
            ok: false,
            status: 'error',
            elapsedMs: Date.now() - started,
            nodesExpanded: null,
            attemptCount: null,
            winnerIndex: -1,
            winningStrategy: null,
            failedStrategies: [],
            attemptHash: null,
            attempts: [],
            solutionLength: null,
            solutionHash: null,
            refereeValid: null,
            refereeError: e?.message || String(e),
        };
    }
    results.push(record);
    console.log(`  L${levelNumber}: ${record.ok ? 'ok' : 'FAIL'} ${record.elapsedMs}ms nodes=${record.nodesExpanded ?? '-'} winner=${record.winningStrategy ?? '-'} attempts=${record.attemptCount ?? '-'}`);
}

const totalMs = Date.now() - runStart;
const solved = results.filter(r => r.ok).map(r => r.level);
const failed = results.filter(r => !r.ok).map(r => r.level);

const output = {
    generatedAt: new Date().toISOString(),
    commit: getCommitSha(),
    corpus: 'data/levels.json',
    order: orderMode,
    seed: orderMode === 'random' ? seed : null,
    budgetMs,
    workBudget,
    freshSolverPerLevel,
    requestedLevels,
    levelOrder,
    summary: {
        total: results.length,
        solved: solved.length,
        failed: failed.length,
        failedLevels: failed,
        totalMs,
        totalNodesExpanded: results.reduce((sum, r) => sum + (r.nodesExpanded || 0), 0),
        totalAttempts: results.reduce((sum, r) => sum + (r.attemptCount || 0), 0),
    },
    results,
};

mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(output, null, 2) + '\n');
console.log(`Result: solved ${solved.length}/${results.length}, failed [${failed.join(', ')}], ${(totalMs / 1000).toFixed(1)}s`);
console.log(`Wrote ${outFile}`);
