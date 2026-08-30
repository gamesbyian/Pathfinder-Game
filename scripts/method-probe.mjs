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
 * --only=<key>[,<key>...] accepts canonical attempt identities (legacy compact keys remain
 * readable during migration). Canonical examples containing "|" must be shell-quoted:
 *   'dfs|score=objectiveFirst|bias=none'
 *   'dfs|score=perimeterSweep|bias=perimeterCW'
 *   'beam|score=objectiveFirst|bias=none|width=2000|retention=plain'
 *   'beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets'
 *   'repair|score=repair|guidance=standard'
 *   'repair|score=repair|guidance=must-turn-biased'
 *   'repair|score=repair|guidance=turn-biased'
 *   'admissible-order|tieBreak=default|lds=off'
 *   'admissible-order|tieBreak=none|lds=off'
 *   'admissible-order|tieBreak=default|lds=on'
 * Run with --list-profiles / --list-ordering-biases to see the valid scoring-profile / structural-ordering-bias vocabulary.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/method-probe.mjs -- \
 *     --corpus=data/stress/stress-levels-random.json \
 *     --levels=pos:1-50 \
 *     --only='repair|score=repair|guidance=turn-biased' \
 *     --budget-ms=600000 --work-budget=50000000 --node-budget=20000000 \
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
import { compareSiblingRankings } from './operational-similarity-lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const flags = new Set(argv.filter(a => a.startsWith('--') && !a.includes('=')));
const args = new Map(argv.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API } = await import('../modules/solver.js');
const { SCORING_PROFILE_ORDER, STRUCTURAL_ORDERING_BIASES, SCORING_PROFILES } = await import('../modules/solver/policy.js');
const Solver = createSolver();
const { prepLevel, runAttempt, attemptConfigKey } = SOLVER_TESTING_API;

if (flags.has('--list-profiles')) {
    console.log('Profiles:', SCORING_PROFILE_ORDER.join(', '), '(plus "repair" for repair-family configs)');
    console.log('Admissible-order identity: admissible-order|tieBreak=<profile-or-none>|lds=<on|off>; tieBreak selects only the soft-score tie-break, not primary admissible-slack ordering.');
    process.exit(0);
}
if (flags.has('--list-ordering-biases') || flags.has('--list-templates')) {
    if (flags.has('--list-templates')) console.warn('--list-templates is deprecated; use --list-ordering-biases.');
    console.log('Structural ordering biases:', Object.keys(STRUCTURAL_ORDERING_BIASES).join(', '));
    process.exit(0);
}

// Shared parser (scripts/attempt-config-key.mjs) — the error messages there are generic; this
// tool prefixes them with "--only: " for CLI-appropriate context.
const parseAttemptConfigKeyRaw = makeAttemptConfigKeyParser({ STRUCTURAL_ORDERING_BIASES, SCORING_PROFILES, attemptConfigKey });
function parseAttemptConfigKey(key) {
    try { return parseAttemptConfigKeyRaw(key); }
    catch (err) { throw new Error(`--only: ${err.message}`); }
}

const CORPUS_FILE = args.get('--corpus') || 'data/stress/stress-levels-random.json';
const LEVEL_SPEC = args.get('--levels') || null;
const ONLY = args.get('--only');
if (!ONLY) { console.error('--only=<attemptConfigKey>[,<key>...] is required. Run with --list-profiles/--list-ordering-biases for the vocabulary.'); process.exit(1); }
let configs;
try {
    configs = ONLY.split(',').map(k => k.trim()).filter(Boolean).map(k => { const config = parseAttemptConfigKey(k); return { key: attemptConfigKey(config), config }; });
} catch (err) {
    console.error(err.message);
    process.exit(1);
}
if (configs.length === 0) { console.error('--only: no valid config keys after parsing.'); process.exit(1); }
// Preferred research mode: --work-budget supplies one SHARED, cumulative canonical-work ceiling
// across every gate/config tried for a level. --budget-ms then becomes only a per-attempt safety
// deadline; if it binds before work/node exhaustion the row is marked deadlineTruncated and a
// work-bounded run exits non-zero rather than turning right-censored work into a clean negative.
//
// Legacy mode (no --work-budget) preserves the historical semantics: BUDGET_MS is a real per-attempt
// wall-clock search cap and NODE_BUDGET is the shared cumulative ceiling. NODE_BUDGET remains useful
// in either mode as a technique-local/diagnostic guard, but cross-technique cost comparisons should
// use work. As before, multiple --only configs share the level envelope, so probe one config at a
// time when you want a clean per-method dose.
const BUDGET_MS = Number(args.get('--budget-ms') || 8000);
const NODE_BUDGET = args.has('--node-budget') ? Number(args.get('--node-budget')) : Infinity;
const WORK_BUDGET = args.has('--work-budget') ? Number(args.get('--work-budget')) : Infinity;
if (!(BUDGET_MS > 0)) { console.error('--budget-ms must be positive.'); process.exit(1); }
if (args.has('--node-budget') && !(NODE_BUDGET > 0)) { console.error('--node-budget must be positive when supplied.'); process.exit(1); }
if (args.has('--work-budget') && !(WORK_BUDGET > 0)) { console.error('--work-budget must be positive when supplied.'); process.exit(1); }
const OUT_FILE = args.get('--out') || null;
const SUMMARY_OUT_FILE = args.get('--summary-out') || null;
const ORDERING_PROFILES = (args.get('--ordering-profiles') || '').split(',').map(value => value.trim()).filter(Boolean);
const ORDERING_LIMIT = Number(args.get('--ordering-limit') || 4096);
const BEAM_TRACE_LIMIT = Number(args.get('--beam-trace-limit') || 0);
for (const profile of ORDERING_PROFILES) if (profile !== 'none' && !SCORING_PROFILES[profile]) {
    console.error(`--ordering-profiles: unknown profile ${profile}`); process.exit(1);
}

