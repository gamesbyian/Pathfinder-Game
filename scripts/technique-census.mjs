#!/usr/bin/env node
/**
 * technique-census: shard runner.
 *
 * Executes one shard's slice of a plan produced by scripts/build-technique-census-plan.mjs — for
 * each cell (one or two technique keys against one level, optionally with an ablation toggle), runs
 * EVERY listed technique key as its own independent attempt sharing the cell's node budget
 * cumulatively (same semantics as method-probe.mjs's `--only=A,B`), records the outcome, and writes
 * results incrementally.
 *
 * READ-ONLY with respect to git-tracked data. Deliberately never writes to the data/hints tree or any
 * corpus file, and never calls hintCapture — a level can appear in cells assigned to DIFFERENT
 * shards across different tiers (T1/T2/T3/T4 shard the flat CELL list, not the level list), so two
 * shards could otherwise race to rewrite the same level's hint file. Every genuinely new, referee-
 * valid solve this shard finds is instead recorded in its own `--out` artifact (full solution path +
 * the attempt records provenanceFromSolveResult needs) for the COMBINE step — the only place that
 * writes to git-tracked corpus/hint files, run once, after every shard has finished, entirely
 * side-stepping the concurrency hazard. See scripts/combine-technique-census-shards.mjs.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/technique-census.mjs -- \
 *     --plan=/path/to/plan.json --shard=1 --shards=60 \
 *     --out=logs/technique-census-shards/shard-01.json \
 *     --summary-out=logs/technique-census-shards/shard-01-summary.md
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { makeAttemptConfigKeyParser } from './attempt-config-key.mjs';

const argv = process.argv.slice(2);
const args = new Map(argv.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));

const PLAN_FILE = args.get('--plan');
if (!PLAN_FILE) { console.error('--plan=<path to plan.json from build-technique-census-plan.mjs> is required.'); process.exit(1); }
const SHARD = Number(args.get('--shard'));
const SHARDS = Number(args.get('--shards'));
if (!Number.isInteger(SHARD) || !Number.isInteger(SHARDS) || SHARD < 1 || SHARD > SHARDS) {
    console.error('--shard=<1-based index> --shards=<total count> are required, 1 <= shard <= shards.');
    process.exit(1);
}
const OUT_FILE = args.get('--out') || null;
const SUMMARY_OUT_FILE = args.get('--summary-out') || null;
// --skip-existing=<path>: a PRIOR shard output at this exact path (e.g. a resumed run after a kill)
// — cellIds already present there are skipped. Never auto-resumes from --out itself (same
// discipline as stress:benchmark's --skip-existing-dir / portfolio-solve-sweep.mjs's --resume, per
// docs/solver-architecture.md's "Two requirements for any batch tool" — pointing --skip-existing at
// a genuinely different prior-run path is what recovers a partial run; re-running with the same
// --out just starts over).
const SKIP_EXISTING_FILE = args.get('--skip-existing') || null;

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API } = await import('../modules/Solver.js');
const { PROFILE_ORDER: _PROFILE_ORDER, TEMPLATES, POLICY_PROFILES } = await import('../modules/solver/policy.js');
const Solver = createSolver();
const { prepLevel, runAttempt, attemptConfigKey, normalizeAblationConfig } = SOLVER_TESTING_API;
const parseAttemptConfigKey = makeAttemptConfigKeyParser({ TEMPLATES, POLICY_PROFILES, attemptConfigKey });

const plan = JSON.parse(readFileSync(path.resolve(PLAN_FILE), 'utf8'));
const total = plan.cells.length;
const start = Math.floor(((SHARD - 1) * total) / SHARDS);
const end = Math.floor((SHARD * total) / SHARDS);
const myCells = plan.cells.slice(start, end);

const alreadyDone = new Set();
if (SKIP_EXISTING_FILE && existsSync(SKIP_EXISTING_FILE)) {
    try {
        const prior = JSON.parse(readFileSync(SKIP_EXISTING_FILE, 'utf8'));
        for (const r of prior.results ?? []) alreadyDone.add(r.cellId);
    } catch { /* malformed/partial prior file — just don't skip anything */ }
}

