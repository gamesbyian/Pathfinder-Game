#!/usr/bin/env node
/**
 * Stage-B incidence measurement for WS2-CUT-BALANCE-PROJECTION / BC1.
 *
 * Replays already-frozen production-frontier prefixes through canonical solver state semantics,
 * asks the existing connectivity implementation for its reached multigraph, then applies the pure
 * bridge-excursion theorem. Production search is unchanged.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createSolver, SOLVER_TESTING_API } from '../../modules/solver.js';
import { getLevelFingerprint } from '../../modules/domain/level-fingerprint.js';
import { buildResearchBlock } from '../solver-research-block-lineage.mjs';
import { researchSemanticHash } from '../research-semantic-identity-lib.mjs';
import { validateResearchUnitTopology } from '../research-unit-topology-lib.mjs';
import { findBridgeExcursionConflicts } from './cut-bridge-excursion-lib.mjs';

function replayPrefix(level, prefix) {
    if (!Array.isArray(prefix) || !prefix.length) throw new Error('frontier row prefix must be non-empty');
    const prep = SOLVER_TESTING_API.prepLevel(level);
    prep._cfg = null;
    prep._metrics = { nodesExpanded: 0 };
    const state = SOLVER_TESTING_API.createState(prefix[0], level, prep);

    for (let index = 1; index < prefix.length; index++) {
        const from = state.path[state.path.length - 1];
        const target = prefix[index];
        const legal = SOLVER_TESTING_API.getNeighbors(from, state, level, prep);
        if (!legal.includes(target)) {
            throw new Error(`prefix replay diverged at index ${index}: ${from} -> ${target} is not legal`);
        }
        const portal = level.portalMap.get(from);
        const isPortalJump = Boolean(portal && !state.lastWasPortalJump && portal.dest === target);
        SOLVER_TESTING_API.applyMove(target, state, level, prep, isPortalJump);
    }
    return { state, prep };
}

export function analyzeBridgeExcursionIncidence({ population, levels }) {
    if (!Array.isArray(population?.rows)) throw new Error('population.rows must be an array');
    if (!Array.isArray(levels)) throw new Error('levels must be an array');

    const rawById = new Map();
    for (const raw of levels) {
        const id = String(raw?.id ?? '');
        if (!id) throw new Error('raw level is missing id');
        if (rawById.has(id)) throw new Error(`duplicate raw level id: ${id}`);
        rawById.set(id, raw);
    }

    const Solver = createSolver();
    const rows = [];
    const parentsWithConflict = new Set();
    const parentsEligible = new Set();

    for (const row of population.rows) {
        const levelId = String(row.levelId ?? row.parentId ?? '');
        const raw = rawById.get(levelId);
        if (!raw) throw new Error(`missing raw level for sampled parent: ${levelId}`);
        const { id: _id, stressMeta: _stressMeta, ...rawLevel } = raw;
        const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
        const { state, prep } = replayPrefix(level, row.prefix);
        const pos = state.path[state.path.length - 1];
        const snapshot = SOLVER_TESTING_API.connectivityResearchSnapshot(pos, state, level, prep);

        let theorem = {
            eligible: false,
            reason: 'ordinary-connectivity-fails',
            bridges: [],
            conflicts: [],
        };
        if (snapshot.connected) {
            theorem = findBridgeExcursionConflicts({
                nodes: snapshot.nodes,
                edges: snapshot.edges,
                current: snapshot.current,
                goal: snapshot.goal,
                pendingMandatory: snapshot.pendingMandatory,
            });
        }

        if (snapshot.connected) parentsEligible.add(levelId);
        if (theorem.conflicts.length) parentsWithConflict.add(levelId);

        rows.push({
            levelId,
            parentId: String(row.parentId ?? levelId),
            independentUnit: String(row.independentUnit ?? row.parentId ?? levelId),
            frontierIndex: row.frontierIndex ?? null,
            depth: row.depth ?? (row.prefix.length - 1),
            ordinaryConnectivityPass: snapshot.connected,
            reachedNodes: snapshot.nodes.length,
            transitionResources: snapshot.edges.length,
            pendingMandatory: snapshot.pendingMandatory.length,
            bridgeCount: theorem.bridges.length,
            conflictCount: theorem.conflicts.length,
            conflicts: theorem.conflicts,
        });
    }

    const connectivityPassing = rows.filter(row => row.ordinaryConnectivityPass);
    const conflicts = connectivityPassing.filter(row => row.conflictCount > 0);
    return {
        schemaVersion: 1,
        kind: 'pathfinder-cut-bridge-incidence',
        evidenceRole: population.evidenceRole ?? 'development',
        question: population.question ?? 'WS2-CUT-BALANCE-PROJECTION',
        inferenceScope: 'BC1 incidence among already-frozen frontier states where existing connectivity passes',
        independenceUnit: population.independenceUnit ?? 'parent-level',
        summary: {
            sampledRows: rows.length,
            sampledParents: new Set(rows.map(row => row.parentId)).size,
            connectivityPassingRows: connectivityPassing.length,
            connectivityPassingParents: parentsEligible.size,
            conflictRows: conflicts.length,
            conflictParents: parentsWithConflict.size,
            conflictRateWithinConnectivityPassingRows: connectivityPassing.length
                ? conflicts.length / connectivityPassing.length
                : null,
            conflictParentRateWithinConnectivityPassingParents: parentsEligible.size
                ? parentsWithConflict.size / parentsEligible.size
                : null,
        },
        rows,
    };
}

export async function attachBridgeExcursionResearchLineage(report, {
    population,
    populationPath,
    levels,
} = {}) {
    if (!report || !Array.isArray(report.rows)) throw new Error('report.rows must be an array');
    if (!population || !Array.isArray(population.rows)) throw new Error('population.rows must be an array');
    if (!Array.isArray(levels)) throw new Error('levels must be an array');
    if (typeof populationPath !== 'string' || !populationPath.trim()) throw new Error('populationPath is required');

    const rawById = new Map(levels.map(level => [String(level?.id ?? ''), level]));
    const parentIds = [...new Set(report.rows.map(row => String(row.parentId ?? row.levelId ?? '')).filter(Boolean))].sort();
    const parentContentIdentities = await Promise.all(parentIds.map(async parentId => {
        const raw = rawById.get(parentId);
        if (!raw) throw new Error(`missing raw level for lineage parent: ${parentId}`);
        return getLevelFingerprint(raw);
    }));
    const questionId = String(report.question ?? population.question ?? 'WS2-CUT-BALANCE-PROJECTION');
    const sourceRevision = researchSemanticHash({
        kind: 'pathfinder-cut-bridge-incidence-source-population',
        population,
    });
    const blockId = `${questionId}:bc1:${researchSemanticHash({
        sourceRevision,
        parentIds,
        parentContentIdentities,
    }).slice('sha256:'.length, 'sha256:'.length + 12)}`;
    const lineage = buildResearchBlock({
        blockId,
        questionId,
        sourceRegime: 'frozen-production-frontier-prefixes',
        sourceRevision,
        evidenceRole: report.evidenceRole ?? 'development',
        independentUnit: 'parent-level',
        parentIds,
        parentContentIdentities,
        sourceArtifactRefs: [populationPath],
        producer: 'scripts/stress/cut-bridge-incidence.mjs',
        manifestRef: populationPath,
        generationRef: null,
    });
    return {
        ...report,
        researchEnrichmentKind: 'observation',
        populationIdentity: lineage.populationIdentity,
        researchBlock: lineage.researchBlock,
        unitTopology: validateResearchUnitTopology({
            observationUnit: 'frontier-state',
            opportunityUnit: 'connectivity-passing-frontier-state',
            assignmentUnit: null,
            dependenceClusterUnit: 'parent',
            analysisUnit: 'frontier-state-with-parent-cluster-reporting',
            generalizationUnit: 'parent-under-frozen-production-frontier-sampling-protocol',
        }),
    };
}

async function main() {
    const args = new Map(process.argv.slice(2).map(arg => arg.split('=', 2)));
    const populationPath = args.get('--population');
    const corpusPath = args.get('--corpus') ?? 'data/stress/stress-levels-random.json';
    const outPath = args.get('--out');
    if (!populationPath) throw new Error('--population is required');
    if (!outPath) throw new Error('--out is required');

    const population = JSON.parse(readFileSync(populationPath, 'utf8'));
    const corpusDoc = JSON.parse(readFileSync(corpusPath, 'utf8'));
    const levels = Array.isArray(corpusDoc) ? corpusDoc : corpusDoc.levels;
    const analysis = analyzeBridgeExcursionIncidence({ population, levels });
    const report = await attachBridgeExcursionResearchLineage(analysis, {
        population,
        populationPath,
        levels,
    });

    const absolute = path.resolve(outPath);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ out: outPath, ...report.summary }, null, 2));
}

if (process.argv[1] && ['cut-bridge-incidence.mjs', 'cut-bridge-incidence.bundle.mjs'].includes(path.basename(process.argv[1]))
    && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