function summarizeOrdering(records, observed) {
    const pairs = [];
    for (let i = 0; i < ORDERING_PROFILES.length; i++) for (let j = i + 1; j < ORDERING_PROFILES.length; j++) {
        const left = ORDERING_PROFILES[i], right = ORDERING_PROFILES[j];
        const comparisons = records.map(record => {
            const a = record.rankings.find(row => row.policyId === left);
            const b = record.rankings.find(row => row.policyId === right);
            if (!a || !b) return null;
            // Admissible policies are ranked by the (slack, soft-score) tuple, so replaying only
            // their soft scores would silently discard the primary slack ordering. Encode their
            // already-observed final order as ordinal scores for the generic order reducer.
            const scoreByCandidate = ranking => new Map(ranking.order.map((id, index) =>
                [id, record.searchFamily === 'admissible-order' ? ranking.order.length - index : ranking.scores[index]]));
            const aScores = scoreByCandidate(a), bScores = scoreByCandidate(b);
            return compareSiblingRankings(record.candidates.map(id => ({ id, score: aScores.get(id) })),
                record.candidates.map(id => ({ id, score: bScores.get(id) })));
        }).filter(Boolean);
        const firstDivergenceIndex = comparisons.findIndex(row => !row.topChoiceAgreement);
        const firstRecord = firstDivergenceIndex >= 0 ? records[firstDivergenceIndex] : null;
        const firstLeft = firstRecord?.rankings.find(row => row.policyId === left);
        const firstRight = firstRecord?.rankings.find(row => row.policyId === right);
        pairs.push({ left, right, candidateSets: comparisons.length,
            topChoiceAgreementRate: comparisons.length ? comparisons.filter(row => row.topChoiceAgreement).length / comparisons.length : null,
            fullRankingAgreementRate: comparisons.length ? comparisons.filter(row => row.fullRankingAgreement).length / comparisons.length : null,
            tieRate: comparisons.length ? comparisons.filter(row => row.tiedPairCount > 0).length / comparisons.length : null,
            meanKendallAgreement: comparisons.length ? comparisons.reduce((sum, row) => sum + (row.kendallAgreement ?? 0), 0) / comparisons.length : null,
            meanLeftTopMargin: comparisons.length ? comparisons.reduce((sum, row) => sum + row.leftTopMargin, 0) / comparisons.length : null,
            meanRightTopMargin: comparisons.length ? comparisons.reduce((sum, row) => sum + row.rightTopMargin, 0) / comparisons.length : null,
            firstTopChoiceDivergence: firstRecord ? { retainedIndex: firstDivergenceIndex,
                depth: firstRecord.depth, candidates: firstRecord.candidates,
                left: { order: firstLeft.order, scores: firstLeft.scores },
                right: { order: firstRight.order, scores: firstRight.scores },
                scoringWeightDecomposition: firstRecord.pairwiseDivergences?.find(row =>
                    row.leftPolicyId === left && row.rightPolicyId === right) ?? null } : null });
    }
    const admissible = records.filter(record => record.searchFamily === 'admissible-order' && record.admissibleSlack);
    const slackTieCounts = admissible.map(record => {
        let ties = 0;
        for (let i = 0; i < record.admissibleSlack.length; i++) for (let j = i + 1; j < record.admissibleSlack.length; j++)
            if (record.admissibleSlack[i].slack === record.admissibleSlack[j].slack) ties++;
        return ties;
    });
    return { observedCandidateSets: observed, retainedCandidateSets: records.length,
        truncated: observed > records.length, pairs,
        ...(admissible.length ? { admissibleSlackAnatomy: {
            candidateSets: admissible.length,
            setsWithEqualSlack: slackTieCounts.filter(count => count > 0).length,
            equalSlackSetRate: slackTieCounts.filter(count => count > 0).length / admissible.length,
            allDistinctSlackSets: slackTieCounts.filter(count => count === 0).length,
            meanEqualSlackPairs: slackTieCounts.reduce((sum, count) => sum + count, 0) / admissible.length,
        } } : {}) };
}

