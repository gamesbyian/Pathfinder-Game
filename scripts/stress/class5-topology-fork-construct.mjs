#!/usr/bin/env node
/**
 * Constructs controlled open-path topological-fork prefix pairs from published human/editor
 * parents, per docs/solver-class5-controlled-topology-acquisition-preflight.md.
 *
 * NOT A SELECTOR. This script never calls the production solver and never inspects a solver
 * outcome or exact label -- candidate parent/anchor/segment acceptance uses only board geometry,
 * the level's own mechanic-progress bookkeeping (via the same createState/getNeighbors/applyMove
 * primitives the native solver uses), and the research-only open-path topology observer. The
 * frozen candidate artifact this script writes is the input to a SEPARATE exact-labelling step
 * (scripts/stress/cpsat-explicit-prefix-reference.mjs); running this script twice on the same
 * inputs is deterministic and reproduces the identical candidate set.
 *
 * Construction, per the preflight's "Candidate construction: a topological fork":
 *   1. Start from one of the parent's own stored referee-valid witnesses.
 *   2. Pick anchors A < B on that witness such that the witness segment [A,B] touches no
 *      must-pass/must-cross/flipper/portal cell and leaves the level's own mechanic-progress
 *      fingerprint unchanged between A and B (so any admissible replacement segment trivially
 *      preserves condition 4 -- "required-object progress and all other non-history mechanic
 *      state... match").
 *   3. Search (bounded DFS over the solver's own legal-move primitive) for an alternate A->B
 *      route of the SAME length that stays disjoint from every cell used elsewhere in the prefix
 *      (so both routes are simple -- zero self-intersections, satisfying condition 3 trivially)
 *      and never takes a portal jump.
 *   4. Keep only alternates whose full prefix has an open-path phase (observeOpenPathTopology)
 *      differing from the original by more than the frozen 1e-12 tolerance on at least one
 *      puncture -- otherwise this candidate is discarded (not close to admissible; not recorded).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelsWithHints } from '../level-data-io.mjs';
import { deterministicTopologyPunctures, observeOpenPathTopology } from '../../modules/solver/open-path-topology-observer.js';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => { const [k, ...v] = x.split('='); return [k, v.join('=')]; }));
const corpus = args.get('--corpus') ?? 'data/levels.json';
const parentIds = (args.get('--parents') ?? 'P00073,P00104,P00116').split(',').map(s => s.trim()).filter(Boolean);
const maxPairsPerBoard = Number(args.get('--max-pairs-per-board') ?? 2);
const maxTotalPairs = Number(args.get('--max-total-pairs') ?? 12);
const minSegLen = Number(args.get('--min-segment-len') ?? 2);
const maxSegLen = Number(args.get('--max-segment-len') ?? 14);
const maxWindowAttemptsPerParent = Number(args.get('--max-window-attempts-per-parent') ?? 60);
const searchNodeBudget = Number(args.get('--search-node-budget') ?? 200000);
const maxWitnessesPerParent = Number(args.get('--max-witnesses-per-parent') ?? 8);
const altsPerWindow = Number(args.get('--alts-per-window') ?? 8);
const outFile = args.get('--out') ?? 'reports/stress/class5-topology-fork-candidates.json';

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.js');
const Solver = createSolver();
const git = (...gitArgs) => execFileSync('git', gitArgs, { encoding: 'utf8' }).trim();
const solverRef = git('rev-parse', 'HEAD');

const unpackToXY = key => [(key & 0xffff) + 1, ((key >>> 16) & 0xffff) + 1];
const pathToXY = keys => keys.map(unpackToXY);

function fingerprint(state) {
    return {
        ints: state.ints,
        mpVisitedMask: state.mpVisitedMask,
        mustCrossMask: state.mustCrossMask,
        crossCounts: Array.from(state.crossCounts),
        flipperUsedMask: state.flipperUsedMask,
        portalJumps: state.portalJumps,
        surroundMask: state.surroundMask ?? 0,
        mustTurnMask: state.mustTurnMask ?? 0,
        adjTurnMask: state.adjTurnMask ?? 0,
    };
}
function fingerprintsEqual(a, b) {
    return a.ints === b.ints && a.mpVisitedMask === b.mpVisitedMask && a.mustCrossMask === b.mustCrossMask
        && a.flipperUsedMask === b.flipperUsedMask && a.portalJumps === b.portalJumps
        && a.surroundMask === b.surroundMask && a.mustTurnMask === b.mustTurnMask && a.adjTurnMask === b.adjTurnMask
        && a.crossCounts.length === b.crossCounts.length && a.crossCounts.every((v, i) => v === b.crossCounts[i]);
}

/** Cells this construction refuses to route an alternate segment's interior (or endpoint B)
 * through: matching non-history progress on these is the whole admissibility burden, so windows
 * whose original segment already avoids them entirely sidestep that burden by construction. */
