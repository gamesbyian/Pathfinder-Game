#!/usr/bin/env node
/**
 * Capture ordinary beam rank/retain decisions for the D1 production-inert evidence gate.
 *
 * This command never runs D1/CP-SAT. It first runs an observer-OFF control, then repeats the exact
 * same beam attempt with research observation enabled. Eligibility is frozen from the observed
 * production decision before any exact D1 result exists.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { createSolver, SOLVER_TESTING_API } from '../../modules/solver.js';
import { captureSolverGitState } from '../experiment-manifest-lib.mjs';
import { loadResearchQuestionRegistry } from '../research-question-relations-lib.mjs';
import { getLevelFingerprint } from '../../modules/domain/level-fingerprint.js';
import { beamResearchRecordToDecisionObservation } from '../solver-decision-observation-lib.mjs';
import {
    buildD1ResearchBlock,
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
const mechanicBucketRetention = String(arg('mechanic-bucket-retention', 'false')).toLowerCase() === 'true';
const listConfiguredBeams = argv.includes('--list-configured-beams');
const budgetMs = Number(arg('budget-ms', 600_000));
const nodeBudget = Number(arg('node-budget', Number.POSITIVE_INFINITY));
const pauseAfterPhasesRaw = arg('pause-after-phases', null);
const pauseAfterPhases = pauseAfterPhasesRaw == null ? undefined : Number(pauseAfterPhasesRaw);
const cutoffRadius = Number(arg('cutoff-radius', 2));
const evidenceRole = arg('evidence-role', 'development');
const executionBoundary = arg('execution-boundary', 'isolated-beam');
const questionId = arg('question-id', 'WS2-D1-PRODUCTION-INERT-OBSERVATION');
const requestedBlockId = arg('block-id', null);
const outFile = arg('out', null);

if (!outFile && !listConfiguredBeams) throw new Error('--out is required unless --list-configured-beams is used');
if (!levelIds.length) throw new Error('--levels must contain at least one level id');
if (new Set(levelIds).size !== levelIds.length) throw new Error('--levels contains duplicate level ids');
if (!Number.isFinite(width) || width < 1) throw new Error('--width must be positive');
if (!Number.isFinite(budgetMs) || budgetMs <= 0) throw new Error('--budget-ms must be positive');
if (!(Number.isFinite(nodeBudget) || nodeBudget === Number.POSITIVE_INFINITY) || nodeBudget <= 0) throw new Error('--node-budget must be positive');
if (pauseAfterPhases !== undefined && (!Number.isInteger(pauseAfterPhases) || pauseAfterPhases < 1)) {
    throw new Error('--pause-after-phases must be a positive integer');
}
if (!Number.isInteger(cutoffRadius) || cutoffRadius < 0) throw new Error('--cutoff-radius must be a non-negative integer');
if (!['isolated-beam', 'production-orchestration'].includes(executionBoundary)) {
    throw new Error('--execution-boundary must be isolated-beam or production-orchestration');
}
if (evidenceRole !== 'development' && executionBoundary !== 'production-orchestration') {
    throw new Error('confirmation/transfer capture requires --execution-boundary=production-orchestration');
}
const questionRegistry = loadResearchQuestionRegistry(ROOT);
if (!questionRegistry.questions.some(question => question.id === questionId)) {
    throw new Error(`unknown --question-id: ${questionId}`);
}

installBrowserStubs();
const Solver = createSolver();
const { prepLevel, beamSearchFromGate, SCORING_PROFILES, getAttemptConfigs, attemptConfigKey } = SOLVER_TESTING_API;
const profile = SCORING_PROFILES[profileName];
if (!profile) throw new Error(`unknown scoring profile: ${profileName}`);
const solver = captureSolverGitState();

const corpusBytes = readFileSync(path.resolve(ROOT, corpusFile));
const corpusDoc = JSON.parse(corpusBytes.toString('utf8'));
const sourceRevision = `sha256:${createHash('sha256').update(corpusBytes).digest('hex')}`;
const rows = Array.isArray(corpusDoc) ? corpusDoc : corpusDoc.levels;
if (!Array.isArray(rows)) throw new Error('corpus must be an array or {levels:[...]}');
const byId = new Map(rows.map(row => [String(row.id), row]));

const parents = [];
const parentContentIdentities = [];
const decisions = [];
for (const levelId of levelIds) {
    const raw = byId.get(levelId);
    if (!raw) throw new Error(`level ${levelId} missing from ${corpusFile}`);
    const parentContentIdentity = await getLevelFingerprint(raw);
    parentContentIdentities.push(parentContentIdentity);
    const { id: _id, stressMeta: _stressMeta, ...rawLevel } = raw;
    const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    const gate = level.gateKeys[0];
    const configuredBeams = getAttemptConfigs(level, null)
        .filter(config => Number.isFinite(config.beamWidth))
        .map((config, index) => ({
            index,
            key: attemptConfigKey(config),
            scoringProfileId: config.scoringProfileId,
            beamWidth: config.beamWidth,
            mechanicBucketRetention: !!config.mechanicBucketRetention,
            orderingBias: config.orderingBias?.id ?? null,
            minBudgetFraction: config.minBudgetFraction ?? null,
        }));
    if (listConfiguredBeams) {
        parents.push({ parentId: levelId, configuredBeams });
        continue;
    }
    const matchingAttempt = configuredBeams.find(config =>
        config.scoringProfileId === profileName
        && config.beamWidth === width
        && config.mechanicBucketRetention === mechanicBucketRetention
        && config.orderingBias === null);
    if (executionBoundary === 'isolated-beam' && !matchingAttempt) {
        throw new Error(`${levelId}: requested beam is not in current production attempt policy; configured beams=${JSON.stringify(configuredBeams)}`);
    }

    const cullRecords = [];
    const expansionByAttemptAndParentPath = new Map();
    const observer = {
        includeParentExpansionWork: true,
        observe(record) {
            const attemptOrdinal = record.attemptContext?.attemptOrdinal ?? -1;
            if (record.stage === 'generated') {
                for (const row of record.details?.parentExpansions ?? []) {
                    if (!Array.isArray(row.path)) continue;
                    expansionByAttemptAndParentPath.set(`${attemptOrdinal}:${pathIdentity(row.path)}`, {
                        workSpent: Number(row.workSpent ?? 0),
                        generatedCandidates: Number(row.generatedCandidates ?? 0),
                    });
                }
            } else if (['score-width-culled', 'mechanic-bucket-culled', 'ints-bucket-culled'].includes(record.stage)) {
                cullRecords.push(JSON.parse(JSON.stringify(record)));
            }
        },
    };

    let behaviorIdentical;
    let solved;
    let nodesExpanded;
    let workSpent;
    let controlNodesExpanded;
    let controlWorkSpent;
    let attemptTelemetry = [];
    let eligibilityPrep;

    if (executionBoundary === 'production-orchestration') {
        const commonOpts = {
            timeBudgetMs: budgetMs,
            nodeBudget,
            lifecycleTelemetry: true,
        };
        const offResult = await Solver.solveLevel(level, commonOpts);
        const onResult = await Solver.solveLevel(level, { ...commonOpts, beamResearchObserver: observer });
        const stableAttempts = result => (result.attempts ?? []).map(attempt => ({
            gateKey: attempt.gateKey,
            stageId: attempt.stageId,
            scoringProfileId: attempt.scoringProfileId,
            orderingBiasId: attempt.orderingBiasId ?? null,
            beamWidth: attempt.beamWidth ?? null,
            mechanicBucketRetention: !!attempt.mechanicBucketRetention,
            ok: attempt.ok,
            outcome: attempt.outcome,
            nodesExpanded: attempt.nodesExpanded,
            workSpent: attempt.workSpent ?? null,
        }));
        behaviorIdentical = JSON.stringify(offResult.solution) === JSON.stringify(onResult.solution)
            && offResult.nodesExpanded === onResult.nodesExpanded
            && offResult.workSpent === onResult.workSpent
            && JSON.stringify(stableAttempts(offResult)) === JSON.stringify(stableAttempts(onResult));
        if (!behaviorIdentical) throw new Error(`${levelId}: orchestration observation changed path, attempt outcomes, nodes, or canonical work`);
        solved = onResult.ok;
        nodesExpanded = onResult.nodesExpanded;
        workSpent = onResult.workSpent ?? null;
        controlNodesExpanded = offResult.nodesExpanded;
        controlWorkSpent = offResult.workSpent ?? null;
        attemptTelemetry = onResult.attempts ?? [];
        eligibilityPrep = prepLevel(level);
        eligibilityPrep._cfg = null;
        eligibilityPrep._metrics = { nodesExpanded: 0 };
    } else {
        const offPrep = prepLevel(level);
        offPrep._cfg = null;
        offPrep._metrics = { nodesExpanded: 0 };
        const offPath = await beamSearchFromGate(
            gate, level, offPrep, profile, budgetMs, Date.now(), null, width,
            null, mechanicBucketRetention, {}, nodeBudget, undefined, pauseAfterPhases,
        );

        const onPrep = prepLevel(level);
        onPrep._cfg = null;
        onPrep._metrics = { nodesExpanded: 0 };
        onPrep._beamResearchObserver = observer;
        const onPath = await beamSearchFromGate(
            gate, level, onPrep, profile, budgetMs, Date.now(), null, width,
            null, mechanicBucketRetention, {}, nodeBudget, undefined, pauseAfterPhases,
        );

        behaviorIdentical = JSON.stringify(offPath) === JSON.stringify(onPath)
            && offPrep._metrics.nodesExpanded === onPrep._metrics.nodesExpanded
            && offPrep._workMeter.units === onPrep._workMeter.units;
        if (!behaviorIdentical) throw new Error(`${levelId}: observation changed path, nodes, or canonical work`);
        solved = !!onPath;
        nodesExpanded = onPrep._metrics.nodesExpanded;
        workSpent = onPrep._workMeter.units;
        controlNodesExpanded = offPrep._metrics.nodesExpanded;
        controlWorkSpent = offPrep._workMeter.units;
        eligibilityPrep = onPrep;
    }

    let eligibleDecisions = 0;
    for (let ordinal = 0; ordinal < cullRecords.length; ordinal++) {
        const record = cullRecords[ordinal];
        const decision = beamResearchRecordToDecisionObservation(record, { parentId: levelId, decisionOrdinal: ordinal });
        if (!decision) continue;
        const eligibility = freezeD1Eligibility(decision, level, eligibilityPrep, { cutoffRadius });
        const attemptOrdinal = record.attemptContext?.attemptOrdinal ?? -1;
        const attempt = attemptOrdinal >= 0 ? attemptTelemetry[attemptOrdinal] ?? null : null;
        decision.context = {
            ...decision.context,
            d1Eligibility: eligibility,
            orchestrationAttempt: record.attemptContext ? {
                ...record.attemptContext,
                stageId: attempt?.stageId ?? null,
                outcome: attempt?.outcome ?? null,
                attemptWorkSpent: attempt?.workSpent ?? null,
                attemptNodesExpanded: attempt?.nodesExpanded ?? null,
            } : null,
            immediateExpansionWork: Object.fromEntries(decision.retainedCandidateIds.map(id => {
                const key = `${attemptOrdinal}:${id}`;
                return [
                    id,
                    expansionByAttemptAndParentPath.has(key)
                        ? { status: 'observed', ...expansionByAttemptAndParentPath.get(key) }
                        : { status: 'not-observed-before-termination', workSpent: null, generatedCandidates: null },
                ];
            })),
        };
        decision.evidenceRole = evidenceRole;
        decision.corpus = corpusFile;
        if (eligibility.eligible) eligibleDecisions++;
        decisions.push(decision);
    }

    parents.push({
        parentId: levelId,
        parentContentIdentity,
        evidenceRole,
        gate,
        configuredAttempt: executionBoundary === 'isolated-beam' ? matchingAttempt : null,
        solved,
        nodesExpanded,
        workSpent,
        controlNodesExpanded,
        controlWorkSpent,
        behaviorIdentical,
        pausedAtPhaseBoundary: executionBoundary === 'isolated-beam' ? (pauseAfterPhases ?? null) : null,
        orchestrationAttemptCount: attemptTelemetry.length,
        cullDecisions: cullRecords.length,
        eligibleDecisions,
    });
}

if (listConfiguredBeams) {
    console.log(JSON.stringify({ corpus: corpusFile, levelIds, parents }, null, 2));
    process.exit(0);
}

const { populationIdentity, researchBlock } = buildD1ResearchBlock({
    blockId: requestedBlockId,
    questionId,
    corpus: corpusFile,
    sourceRevision,
    evidenceRole,
    parentIds: levelIds,
    parentContentIdentities,
    captureArtifact: outFile,
    runRef: null,
});

const document = {
    schemaVersion: 1,
    kind: 'd1-production-inert-decision-capture',
    generatedAt: new Date().toISOString(),
    solver,
    corpus: corpusFile,
    sourceRevision,
    levelIds,
    populationIdentity,
    researchBlock,
    evidenceRole,
    independentUnit: 'parent-level',
    executionBoundary: executionBoundary === 'production-orchestration'
        ? 'full current production solveLevel orchestration with observer OFF/ON parity; beam records joined to actual attempt telemetry by attempt ordinal'
        : 'isolated current-policy beam configuration; policy membership verified, full orchestration reach/allocation not reproduced',
    freezeBoundary: 'all D1 eligibility fixed from unchanged beam decision records before exact D1 annotation',
    policy: {
        executionBoundary,
        profile: executionBoundary === 'isolated-beam' ? profileName : null,
        width: executionBoundary === 'isolated-beam' ? width : null,
        mechanicBucketRetention: executionBoundary === 'isolated-beam' ? mechanicBucketRetention : null,
        budgetMs,
        nodeBudget: Number.isFinite(nodeBudget) ? nodeBudget : null,
        pauseAfterPhases: pauseAfterPhases ?? null,
    },
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