function createBeamTraceCollector(limit) {
    const buckets = new Map();
    const hashPath = pathKeys => {
        let hash = 2166136261;
        for (const key of pathKeys) { hash ^= key; hash = Math.imul(hash, 16777619); }
        return (hash >>> 0).toString(16).padStart(8, '0');
    };
    return {
        observe(record) {
            const key = `${record.stage}@${record.depth}`;
            let bucket = buckets.get(key);
            if (!bucket) { bucket = { stage: record.stage, depth: record.depth, observed: 0, overflowed: false, signatures: new Set() }; buckets.set(key, bucket); }
            bucket.observed += record.paths.length;
            for (const pathKeys of record.paths) {
                const signature = hashPath(pathKeys);
                if (bucket.signatures.has(signature)) continue;
                if (bucket.signatures.size < limit) { bucket.signatures.add(signature); continue; }
                bucket.overflowed = true;
                let largest = '';
                for (const retained of bucket.signatures) if (retained > largest) largest = retained;
                if (signature < largest) { bucket.signatures.delete(largest); bucket.signatures.add(signature); }
            }
        },
        snapshot() { return { signatureLimitPerStageDepth: limit, buckets: [...buckets.values()].map(bucket => ({
            stage: bucket.stage, depth: bucket.depth, observed: bucket.observed,
            retainedUnique: bucket.signatures.size, truncated: bucket.overflowed,
            signatures: [...bucket.signatures].sort(),
        })) }; },
    };
}

const corpus = JSON.parse(readFileSync(path.resolve(ROOT, CORPUS_FILE), 'utf8'));
const corpusLevels = Array.isArray(corpus) ? corpus : corpus.levels;
const levels = LEVEL_SPEC ? selectLevelsBySpec(corpusLevels, LEVEL_SPEC) : corpusLevels;

console.log(`method-probe: ${levels.length} level(s), corpus=${CORPUS_FILE}, only=[${configs.map(c => c.key).join(', ')}], deadline=${BUDGET_MS}ms, work-budget=${WORK_BUDGET === Infinity ? '(legacy wall-bounded mode)' : WORK_BUDGET}, node-budget=${NODE_BUDGET === Infinity ? 'inf' : NODE_BUDGET}`);

