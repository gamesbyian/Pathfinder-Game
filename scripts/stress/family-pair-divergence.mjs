#!/usr/bin/env node
/** Read-only differential replay for one recorded parent→variant edge. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { FEATURES } from '../ablation-config.mjs';
import { inverseTransformPoint } from '../../modules/domain/geometry.ts';
import { PACK, UNPACK } from '../../modules/domain/cell-key.ts';
import { compareAblations, comparePathTraces, scoreFlagAblation, tracePathRanks } from './divergence-lib.mjs';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--')).map(arg => {
    const [key, ...value] = arg.split('=');
    return [key, value.join('=')];
}));
for (const key of ['--parent-levels', '--variant-levels', '--manifest', '--variant-id']) {
    if (args.get(key)) continue;
    console.error('Usage: --parent-levels=<json> --variant-levels=<json> --manifest=<json> --variant-id=<id> ' +
        '[--path=k,k,...|--result=<json>] [--profile=default] [--template=<id>] [--out=<json>]');
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
    observedRow = (document.levels ?? document.results ?? []).find(row => String(row.id ?? row.levelId) === String(edge.variantId)) ?? null;
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
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/Solver.js');
const Solver = createSolver();
const parent = Solver.prepareLevelForSolver(parentRaw, { source: 'raw' });
const variant = Solver.prepareLevelForSolver(variantRaw, { source: 'raw' });
const winningAttempt = observedRow?.attempts?.find(attempt => attempt.ok || attempt.status === 'success') ?? null;
const profileName = args.get('--profile') || winningAttempt?.profile || 'default';
const profile = api.POLICY_PROFILES[profileName];
if (!profile) throw new Error(`unknown profile ${profileName}`);
const templateId = args.get('--template') ?? winningAttempt?.template ?? null;
const template = templateId
    ? api.getAttemptConfigs(variant).find(config => config.profileName === profileName && config.template?.id === templateId)?.template ?? null
    : null;
if (templateId && !template) throw new Error(`template ${templateId} is not available for profile ${profileName}`);

const parentPrep = api.prepLevel(parent);
const variantPrep = api.prepLevel(variant);
const trace = (level, prep, selectedPath, configOverride) => tracePathRanks({
    api, level, prep, path: selectedPath, profile, template, configOverride,
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
const output = {
    schemaVersion: 1,
    parentId: manifest.parentLevelId,
    variantId: edge.variantId,
    familyId: manifest.familyId,
    relation: edge.relation ?? manifest.familyMode,
    mutation: edge.mutationManifest,
    attemptContext: {
        source: args.get('--profile') || args.get('--template') ? 'specified' : winningAttempt ? 'observed' : 'default',
        profile: profileName,
        template: templateId,
    },
    pathSource: args.get('--path') ? 'explicit' : 'result',
    validation,
    comparison: comparePathTraces(leftTrace, rightTrace, { meaningfulRankDelta: Number(args.get('--meaningful-rank-delta') || 1) }),
    ablationDifferential: compareAblations(leftAblations, rightAblations),
};
const outputFile = args.get('--out');
if (outputFile) {
    mkdirSync(path.dirname(outputFile), { recursive: true });
    writeFileSync(outputFile, `${JSON.stringify(output, null, 2)}\n`);
} else {
    console.log(JSON.stringify(output, null, 2));
}
if (!validation.parent.ok || !validation.variant.ok) process.exitCode = 1;
