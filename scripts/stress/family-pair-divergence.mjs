#!/usr/bin/env node
/** Read-only differential replay for one recorded parent→variant edge. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { findFamilyResultRow } from '../family-edge-identity.mjs';
import path from 'node:path';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { FEATURES } from '../../modules/solver/ablation-config.js';
import { inverseTransformPoint, transformPoint } from '../../modules/domain/geometry.ts';
import { PACK, UNPACK } from '../../modules/domain/cell-key.ts';
import { compareAblations, comparePathTraces, compareSemanticSnapshots, scoreFlagAblation, tracePathRanks } from './divergence-lib.mjs';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--')).map(arg => {
    const [key, ...value] = arg.split('=');
    return [key, value.join('=')];
}));
for (const key of ['--parent-levels', '--variant-levels', '--manifest', '--variant-id']) {
    if (args.get(key)) continue;
    console.error('Usage: --parent-levels=<json> --variant-levels=<json> --manifest=<json> --variant-id=<id> ' +
        '[--path=k,k,...|--result=<json>] [--scoring-profile=default] [--ordering-bias=<id>] [--out=<json>]');
    process.exit(2);
}
const levelsOf = file => {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : parsed.levels ?? [];
};

const manifest = JSON.parse(readFileSync(args.get('--manifest'), 'utf8'));
const edge = manifest.variants.find(variant => String(variant.variantId) === args.get('--variant-id'));
if (!edge) throw new Error(`variant ${args.get('--variant-id')} absent from manifest`);
if ((edge.relation ?? manifest.familyMode) !== 'symmetry' && edge.witnessRelation && edge.witnessRelation !== 'exact-coordinate') {
    throw new Error(`family-pair replay requires symmetry or exact-coordinate witness relation, got ${edge.witnessRelation}`);
}

const parentRaw = levelsOf(args.get('--parent-levels')).find(level => String(level.id) === String(manifest.parentLevelId));
const variantRaw = levelsOf(args.get('--variant-levels')).find(level => String(level.id) === String(edge.variantId));
if (!parentRaw || !variantRaw) throw new Error('parent or variant level was not found');

let variantPath = args.get('--path')?.split(',').map(Number);
let observedRow = null;
if (args.get('--result')) {
    const document = JSON.parse(readFileSync(args.get('--result'), 'utf8'));
    observedRow = findFamilyResultRow(document.levels ?? document.results ?? [], { parentCorpus:manifest.parentCorpus, parentId:manifest.parentLevelId, variantId:edge.variantId });
    if (!variantPath) variantPath = observedRow?.solution ?? observedRow?.path;
}
if (!Array.isArray(variantPath)) throw new Error('no successful path supplied or found');

const transform = edge.mutationManifest?.operation === 'transform' ? Number(edge.mutationManifest.variant) : null;
if (transform !== null && (!Number.isInteger(transform) || transform < 0 || transform > 7)) {
    throw new Error(`invalid symmetry transform variant: ${edge.mutationManifest?.variant ?? 'missing'}`);
}
const parentPath = transform === null ? variantPath : variantPath.map(key => {
    const { x, y } = UNPACK(key);
    const point = inverseTransformPoint(x, y, transform, parentRaw.grid.w, parentRaw.grid.h);
    return PACK(point.x, point.y);
});

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.js');
const Solver = createSolver();
const parent = Solver.prepareLevelForSolver(parentRaw, { source: 'raw' });
const variant = Solver.prepareLevelForSolver(variantRaw, { source: 'raw' });
const winningAttempt = observedRow?.attempts?.find(attempt => attempt.ok || attempt.status === 'success') ?? null;
const scoringProfileId = args.get('--scoring-profile') ?? args.get('--profile') ?? winningAttempt?.scoringProfileId ?? winningAttempt?.profile ?? 'default';
const scoringProfile = api.SCORING_PROFILES[scoringProfileId];
if (!scoringProfile) throw new Error(`unknown scoring profile ${scoringProfileId}`);
const orderingBiasId = args.get('--ordering-bias') ?? args.get('--template') ?? winningAttempt?.orderingBiasId ?? winningAttempt?.template ?? null;
const orderingBias = orderingBiasId
    ? api.getAttemptConfigs(variant).find(config => config.scoringProfileId === scoringProfileId && config.orderingBias?.id === orderingBiasId)?.orderingBias ?? null
    : null;
if (orderingBiasId && !orderingBias) throw new Error(`ordering bias ${orderingBiasId} is not available for scoring profile ${scoringProfileId}`);

const parentPrep = api.prepLevel(parent);
const variantPrep = api.prepLevel(variant);
const trace = (level, prep, selectedPath, configOverride) => tracePathRanks({
    api, level, prep, path: selectedPath, scoringProfile, orderingBias, configOverride,
});
const leftTrace = trace(parent, parentPrep, parentPath, null);
const rightTrace = trace(variant, variantPrep, variantPath, null);
const scoreFlags = Object.keys(FEATURES).filter(flag => flag.startsWith('SCORE_'));
const leftAblations = scoreFlagAblation({
    trace: config => trace(parent, parentPrep, parentPath, config), scoreFlags, normalizeConfig: api.normalizeAblationConfig,
});
const rightAblations = scoreFlagAblation({
    trace: config => trace(variant, variantPrep, variantPath, config), scoreFlags, normalizeConfig: api.normalizeAblationConfig,
});
const validation = {
    parent: Solver.validateCandidatePath(parent, parentPath),
    variant: Solver.validateCandidatePath(variant, variantPath),
};

const mapParentKey = key => {
    if (transform === null) return key;
    const { x, y } = UNPACK(key);
    const point = transformPoint(x, y, transform, parentRaw.grid.w, parentRaw.grid.h);
    return PACK(point.tx, point.ty);
};
const replayPrefix = (level, prep, selectedPath, depth) => {
    const state = api.createState(selectedPath[0], level, prep);
    for (let i = 1; i <= depth; i++) {
        const from = state.path.at(-1), to = selectedPath[i];
        const portal = level.portalMap.get(from);
        api.applyMove(to, state, level, prep, !!(portal && !state.lastWasPortalJump && portal.dest === to));
    }
    return state;
};
const semanticAt = (level, prep, selectedPath, depth, keyMap = key => key) => {
    const state = replayPrefix(level, prep, selectedPath, depth);
    const pos = state.path.at(-1);
    const legal = api.getNeighbors(pos, state, level, prep);
    const pruneVerdicts = {};
    const scores = {};
    const curCtx = api.buildCurUrgencyContext(pos, state, level, prep, true, scoringProfile);
    for (const child of legal) {
        const candidateState = replayPrefix(level, prep, selectedPath, depth);
        const portal = level.portalMap.get(pos);
        api.applyMove(child, candidateState, level, prep, !!(portal && !candidateState.lastWasPortalJump && portal.dest === child));
        pruneVerdicts[keyMap(child)] = api.evaluatePrunedMove(child, api.getRealLengthFromState(candidateState), candidateState,
            level, prep, prep._cfg, false);
        scores[keyMap(child)] = api.scoreMove(child, pos, candidateState, level, prep, scoringProfile,
            level.reqLen - api.getRealLengthFromState(candidateState), orderingBias, curCtx);
    }
    const goalDistance = prep.distMap.get(pos) ?? null;
    const orderedPruneVerdicts = Object.fromEntries(Object.entries(pruneVerdicts).sort(([a], [b]) => Number(a) - Number(b)));
    const orderedScores = Object.fromEntries(Object.entries(scores).sort(([a], [b]) => Number(a) - Number(b)));
    return { legalCandidates: legal, mechanicMask: { mustMask: state.mustMask, mpVisitedMask: state.mpVisitedMask,
        mustCrossMask: state.mustCrossMask, flipperUsedMask: state.flipperUsedMask, surroundMask: state.surroundMask,
        mustTurnMask: state.mustTurnMask, adjTurnMask: state.adjTurnMask, lastWasPortalJump: state.lastWasPortalJump },
        lowerBounds: { goalDistance, mustPass: level.mustPassKeys.length ? api.mustPassLowerBound(pos, state, level, prep) : 0,
            mustCross: state.mustCrossMask ? api.mustCrossLowerBound(pos, state, level, prep) : 0 },
        pruneVerdicts: orderedPruneVerdicts, scoreComponents: { totalByCandidate: orderedScores },
        neutralMetrics: { intersections: state.ints, realLength: api.getRealLengthFromState(state), portalJumps: state.portalJumps },
        directionalPolicies: [orderingBias?.perimeterDir ? `perimeter:${orderingBias.perimeterDir}` : null,
            orderingBias?.sideAxis ? `side-axis:${orderingBias.sideAxis}` : null].filter(Boolean) };
};
const semanticSteps = [];
if (transform !== null && !leftTrace.error && !rightTrace.error) for (let depth = 0; depth < Math.min(parentPath.length, variantPath.length) - 1; depth++) {
    const left = semanticAt(parent, parentPrep, parentPath, depth, mapParentKey);
    const right = semanticAt(variant, variantPrep, variantPath, depth);
    const comparison = compareSemanticSnapshots(left, right, mapParentKey);
    if (!comparison.equivariant || comparison.intentionalDirectionalPolicies.length) semanticSteps.push({ depth, comparison });
}
const output = {
    schemaVersion: 1,
    parentId: manifest.parentLevelId,
    variantId: edge.variantId,
    familyId: manifest.familyId,
    relation: edge.relation ?? manifest.familyMode,
    mutation: edge.mutationManifest,
    attemptContext: {
        source: args.get('--profile') || args.get('--template') ? 'specified' : winningAttempt ? 'observed' : 'default',
        scoringProfileId,
        orderingBiasId,
    },
    pathSource: args.get('--path') ? 'explicit' : 'result',
    validation,
    comparison: comparePathTraces(leftTrace, rightTrace, { meaningfulRankDelta: Number(args.get('--meaningful-rank-delta') || 1) }),
    ablationDifferential: compareAblations(leftAblations, rightAblations),
    semanticEquivariance: { checkedPrefixes: transform === null ? 0 : Math.min(parentPath.length, variantPath.length) - 1,
        mismatchCount: semanticSteps.filter(step => !step.comparison.equivariant).length,
        firstMismatch: semanticSteps.find(step => !step.comparison.equivariant) ?? null,
        observations: semanticSteps },
};
const outputFile = args.get('--out');
if (outputFile) {
    mkdirSync(path.dirname(outputFile), { recursive: true });
    writeFileSync(outputFile, `${JSON.stringify(output, null, 2)}\n`);
} else {
    console.log(JSON.stringify(output, null, 2));
}
if (!validation.parent.ok || !validation.variant.ok) process.exitCode = 1;