function forbiddenSet(level) {
    return new Set([...level.mustPassKeys, ...level.mustCrossKeys, ...level.flippingFilterMap.keys(), ...level.portalMap.keys()]);
}

function replayFull(level, prep, witnessKeys) {
    const state = api.createState(witnessKeys[0], level, prep);
    const snaps = [fingerprint(state)];
    for (let i = 1; i < witnessKeys.length; i++) {
        const from = state.path.at(-1);
        const portal = level.portalMap.get(from);
        const isJump = !!(portal && portal.dest === witnessKeys[i]);
        api.applyMove(witnessKeys[i], state, level, prep, isJump);
        snaps.push(fingerprint(state));
    }
    return snaps;
}

/** Bounded DFS for a same-length, self-intersection-free, forbidden-cell-free, portal-free
 * alternate A->B route. Returns up to `altsPerWindow` distinct full prefix paths (0..B). */
function findAlternateSegments(level, prep, headKeys, targetKey, segLen, forbidden) {
    const state = api.createState(headKeys[0], level, prep);
    for (let i = 1; i < headKeys.length; i++) {
        const from = state.path.at(-1);
        const portal = level.portalMap.get(from);
        api.applyMove(headKeys[i], state, level, prep, !!(portal && portal.dest === headKeys[i]));
    }
    let nodes = 0;
    const found = [];
    function dfs(remaining) {
        if (found.length >= altsPerWindow || nodes >= searchNodeBudget) return;
        nodes++;
        if (remaining === 0) {
            if (state.path.at(-1) === targetKey) found.push({ path: state.path.slice(), fp: fingerprint(state) });
            return;
        }
        const pos = state.path.at(-1);
        if (level.portalMap.has(pos)) return; // stepping off here would be a forced portal jump
        const neighbors = api.getNeighbors(pos, state, level, prep).slice().sort((a, b) => a - b);
        for (const next of neighbors) {
            if (found.length >= altsPerWindow || nodes >= searchNodeBudget) return;
            if (forbidden.has(next)) continue;
            if (state.visited[next] > 0) continue; // keep the whole prefix simple (ints stays 0)
            const undo = api.applyMove(next, state, level, prep, false);
            dfs(remaining - 1);
            api.undoMove(undo, state);
        }
    }
    dfs(segLen);
    return found;
}

function sameKeys(a, b) {
    return a.length === b.length && a.every((k, i) => k === b[i]);
}

const rawLevels = readLevelsWithHints(corpus);
const byId = new Map(rawLevels.map(l => [String(l.id), l]));

const candidates = [];
const parentReports = [];

