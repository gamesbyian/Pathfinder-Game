#!/usr/bin/env node
/**
 * Lane D question 3: residual-interface commutativity, per
 * docs/solver-per-instance-relational-feasibility-preflight.md's question 3 ("for candidate
 * disjoint/weakly-coupled obligation excursions, actually swap/reorder them and evaluate legality
 * plus future completion feasibility/state consequences. Obligation-multiset equality alone is not
 * evidence of commutativity.").
 *
 * This is the experiment reports/2026-09-13-solver-archaeology-residual-interface-retry-lineage-008.md
 * found was NEVER RUN: the residual-interface tooling's `commutingCandidate` notion
 * (scripts/stress/research-analysis-lib.mjs's mineResidualInterfaces) only detects candidates --
 * two segments between the same entry/exit interface with the same obligation multiset in a
 * different order -- it never measures "whether the swapped/reordered path remains legal" or
 * "which mechanics invalidate the commutativity assumption." This script closes that gap directly
 * with the native solver's own PLAY referee (modules/domain/path-validator.js's
 * validateCandidatePath), not CP-SAT: splice one candidate's segment into the other's own full
 * accepted path at the shared interface, and validate the result as a complete solution.
 *
 * Zero CP-SAT/exact compute. Uses only already-committed accepted hint paths (data/stress/hints-random)
 * and the native solver's legal-move replay + PLAY referee -- both already-audited primitives used
 * throughout this session's lanes.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/lane-d-residual-interface-commutativity.mjs -- \
 *     --corpus=data/stress/stress-levels-random.json --hints-dir=data/stress/hints-random \
 *     --levels=25 --hints-per-level=20 --min-hints=8 --seed=lane-d-commutativity-pilot-001 \
 *     --out=reports/stress/lane-d-residual-interface-commutativity-2026-09-17.json
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelsWithHints } from '../level-data-io.mjs';
import { mineResidualInterfaces } from './research-analysis-lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };

const CORPUS_FILE = arg('corpus', 'data/stress/stress-levels-random.json');
const HINTS_DIR = arg('hints-dir', 'data/stress/hints-random');
const LEVEL_COUNT = Number(arg('levels', 25));
const HINTS_PER_LEVEL = Number(arg('hints-per-level', 20));
const MIN_HINTS = Number(arg('min-hints', 8));
const MAX_SPAN = Number(arg('max-span', 12));
const SEED = arg('seed', 'lane-d-commutativity-pilot-001');
const OUT_FILE = arg('out', null);

function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return () => {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return (h ^= h >>> 16) >>> 0;
    };
}
function mulberry32(seed) {
    let a = seed;
    return () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function seededRng(seedStr) { const h = xmur3(seedStr); return mulberry32(h()); }
function shuffleWithSeed(arr, seedStr) {
    const rng = seededRng(seedStr);
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API } = await import('../../modules/solver.js');
const { validateCandidatePath } = await import('../../modules/domain/path-validator.ts');
const Solver = createSolver();
const { prepLevel, createState, applyMove } = SOLVER_TESTING_API;

const levels = readLevelsWithHints(path.resolve(ROOT, CORPUS_FILE), { hintsDir: HINTS_DIR });
const eligible = levels.filter((l) => (l.hintRecords?.length ?? 0) >= MIN_HINTS);
const selectedIds = shuffleWithSeed(eligible.map((l) => l.id), `${SEED}:levels`).slice(0, LEVEL_COUNT);
const selectedSet = new Set(selectedIds);
const selected = eligible.filter((l) => selectedSet.has(l.id));

/** Replay one accepted hint path through the native solver to annotate per-step obligation
 * labels and running intersection count -- the fields mineResidualInterfaces needs to detect
 * commutingCandidate pairs (same obligation multiset, different order). */
function annotateSolution(fullPath, level, prep) {
    const gate = fullPath[0];
    const state = createState(gate, level, prep);
    const mustPass = new Set(level.mustPassKeys);
    const mustCross = new Set(level.mustCrossKeys);
    const obligations = [null];
    const intersections = [0];
    for (let i = 1; i < fullPath.length; i++) {
        const prev = fullPath[i - 1];
        const next = fullPath[i];
        const pAtPrev = level.portalMap.get(prev);
        const isJump = !!(pAtPrev && !state.lastWasPortalJump && pAtPrev.dest === next);
        applyMove(next, state, level, prep, isJump);
        intersections.push(state.ints);
        obligations.push(mustPass.has(next) ? 'mustPass' : mustCross.has(next) ? 'mustCross' : null);
    }
    return { intersections, obligations };
}

const perLevel = [];
let totalCandidates = 0;
let totalLegal = 0;
const failureReasons = new Map();

