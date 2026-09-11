#!/usr/bin/env node
/**
 * Offline scorer-vocabulary diagnostic.
 *
 * Replays stored valid witness/hint trajectories through the real solver state. At each branching
 * prefix it evaluates the same legal sibling set under a true-zero scoring profile, twelve one-hot
 * basis profiles (one per tunable scoreMove weight), and one requested real profile. The zero/basis
 * scores recover scoreMove's effective affine feature vector at that exact state.
 *
 * The strongest results are weight-invariant sibling relationships: if a known-valid continuation
 * and another legal sibling have identical values for all twelve tunable components, no reweighting
 * of those fields can change their pairwise score margin. Equal intercepts give an exact vocabulary
 * collision; a higher alternative intercept gives a fixed alternative preference. The sibling is
 * NOT assumed dead unless a separate exact/reference label says so.
 *
 * Basis evaluation calls scoreMove directly to keep work linear in profile count. A single-policy
 * ordering observer then records the real active-profile scores; the basis must reconstruct those
 * scores within epsilon before results should be interpreted. This avoids the observer's richer
 * O(policy^2) pairwise-divergence work when many research policies are loaded.
 *
 * Usage (bundled, not raw tsx):
 *   node scripts/run-bundled.mjs scripts/stress/witness-scoring-vocabulary-diagnostic.mjs -- \
 *     --corpus=corpus2 --unsolved-only --report=reports/stress/<production-report>.json \
 *     --limit=200 --out=tmp/witness-scoring-vocabulary.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { solvedIdsFromBenchmarkReport } from './benchmark-report-lib.mjs';
import {
    SCORING_WEIGHT_FIELDS,
    analyzeVocabularyDecision,
    basisScoringProfiles,
    reconstructScore,
    scoreVectorFromBasisScores,
    zeroScoringProfile,
} from './scoring-vocabulary-lib.mjs';

installBrowserStubs();
const { normalizeRawLevel } = await import('../../modules/solver/normalization.js');
const { prepLevel } = await import('../../modules/solver/prep.js');
const { createState, applyMove, undoMove, getNeighbors, STATE_BUF_DFS } = await import('../../modules/solver/search-state.js');
const { buildCurUrgencyContext, scoreAndSort, scoreMove } = await import('../../modules/solver/scoring.js');
const { getRealLengthFromState } = await import('../../modules/solver/solution.js');
const { SCORING_PROFILES } = await import('../../modules/solver/policy.js');

const argv = process.argv.slice(2);
const args = new Map(argv.filter(a => a.includes('=')).map(a => {
    const [k, ...v] = a.split('='); return [k, v.join('=')];
}));
const flags = new Set(argv.filter(a => !a.includes('=')));
const root = (() => {
    let dir = new URL('.', import.meta.url).pathname;
    for (let i = 0; i < 6; i++) {
        if (existsSync(path.join(dir, 'package.json'))) return dir;
        dir = path.dirname(dir);
    }
    throw new Error('could not locate package root from ' + import.meta.url);
})();

const CORPORA = {
    corpus1: { levels: 'data/stress/stress-levels.json', hints: 'data/stress/hints' },
    corpus2: { levels: 'data/stress/stress-levels-random.json', hints: 'data/stress/hints-random' },
};
const corpusName = args.get('--corpus') || 'corpus2';
const corpus = CORPORA[corpusName];
if (!corpus) { console.error(`unknown --corpus=${corpusName}`); process.exit(2); }

const scoringProfileId = args.get('--scoring-profile') ?? args.get('--profile') ?? 'default';
const scoringProfile = SCORING_PROFILES[scoringProfileId];
if (!scoringProfile) { console.error(`unknown --scoring-profile=${scoringProfileId}`); process.exit(2); }
const sources = new Set((args.get('--sources') || 'witness,hints').split(',').map(s => s.trim()).filter(Boolean));
const epsilon = args.has('--epsilon') ? Number(args.get('--epsilon')) : 1e-9;
if (!(epsilon >= 0) || !Number.isFinite(epsilon)) { console.error('invalid --epsilon'); process.exit(2); }

const PACK = (x, y) => (((y << 16) | x) >>> 0);
const rawFile = JSON.parse(readFileSync(path.join(root, corpus.levels), 'utf8'));
const rawLevels = Array.isArray(rawFile) ? rawFile : rawFile.levels;

let solvedIds = null;
const reportPath = args.get('--report');
if (reportPath) {
    const rep = JSON.parse(readFileSync(path.join(root, reportPath), 'utf8'));
    solvedIds = solvedIdsFromBenchmarkReport(rep);
}
if ((flags.has('--unsolved-only') || flags.has('--solved-only')) && !solvedIds) {
    console.error('--unsolved-only/--solved-only requires --report=<benchmark-report>');
    process.exit(2);
}

function knownSolutions(raw) {
    const out = [];
    if (sources.has('witness')) {
        const witness = raw?.stressMeta?.witnessSolution;
        if (Array.isArray(witness) && witness.length) out.push(witness.map(([x, y]) => PACK(x - 1, y - 1)));
    }
    if (sources.has('hints') && raw?.id) {
        const hintPath = path.join(root, corpus.hints, `${raw.id}.json`);
        if (existsSync(hintPath)) {
            for (const hint of (JSON.parse(readFileSync(hintPath, 'utf8')).hints || [])) {
                if (Array.isArray(hint?.path) && hint.path.length) out.push(hint.path);
            }
        }
    }
    return out;
}

function buildTrie(paths) {
    const trieRoot = { key: paths[0][0], children: new Map() };
    for (const candidatePath of paths) {
        if (candidatePath[0] !== trieRoot.key) continue;
        let node = trieRoot;
        for (let i = 1; i < candidatePath.length; i++) {
            let child = node.children.get(candidatePath[i]);
            if (!child) {
                child = { key: candidatePath[i], children: new Map() };
                node.children.set(candidatePath[i], child);
            }
            node = child;
        }
    }
    return trieRoot;
}

function rankingScoreMap(record, policyId) {
    const ranking = record?.rankings?.find(row => row.policyId === policyId);
    if (!ranking) return null;
    return new Map(ranking.order.map((candidate, index) => [candidate, ranking.scores[index]]));
}

const zeroProfile = zeroScoringProfile();
const basisProfiles = basisScoringProfiles();

let targets = rawLevels.filter(raw => raw && (raw.stressMeta?.witnessSolution || raw.id));
if (solvedIds && flags.has('--unsolved-only')) targets = targets.filter(raw => !solvedIds.has(raw.id));
if (solvedIds && flags.has('--solved-only')) targets = targets.filter(raw => solvedIds.has(raw.id));
const limit = args.has('--limit') ? Number(args.get('--limit')) : Infinity;
if (Number.isFinite(limit) && limit >= 0 && targets.length > limit) {
    const stride = targets.length / limit;
    targets = Array.from({ length: limit }, (_, i) => targets[Math.floor(i * stride)]);
}

const totals = {
    levelsScored: 0,
    decisionsVisited: 0,
    branchingDecisions: 0,
    branchingWithKnownContinuation: 0,
    absentKnownContinuation: 0,
    exactVocabularyCollisionDecisions: 0,
    exactVocabularyCollisionPairs: 0,
    weightInvariantDecisions: 0,
    weightInvariantPairs: 0,
    weightInvariantAlternativePreferredDecisions: 0,
    weightInvariantAlternativePreferredPairs: 0,
    reconstructionFailures: 0,
    maxReconstructionError: 0,
};
const levels = [];
const collisionExamples = [];
const weightInvariantExamples = [];
const reconstructionExamples = [];
let skippedLevels = 0;

for (const raw of targets) {
    let level, prep;
    try {
        level = normalizeRawLevel(raw);
        prep = prepLevel(level);
    } catch {
        skippedLevels++;
        continue;
    }
    const paths = knownSolutions(raw);
    if (!paths.length) { skippedLevels++; continue; }

    const byGate = new Map();
    for (const solutionPath of paths) {
        if (!byGate.has(solutionPath[0])) byGate.set(solutionPath[0], []);
        byGate.get(solutionPath[0]).push(solutionPath);
    }
    const levelSummary = {
        id: raw.id ?? null,
        decisionsVisited: 0,
        branchingDecisions: 0,
        exactVocabularyCollisionDecisions: 0,
        exactVocabularyCollisionPairs: 0,
        weightInvariantDecisions: 0,
        weightInvariantPairs: 0,
        weightInvariantAlternativePreferredDecisions: 0,
        weightInvariantAlternativePreferredPairs: 0,
        absentKnownContinuation: 0,
        maxReconstructionError: 0,
    };

    for (const [gate, gatePaths] of byGate) {
        let state;
        try { state = createState(gate, level, prep, STATE_BUF_DFS); } catch { continue; }
        const trie = buildTrie(gatePaths);

        const walk = node => {
            if (node.children.size === 0) return;
            totals.decisionsVisited++;
            levelSummary.decisionsVisited++;
            const pos = node.key;
            let neighbors;
            try { neighbors = getNeighbors(pos, state, level, prep); } catch { neighbors = []; }
            const knownChildren = [...node.children.keys()];
            const presentKnown = knownChildren.filter(key => neighbors.includes(key));
            if (presentKnown.length !== knownChildren.length) {
                const missing = knownChildren.length - presentKnown.length;
                totals.absentKnownContinuation += missing;
                levelSummary.absentKnownContinuation += missing;
            }

            if (neighbors.length >= 2 && presentKnown.length > 0) {
                totals.branchingDecisions++;
                totals.branchingWithKnownContinuation++;
                levelSummary.branchingDecisions++;

                const realLen = getRealLengthFromState(state);
                const portalEntry = level.portalMap.get(pos);
                const scoreCandidates = profile => {
                    const context = buildCurUrgencyContext(pos, state, level, prep, true, profile);
                    const scores = new Map();
                    for (const candidate of neighbors) {
                        const isJump = !!(portalEntry && portalEntry.dest === candidate);
                        const remaining = level.requiredLength - realLen - (isJump ? 0 : 1);
                        scores.set(candidate, scoreMove(candidate, pos, state, level, prep, profile, remaining, null, context));
                    }
                    return scores;
                };

                const zeroScores = scoreCandidates(zeroProfile);
                const basisMaps = Object.fromEntries(basisProfiles.map(row => [row.field, scoreCandidates(row.scoringProfile)]));

                // One observer policy only: this validates against scoreAndSort's real scoring path
                // without triggering the observer's pairwise multi-policy forensics.
                let observation = null;
                const previousObserver = prep._orderingResearchObserver;
                prep._orderingResearchObserver = {
                    policies: [{ id: '__active-profile__', scoringProfile, orderingBias: null }],
                    observe: record => { observation = record; },
                };
                try {
                    scoreAndSort(neighbors.slice(), pos, state, level, prep, scoringProfile, null);
                } finally {
                    prep._orderingResearchObserver = previousObserver;
                }
                const activeScores = rankingScoreMap(observation, '__active-profile__');

                if (activeScores) {
                    const candidateVectors = new Map();
                    for (const candidate of neighbors) {
                        const basisScores = Object.fromEntries(SCORING_WEIGHT_FIELDS.map(field => [field, basisMaps[field].get(candidate)]));
                        const vector = scoreVectorFromBasisScores(zeroScores.get(candidate), basisScores);
                        candidateVectors.set(candidate, vector);
                        const reconstructed = reconstructScore(vector, scoringProfile);
                        const actual = activeScores.get(candidate);
                        const error = Math.abs(reconstructed - actual);
                        totals.maxReconstructionError = Math.max(totals.maxReconstructionError, error);
                        levelSummary.maxReconstructionError = Math.max(levelSummary.maxReconstructionError, error);
                        if (error > epsilon) {
                            totals.reconstructionFailures++;
                            if (reconstructionExamples.length < 50) reconstructionExamples.push({
                                levelId: raw.id ?? null,
                                depth: state.path.length - 1,
                                candidate,
                                reconstructed,
                                actual,
                                error,
                            });
                        }
                    }

                    const decision = analyzeVocabularyDecision(candidateVectors, presentKnown, epsilon);
                    if (decision.exactVocabularyCollision) {
                        totals.exactVocabularyCollisionDecisions++;
                        totals.exactVocabularyCollisionPairs += decision.collisions.length;
                        levelSummary.exactVocabularyCollisionDecisions++;
                        levelSummary.exactVocabularyCollisionPairs += decision.collisions.length;
                        if (collisionExamples.length < 100) collisionExamples.push({
                            levelId: raw.id ?? null,
                            depth: state.path.length - 1,
                            pos,
                            knownContinuationChildren: presentKnown,
                            legalChildren: neighbors,
                            collisions: decision.collisions,
                        });
                    }
                    if (decision.weightInvariant) {
                        totals.weightInvariantDecisions++;
                        totals.weightInvariantPairs += decision.weightInvariantPairs.length;
                        levelSummary.weightInvariantDecisions++;
                        levelSummary.weightInvariantPairs += decision.weightInvariantPairs.length;
                        if (decision.weightInvariantAlternativePreferred) {
                            totals.weightInvariantAlternativePreferredDecisions++;
                            totals.weightInvariantAlternativePreferredPairs += decision.weightInvariantAlternativePreferredPairs.length;
                            levelSummary.weightInvariantAlternativePreferredDecisions++;
                            levelSummary.weightInvariantAlternativePreferredPairs += decision.weightInvariantAlternativePreferredPairs.length;
                        }
                        if (weightInvariantExamples.length < 100) weightInvariantExamples.push({
                            levelId: raw.id ?? null,
                            depth: state.path.length - 1,
                            pos,
                            knownContinuationChildren: presentKnown,
                            legalChildren: neighbors,
                            weightInvariantPairs: decision.weightInvariantPairs,
                        });
                    }
                }
            }

            for (const child of node.children.values()) {
                const portal = level.portalMap.get(pos);
                const isPortalJump = !!(portal && !state.lastWasPortalJump && portal.dest === child.key);
                let undo;
                try { undo = applyMove(child.key, state, level, prep, isPortalJump); } catch { continue; }
                walk(child);
                undoMove(undo, state);
            }
        };
        walk(trie);
    }

    if (levelSummary.decisionsVisited > 0) {
        levels.push(levelSummary);
        totals.levelsScored++;
    }
}

console.log(`\nScoring-vocabulary diagnostic — ${corpusName}, profile '${scoringProfileId}', sources ${[...sources].join('+')}`);
console.log(`levels scored: ${totals.levelsScored} (skipped ${skippedLevels})`);
console.log(`decisions: ${totals.decisionsVisited.toLocaleString()} | branching: ${totals.branchingDecisions.toLocaleString()}`);
console.log(`known continuation absent from legal siblings: ${totals.absentKnownContinuation.toLocaleString()}`);
console.log(`exact 12-weight vocabulary collision decisions: ${totals.exactVocabularyCollisionDecisions.toLocaleString()} (${totals.exactVocabularyCollisionPairs.toLocaleString()} pairs)`);
console.log(`weight-invariant decisions: ${totals.weightInvariantDecisions.toLocaleString()} (${totals.weightInvariantPairs.toLocaleString()} pairs)`);
console.log(`weight-invariant alternative-preferred decisions: ${totals.weightInvariantAlternativePreferredDecisions.toLocaleString()} (${totals.weightInvariantAlternativePreferredPairs.toLocaleString()} pairs)`);
console.log(`affine reconstruction failures > ${epsilon}: ${totals.reconstructionFailures.toLocaleString()} | max error ${totals.maxReconstructionError}`);
if (totals.reconstructionFailures > 0) {
    console.error('WARNING: score reconstruction was not exact within epsilon; do not interpret weight-invariant results until investigated.');
}

const outFile = args.get('--out');
if (outFile) {
    const absolute = path.join(root, outFile);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, JSON.stringify({
        schemaVersion: 1,
        corpus: corpusName,
        population: flags.has('--unsolved-only') ? 'unsolved' : flags.has('--solved-only') ? 'solved' : 'all',
        scoringProfileId,
        sources: [...sources],
        epsilon,
        interpretation: {
            positiveLabel: 'known-valid continuation from stored witness/hint',
            otherLegalSibling: 'reference-abstain unless separately exact-labelled',
            weightInvariantPair: 'all 12 tunable components match; weight retuning cannot change this pairwise score margin, which is the intercept margin',
            weightInvariantAlternativePreferred: 'all 12 tunable components match and the profile-independent intercept favors the other legal sibling; the sibling is still reference-abstain unless independently labelled dead',
            exactVocabularyCollision: 'same intercept and all 12 score-weight basis components; current 12-weight reweighting cannot distinguish the pair at this state',
        },
        weightFields: SCORING_WEIGHT_FIELDS,
        totals,
        skippedLevels,
        collisionExamples,
        weightInvariantExamples,
        reconstructionExamples,
        levels,
    }, null, 2));
    console.log(`Wrote ${outFile}`);
}
