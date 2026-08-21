#!/usr/bin/env node
/**
 * method-probe: run ONE (or a small allowlist of) attempt config(s) directly against a level set,
 * bypassing getAttemptConfigs / the early repair probe / the full-budget repair fallback / the
 * attraction-diversity pass entirely. For fast (seconds, not minutes-per-level) "does method X
 * solve level L" signal during solver-development iteration — NOT a substitute for
 * portfolio-solve-sweep.mjs's "solve by any means" answer, and NOT how production solves anything
 * (Solver.solve()/solveLevel() are completely untouched by this file).
 *
 * Each requested config is tried, per gate, in the order listed, stopping at the first success —
 * same early-return shape as the real ladder, just over a hand-picked config list instead of the
 * full feature-routed one.
 *
 * --only=<key>[,<key>...] (required) selects configs by their canonical attemptConfigKey() string
 * (the same format solveLevel()'s own Attempt records use — see orchestration.ts):
 *   dfs:objectiveFirst
 *   dfs:perimeterSweep/perimeterCW
 *   beam:objectiveFirst@beam2000
 *   beam:intersectionHarvest@beam5000(diverse)
 *   dfs:repair:repair
 *   dfs:repair:repair(mustTurnBiased)
 *   dfs:repair:repair(turnBiased)
 *   ida:default                 (admissible-order-search.ts prototype; <profile> is the tie-break
 *                                 profile, e.g. ida:objectiveFirst, ida:mustCrossFirst)
 *   ida:none                    (skips the tie-break entirely -- reproduces the technique's
 *                                 original ordering, from before any profile tie-broke ties)
 *   ida:default(lds)            (admissibleOrderSearchLDS: cheap low-discrepancy probe waves
 *                                 before the same unbounded fallback -- TESTED AND REJECTED
 *                                 2026-07-24, kept only as a documented negative result, see
 *                                 AttemptConfig.admissibleOrderLds's own doc)
 * Run with --list-profiles / --list-templates to see the valid profile/template name vocabulary.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/method-probe.mjs -- \
 *     --corpus=data/stress/stress-levels-random.json \
 *     --levels=pos:1-50 \
 *     --only=dfs:repair:repair(turnBiased) \
 *     --budget-ms=8000 --node-budget=20000000 \
 *     --out=/tmp/probe.json --summary-out=/tmp/probe-summary.md
 *
 *   node scripts/run-bundled.mjs scripts/method-probe.mjs -- --list-profiles
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { selectLevelsBySpec } from './level-data-io.mjs';
import { makeAttemptConfigKeyParser } from './attempt-config-key.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const flags = new Set(argv.filter(a => a.startsWith('--') && !a.includes('=')));
const args = new Map(argv.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API } = await import('../modules/Solver.js');
const { PROFILE_ORDER, TEMPLATES, POLICY_PROFILES } = await import('../modules/solver/policy.js');
const Solver = createSolver();
const { prepLevel, runAttempt, attemptConfigKey } = SOLVER_TESTING_API;

if (flags.has('--list-profiles')) {
    console.log('Profiles:', PROFILE_ORDER.join(', '), '(plus "repair" for repair-family configs)');
    console.log('admissible-order-search.ts (prototype): "ida:<profile>", e.g. "ida:default" -- <profile> selects the soft-score TIE-BREAK profile, not the primary ordering (that\'s always admissible slack). "ida:none" skips the tie-break entirely (the technique\'s original ordering).');
    process.exit(0);
}
if (flags.has('--list-templates')) {
    console.log('Templates:', Object.keys(TEMPLATES).join(', '));
    process.exit(0);
}

// Shared parser (scripts/attempt-config-key.mjs) — the error messages there are generic; this
// tool prefixes them with "--only: " for CLI-appropriate context.
const parseAttemptConfigKeyRaw = makeAttemptConfigKeyParser({ TEMPLATES, POLICY_PROFILES, attemptConfigKey });
function parseAttemptConfigKey(key) {
    try { return parseAttemptConfigKeyRaw(key); }
    catch (err) { throw new Error(`--only: ${err.message}`); }
}

const CORPUS_FILE = args.get('--corpus') || 'data/stress/stress-levels-random.json';
const LEVEL_SPEC = args.get('--levels') || null;
const ONLY = args.get('--only');
if (!ONLY) { console.error('--only=<attemptConfigKey>[,<key>...] is required. Run with --list-profiles/--list-templates for the vocabulary.'); process.exit(1); }
let configs;
try {
    configs = ONLY.split(',').map(k => k.trim()).filter(Boolean).map(k => ({ key: k, config: parseAttemptConfigKey(k) }));
} catch (err) {
    console.error(err.message);
    process.exit(1);
}
if (configs.length === 0) { console.error('--only: no valid config keys after parsing.'); process.exit(1); }
// BUDGET_MS is a PER-ATTEMPT wall-clock cap: each (gate, config) pair gets its own fresh
// BUDGET_MS window, same as a single attempt in the real ladder. NODE_BUDGET is a SHARED,
// CUMULATIVE ceiling across every gate/config tried for one level (mirroring solveLevel()'s own
// external nodeBudget semantics — see orchestration.ts) — an expensive first config in the
// --only list can exhaust it before a later one gets a fair share, exactly as it would in
// production under a bounded external node budget. This is intentional fidelity, not a bug: put
// the config you actually want signal on FIRST, or give NODE_BUDGET enough headroom for all of
// them, or probe one config at a time for a clean per-method read.
const BUDGET_MS = Number(args.get('--budget-ms') || 8000);
const NODE_BUDGET = args.has('--node-budget') ? Number(args.get('--node-budget')) : Infinity;
const OUT_FILE = args.get('--out') || null;
const SUMMARY_OUT_FILE = args.get('--summary-out') || null;

const corpus = JSON.parse(readFileSync(path.resolve(ROOT, CORPUS_FILE), 'utf8'));
const corpusLevels = Array.isArray(corpus) ? corpus : corpus.levels;
const levels = LEVEL_SPEC ? selectLevelsBySpec(corpusLevels, LEVEL_SPEC) : corpusLevels;

console.log(`method-probe: ${levels.length} level(s), corpus=${CORPUS_FILE}, only=[${configs.map(c => c.key).join(', ')}], budget=${BUDGET_MS}ms, node-budget=${NODE_BUDGET === Infinity ? 'inf' : NODE_BUDGET}`);

async function probeLevel(entry) {
    const { id, stressMeta: _stressMeta, ...raw } = entry;
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const prep = prepLevel(level);
    prep._cfg = null;
    prep._metrics = { nodesExpanded: 0 };
    prep._forcedFirstStepKey = null;
    prep._forcedPortalExitKey = null;

    const attempts = [];
    let solution = null;
    let winningKey = null;
    let winningGate = null;
    const startTime = Date.now();
    outer:
    for (const gateKey of level.gateKeys) {
        for (const { key, config } of configs) {
            if (prep._metrics.nodesExpanded >= NODE_BUDGET) break outer;
            const remaining = NODE_BUDGET === Infinity ? Infinity : Math.max(0, NODE_BUDGET - prep._metrics.nodesExpanded);
            const r = await runAttempt(gateKey, level, prep, config, BUDGET_MS, Date.now(), null, remaining);
            attempts.push({ configKey: key, gateKey, ...r.attempt });
            if (r.path) { solution = r.path; winningKey = key; winningGate = gateKey; break outer; }
        }
    }
    return {
        id,
        ok: !!solution,
        winningConfigKey: winningKey,
        winningGate,
        solution,
        totalMs: Date.now() - startTime,
        nodesExpanded: prep._metrics.nodesExpanded,
        attempts,
    };
}

const results = [];
if (OUT_FILE) mkdirSync(path.dirname(path.resolve(ROOT, OUT_FILE)), { recursive: true });
for (let i = 0; i < levels.length; i++) {
    const entry = levels[i];
    let r;
    try { r = await probeLevel(entry); }
    catch (err) { r = { id: entry.id, ok: false, error: err?.message ?? String(err) }; }
    results.push(r);
    console.log(`  [${i + 1}/${levels.length}] ${entry.id ?? '?'} ok=${r.ok ? '✓' : '✗'}${r.ok ? ` via ${r.winningConfigKey}` : ''}`);
    // Report/persist between levels, not only at the end — see CLAUDE.md's batch-tool requirement.
    if (OUT_FILE) writeFileSync(path.resolve(ROOT, OUT_FILE), JSON.stringify({ corpus: CORPUS_FILE, only: configs.map(c => c.key), budgetMs: BUDGET_MS, nodeBudget: NODE_BUDGET === Infinity ? null : NODE_BUDGET, levels: results }, null, 1));
}

const solvedCount = results.filter(r => r.ok).length;
console.log(`Result: solved=${solvedCount}/${levels.length}`);

if (SUMMARY_OUT_FILE) {
    const lines = [
        `# method-probe: ${configs.map(c => c.key).join(', ')}`,
        '',
        `Corpus: \`${CORPUS_FILE}\` — ${levels.length} level(s), budget=${BUDGET_MS}ms, node-budget=${NODE_BUDGET === Infinity ? 'inf' : NODE_BUDGET}`,
        '',
        `**Solved: ${solvedCount}/${levels.length}**`,
        '',
        '| id | ok | winning config | nodes | ms |',
        '|---|---|---|---|---|',
        ...results.map(r => `| ${r.id ?? '?'} | ${r.ok ? '✓' : '✗'} | ${r.winningConfigKey ?? '—'} | ${r.nodesExpanded ?? '—'} | ${r.totalMs ?? '—'} |`),
    ];
    mkdirSync(path.dirname(path.resolve(ROOT, SUMMARY_OUT_FILE)), { recursive: true });
    writeFileSync(path.resolve(ROOT, SUMMARY_OUT_FILE), lines.join('\n') + '\n');
}
