#!/usr/bin/env node
/**
 * Reusable research-state sampler over a real production beam frontier.
 *
 * This is population-construction infrastructure, not a labeler or solver treatment. It freezes
 * multiple distinct current-search states per parent before any downstream exact/referee labels are
 * inspected. Parent identity and frontier ancestry are persisted so within-parent detection is not
 * accidentally counted as between-parent confirmation.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/production-search-frontier-sampler.mjs -- \
 *     --corpus=data/stress/stress-levels-random.json --levels=R01600,R03147 \
 *     --depth-fraction=0.1 --picks=25 --seed=my-question-v1 \
 *     --profile=intersectionHarvest --width=5000 \
 *     --question=WS2-D1 --evidence-role=development \
 *     --cases-out=/tmp/frontier-cases.json --population-out=/tmp/frontier-population.json
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { createSolver, SOLVER_TESTING_API } from '../../modules/solver.js';
import { captureSolverGitState } from '../experiment-manifest-lib.mjs';
import {
    frontierAncestryKey,
    reconstructBeamPath,
    sampleDistinctIndices,
} from './production-search-frontier-sampler-lib.mjs';
import { assertResearchBlock } from '../solver-research-block-lineage.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
    const hit = argv.find(value => value.startsWith(`--${name}=`));
    return hit === undefined ? fallback : hit.slice(name.length + 3);
};

const corpusFile = arg('corpus', 'data/stress/stress-levels-random.json');
const levelIds = String(arg('levels', '')).split(',').map(value => value.trim()).filter(Boolean);
const depthFraction = Number(arg('depth-fraction', 0.1));
const picksRequested = Number(arg('picks', 25));
const seed = arg('seed', 'production-frontier-sampler-v1');
const profileName = arg('profile', 'intersectionHarvest');
const width = Number(arg('width', 5000));
const budgetMs = Number(arg('budget-ms', 600_000));
const question = arg('question', null);
const evidenceRole = arg('evidence-role', 'development');
const casesOut = arg('cases-out', null);
const populationOut = arg('population-out', null);
const blockArtifact = arg('block-artifact', null);

if (!levelIds.length) throw new Error('--levels must contain at least one level id');
if (!(depthFraction > 0 && depthFraction < 1)) throw new Error('--depth-fraction must be in (0, 1)');
if (!Number.isInteger(picksRequested) || picksRequested < 1) throw new Error('--picks must be a positive integer');
if (!Number.isFinite(width) || width < 1) throw new Error('--width must be positive');
if (!Number.isFinite(budgetMs) || budgetMs <= 0) throw new Error('--budget-ms must be positive');
if (!casesOut && !populationOut) throw new Error('at least one of --cases-out or --population-out is required');

let inheritedLineage = null;
if (blockArtifact) {
    const blockDoc = JSON.parse(readFileSync(path.resolve(ROOT, blockArtifact), 'utf8'));
    const researchBlock = blockDoc?.researchBlock ?? blockDoc?.population?.researchBlock ?? null;
    const populationIdentity = blockDoc?.populationIdentity ?? blockDoc?.population?.corpusIdentity ?? null;
    assertResearchBlock(researchBlock, { populationIdentity });
    const parentSet = new Set(researchBlock.parentIds.map(String));
    const missing = levelIds.filter(levelId => !parentSet.has(String(levelId)));
    if (missing.length) throw new Error(`--block-artifact does not contain sampled parent(s): ${missing.join(', ')}`);
    if (question && question !== researchBlock.questionId) {
        throw new Error(`--question=${question} conflicts with block questionId=${researchBlock.questionId}`);
    }
    inheritedLineage = { researchBlock, populationIdentity, blockArtifact };
}
const resolvedQuestion = question || inheritedLineage?.researchBlock?.questionId || null;

installBrowserStubs();
const Solver = createSolver();
const { prepLevel, beamSearchFromGate, SCORING_PROFILES } = SOLVER_TESTING_API;
const profile = SCORING_PROFILES[profileName];
if (!profile) throw new Error(`unknown scoring profile: ${profileName}`);
const solver = captureSolverGitState();

const corpusDoc = JSON.parse(readFileSync(path.resolve(ROOT, corpusFile), 'utf8'));
const corpusRows = Array.isArray(corpusDoc) ? corpusDoc : corpusDoc.levels;
if (!Array.isArray(corpusRows)) throw new Error('corpus must be an array or {levels:[...]}');
const corpusById = new Map(corpusRows.map(row => [String(row.id), row]));

const rows = [];
const parentSummaries = [];
for (const levelId of levelIds) {
    const raw = corpusById.get(levelId);
    if (!raw) throw new Error(`level ${levelId} missing from ${corpusFile}`);
    const { id: _id, stressMeta: _stressMeta, ...rawLevel } = raw;
    const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    const gate = level.gateKeys[0];
    const prep = prepLevel(level);
    prep._cfg = null;
    prep._metrics = { nodesExpanded: 0 };

    const pauseAfterPhases = Math.max(1, Math.round(level.requiredLength * depthFraction));
    const out = {};
    const result = await beamSearchFromGate(
        gate, level, prep, profile, budgetMs, Date.now(), null, width,
        null, false, out, Infinity, undefined, pauseAfterPhases,
    );

    if (result) {
        parentSummaries.push({ levelId, status: 'solved-before-checkpoint', depth: pauseAfterPhases, sampled: 0 });
        continue;
    }
    if (!out.pausedContinuation) {
        parentSummaries.push({ levelId, status: 'exhausted-before-checkpoint', depth: pauseAfterPhases, sampled: 0 });
        continue;
    }

    const frontier = out.pausedContinuation.frontier;
    const selected = sampleDistinctIndices(frontier.length, picksRequested, `${seed}:${levelId}:frontier`);
    const ancestryKey = frontierAncestryKey({
        corpus: corpusFile,
        levelId,
        profile: profileName,
        width,
        depth: pauseAfterPhases,
        solverCommit: solver.commit,
    });
    for (const frontierIndex of selected) {
        const node = frontier[frontierIndex];
        rows.push({
            levelId,
            parentId: levelId,
            independentUnit: levelId,
            ancestryKey,
            selectionSeed: seed,
            frontierIndex,
            frontierSize: frontier.length,
            depth: pauseAfterPhases,
            score: node.score,
            prefix: reconstructBeamPath(node),
        });
    }
    parentSummaries.push({
        levelId,
        status: 'sampled',
        depth: pauseAfterPhases,
        frontierSize: frontier.length,
        sampled: selected.length,
        ancestryKey,
        selectionSeed: seed,
    });
}

const population = {
    schemaVersion: 1,
    kind: 'pathfinder-production-search-frontier-sample',
    generatedAt: new Date().toISOString(),
    question: resolvedQuestion,
    evidenceRole,
    independenceUnit: 'parent-level',
    freezeBoundary: 'candidate rows selected from production beam frontier before downstream labels',
    corpus: corpusFile,
    levelIds,
    solver,
    sampler: {
        profile: profileName,
        width,
        depthFraction,
        picksRequested,
        seed,
        budgetMs,
    },
    parentSummaries,
    rows,
    ...(inheritedLineage ? {
        populationIdentity: inheritedLineage.populationIdentity,
        researchBlock: inheritedLineage.researchBlock,
        sourceBlockArtifact: inheritedLineage.blockArtifact,
    } : {}),
};

function writeJson(relative, payload) {
    const absolute = path.resolve(ROOT, relative);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}\n`);
}

if (casesOut) {
    writeJson(casesOut, {
        schemaVersion: 1,
        corpus: corpusFile,
        freezeBoundary: population.freezeBoundary,
        ...(inheritedLineage ? {
            populationIdentity: inheritedLineage.populationIdentity,
            researchBlock: inheritedLineage.researchBlock,
            sourceBlockArtifact: inheritedLineage.blockArtifact,
        } : {}),
        cases: rows.map(row => ({
            id: `${row.levelId}:frontier-${row.frontierIndex}`,
            levelId: row.levelId,
            parentId: row.parentId,
            ancestryKey: row.ancestryKey,
            prefix: row.prefix,
        })),
    });
}
if (populationOut) writeJson(populationOut, population);

console.log(JSON.stringify({
    parentsRequested: levelIds.length,
    parentsSampled: parentSummaries.filter(row => row.status === 'sampled').length,
    rows: rows.length,
    independenceUnit: population.independenceUnit,
    casesOut,
    populationOut,
}, null, 2));
