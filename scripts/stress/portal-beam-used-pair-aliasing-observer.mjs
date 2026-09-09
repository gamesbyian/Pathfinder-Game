#!/usr/bin/env node
/**
 * Prespecified measurement for reports/2026-09-09-portal-beam-state-identity-preflight-001.md:
 * before choosing a portal-aware coarse-merge representation, measure whether the proposed
 * "count/transient" coarse key -- current 7 constraint scalars + portalJumps + lastWasPortalJump --
 * actually aliases candidates that used DIFFERENT portal pairs (a real representation gap the
 * preflight identifies, not a formal soundness defect: coarse merge already ignores ordinary
 * visited-set differences).
 *
 * Method (outcome-independent, run BEFORE any treatment choice, per the preflight's own
 * instruction): production coarse-state merge is unconditionally disabled for portal levels
 * (search.ts's `useCoarseStateMerge = level.portalMap.size === 0 && ...`), so the ordinary
 * 'post-hard-prune' beam research stage already emits the FULL uncollapsed candidate pool at every
 * phase for a portal level -- exactly the candidates merging would act on if enabled. For every
 * such phase where `paths.length > beamWidth` (the branch that would invoke merging), replay each
 * candidate's reconstructed path through real search-state primitives (same createState/applyMove
 * a live search uses) to derive the proposed key's 9 fields PLUS the actual set of portal pairs
 * traversed, then group by the proposed key and report how many groups collapse candidates with
 * DIFFERENT used-pair identities (aliasing), and what candidate share that touches.
 *
 * Usage (bundled):
 *   node scripts/run-bundled.mjs scripts/stress/portal-beam-used-pair-aliasing-observer.mjs -- \
 *     [--corpus=corpus2] [--sample=40] [--beam-width=200] [--node-budget=300000] [--out=<file>]
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

installBrowserStubs();
const { normalizeRawLevel } = await import('../../modules/solver/normalization.js');
const { prepLevel } = await import('../../modules/solver/prep.js');
const { createState, applyMove } = await import('../../modules/solver/search-state.js');
const { beamSearchFromGate } = await import('../../modules/solver/search.js');
const { SCORING_PROFILES } = await import('../../modules/solver/policy.js');

const args = new Map(process.argv.slice(2).filter(a => a.includes('=')).map(a => {
    const [k, ...v] = a.split('='); return [k, v.join('=')];
}));
const root = (() => {
    let dir = new URL('.', import.meta.url).pathname;
    for (let i = 0; i < 6; i++) {
        if (existsSync(path.join(dir, 'package.json'))) return dir;
        dir = path.dirname(dir);
    }
    throw new Error('package root not found');
})();

const CORPORA = {
    corpus1: 'data/stress/stress-levels.json',
    corpus2: 'data/stress/stress-levels-random.json',
    published: 'data/levels.json',
};
const corpusName = args.get('--corpus') || 'corpus2';
const corpusFile = CORPORA[corpusName];
const SAMPLE = Number(args.get('--sample') || 40);
const BEAM_WIDTH = Number(args.get('--beam-width') || 200);
const NODE_BUDGET = Number(args.get('--node-budget') || 300_000);
const OUT = args.get('--out') || null;
const TIME_BUDGET_MS = 60_000; // wall-safety only; node budget is the real stop condition

const rawFile = JSON.parse(readFileSync(path.join(root, corpusFile), 'utf8'));
const rawLevels = (Array.isArray(rawFile) ? rawFile : rawFile.levels).filter(l => (l.portals || []).length > 0);
// Deterministic, documented, position-order sample -- this is a structural representation
// measurement, not an outcome-selected sample, so no randomization/exclusion machinery is needed.
const sample = rawLevels.slice(0, SAMPLE);
console.log(`portal-beam-used-pair-aliasing-observer: ${corpusName}, ${rawLevels.length} portal-bearing level(s) available, sampling first ${sample.length}, beamWidth=${BEAM_WIDTH}, nodeBudget=${NODE_BUDGET}`);

function buildPairIndex(level) {
    const pairIndexByCell = new Map();
    const pairs = [];
    for (const [cell, portal] of level.portalMap) {
        if (pairIndexByCell.has(cell)) continue;
        const dest = portal.dest;
        const idx = pairs.length;
        pairIndexByCell.set(cell, idx);
        pairIndexByCell.set(dest, idx);
        pairs.push([cell, dest]);
    }
    return pairIndexByCell;
}

/** Replay a reconstructed candidate path from the gate; return the proposed key's 9 fields plus
 *  the set of portal pair indices actually traversed. */
function replayCandidate(pathKeys, level, prep, pairIndexByCell) {
    let state;
    try { state = createState(pathKeys[0], level, prep); } catch { return null; }
    const usedPairs = new Set();
    for (let i = 1; i < pathKeys.length; i++) {
        const from = pathKeys[i - 1], to = pathKeys[i];
        const portal = level.portalMap.get(from);
        const isJump = !!(portal && !state.lastWasPortalJump && portal.dest === to);
        if (isJump) {
            const idx = pairIndexByCell.get(from);
            if (idx !== undefined) usedPairs.add(idx);
        }
        try { applyMove(to, state, level, prep, isJump); } catch { return null; }
    }
    return {
        key: pathKeys[pathKeys.length - 1],
        ints: state.ints, mpVisitedMask: state.mpVisitedMask, mustCrossMask: state.mustCrossMask,
        flipperUsedMask: state.flipperUsedMask, surroundMask: state.surroundMask,
        mustTurnMask: state.mustTurnMask, adjTurnMask: state.adjTurnMask,
        portalJumps: state.portalJumps, lastWasPortalJump: state.lastWasPortalJump,
        usedPairs: [...usedPairs].sort((a, b) => a - b).join(','),
    };
}

