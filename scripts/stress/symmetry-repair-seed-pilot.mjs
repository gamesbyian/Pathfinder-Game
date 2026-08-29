#!/usr/bin/env node
/** Matched research-seed repair control for one recorded symmetry witness edge. */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { inverseTransformPoint, transformPoint } from '../../modules/domain/geometry.ts';
import { PACK, UNPACK } from '../../modules/domain/cell-key.ts';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const [key, ...rest] = x.split('='); return [key, rest.join('=')];
}));
const parentFile = args.get('--parent-levels') ?? 'data/stress/stress-levels-random.json';
const variantFile = args.get('--variant-levels') ?? 'data/families/phaseB/R02248-symmetry.json';
const manifestFile = args.get('--manifest') ?? 'data/families/phaseB/R02248-symmetry-manifest.json';
const resultFile = args.get('--result') ?? 'reports/families/2026-07-15-R02248-symmetry-family-solve.json';
const variantId = args.get('--variant-id') ?? 'F02248-sym-02';
const researchSeed = Number(args.get('--research-seed') ?? 12345);
const nodeBudget = Number(args.get('--node-budget') ?? 100000);
const recordLimit = Number(args.get('--record-limit') ?? 2000);
const outFile = args.get('--out') ?? 'reports/stress/symmetry-repair-seed-pilot.json';
const levelsOf = file => { const x = JSON.parse(readFileSync(file, 'utf8')); return Array.isArray(x) ? x : x.levels; };

const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
const edge = manifest.variants.find(x => String(x.variantId) === variantId);
const transform = edge?.mutationManifest?.variant;
if (!edge || !Number.isInteger(transform)) throw new Error('variant edge with transform is required');
const parentRaw = levelsOf(parentFile).find(x => String(x.id) === String(manifest.parentLevelId));
const variantRaw = levelsOf(variantFile).find(x => String(x.id) === variantId);
const result = JSON.parse(readFileSync(resultFile, 'utf8')).levels.find(x => String(x.id) === variantId);
if (!parentRaw || !variantRaw || !result?.solution) throw new Error('parent, variant, or recorded solution missing');
const mapParent = key => { const { x, y } = UNPACK(key); const p = transformPoint(x, y, transform, parentRaw.grid.w, parentRaw.grid.h); return PACK(p.tx, p.ty); };
const mapVariantBack = key => { const { x, y } = UNPACK(key); const p = inverseTransformPoint(x, y, transform, parentRaw.grid.w, parentRaw.grid.h); return PACK(p.x, p.y); };
const parentGate = mapVariantBack(result.solution[0]);

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const { repairSearchFromGate } = await import('../../modules/solver/repair-search.ts');
const Solver = createSolver();
const parent = Solver.prepareLevelForSolver(parentRaw, { source: 'raw' });
const variant = Solver.prepareLevelForSolver(variantRaw, { source: 'raw' });
const run = async (level, gate) => {
    const choices = [];
    const prep = api.prepLevel(level); prep._cfg = null; prep._metrics = { nodesExpanded: 0 }; prep._repairResearchSeed = researchSeed;
    prep._repairChoiceResearchObserver = { observe: record => { if (choices.length < recordLimit) choices.push(record); } };
    const solution = await repairSearchFromGate(gate, level, prep, api.SCORING_PROFILES.repair, 120000, Date.now(), null,
        null, false, nodeBudget, {});
    return { solution, nodesExpanded: prep._metrics.nodesExpanded, choices };
};
const left = await run(parent, parentGate);
const right = await run(variant, result.solution[0]);
let firstDrawDivergence = null, firstSurvivorOrderDivergence = null, firstSameDrawDifferentChoice = null;
for (let i = 0; i < Math.min(left.choices.length, right.choices.length); i++) {
    const a = left.choices[i], b = right.choices[i];
    const mappedSurvivors = a.survivors.map(mapParent);
    const drawsEqual = JSON.stringify(a.primaryDraws) === JSON.stringify(b.primaryDraws) && a.biasDraw === b.biasDraw;
    const setsEqual = JSON.stringify([...mappedSurvivors].sort((x, y) => x - y)) === JSON.stringify([...b.survivors].sort((x, y) => x - y));
    const orderEqual = JSON.stringify(mappedSurvivors) === JSON.stringify(b.survivors);
    if (!firstDrawDivergence && !drawsEqual) firstDrawDivergence = { choice: i, left: a.primaryDraws, right: b.primaryDraws };
    if (!firstSurvivorOrderDivergence && setsEqual && !orderEqual) firstSurvivorOrderDivergence = { choice: i, mappedLeft: mappedSurvivors, right: b.survivors };
    if (!firstSameDrawDifferentChoice && drawsEqual && mapParent(a.chosen) !== b.chosen) firstSameDrawDifferentChoice = {
        choice: i, draws: a.primaryDraws, mappedLeftChosen: mapParent(a.chosen), rightChosen: b.chosen,
        survivorSetsEqual: setsEqual, survivorOrderEqual: orderEqual };
}
const document = { schemaVersion: 1, familyId: manifest.familyId, parentId: manifest.parentLevelId, variantId,
    transform, researchSeed, nodeBudget, recordedVariantWasRepairSolve: result.winningConfig?.includes('repair') ?? false,
    parent: { solved: !!left.solution, nodesExpanded: left.nodesExpanded, choicesRecorded: left.choices.length },
    variant: { solved: !!right.solution, nodesExpanded: right.nodesExpanded, choicesRecorded: right.choices.length },
    firstDrawDivergence, firstSurvivorOrderDivergence, firstSameDrawDifferentChoice,
    interpretation: 'Matched seed normalizes initial streams; survivor cardinality/order may subsequently change draw consumption or abstract choice.' };
mkdirSync(path.dirname(outFile), { recursive: true }); writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Wrote ${outFile}`);
