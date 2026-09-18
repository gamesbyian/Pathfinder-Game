#!/usr/bin/env node
/**
 * Capture ordinary beam rank/retain decisions for the D1 production-inert evidence gate.
 *
 * This command never runs D1/CP-SAT. It first runs an observer-OFF control, then repeats the exact
 * same beam attempt with research observation enabled. Eligibility is frozen from the observed
 * production decision before any exact D1 result exists.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { createSolver, SOLVER_TESTING_API } from '../../modules/solver.js';
import { captureSolverGitState } from '../experiment-manifest-lib.mjs';
import { beamResearchRecordToDecisionObservation } from '../solver-decision-observation-lib.mjs';
import {
    D1_DEVELOPMENT_PARENT_IDS,
    freezeD1Eligibility,
    pathIdentity,
} from './d1-production-observation-lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
    const hit = argv.find(value => value.startsWith(`--${name}=`));
    return hit === undefined ? fallback : hit.slice(name.length + 3);
};

const corpusFile = arg('corpus', 'data/stress/stress-levels-random.json');
const levelIds = String(arg('levels', 'R03147')).split(',').map(value => value.trim()).filter(Boolean);
const profileName = arg('profile', 'intersectionHarvest');
const width = Number(arg('width', 5000));
const budgetMs = Number(arg('budget-ms', 600_000));
const nodeBudget = Number(arg('node-budget', Number.POSITIVE_INFINITY));
const cutoffRadius = Number(arg('cutoff-radius', 2));
const evidenceRole = arg('evidence-role', 'development');
const outFile = arg('out', null);

if (!outFile) throw new Error('--out is required');
if (!levelIds.length) throw new Error('--levels must contain at least one level id');
if (!Number.isFinite(width) || width < 1) throw new Error('--width must be positive');
if (!Number.isFinite(budgetMs) || budgetMs <= 0) throw new Error('--budget-ms must be positive');
if (!(Number.isFinite(nodeBudget) || nodeBudget === Number.POSITIVE_INFINITY) || nodeBudget <= 0) throw new Error('--node-budget must be positive');
if (!Number.isInteger(cutoffRadius) || cutoffRadius < 0) throw new Error('--cutoff-radius must be a non-negative integer');
if (!['development', 'independent-confirmation'].includes(evidenceRole)) throw new Error('--evidence-role must be development or independent-confirmation');
if (evidenceRole === 'independent-confirmation') {
    const contaminated = levelIds.filter(id => D1_DEVELOPMENT_PARENT_IDS.includes(id));
    if (contaminated.length) throw new Error(`independent-confirmation excludes D1 development parents: ${contaminated.join(',')}`);
}

installBrowserStubs();
const Solver = createSolver();
const { prepLevel, beamSearchFromGate, SCORING_PROFILES } = SOLVER_TESTING_API;
const profile = SCORING_PROFILES[profileName];
if (!profile) throw new Error(`unknown scoring profile: ${profileName}`);
const solver = captureSolverGitState();

const corpusDoc = JSON.parse(readFileSync(path.resolve(ROOT, corpusFile), 'utf8'));
const rows = Array.isArray(corpusDoc) ? corpusDoc : corpusDoc.levels;
if (!Array.isArray(rows)) throw new Error('corpus must be an array or {levels:[...]}');
const byId = new Map(rows.map(row => [String(row.id), row]));

const parents = [];
const decisions = [];
for (const levelId of levelIds) {
    const raw = byId.get(levelId);
    if (!raw) throw new Error(`level ${levelId} missing from ${corpusFile}`);
    const { id: _id, stressMeta: _stressMeta, ...rawLevel } = raw;
    const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    const gate = level.gateKeys[0];

    const offPrep = prepLevel(level);
    offPrep._cfg = null;
    offPrep._metrics = { nodesExpanded: 0 };
    const offPath = await beamSearchFromGate(
        gate, level, offPrep, profile, budgetMs, Date.now(), null, width,
        null, false, {}, nodeBudget,
    );

    const cullRecords = [];
    const expansionByParentPath = new Map();
    const onPrep = prepLevel(level);
    onPrep._cfg = null;
    onPrep._metrics = { nodesExpanded: 0 };
    onPrep._beamResearchObserver = {
        includeParentExpansionWork: true,
        observe(record) {
            if (record.stage === 'generated') {
                for (const row of record.details?.parentExpansions ?? []) {
                    if (!Array.isArray(row.path)) continue;
                    expansionByParentPath.set(pathIdentity(row.path), {
                        workSpent: Number(row.workSpent ?? 0),
                        generatedCandidates: Number(row.generatedCandidates ?? 0),
                    });
                }
            } else if (['score-width-culled', 'mechanic-bucket-culled', 'ints-bucket-culled'].includes(record.stage)) {
                cullRecords.push(structuredClone(record));
            }
        },
    };
    const onPath = await beamSearchFromGate(
        gate, level, onPrep, profile, budgetMs, Date.now(), null, width,
        null, false, {}, nodeBudget,
    );

    const behaviorIdentical = JSON.stringify(offPath) === JSON.stringify(onPath)
        && offPrep._metrics.nodesExpanded === onPrep._metrics.nodesExpanded
        && offPrep._workMeter.units === onPrep._workMeter.units;
    if (!behaviorIdentical) throw new Error(`${levelId}: observation changed path, nodes, or canonical work`);

    let eligibleDecisions = 0;
    for (let ordinal = 0; ordinal < cullRecords.length; ordinal++) {
        const decision = beamResearchRecordToDecisionObservation(cullRecords[ordinal], { parentId: levelId, decisionOrdinal: ordinal });
        if (!decision) continue;
        const eligibility = freezeD1Eligibility(decision, level, onPrep, { cutoffRadius });
        decision.context = {
            ...decision.context,
            d1Eligibility: eligibility,
            immediateExpansionWork: Object.fromEntries(decision.retainedCandidateIds
                .filter(id => expansionByParentPath.has(id))
                .map(id => [id, expansionByParentPath.get(id)])),
        };
        decision.evidenceRole = evidenceRole;
        decision.corpus = corpusFile;
        if (eligibility.eligible) eligibleDecisions++;
        decisions.push(decision);
    }

    parents.push({
        parentId: levelId,
        evidenceRole,
        gate,
        solved: !!onPath,
        nodesExpanded: onPrep._metrics.nodesExpanded,
        workSpent: onPrep._workMeter.units,
        controlNodesExpanded: offPrep._metrics.nodesExpanded,
        controlWorkSpent: offPrep._workMeter.units,
        behaviorIdentical,
        cullDecisions: cullRecords.length,
        eligibleDecisions,
    });
}

const document = {
    schemaVersion: 1,
    kind: 'd1-production-inert-decision-capture',
    generatedAt: new Date().toISOString(),
    solver,
    corpus: corpusFile,
    levelIds,
    evidenceRole,
    independentUnit: 'parent-level',
    freezeBoundary: 'all D1 eligibility fixed from unchanged beam decision records before exact D1 annotation',
    policy: { profile: profileName, width, budgetMs, nodeBudget: Number.isFinite(nodeBudget) ? nodeBudget : null },
    eligibility: {
        cutoffRadius,
        requirements: [
            'actual cull decision',
            'candidate rank within fixed cutoff window',
            'positive remaining intersection deficit',
            'at least one nontrivial already-visited revisit candidate',
            'at least one eligible retained and one eligible culled candidate in the same decision',
        ],
    },
    parents,
    decisions,
    summary: {
        parents: parents.length,
        parityPass: parents.filter(row => row.behaviorIdentical).length,
        cullDecisions: decisions.length,
        eligibleDecisions: decisions.filter(row => row.context?.d1Eligibility?.eligible).length,
    },
};

const absolute = path.resolve(ROOT, outFile);
mkdirSync(path.dirname(absolute), { recursive: true });
writeFileSync(absolute, `${JSON.stringify(document, null, 2)}\n`);
console.log(JSON.stringify({ out: outFile, ...document.summary }, null, 2));
