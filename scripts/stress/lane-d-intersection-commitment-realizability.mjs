#!/usr/bin/env node
/**
 * Lane D, question 1: future-intersection commitment realizability, per
 * docs/solver-per-instance-relational-feasibility-preflight.md. On matched same-parent LIVE/DEAD
 * states with the SAME remaining intersection deficit (so scalar bounds alone cannot distinguish
 * them), ask whether completion still realizes the remaining intersection deficit through each
 * candidate already-visited cell individually (a bounded family: cpsat-reference-probe.py's new
 * --pin-revisit hook adds visits[c] >= 2 for one candidate cell at a time). If DEAD loses every
 * candidate while LIVE retains at least one, that is decision-bearing evidence of a joint
 * intersection-placement gap invisible to the production solver's scalar/local machinery.
 *
 * Population: prespecified before this script ran, from H1's already-committed exact-labelled B2
 * set (reports/stress/h1-event-feasibility-queries-2026-09-16.json) -- no new labelling. Selection
 * requires (a) same parent level, (b) one exact-DEAD and >=1 exact-LIVE sibling, (c) identical
 * remaining intersection deficit AND remaining length (so the only remaining scalar difference is
 * the label itself). Exactly two parents in B2 meet this bar: S00030 and R00104 (computed via
 * scripts/stress/tmp-b2-int-deficit.mjs, not committed -- see the reconciliation report for the
 * full table). No outcome was inspected before writing this selection rule.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { classifyProbeProcess, parseEmittedPath } from './cpsat-explicit-prefix-reference-lib.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => { const [k, ...v] = x.split('='); return [k, v.join('=')]; }));
const timeLimit = Number(args.get('--time-limit') ?? 45);
const outFile = args.get('--out') ?? 'reports/stress/lane-d-intersection-commitment-realizability-results.json';

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.js');
const Solver = createSolver();
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const solverRef = git('rev-parse', 'HEAD');

const h1Doc = JSON.parse(readFileSync('reports/stress/h1-event-feasibility-queries-2026-09-16.json', 'utf8'));

// Frozen selection: (parent, remInt, remLen) triples that already matched before any query ran.
const SELECTED_PARENTS = ['S00030', 'R00104'];

const corpusCache = new Map();
function loadRaw(corpus, id) {
    if (!corpusCache.has(corpus)) {
        const doc = JSON.parse(readFileSync(corpus, 'utf8'));
        const rows = Array.isArray(doc) ? doc : doc.levels;
        corpusCache.set(corpus, new Map(rows.map(r => [String(r.id), r])));
    }
    return corpusCache.get(corpus).get(String(id));
}
const packRaw = ([x, y]) => (((x - 1) & 0xffff) | (((y - 1) & 0xffff) << 16));

function candidateCells(state, level, prep) {
    // Unique already-visited cells (dedup), excluding the start gate, goal, and any cap-1
    // (portal/flip) cell -- forcing a second visit there is trivially infeasible by construction
    // and would not test the intended joint-realizability question.
    const seen = new Set();
    const out = [];
    for (const [x, y] of state.prefixXY) {
        const k = packRaw([x, y]);
        if (seen.has(k)) continue;
        seen.add(k);
        if (prep.gateFlags[k]) continue;
        if (k === level.goalKey) continue;
        if (level.portalMap.has(k)) continue;
        if (level.filterMap.has(k) || level.flippingFilterMap.has(k)) continue;
        out.push([x, y]);
    }
    return out;
}

const results = [];
for (const parentId of SELECTED_PARENTS) {
    const parentStates = h1Doc.states.filter(s => s.levelId === parentId);
    const dead = parentStates.find(s => s.exactLabel === 'dead');
    const liveSiblings = parentStates.filter(s => s.exactLabel === 'live');
    if (!dead || liveSiblings.length === 0) continue;

    const raw = loadRaw(dead.corpus, dead.levelId);
    const { id: _id, stressMeta: _sm, ...rawLevel } = raw;
    const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    const prep = api.prepLevel(level);
    prep._cfg = null;

    for (const state of [dead, ...liveSiblings]) {
        const candidates = candidateCells(state, level, prep);
        console.log(`${parentId}:${state.role} (${state.exactLabel}): ${candidates.length} candidate revisit cells`);
        const stateResult = { parentId, role: state.role, exactLabel: state.exactLabel, candidateCount: candidates.length, feasible: [], infeasible: [], indeterminate: [] };
        for (const cell of candidates) {
            const prefixJson = JSON.stringify(state.prefixXY);
            const result = spawnSync('python3', [
                'scripts/stress/cpsat-reference-probe.py', state.levelId, String(timeLimit),
                '--emit-path', `--corpus=${state.corpus}`, `--prefix=${prefixJson}`, `--pin-revisit=${JSON.stringify([cell])}`,
            ], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
            const exitCode = result.status ?? (result.error ? -1 : 0);
            const classified = classifyProbeProcess({ stdout: result.stdout ?? '', stderr: result.stderr ?? '', exitCode });
            if (classified.label === 'live') {
                // Referee-validate every claimed-feasible witness -- this is a query against the
                // REAL rules plus one additive hypothetical constraint, so a claimed witness must
                // still pass the real referee, exactly like any other "live" claim.
                const emitted = parseEmittedPath(result.stdout ?? '');
                let refereeValid = false;
                if (emitted) {
                    const verdict = Solver.validateCandidatePath(level, emitted.map(([x, y]) => (((x - 1) & 0xffff) | (((y - 1) & 0xffff) << 16))));
                    refereeValid = verdict.ok;
                }
                if (refereeValid) stateResult.feasible.push(cell);
                else stateResult.indeterminate.push({ cell, reason: 'referee-rejected-claimed-live-witness' });
            } else if (classified.label === 'dead') {
                stateResult.infeasible.push(cell);
            } else {
                stateResult.indeterminate.push({ cell, reason: 'cpsat-timeout-or-abstain' });
            }
        }
        console.log(`  -> feasible=${stateResult.feasible.length} infeasible=${stateResult.infeasible.length} indeterminate=${stateResult.indeterminate.length}`);
        results.push(stateResult);
    }
}

const document = {
    schemaVersion: 1, kind: 'lane-d-intersection-commitment-realizability', generatedAt: new Date().toISOString(), solverRef,
    sourceH1Queries: 'reports/stress/h1-event-feasibility-queries-2026-09-16.json',
    selectionRule: 'same-parent LIVE/DEAD pairs with identical remaining-intersection-deficit AND remaining-length, from the already-committed B2 exact-label set',
    selectedParents: SELECTED_PARENTS,
    summary: {
        deadStatesWithZeroFeasibleCommitments: results.filter(r => r.exactLabel === 'dead' && r.feasible.length === 0 && r.candidateCount > 0).length,
        deadStatesTotal: results.filter(r => r.exactLabel === 'dead').length,
        liveStatesWithAtLeastOneFeasibleCommitment: results.filter(r => r.exactLabel === 'live' && r.feasible.length > 0).length,
        liveStatesTotal: results.filter(r => r.exactLabel === 'live').length,
        correctnessAlarms: results.reduce((a, r) => a + r.indeterminate.filter(i => i.reason === 'referee-rejected-claimed-live-witness').length, 0),
    },
    results,
};
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
console.log(JSON.stringify(document.summary, null, 2));
