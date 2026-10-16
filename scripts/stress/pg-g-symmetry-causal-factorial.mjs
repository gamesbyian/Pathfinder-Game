#!/usr/bin/env node
/**
 * PG-G selected-pair causal test for symmetry-sensitive search ordering and repair seed identity.
 *
 * Research-only. Production behavior remains unchanged unless the caller explicitly sets the
 * PrepLevel research hooks used here.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { inverseTransformPoint, transformPoint } from '../../modules/domain/geometry.ts';
import { PACK, UNPACK } from '../../modules/domain/cell-key.ts';
import { getLevelFingerprint } from '../../modules/domain/level-fingerprint.ts';
import { repairPrimarySeed } from '../../modules/solver/repair-search.ts';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { makeAttemptConfigKeyParser } from '../attempt-config-key.mjs';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--')).map(arg => {
    const eq = arg.indexOf('=');
    return eq < 0 ? [arg, 'true'] : [arg.slice(0, eq), arg.slice(eq + 1)];
}));
const required = key => {
    const value = args.get(key);
    if (!value) throw new Error(`${key}=... is required`);
    return value;
};

const specFile = path.resolve(required('--spec'));
const microscopeSpecFile = path.resolve(args.get('--microscope-spec')
    ?? 'reports/2026-10-15-pg-g-symmetry-ordering-microscope-spec-001.json');
const historicalRoot = path.resolve(required('--historical-root'));
const parentRoot = path.resolve(args.get('--parent-root') ?? '.');
const outFile = path.resolve(args.get('--out') ?? 'tmp/pg-g-symmetry-causal-factorial/result.json');
const spec = JSON.parse(readFileSync(specFile, 'utf8'));
const microscopeSpec = JSON.parse(readFileSync(microscopeSpecFile, 'utf8'));

let historicalHead;
try {
    historicalHead = execFileSync('git', ['-C', historicalRoot, 'rev-parse', 'HEAD'], { encoding:'utf8' }).trim();
} catch (error) {
    throw new Error(`cannot verify historical dataset git identity: ${error?.message ?? error}`);
}
if (historicalHead !== spec.historicalDatasetRef) {
    throw new Error(`historical dataset mismatch: expected ${spec.historicalDatasetRef}, got ${historicalHead}`);
}
const currentHead = (() => {
    try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding:'utf8' }).trim(); }
    catch { return 'local'; }
})();

const levelsOf = file => {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    const levels = Array.isArray(parsed) ? parsed : parsed?.levels;
    if (!Array.isArray(levels)) throw new Error(`${file} has no level array`);
    return levels;
};
const idOf = level => String(level?.id ?? '');
const sameArray = (a, b) => a.length === b.length && a.every((value, i) => value === b[i]);

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.js');
const { STRUCTURAL_ORDERING_BIASES, SCORING_PROFILES } = await import('../../modules/solver/policy.js');
const Solver = createSolver();
const parseAttemptConfigKey = makeAttemptConfigKeyParser({
    STRUCTURAL_ORDERING_BIASES,
    SCORING_PROFILES,
    attemptConfigKey: api.attemptConfigKey,
});

function mapParentKey(key, orientation, parentRaw) {
    const { x, y } = UNPACK(key);
    const { tx, ty } = transformPoint(x, y, orientation, parentRaw.grid.w, parentRaw.grid.h);
    return PACK(tx, ty);
}
function unmapVariantKey(key, orientation, parentRaw) {
    const { x, y } = UNPACK(key);
    const p = inverseTransformPoint(x, y, orientation, parentRaw.grid.w, parentRaw.grid.h);
    return PACK(p.x, p.y);
}
function parentFrameDirectionRank(from, candidate, orientation, parentRaw) {
    const a = UNPACK(unmapVariantKey(from, orientation, parentRaw));
    const b = UNPACK(unmapVariantKey(candidate, orientation, parentRaw));
    const dx = b.x - a.x, dy = b.y - a.y;
    if (dx === 1 && dy === 0) return 0;   // E
    if (dx === -1 && dy === 0) return 1;  // W
    if (dx === 0 && dy === 1) return 2;   // S
    if (dx === 0 && dy === -1) return 3;  // N
    return 4; // forced portal jumps are singletons; keep any unexpected non-cardinal ties stable
}
function makeParentFrameOrderKey(orientation, parentRaw) {
    return (from, candidate) => parentFrameDirectionRank(from, candidate, orientation, parentRaw);
}
function applyNext(level, prep, state, next) {
    const pos = state.path.at(-1);
    const portal = level.portalMap.get(pos);
    api.applyMove(next, state, level, prep, !!(portal && !state.lastWasPortalJump && portal.dest === next));
}

const familyCache = new Map();
async function loadCase(item) {
    if (familyCache.has(item.id)) return familyCache.get(item.id);
    const base = `family-${item.parentId}-${item.familyToken}`;
    const manifestFile = path.join(historicalRoot, 'data', 'families', `${base}-manifest.json`);
    const variantFile = path.join(historicalRoot, 'data', 'families', `${base}.json`);
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
    const edge = (manifest.variants ?? []).find(row => String(row.variantId) === String(item.variantId));
    if (!edge) throw new Error(`${item.id}: variant absent from manifest`);
    if ((edge.relation ?? manifest.familyMode) !== 'symmetry') throw new Error(`${item.id}: expected symmetry relation`);
    const orientation = Number(edge.mutationManifest?.variant);
    if (!Number.isInteger(orientation) || orientation < 0 || orientation > 7) {
        throw new Error(`${item.id}: invalid symmetry orientation`);
    }
    const parentFile = path.resolve(parentRoot, manifest.parentCorpus);
    const parentRaw = levelsOf(parentFile).find(level => idOf(level) === String(item.parentId));
    const variantRaw = levelsOf(variantFile).find(level => idOf(level) === String(item.variantId));
    if (!parentRaw || !variantRaw) throw new Error(`${item.id}: parent or variant raw level missing`);
    const currentParentHash = await getLevelFingerprint(parentRaw);
    if (manifest.parentContentHash && currentParentHash !== manifest.parentContentHash) {
        throw new Error(`${item.id}: current parent content does not match historical manifest`);
    }
    const loaded = { item, manifest, edge, orientation, parentRaw, variantRaw, parentContentHash:currentParentHash };
    familyCache.set(item.id, loaded);
    return loaded;
}

async function verifyEquivariantOrder(loaded) {
    const source = (microscopeSpec.cases ?? []).find(row => row.id === loaded.item.id);
    if (!source?.variantPath?.length) throw new Error(`${loaded.item.id}: frozen microscope path missing`);
    const variantPath = source.variantPath.map(Number);
    const parentPath = variantPath.map(key => unmapVariantKey(key, loaded.orientation, loaded.parentRaw));
    const parent = Solver.prepareLevelForSolver(loaded.parentRaw, { source:'raw' });
    const variant = Solver.prepareLevelForSolver(loaded.variantRaw, { source:'raw' });
    const pv = Solver.validateCandidatePath(parent, parentPath);
    const vv = Solver.validateCandidatePath(variant, variantPath);
    if (!pv.ok || !vv.ok) throw new Error(`${loaded.item.id}: frozen mapped path is no longer referee-valid`);
    const parentPrep = api.prepLevel(parent);
    const variantPrep = api.prepLevel(variant);
    variantPrep._candidateOrderResearchKey = makeParentFrameOrderKey(loaded.orientation, loaded.parentRaw);
    const ps = api.createState(parentPath[0], parent, parentPrep);
    const vs = api.createState(variantPath[0], variant, variantPrep);
    let checked = 0;
    for (let depth = 0; depth < variantPath.length - 1; depth++) {
        const ppos = ps.path.at(-1), vpos = vs.path.at(-1);
        const mappedPos = mapParentKey(ppos, loaded.orientation, loaded.parentRaw);
        if (mappedPos !== vpos) throw new Error(`${loaded.item.id}: mapped position drift at depth ${depth}`);
        const mappedParent = api.getNeighbors(ppos, ps, parent, parentPrep)
            .map(key => mapParentKey(key, loaded.orientation, loaded.parentRaw));
        const orderedVariant = api.getNeighbors(vpos, vs, variant, variantPrep);
        if (!sameArray(mappedParent, orderedVariant)) {
            throw new Error(`${loaded.item.id}: parent-frame order hook mismatch at depth ${depth}: mapped=[${mappedParent}] variant=[${orderedVariant}]`);
        }
        applyNext(parent, parentPrep, ps, parentPath[depth + 1]);
        applyNext(variant, variantPrep, vs, variantPath[depth + 1]);
        checked++;
    }
    return checked;
}

function armUsesOrder(arm) { return arm === 'order' || arm === 'combined'; }
function armUsesSeed(arm) { return arm === 'seed' || arm === 'combined'; }
function techniqueIsRepair(technique) { return technique.startsWith('repair|'); }

async function runIsolated(rawLevel, technique, {
    arm = 'control',
    orientation = 0,
    parentRaw = rawLevel,
    variant = false,
} = {}) {
    const level = Solver.prepareLevelForSolver(rawLevel, { source:'raw' });
    const prep = api.prepLevel(level);
    prep._cfg = null;
    prep._metrics = { nodesExpanded:0 };
    prep._attemptBudgetTelemetry = true;
    prep._forcedFirstStepKey = null;
    prep._forcedPortalExitKey = null;
    if (armUsesOrder(arm)) prep._candidateOrderResearchKey = makeParentFrameOrderKey(orientation, parentRaw);
    const workStart = prep._workMeter.units;
    const absoluteWorkCap = workStart + Number(spec.workBudget);
    prep._workCap = absoluteWorkCap;
    // Admissible-order / IDA deliberately ignores the historical soft _workCap and obeys
    // _strictWorkCap inside its hot loop. Match technique-census-cell.mjs's proven equal-work
    // contract exactly so this selected-pair experiment cannot silently give IDA hundreds of
    // millions of extra work while DFS/repair stop at the nominal 10M dose.
    prep._strictWorkCap = absoluteWorkCap;
    const config = parseAttemptConfigKey(technique);
    const attempts = [];
    let solution = null;
    let winningGate = null;
    let deadlineTruncated = false;
    const gateSeeds = [];
    const startMs = Date.now();

    for (const gateKey of level.gateKeys) {
        const spent = prep._workMeter.units - workStart;
        if (spent >= spec.workBudget) break;
        if (armUsesSeed(arm) && techniqueIsRepair(technique)) {
            const parentGate = variant ? unmapVariantKey(gateKey, orientation, parentRaw) : gateKey;
            prep._repairResearchSeed = repairPrimarySeed(parentGate, 0);
        } else {
            prep._repairResearchSeed = null;
        }
        gateSeeds.push({
            gateKey,
            productionSeed:repairPrimarySeed(gateKey, 0),
            researchSeed:prep._repairResearchSeed ?? null,
        });
        const result = await api.runAttempt(
            gateKey, level, prep, config, Number(spec.budgetMs), Date.now(), null, Infinity,
        );
        attempts.push({ gateKey, ...result.attempt });
        if (result.path) {
            solution = result.path;
            winningGate = gateKey;
            break;
        }
        if (result.attempt?.outcome === 'timed-out') {
            const workReached = prep._workMeter.units - workStart >= spec.workBudget;
            if (!workReached) {
                deadlineTruncated = true;
                break;
            }
        }
    }
    const workSpent = prep._workMeter.units - workStart;
    const validation = solution ? Solver.validateCandidatePath(level, solution) : null;
    if (solution && !validation?.ok) throw new Error(`referee rejected ${technique} ${arm} solution`);
    const status = solution ? 'success'
        : deadlineTruncated ? 'deadline-truncated'
        : workSpent >= spec.workBudget ? 'work-budget-reached'
        : 'exhausted';
    return {
        arm,
        technique,
        ok:!!solution,
        status,
        workSpent,
        nodesExpanded:prep._metrics.nodesExpanded,
        totalMs:Date.now() - startMs,
        deadlineTruncated,
        validDeterministicEvidence:!deadlineTruncated && workSpent <= spec.workBudget * 1.01,
        workCapOvershoot:Math.max(0, workSpent - spec.workBudget),
        winningGate,
        gateSeeds,
        attempts,
        solution,
    };
}

function comparison(parent, variant) {
    const bothSolved = parent.ok && variant.ok;
    const workRatio = bothSolved && parent.workSpent > 0 ? variant.workSpent / parent.workSpent : null;
    return {
        solveStateMatches:parent.ok === variant.ok,
        exactStatusMatches:parent.status === variant.status,
        workRatioVariantOverParent:workRatio,
        logWorkGap:workRatio && workRatio > 0 ? Math.abs(Math.log(workRatio)) : null,
        workDelta:variant.workSpent - parent.workSpent,
    };
}

const orderChecks = [];
for (const item of spec.cases ?? []) {
    const loaded = await loadCase(item);
    const checkedPrefixes = await verifyEquivariantOrder(loaded);
    orderChecks.push({ id:item.id, checkedPrefixes });
}

const parentCache = new Map();
const rows = [];
for (const item of spec.cases ?? []) {
    const loaded = await loadCase(item);
    for (const technique of item.techniques ?? []) {
        const parentKey = `${item.parentId}::${technique}`;
        let parent = parentCache.get(parentKey);
        if (!parent) {
            parent = await runIsolated(loaded.parentRaw, technique, {
                arm:'control', orientation:0, parentRaw:loaded.parentRaw, variant:false,
            });
            parentCache.set(parentKey, parent);
        }
        const arms = techniqueIsRepair(technique)
            ? ['control', 'order', 'seed', 'combined']
            : ['control', 'order'];
        const variants = {};
        for (const arm of arms) {
            variants[arm] = await runIsolated(loaded.variantRaw, technique, {
                arm, orientation:loaded.orientation, parentRaw:loaded.parentRaw, variant:true,
            });
        }
        const comparisons = Object.fromEntries(arms.map(arm => [arm, comparison(parent, variants[arm])]));
        rows.push({
            caseId:item.id,
            parentId:item.parentId,
            variantId:item.variantId,
            orientation:loaded.orientation,
            transformKind:loaded.edge.mutationManifest?.kind ?? null,
            parentContentHash:loaded.parentContentHash,
            expectedControlSignal:item.expectedControlSignal,
            technique,
            parentControl:parent,
            variantArms:variants,
            comparisons,
        });
    }
}

const invalid = rows.flatMap(row => Object.values(row.variantArms)
    .filter(run => !run.validDeterministicEvidence)
    .map(run => `${row.caseId}::${row.technique}::${run.arm}`));
for (const [key, run] of parentCache) if (!run.validDeterministicEvidence) invalid.push(`parent::${key}`);
if (invalid.length) throw new Error(`invalid equal-work observations (deadline or >1% work-cap overshoot): ${invalid.join(', ')}`);

const solveCliffs = rows.filter(row => !row.comparisons.control.solveStateMatches);
const workOnlyControls = rows.filter(row => row.comparisons.control.solveStateMatches
    && row.parentControl.ok && row.variantArms.control.ok);
const aggregate = {
    cases:spec.cases.length,
    techniquePairRows:rows.length,
    uniqueParentTechniqueControls:parentCache.size,
    orderCanaryPrefixes:orderChecks.reduce((sum, row) => sum + row.checkedPrefixes, 0),
    controlSolveStateCliffs:solveCliffs.length,
    solveCliffsResolvedByOrder:solveCliffs.filter(row => row.comparisons.order?.solveStateMatches).length,
    repairSolveCliffsResolvedBySeed:solveCliffs.filter(row => row.comparisons.seed?.solveStateMatches).length,
    repairSolveCliffsResolvedByCombined:solveCliffs.filter(row => row.comparisons.combined?.solveStateMatches).length,
    workOnlyControlRows:workOnlyControls.length,
};
const output = {
    schemaVersion:1,
    kind:'pathfinder-pg-g-symmetry-causal-factorial-result',
    generatedAt:new Date().toISOString(),
    sourceRef:currentHead,
    historicalDatasetRef:historicalHead,
    sourceSpec:path.relative(process.cwd(), specFile),
    microscopeSpec:path.relative(process.cwd(), microscopeSpecFile),
    evidenceRole:spec.evidenceRole,
    selection:spec.selection,
    workBudget:spec.workBudget,
    budgetMs:spec.budgetMs,
    orderChecks,
    aggregate,
    rows,
};
mkdirSync(path.dirname(outFile), { recursive:true });
writeFileSync(outFile, JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(aggregate));