console.log(`technique-census shard ${SHARD}/${SHARDS}: ${myCells.length} cells (plan total ${total}), ${alreadyDone.size} already done`);

// ─── Corpus files: loaded lazily and cached, one parse per corpus regardless of how many cells
// reference it (a shard's cells can span all 3 corpora across different tiers). Read-only. ────────
const CORPUS_FILES = { published: 'data/levels.json', corpus1: 'data/stress/stress-levels.json', corpus2: 'data/stress/stress-levels-random.json' };
const corpusCache = new Map();
function getRawLevel(corpus, pos) {
    if (!corpusCache.has(corpus)) {
        const raw = JSON.parse(readFileSync(path.resolve(CORPUS_FILES[corpus]), 'utf8'));
        corpusCache.set(corpus, Array.isArray(raw) ? raw : raw.levels);
    }
    return corpusCache.get(corpus)[pos - 1];
}

const parsedConfigCache = new Map(); // technique key -> parsed AttemptConfig (parsing is pure, safe to cache across cells)
function getParsedConfig(key) {
    if (!parsedConfigCache.has(key)) parsedConfigCache.set(key, parseAttemptConfigKey(key));
    return parsedConfigCache.get(key);
}

/** Runs one cell: every listed technique key, per gate, sharing the cell's node budget
 *  cumulatively — same early-return-on-first-success shape as method-probe.mjs's own probeLevel,
 *  generalized from a fixed --only list to a per-cell technique list and an optional ablation
 *  override. */
async function runCell(cell) {
    const entry = getRawLevel(cell.corpus, cell.levelPos);
    const { id: _id, stressMeta: _sm, ...rawLevel } = entry;
    const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    const prep = prepLevel(level);
    prep._cfg = cell.ablation
        ? normalizeAblationConfig(Object.fromEntries([
            ...(cell.ablation.enable ?? []).map(f => [f, true]),
            ...(cell.ablation.disable ?? []).map(f => [f, false]),
        ]))
        : null;
    prep._metrics = { nodesExpanded: 0 };
    prep._forcedFirstStepKey = null;
    prep._forcedPortalExitKey = null;

    const configs = cell.techniqueKeys.map(key => ({ key, config: getParsedConfig(key) }));
    const attempts = [];
    let solution = null;
    let winningKey = null;
    let winningGate = null;
    const startTime = Date.now();
    outer:
    for (const gateKey of level.gateKeys) {
        for (const { key, config } of configs) {
            if (prep._metrics.nodesExpanded >= cell.nodeBudget) break outer;
            const remaining = cell.nodeBudget === Infinity ? Infinity : Math.max(0, cell.nodeBudget - prep._metrics.nodesExpanded);
            const r = await runAttempt(gateKey, level, prep, config, cell.budgetMs, Date.now(), null, remaining);
            attempts.push({ configKey: key, gateKey, ...r.attempt });
            if (r.path) { solution = r.path; winningKey = key; winningGate = gateKey; break outer; }
        }
    }

    const nodesExpanded = prep._metrics.nodesExpanded;
    const totalMs = Date.now() - startTime;
    let refereeValid = null;
    if (solution) refereeValid = Solver.validateCandidatePath(level, solution).ok;
    const ok = !!solution && refereeValid === true;
    // Derived status vocabulary, aligned with the rest of the batch-tooling family
    // (level-blind-capability-sweep.mjs / portfolio-solve-sweep.mjs): 'success' | 'node-budget-
    // reached' | 'exhausted' (every technique in the cell terminated on its own, under budget) |
    // 'referee-invalid' (a rare, load-bearing signal: the solver found a path SOLVER-mode rules
    // accept but PLAY-mode rules don't — see CLAUDE.md's MoveContext.SOLVER note — never silently
    // dropped as a plain failure).
    const status = ok ? 'success'
        : (solution && refereeValid === false) ? 'referee-invalid'
        : (nodesExpanded >= cell.nodeBudget) ? 'node-budget-reached'
        : 'exhausted';

    return {
        cellId: cell.cellId, tier: cell.tier, corpus: cell.corpus, levelId: entry.id ?? null, levelPos: cell.levelPos,
        techniqueKeys: cell.techniqueKeys, pairLabel: cell.pairLabel ?? null, flagExperiment: cell.flagExperiment ?? null,
        ablation: cell.ablation ?? null, nodeBudget: cell.nodeBudget,
        ok, status, refereeValid, winningConfigKey: winningKey, winningGate,
        nodesExpanded, totalMs,
        // Full per-attempt breakdown (needed by provenanceFromSolveResult at combine time) is kept
        // only for a genuine solve — most of the 90K cells will be negative results on an unsolved
        // level, and the aggregate above is what every downstream analysis actually needs from those;
        // keeping every attempt record for all of them would multiply artifact size for no benefit.
        attempts: ok ? attempts : undefined,
        solution: ok ? solution : undefined,
    };
}