for (const parentId of parentIds) {
    const raw = byId.get(parentId);
    if (!raw) { parentReports.push({ parentId, status: 'not-found' }); continue; }
    if (raw.provenance?.origin !== 'human') {
        parentReports.push({ parentId, status: 'skipped-not-human-origin', origin: raw.provenance?.origin ?? null });
        continue;
    }
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const prep = api.prepLevel(level);
    const punctures = deterministicTopologyPunctures(level);
    if (punctures.length === 0) {
        parentReports.push({ parentId, status: 'skipped-no-punctures' });
        continue;
    }
    const witnesses = (raw.hints ?? []).slice(0, maxWitnessesPerParent);
    if (witnesses.length === 0) {
        parentReports.push({ parentId, status: 'skipped-no-stored-witness' });
        continue;
    }
    const forbidden = forbiddenSet(level);
    let accepted = 0;
    let windowAttempts = 0;
    const perParentReasons = { fingerprintMismatch: 0, touchesForbidden: 0, notSimple: 0, alternateSearchExhausted: 0, noPhaseDelta: 0 };

    witnessLoop:
    for (let wIdx = 0; wIdx < witnesses.length; wIdx++) {
        const witnessKeys = witnesses[wIdx];
        const snaps = replayFull(level, prep, witnessKeys);
        const N = witnessKeys.length;
        for (let segLen = minSegLen; segLen <= maxSegLen && accepted < maxPairsPerBoard; segLen++) {
            for (let A = 0; A + segLen < N && accepted < maxPairsPerBoard; A++) {
                const B = A + segLen;
                if (windowAttempts >= maxWindowAttemptsPerParent) break witnessLoop;
                if (snaps[B].ints !== 0) continue; // whole prefix must stay simple
                const interior = witnessKeys.slice(A + 1, B); // B itself checked next line
                if (forbidden.has(witnessKeys[B]) || interior.some(k => forbidden.has(k))) { perParentReasons.touchesForbidden++; continue; }
                if (!fingerprintsEqual(snaps[A], snaps[B])) { perParentReasons.fingerprintMismatch++; continue; }
                windowAttempts++;

                const headKeys = witnessKeys.slice(0, A + 1);
                const originalPrefix = witnessKeys.slice(0, B + 1);
                // Exclude the original segment's own interior cells too, not just the globally
                // forbidden set: otherwise the DFS's first same-length hits are typically minor
                // variations of the SAME route (homotopically trivial relative to every puncture,
                // hence identical phase) rather than a route passing on the puncture's other side.
                const excludeForAlt = new Set([...forbidden, ...interior]);
                const alts = findAlternateSegments(level, prep, headKeys, witnessKeys[B], segLen, excludeForAlt);
                if (alts.length === 0) { perParentReasons.alternateSearchExhausted++; continue; }

                const originalObs = observeOpenPathTopology(level, originalPrefix);
                let best = null;
                for (const alt of alts) {
                    if (sameKeys(alt.path, originalPrefix)) continue;
                    if (!fingerprintsEqual(alt.fp, snaps[B])) continue; // defense-in-depth on condition 4
                    const altObs = observeOpenPathTopology(level, alt.path);
                    if (altObs.portalExcluded || originalObs.portalExcluded) continue; // excluded by construction rule
                    if (altObs.endpointGeometryKey !== originalObs.endpointGeometryKey || altObs.referenceSetIdentity !== originalObs.referenceSetIdentity) continue;
                    if (altObs.phases.length !== originalObs.phases.length) continue;
                    const deltas = altObs.phases.map((p, i) => Math.abs(p.phaseTurns - originalObs.phases[i].phaseTurns));
                    const maxDelta = Math.max(0, ...deltas);
                    if (maxDelta <= 1e-12) continue;
                    if (!best || maxDelta > best.maxDelta) best = { alt, altObs, maxDelta, deltas };
                }
                if (!best) { perParentReasons.noPhaseDelta++; continue; }

                const pairId = `${parentId}-w${wIdx}-A${A}-B${B}`;
                candidates.push({
                    pairId,
                    parentId,
                    witnessIndex: wIdx,
                    anchorA: { index: A, key: witnessKeys[A], xy: unpackToXY(witnessKeys[A]) },
                    anchorB: { index: B, key: witnessKeys[B], xy: unpackToXY(witnessKeys[B]) },
                    segmentLength: segLen,
                    original: {
                        id: `${pairId}-original`,
                        pathKeys: originalPrefix,
                        pathXY: pathToXY(originalPrefix),
                        observation: originalObs,
                        fingerprint: snaps[B],
                    },
                    alternate: {
                        id: `${pairId}-alternate`,
                        pathKeys: best.alt.path,
                        pathXY: pathToXY(best.alt.path),
                        observation: best.altObs,
                        fingerprint: best.alt.fp,
                    },
                    maxPhaseDelta: best.maxDelta,
                    phaseDeltasByPuncture: best.deltas,
                    controlFingerprintMatch: fingerprintsEqual(snaps[B], best.alt.fp),
                    endpointGeometryKeyMatch: originalObs.endpointGeometryKey === best.altObs.endpointGeometryKey,
                    portalExcludedBoth: originalObs.portalExcluded === false && best.altObs.portalExcluded === false,
                    selfIntersectionCountBoth: 0,
                });
                accepted++;
                if (candidates.length >= maxTotalPairs) break witnessLoop;
            }
        }
        if (accepted >= maxPairsPerBoard) break;
    }
    parentReports.push({
        parentId, status: accepted > 0 ? 'admissible-pairs-found' : 'no-admissible-pair-found',
        acceptedPairs: accepted, windowAttempts, witnessesTried: Math.min(witnesses.length, maxWitnessesPerParent), punctureCount: punctures.length,
        rejectionReasons: perParentReasons,
    });
    if (candidates.length >= maxTotalPairs) break;
}

const document = {
    schemaVersion: 1,
    kind: 'class5-controlled-topology-fork-candidates',
    generatedAt: new Date().toISOString(),
    solverRef,
    preflight: 'docs/solver-class5-controlled-topology-acquisition-preflight.md',
    construction: 'scripts/stress/class5-topology-fork-construct.mjs',
    corpus,
    requestedParents: parentIds,
    params: { maxPairsPerBoard, maxTotalPairs, minSegLen, maxSegLen, searchNodeBudget, maxWitnessesPerParent, altsPerWindow, maxWindowAttemptsPerParent },
    parentReports,
    candidateCount: candidates.length,
    parentFamiliesRepresented: [...new Set(candidates.map(c => c.parentId))],
    guardrails: [
        'No production solver result or exact label was consulted to accept/reject any parent, anchor, or segment.',
        'Both prefixes of every pair are frozen here, before any exact-label request.',
    ],
    candidates,
};
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
console.log(JSON.stringify({ candidateCount: candidates.length, parentFamiliesRepresented: document.parentFamiliesRepresented, parentReports }, null, 2));