async function probeLevel(entry) {
    const { id, stressMeta: _stressMeta, ...raw } = entry;
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const prep = prepLevel(level);
    prep._cfg = null;
    prep._metrics = { nodesExpanded: 0 };
    prep._attemptBudgetTelemetry = Number.isFinite(WORK_BUDGET);
    const workStart = prep._workMeter.units;
    if (Number.isFinite(WORK_BUDGET)) prep._workCap = workStart + WORK_BUDGET;
    prep._forcedFirstStepKey = null;
    prep._forcedPortalExitKey = null;
    const orderingRecords = [];
    let orderingObserved = 0;
    if (ORDERING_PROFILES.length) prep._orderingResearchObserver = {
        policies: ORDERING_PROFILES.map(id => ({ id, scoringProfile: id === 'none' ? null : SCORING_PROFILES[id] })),
        observe(record) { if (record.candidates.length >= 2) { orderingObserved++; if (orderingRecords.length < ORDERING_LIMIT) orderingRecords.push(record); } },
    };

    const attempts = [];
    let solution = null;
    let winningKey = null;
    let winningGate = null;
    let deadlineTruncated = false;
    let wallBoundedAttemptObserved = false;
    const startTime = Date.now();
    outer:
    for (const gateKey of level.gateKeys) {
        for (const { key, config } of configs) {
            const workSpentBefore = prep._workMeter.units - workStart;
            if (prep._metrics.nodesExpanded >= NODE_BUDGET || workSpentBefore >= WORK_BUDGET) break outer;
            const remaining = NODE_BUDGET === Infinity ? Infinity : Math.max(0, NODE_BUDGET - prep._metrics.nodesExpanded);
            const beamTrace = BEAM_TRACE_LIMIT > 0 ? createBeamTraceCollector(BEAM_TRACE_LIMIT) : null;
            prep._beamResearchObserver = beamTrace;
            const r = await runAttempt(gateKey, level, prep, config, BUDGET_MS, Date.now(), null, remaining);
            prep._beamResearchObserver = null;
            attempts.push({ configKey: key, gateKey, ...r.attempt,
                ...(beamTrace ? { beamOperationalTrace: beamTrace.snapshot() } : {}) });
            if (r.path) { solution = r.path; winningKey = key; winningGate = gateKey; break outer; }

            if (r.attempt.outcome === 'timed-out') {
                wallBoundedAttemptObserved = true;
                if (Number.isFinite(WORK_BUDGET)) {
                    const workReached = prep._workMeter.units - workStart >= WORK_BUDGET;
                    const nodeReached = prep._metrics.nodesExpanded >= NODE_BUDGET;
                    if (!workReached && !nodeReached) {
                        deadlineTruncated = true;
                        break outer;
                    }
                }
            }
        }
    }
    const workSpent = prep._workMeter.units - workStart;
    const status = solution ? 'success'
        : deadlineTruncated ? 'deadline-truncated'
        : workSpent >= WORK_BUDGET ? 'work-budget-reached'
        : prep._metrics.nodesExpanded >= NODE_BUDGET ? 'node-budget-reached'
        : wallBoundedAttemptObserved ? 'wall-bounded-legacy'
        : 'exhausted';
    return {
        id,
        ok: !!solution,
        status,
        winningConfigKey: winningKey,
        winningGate,
        solution,
        totalMs: Date.now() - startTime,
        nodesExpanded: prep._metrics.nodesExpanded,
        workSpent,
        workBudget: Number.isFinite(WORK_BUDGET) ? WORK_BUDGET : null,
        deadlineTruncated,
        validDeterministicEvidence: Number.isFinite(WORK_BUDGET) ? !deadlineTruncated : false,
        attempts,
        ...(ORDERING_PROFILES.length ? { orderingResearch: summarizeOrdering(orderingRecords, orderingObserved) } : {}),
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
    if (OUT_FILE) writeFileSync(path.resolve(ROOT, OUT_FILE), JSON.stringify({
        corpus: CORPUS_FILE, only: configs.map(c => c.key), budgetMs: BUDGET_MS,
        workBudget: WORK_BUDGET === Infinity ? null : WORK_BUDGET,
        nodeBudget: NODE_BUDGET === Infinity ? null : NODE_BUDGET, levels: results,
    }, null, 1));
}

const solvedCount = results.filter(r => r.ok).length;
const deadlineTruncatedIds = results.filter(r => r.deadlineTruncated).map(r => r.id);
console.log(`Result: solved=${solvedCount}/${levels.length}${deadlineTruncatedIds.length ? `; DEADLINE-TRUNCATED=${deadlineTruncatedIds.length}` : ''}`);
if (Number.isFinite(WORK_BUDGET) && deadlineTruncatedIds.length) {
    console.error(`INVALID WORK-BOUNDED PROBE: wall deadline truncated ${deadlineTruncatedIds.length} level(s): ${deadlineTruncatedIds.join(',')}`);
    process.exitCode = 2;
}

if (SUMMARY_OUT_FILE) {
    const lines = [
        `# method-probe: ${configs.map(c => c.key).join(', ')}`,
        '',
        `Corpus: \`${CORPUS_FILE}\` — ${levels.length} level(s), deadline=${BUDGET_MS}ms, work-budget=${WORK_BUDGET === Infinity ? 'legacy wall-bounded' : WORK_BUDGET}, node-budget=${NODE_BUDGET === Infinity ? 'inf' : NODE_BUDGET}`,
        '',
        `**Solved: ${solvedCount}/${levels.length}**`,
        deadlineTruncatedIds.length ? `**Invalid equal-work rows (deadline-truncated): ${deadlineTruncatedIds.join(', ')}**` : '',
        '',
        '| id | status | winning config | work | nodes | ms |',
        '|---|---|---|---:|---:|---:|',
        ...results.map(r => `| ${r.id ?? '?'} | ${r.status ?? (r.ok ? 'success' : 'failed')} | ${r.winningConfigKey ?? '—'} | ${r.workSpent ?? '—'} | ${r.nodesExpanded ?? '—'} | ${r.totalMs ?? '—'} |`),
    ];
    mkdirSync(path.dirname(path.resolve(ROOT, SUMMARY_OUT_FILE)), { recursive: true });
    writeFileSync(path.resolve(ROOT, SUMMARY_OUT_FILE), lines.join('\n') + '\n');
}