for (const level of selected) {
    const hintPaths = shuffleWithSeed(level.hintRecords.map((h) => h.path), `${SEED}:${level.id}:hints`).slice(0, HINTS_PER_LEVEL);
    const { id: _id, stressMeta: _sm, ...rawLevel } = level;
    const prepared = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    const prep = prepLevel(prepared);
    prep._cfg = null;

    const solutionRecords = hintPaths.map((p, idx) => {
        const { intersections, obligations } = annotateSolution(p, prepared, prep);
        return { id: `${level.id}:h${idx}`, path: p, intersections, obligations };
    });

    const mined = mineResidualInterfaces(solutionRecords, { maxSpan: MAX_SPAN });
    const commutingPairs = mined.interfaces.flatMap((iface) => iface.pairs.filter((p) => p.commutingCandidate));

    const bySolution = new Map(solutionRecords.map((r) => [r.id, r.path]));
    const results = [];
    for (const pair of commutingPairs) {
        const { a, b } = pair;
        const basePath = bySolution.get(a.solution);
        const splicedPath = [...basePath.slice(0, a.from), ...b.path, ...basePath.slice(a.to + 1)];
        const verdict = validateCandidatePath(prepared, splicedPath);
        results.push({
            interfaceKey: `${a.path[0]}>${a.path[a.path.length - 1]}`,
            fromSolution: a.solution, substitutedFrom: b.solution,
            aObligations: a.obligations, bObligations: b.obligations,
            aLength: a.length, bLength: b.length,
            legal: verdict.ok, reason: verdict.ok ? null : verdict.reason,
        });
        totalCandidates++;
        if (verdict.ok) totalLegal++;
        else failureReasons.set(verdict.reason, (failureReasons.get(verdict.reason) ?? 0) + 1);
    }

    perLevel.push({
        id: level.id, hintsUsed: hintPaths.length,
        repeatedInterfaces: mined.repeatedInterfaces, candidatePairs: mined.candidatePairs,
        commutingCandidates: commutingPairs.length,
        legalAfterSplice: results.filter((r) => r.legal).length,
        results,
    });
    console.log(`  ${level.id}: ${hintPaths.length} hints, ${mined.repeatedInterfaces} repeated interfaces, ${commutingPairs.length} commuting candidates, ${results.filter((r) => r.legal).length}/${results.length} legal after splice`);
}

const allResults = perLevel.flatMap((l) => l.results);
const lengthMatched = allResults.filter((r) => r.aLength === r.bLength);
const lengthMismatched = allResults.filter((r) => r.aLength !== r.bLength);
const failureCategory = (reason) => {
    if (/^Invalid move at step/.test(reason)) return 'geometric/adjacency (invalid move)';
    if (/^Path length/.test(reason)) return 'path length mismatch';
    if (/^Intersections/.test(reason)) return 'intersections count mismatch';
    if (/Must-pass/.test(reason)) return 'must-pass not satisfied';
    if (/Must-cross/.test(reason)) return 'must-cross not satisfied';
    if (/turn/i.test(reason)) return 'turn constraint violated';
    if (/Surround/.test(reason)) return 'surround constraint violated';
    return reason;
};
const failureCategories = new Map();
for (const [reason, count] of failureReasons) {
    const cat = failureCategory(reason);
    failureCategories.set(cat, (failureCategories.get(cat) ?? 0) + count);
}

const summary = {
    generatedAt: new Date().toISOString(),
    evidenceRole: 'Lane D question 3 -- residual-interface commutativity, native-solver PLAY-referee splice-and-validate observer (not CP-SAT)',
    corpus: CORPUS_FILE, hintsDir: HINTS_DIR, seed: SEED, maxSpan: MAX_SPAN,
    method: 'mine same-interface commutingCandidate segment pairs (same obligation multiset, different order) across each level\'s own accepted hint paths, splice one segment into the other\'s full path at the shared interface, validate the spliced full path with the native PLAY referee (validateCandidatePath)',
    levelsSampled: perLevel.length,
    totalCommutingCandidates: totalCandidates,
    totalLegalAfterSplice: totalLegal,
    legalRate: totalCandidates ? totalLegal / totalCandidates : null,
    lengthMatchedBreakdown: {
        lengthMatched: { count: lengthMatched.length, legal: lengthMatched.filter((r) => r.legal).length,
            legalRate: lengthMatched.length ? lengthMatched.filter((r) => r.legal).length / lengthMatched.length : null },
        lengthMismatched: { count: lengthMismatched.length, legal: lengthMismatched.filter((r) => r.legal).length,
            legalRate: lengthMismatched.length ? lengthMismatched.filter((r) => r.legal).length / lengthMismatched.length : null },
    },
    failureReasonCategories: Object.fromEntries([...failureCategories.entries()].sort((a, b) => b[1] - a[1])),
    failureReasons: Object.fromEntries([...failureReasons.entries()].sort((a, b) => b[1] - a[1])),
    perLevel,
};
console.log(`\nOverall: ${totalLegal}/${totalCandidates} commuting-candidate splices legal (${totalCandidates ? (totalLegal / totalCandidates * 100).toFixed(1) : '0'}%)`);
console.log('Length-matched breakdown:', JSON.stringify(summary.lengthMatchedBreakdown, null, 2));
console.log('Failure categories:', JSON.stringify(summary.failureReasonCategories, null, 2));

if (OUT_FILE) {
    const abs = path.resolve(ROOT, OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify(summary, null, 2));
    console.log(`Wrote ${OUT_FILE}`);
}
