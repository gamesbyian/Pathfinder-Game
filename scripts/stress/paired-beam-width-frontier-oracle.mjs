#!/usr/bin/env node
/**
 * Response-guided consumer oracle for non-monotonic beam-width inversions.
 *
 * Captures two isolated beam frontiers at the same scoring profile and phase checkpoint on an
 * explicit development population. It compares exact prefix identities only; it does not claim
 * feasibility, dominance, routing value, or production benefit.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/paired-beam-width-frontier-oracle.mjs -- \
 *     --corpora=data/levels.json,data/stress/stress-levels.json,data/stress/stress-levels-random.json \
 *     --levels=P00001,S00001,R00001 \
 *     --profile=objectiveFirst --widths=2000,5000 --depth-fraction=0.2 \
 *     --out=tmp/paired-width-frontier.json
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { createSolver, SOLVER_TESTING_API } from '../../modules/solver.js';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { reconstructBeamPath } from './production-search-frontier-sampler-lib.mjs';

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
    const hit = argv.find(value => value.startsWith(`--${name}=`));
    return hit === undefined ? fallback : hit.slice(name.length + 3);
};

const pathIdentity = prefix => JSON.stringify(prefix);

export function compareFrontierIdentitySets(leftIds, rightIds) {
    const left = new Set(leftIds.map(String));
    const right = new Set(rightIds.map(String));
    const shared = [...left].filter(id => right.has(id)).sort();
    const leftOnly = [...left].filter(id => !right.has(id)).sort();
    const rightOnly = [...right].filter(id => !left.has(id)).sort();
    const union = shared.length + leftOnly.length + rightOnly.length;
    return {
        left: left.size,
        right: right.size,
        shared: shared.length,
        leftOnly: leftOnly.length,
        rightOnly: rightOnly.length,
        jaccard: union ? shared.length / union : null,
        leftContainedInRight: leftOnly.length === 0,
        rightContainedInLeft: rightOnly.length === 0,
        sharedIds: shared,
        leftOnlyIds: leftOnly,
        rightOnlyIds: rightOnly,
    };
}

export function compareBeamFrontiers(leftFrontier, rightFrontier) {
    const identityRows = frontier => frontier.map((node, index) => {
        const prefix = reconstructBeamPath(node);
        return {
            index,
            id: pathIdentity(prefix),
            prefix,
            score: node.score,
        };
    });
    const left = identityRows(leftFrontier);
    const right = identityRows(rightFrontier);
    const comparison = compareFrontierIdentitySets(
        left.map(row => row.id),
        right.map(row => row.id),
    );
    const byLeft = new Map(left.map(row => [row.id, row]));
    const byRight = new Map(right.map(row => [row.id, row]));
    return {
        ...comparison,
        leftOnlyRows: comparison.leftOnlyIds.map(id => byLeft.get(id)),
        rightOnlyRows: comparison.rightOnlyIds.map(id => byRight.get(id)),
        sharedRows: comparison.sharedIds.map(id => ({
            id,
            left: byLeft.get(id),
            right: byRight.get(id),
        })),
    };
}

async function captureFrontier({ level, gate, profile, width, pauseAfterPhases, budgetMs }) {
    const { prepLevel, beamSearchFromGate } = SOLVER_TESTING_API;
    const prep = prepLevel(level);
    prep._cfg = null;
    prep._metrics = { nodesExpanded: 0 };
    const out = {};
    const result = await beamSearchFromGate(
        gate,
        level,
        prep,
        profile,
        budgetMs,
        Date.now(),
        null,
        width,
        null,
        false,
        out,
        Infinity,
        undefined,
        pauseAfterPhases,
    );
    if (result) {
        return {
            status: 'solved-before-checkpoint',
            frontier: [],
            nodesExpanded: prep._metrics.nodesExpanded,
            workSpent: prep._workMeter.units,
        };
    }
    if (!out.pausedContinuation) {
        return {
            status: 'exhausted-before-checkpoint',
            frontier: [],
            nodesExpanded: prep._metrics.nodesExpanded,
            workSpent: prep._workMeter.units,
        };
    }
    return {
        status: 'paused',
        frontier: out.pausedContinuation.frontier,
        nodesExpanded: prep._metrics.nodesExpanded,
        workSpent: prep._workMeter.units,
    };
}

async function main() {
    const corpusFiles = String(arg('corpora', arg('corpus', 'data/stress/stress-levels-random.json')))
        .split(',').map(value => value.trim()).filter(Boolean);
    const levelIds = String(arg('levels', '')).split(',').map(value => value.trim()).filter(Boolean);
    const profileName = arg('profile', 'objectiveFirst');
    const widths = String(arg('widths', '2000,5000')).split(',').map(Number);
    const depthFraction = Number(arg('depth-fraction', 0.2));
    const budgetMs = Number(arg('budget-ms', 600_000));
    const maxExamples = Number(arg('max-examples', 12));
    const outFile = arg('out', null);

    if (!outFile) throw new Error('--out is required');
    if (!levelIds.length) throw new Error('--levels must contain at least one explicit level id');
    if (new Set(levelIds).size !== levelIds.length) throw new Error('--levels contains duplicate ids');
    if (widths.length !== 2 || widths.some(width => !Number.isInteger(width) || width < 1) || widths[0] === widths[1]) {
        throw new Error('--widths must contain two distinct positive integers');
    }
    if (!(depthFraction > 0 && depthFraction < 1)) throw new Error('--depth-fraction must be in (0,1)');
    if (!Number.isFinite(budgetMs) || budgetMs <= 0) throw new Error('--budget-ms must be positive');
    if (!Number.isInteger(maxExamples) || maxExamples < 0) throw new Error('--max-examples must be a non-negative integer');

    installBrowserStubs();
    const Solver = createSolver();
    const profile = SOLVER_TESTING_API.SCORING_PROFILES[profileName];
    if (!profile) throw new Error(`unknown scoring profile: ${profileName}`);

    if (!corpusFiles.length) throw new Error('--corpora/--corpus must contain at least one corpus file');
    const byId = new Map();
    for (const corpusFile of corpusFiles) {
        const document = JSON.parse(readFileSync(path.resolve(corpusFile), 'utf8'));
        const rows = Array.isArray(document) ? document : document.levels;
        if (!Array.isArray(rows)) throw new Error(`corpus ${corpusFile} must be an array or {levels:[...]}`);
        for (const row of rows) {
            const id = String(row?.id ?? '');
            if (!id) throw new Error(`corpus ${corpusFile} contains a level without id`);
            if (byId.has(id)) throw new Error(`duplicate level id across corpus inputs: ${id}`);
            byId.set(id, row);
        }
    }

    const results = [];
    for (const levelId of levelIds) {
        const raw = byId.get(levelId);
        if (!raw) throw new Error(`level ${levelId} missing from corpus inputs: ${corpusFiles.join(',')}`);
        const { id: _id, stressMeta: _stressMeta, ...rawLevel } = raw;
        const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
        const pauseAfterPhases = Math.max(1, Math.round(level.requiredLength * depthFraction));
        const gates = [];

        for (const [gateIndex, gate] of level.gateKeys.entries()) {
            const captures = [];
            for (const width of widths) {
                captures.push(await captureFrontier({
                    level, gate, profile, width, pauseAfterPhases, budgetMs,
                }));
            }

            const fullComparison = captures.every(row => row.status === 'paused')
                ? compareBeamFrontiers(captures[0].frontier, captures[1].frontier)
                : null;
            const comparison = fullComparison ? {
                left: fullComparison.left,
                right: fullComparison.right,
                shared: fullComparison.shared,
                leftOnly: fullComparison.leftOnly,
                rightOnly: fullComparison.rightOnly,
                jaccard: fullComparison.jaccard,
                leftContainedInRight: fullComparison.leftContainedInRight,
                rightContainedInLeft: fullComparison.rightContainedInLeft,
                leftOnlyExamples: fullComparison.leftOnlyRows.slice(0, maxExamples),
                rightOnlyExamples: fullComparison.rightOnlyRows.slice(0, maxExamples),
                sharedExamples: fullComparison.sharedRows.slice(0, maxExamples),
            } : null;

            gates.push({
                gateIndex,
                gateKey: gate,
                left: {
                    width: widths[0],
                    status: captures[0].status,
                    frontierSize: captures[0].frontier.length,
                    nodesExpanded: captures[0].nodesExpanded,
                    workSpent: captures[0].workSpent,
                },
                right: {
                    width: widths[1],
                    status: captures[1].status,
                    frontierSize: captures[1].frontier.length,
                    nodesExpanded: captures[1].nodesExpanded,
                    workSpent: captures[1].workSpent,
                },
                comparison,
            });
        }

        results.push({
            levelId,
            pauseAfterPhases,
            widths,
            gates,
        });
    }

    const comparable = results.flatMap(row => row.gates.map(gate => ({ levelId: row.levelId, ...gate })))
        .filter(row => row.comparison);
    const report = {
        schemaVersion: 1,
        kind: 'pathfinder-paired-beam-width-frontier-oracle',
        evidenceRole: 'development',
        premiseUse: 'consumer-oracle-only',
        protocol: {
            corpora: corpusFiles,
            levelIds,
            profile: profileName,
            widths,
            depthFraction,
            budgetMs,
            maxExamples,
            execution: 'two isolated beam searches per gate, same profile/checkpoint; no production policy change',
        },
        interpretation: {
            allowed: 'test state-support nesting/overlap before dominance or retention hypotheses',
            forbidden: 'infer feasibility, production benefit, or a routing rule from frontier membership alone',
        },
        summary: {
            requestedParents: results.length,
            requestedGates: results.reduce((sum, row) => sum + row.gates.length, 0),
            comparableGates: comparable.length,
            parentsWithComparableGates: new Set(comparable.map(row => row.levelId)).size,
            leftContainedInRight: comparable.filter(row => row.comparison.leftContainedInRight).length,
            rightContainedInLeft: comparable.filter(row => row.comparison.rightContainedInLeft).length,
            meanJaccard: comparable.length
                ? comparable.reduce((sum, row) => sum + (row.comparison.jaccard ?? 0), 0) / comparable.length
                : null,
        },
        parents: results,
    };

    const absolute = path.resolve(outFile);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ out: outFile, ...report.summary }, null, 2));
}

if (process.argv[1] && ['paired-beam-width-frontier-oracle.mjs', 'paired-beam-width-frontier-oracle.bundle.mjs'].includes(path.basename(process.argv[1]))
    && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
