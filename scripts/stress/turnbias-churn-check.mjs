#!/usr/bin/env node
// Local churn check for STRATEGY_REPAIR_TURN_BIAS's CURRENT (weighted, non-exclusive) design,
// against a must-turn sample of corpus-2 — CLAUDE.md's "net-monotonic-after-recovery, not
// zero-regression" bar requires knowing whether a net-positive aggregate hides real churn
// (some solves lost, more gained), not just trusting the raw delta. The GitHub Actions
// deterministic corpus-2 refresh already gave a matched aggregate (725 -> 728, +3), but its
// per-level artifact isn't downloadable from this environment (blocked egress host) — this gets
// the per-level breakdown locally instead, via the real Solver.solveLevel() entrypoint (the full
// ladder, not an isolated attempt config, since turn bias's real effect depends on the weighted
// probe-budget split against repairMustTurnBiased).
//
// Explicitly neutralizes STRATEGY_REPAIR_ELITE_PREFIX_DFS in BOTH arms (shipped opt-in-only this
// same session) so any non-null ablation config doesn't accidentally activate it as a side effect
// of normalizeAblationConfig's Proxy reading unset flags as true — this test isolates turn bias
// specifically. STRATEGY_REPAIR_NOGOOD_CACHE (shipped default-on) is left alone deliberately: it
// reflects this branch's real current default in both arms.
//
// SCRATCH TOOL — run via:
//   node scripts/run-bundled.mjs scripts/stress/turnbias-churn-check.mjs [sampleSize] [nodeBudget]
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API } = await import('../../modules/solver.js');
const Solver = createSolver();
const { normalizeAblationConfig } = SOLVER_TESTING_API;

const ROOT = fileURLToPath(new URL('..', import.meta.url));
// Defaults tuned for local iteration speed, not fidelity to production budgets — a full
// Solver.solveLevel() call with the repair fallback can take up to ~(1+6+1)x timeBudgetMs per CLAUDE.md's
// documented worst case, which made an initial 80-level/120s-wall attempt impractically slow (one
// level took >7 minutes). Prefer the real GitHub Actions solver-stress-refresh.yml dispatch
// (deterministic:true, enable_flags=<flag>) for an authoritative answer — it now prints per-level
// churn directly to the job log (2026-08-07) — and treat this script as a fast, rough local signal.
const SAMPLE_SIZE = process.argv[2] ? Number(process.argv[2]) : 50;
const NODE_BUDGET = process.argv[3] ? Number(process.argv[3]) : 1500000;
const WALL_MS = process.argv[4] ? Number(process.argv[4]) : 15000;

const corpus = JSON.parse(readFileSync(path.join(ROOT, 'data/stress/stress-levels-random.json'), 'utf8'));
const levels = Array.isArray(corpus) ? corpus : corpus.levels;

function hasMustTurn(entry) {
    return (entry.landmarks || []).some(x => String(x.role || '').startsWith('mustTurn'));
}

const pool = levels.filter(hasMustTurn);
const stride = Math.max(1, Math.floor(pool.length / SAMPLE_SIZE));
const candidates = [];
for (let i = 0; i < pool.length && candidates.length < SAMPLE_SIZE; i += stride) candidates.push(pool[i]);

const OFF_ABLATION = normalizeAblationConfig({ STRATEGY_REPAIR_TURN_BIAS: false, STRATEGY_REPAIR_ELITE_PREFIX_DFS: false });
const ON_ABLATION = normalizeAblationConfig({ STRATEGY_REPAIR_TURN_BIAS: true, STRATEGY_REPAIR_ELITE_PREFIX_DFS: false });

let solvedOn = 0, solvedOff = 0;
const flips = [];
let i = 0;

for (const entry of candidates) {
    i++;
    const { id, stressMeta: _stressMeta, ...raw } = entry;
    let level;
    try {
        level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    } catch (err) {
        console.error(`prep error on ${id}: ${err?.message ?? err}`);
        continue;
    }
    const onResult = await Solver.solveLevel(level, { ablation: ON_ABLATION, nodeBudget: NODE_BUDGET, timeBudgetMs: WALL_MS });
    const offResult = await Solver.solveLevel(level, { ablation: OFF_ABLATION, nodeBudget: NODE_BUDGET, timeBudgetMs: WALL_MS });
    const onSolved = !!onResult.ok;
    const offSolved = !!offResult.ok;
    if (onSolved) solvedOn++;
    if (offSolved) solvedOff++;
    if (onSolved !== offSolved) {
        flips.push({ id: id ?? '(no id)', solvedOn, offSolved, winningScoringProfileIdOn: onResult.attempts?.find(a => a.ok)?.scoringProfileId ?? null, winningScoringProfileIdOff: offResult.attempts?.find(a => a.ok)?.scoringProfileId ?? null });
        console.log(`${id}: FLIP onSolved=${onSolved} offSolved=${offSolved}`);
    }
    if (i % 10 === 0) console.log(`  ...${i}/${candidates.length} (solvedOn=${solvedOn} solvedOff=${solvedOff} flips=${flips.length})`);
}

console.log(`\nSample: ${candidates.length} must-turn corpus-2 levels, node budget ${NODE_BUDGET}, wall ${WALL_MS}ms`);
console.log(`Solved ON (turn bias):  ${solvedOn}/${candidates.length}`);
console.log(`Solved OFF (baseline):  ${solvedOff}/${candidates.length}`);
console.log(`Flips: ${flips.length}`);
if (flips.length > 0) console.log(JSON.stringify(flips, null, 2));