const results = [];
if (OUT_FILE) mkdirSync(path.dirname(path.resolve(OUT_FILE)), { recursive: true });
function writeReport(partial) {
    if (!OUT_FILE) return;
    writeFileSync(path.resolve(OUT_FILE), JSON.stringify({ shard: SHARD, shards: SHARDS, planFile: PLAN_FILE, partial, results }));
}

let handledSignal = false;
function onSignal() {
    if (handledSignal) return;
    handledSignal = true;
    console.log('technique-census: signal received, writing partial results and exiting.');
    writeReport(true);
    process.exit(0);
}
process.on('SIGINT', onSignal);
process.on('SIGTERM', onSignal);

for (let i = 0; i < myCells.length; i++) {
    const cell = myCells[i];
    if (alreadyDone.has(cell.cellId)) continue;
    let r;
    try { r = await runCell(cell); }
    catch (err) { r = { cellId: cell.cellId, tier: cell.tier, corpus: cell.corpus, levelPos: cell.levelPos, ok: false, status: 'error', error: err?.message ?? String(err) }; }
    results.push(r);
    if ((i + 1) % 25 === 0 || i === myCells.length - 1) {
        console.log(`  [${i + 1}/${myCells.length}] ${cell.cellId} ${r.ok ? 'SOLVED' : r.status}`);
    }
    // Report/persist between cells, not only at the end — CLAUDE.md's batch-tool requirement.
    writeReport(true);
}
writeReport(false);

const solved = results.filter(r => r.ok).length;
console.log(`Result: shard ${SHARD}/${SHARDS} solved=${solved}/${results.length} (of ${myCells.length} assigned, ${alreadyDone.size} pre-skipped)`);

if (SUMMARY_OUT_FILE) {
    const byTier = {};
    for (const r of results) { byTier[r.tier] ??= { total: 0, ok: 0 }; byTier[r.tier].total++; if (r.ok) byTier[r.tier].ok++; }
    const lines = [
        `# technique-census shard ${SHARD}/${SHARDS}`, '',
        `Plan: \`${PLAN_FILE}\` — ${myCells.length} cells assigned, ${alreadyDone.size} pre-skipped, ${results.length} run.`,
        '', `**Solved: ${solved}/${results.length}**`, '',
        '| tier | ok | total |', '|---|---:|---:|',
        ...Object.entries(byTier).map(([t, v]) => `| ${t} | ${v.ok} | ${v.total} |`),
    ];
    mkdirSync(path.dirname(path.resolve(SUMMARY_OUT_FILE)), { recursive: true });
    writeFileSync(path.resolve(SUMMARY_OUT_FILE), lines.join('\n') + '\n');
}