function proposedKey(c) {
    return [c.key, c.ints, c.mpVisitedMask, c.mustCrossMask, c.flipperUsedMask, c.surroundMask,
        c.mustTurnMask, c.adjTurnMask, c.portalJumps, c.lastWasPortalJump].join('|');
}

let levelsChecked = 0, levelsWithMergeEligiblePhase = 0;
let phasesObserved = 0, groupsObserved = 0, groupsAliased = 0;
let candidatesInGroups = 0, candidatesInAliasedGroups = 0;
let replayFailures = 0;
const perLevel = [];

for (const raw of sample) {
    let level, prep;
    try { level = normalizeRawLevel(raw); prep = prepLevel(level); } catch (e) {
        console.error(`${raw.id}: prep failed (${e.message})`); continue;
    }
    levelsChecked++;
    const pairIndexByCell = buildPairIndex(level);

    let levelPhases = 0, levelGroups = 0, levelAliasedGroups = 0, levelCandInGroups = 0, levelCandInAliased = 0;
    prep._beamResearchObserver = {
        observe(record) {
            if (record.stage !== 'post-hard-prune') return;
            if (record.paths.length <= BEAM_WIDTH) return; // merge would not have engaged at this phase
            levelPhases++;
            const byKey = new Map();
            for (const p of record.paths) {
                const c = replayCandidate(p, level, prep, pairIndexByCell);
                if (!c) { replayFailures++; continue; }
                const k = proposedKey(c);
                let bucket = byKey.get(k);
                if (!bucket) { bucket = []; byKey.set(k, bucket); }
                bucket.push(c);
            }
            for (const bucket of byKey.values()) {
                if (bucket.length <= 1) continue;
                levelGroups++;
                levelCandInGroups += bucket.length;
                const distinctPairSets = new Set(bucket.map(c => c.usedPairs));
                if (distinctPairSets.size > 1) { levelAliasedGroups++; levelCandInAliased += bucket.length; }
            }
        },
    };
    prep._metrics = { nodesExpanded: 0 };
    prep._cfg = null;

    for (const gateKey of level.gateKeys) {
        try {
            await beamSearchFromGate(gateKey, level, prep, SCORING_PROFILES.default, TIME_BUDGET_MS, Date.now(),
                null, BEAM_WIDTH, null, false, null, NODE_BUDGET);
        } catch (e) {
            console.error(`${raw.id} gate=${gateKey}: beam attempt threw (${e.message})`);
        }
        if (prep._metrics.nodesExpanded >= NODE_BUDGET) break;
    }
    prep._beamResearchObserver = null;

    if (levelPhases > 0) levelsWithMergeEligiblePhase++;
    phasesObserved += levelPhases; groupsObserved += levelGroups; groupsAliased += levelAliasedGroups;
    candidatesInGroups += levelCandInGroups; candidatesInAliasedGroups += levelCandInAliased;
    perLevel.push({ id: raw.id, phases: levelPhases, groups: levelGroups, aliasedGroups: levelAliasedGroups,
        candidatesInGroups: levelCandInGroups, candidatesInAliasedGroups: levelCandInAliased });
    if (levelPhases > 0) {
        console.log(`  ${raw.id}: ${levelPhases} merge-eligible phase(s), ${levelGroups} group(s) (size>1), ${levelAliasedGroups} aliased`);
    }
}

const summary = {
    corpus: corpusName, sampled: sample.length, levelsChecked, levelsWithMergeEligiblePhase,
    beamWidth: BEAM_WIDTH, nodeBudget: NODE_BUDGET,
    phasesObserved, groupsObserved, groupsAliased,
    candidatesInGroups, candidatesInAliasedGroups, replayFailures,
    groupAliasedRate: groupsObserved > 0 ? groupsAliased / groupsObserved : null,
    candidateAliasedShare: candidatesInGroups > 0 ? candidatesInAliasedGroups / candidatesInGroups : null,
    perLevel,
};

console.log('\nportal-beam-used-pair-aliasing-observer summary:');
console.log(`  levels sampled: ${sample.length}, reached >=1 merge-eligible phase: ${levelsWithMergeEligiblePhase}`);
console.log(`  merge-eligible phases observed: ${phasesObserved}`);
console.log(`  candidate groups (size>1) at proposed key: ${groupsObserved}`);
console.log(`  groups spanning >1 distinct used-pair identity (ALIASED): ${groupsAliased}` +
    (groupsObserved ? ` (${(100 * groupsAliased / groupsObserved).toFixed(1)}%)` : ''));
console.log(`  candidates inside size>1 groups: ${candidatesInGroups}`);
console.log(`  candidates inside ALIASED groups: ${candidatesInAliasedGroups}` +
    (candidatesInGroups ? ` (${(100 * candidatesInAliasedGroups / candidatesInGroups).toFixed(1)}% of grouped candidates)` : ''));
if (replayFailures) console.log(`  replay failures (excluded from grouping): ${replayFailures}`);

if (OUT) {
    const outPath = path.isAbsolute(OUT) ? OUT : path.join(root, OUT);
    writeFileSync(outPath, JSON.stringify(summary, null, 2));
    console.log(`\nWrote ${outPath}`);
}
