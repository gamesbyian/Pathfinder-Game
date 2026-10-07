#!/usr/bin/env node
/**
 * Build a technique-census plan for controlled parent -> variant families.
 *
 * The output deliberately reuses technique-census.mjs/technique-census-cell.mjs rather than
 * creating another solver executor. Every cell contains exactly one technique and one level under
 * the same canonical work budget, making parent/variant response differences directly comparable.
 *
 * Usage:
 *   node scripts/family-technique-response-plan.mjs \
 *     --manifest=<family-manifest.json> \
 *     --parent-corpus=<parents.json> \
 *     --variant-corpus=<variants.json> \
 *     --techniques='beam|score=default|bias=none|width=500|retention=plain,dfs|score=default|bias=none' \
 *     --work-budget=5000000 --budget-ms=600000 --out=<plan.json>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const argv = process.argv.slice(2);
const args = new Map(argv.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const i = a.indexOf('=');
    return [a.slice(0, i), a.slice(i + 1)];
}));
const required = name => {
    const value = args.get(name);
    if (!value) throw new Error(`${name}=... is required`);
    return value;
};
const positiveInt = (value, name) => {
    const n = Number(value);
    if (!Number.isSafeInteger(n) || n <= 0) throw new Error(`${name} must be a positive safe integer`);
    return n;
};
const readJson = file => JSON.parse(readFileSync(path.resolve(file), 'utf8'));
const levelsOf = doc => Array.isArray(doc) ? doc : doc?.levels;
const idOf = (level, position) => String(level?.id ?? position);

const manifestFile = required('--manifest');
const parentCorpusFile = required('--parent-corpus');
const variantCorpusFile = required('--variant-corpus');
const techniques = required('--techniques').split(',').map(x => x.trim()).filter(Boolean);
if (!techniques.length) throw new Error('--techniques must contain at least one canonical technique key');
if (new Set(techniques).size !== techniques.length) throw new Error('--techniques contains duplicates');
const workBudget = positiveInt(required('--work-budget'), '--work-budget');
const budgetMs = positiveInt(args.get('--budget-ms') ?? '600000', '--budget-ms');
const outFile = args.get('--out') ?? 'tmp/family-technique-response/plan.json';

const manifest = readJson(manifestFile);
const parentLevels = levelsOf(readJson(parentCorpusFile));
const variantLevels = levelsOf(readJson(variantCorpusFile));
if (!Array.isArray(parentLevels) || !Array.isArray(variantLevels)) throw new Error('parent/variant corpus must be an array or object with levels[]');

const parentId = String(manifest.parentLevelId ?? manifest.parentId ?? '');
if (!parentId) throw new Error('manifest lacks parentLevelId/parentId');
const familyId = String(manifest.familyId ?? `family-${parentId}`);
const relation = manifest.familyMode ?? manifest.relation ?? null;
const parentPos = parentLevels.findIndex((level, i) => idOf(level, i + 1) === parentId) + 1;
if (!parentPos) throw new Error(`parent ${parentId} was not found in ${parentCorpusFile}`);

const variantPositionById = new Map(variantLevels.map((level, i) => [idOf(level, i + 1), i + 1]));
const variants = (manifest.variants ?? []).map(v => {
    const variantId = String(v.variantId ?? v.id ?? '');
    if (!variantId) throw new Error('manifest contains a variant without variantId/id');
    const levelPos = variantPositionById.get(variantId);
    if (!levelPos) throw new Error(`variant ${variantId} was not found in ${variantCorpusFile}`);
    return { variantId, levelPos, edge: v };
});
if (!variants.length) throw new Error('manifest contains no variants');

const cells = [];
const addCell = ({ role, levelId, levelPos, corpusFile, variantId = null, edge = null, technique, techniqueIndex }) => {
    const edgeToken = role === 'parent' ? 'parent' : variantId;
    cells.push({
        cellId: `FTR1::${familyId}::${edgeToken}::t${String(techniqueIndex + 1).padStart(2, '0')}`,
        tier: 'FTR1',
        corpus: role === 'parent' ? 'family-parent' : 'family-variant',
        corpusFile,
        levelId,
        levelPos,
        techniqueKeys: [technique],
        workBudget,
        budgetMs,
        collectAttemptTelemetry: true,
        familyContext: {
            familyId,
            parentId,
            variantId,
            role,
            relation: edge?.relation ?? relation,
            witnessRelation: edge?.witnessRelation ?? null,
            mutation: edge?.mutationManifest ?? null,
        },
    });
};
for (let ti = 0; ti < techniques.length; ti++) {
    addCell({ role: 'parent', levelId: parentId, levelPos: parentPos, corpusFile: parentCorpusFile, technique: techniques[ti], techniqueIndex: ti });
    for (const v of variants) addCell({
        role: 'variant', levelId: v.variantId, levelPos: v.levelPos, corpusFile: variantCorpusFile,
        variantId: v.variantId, edge: v.edge, technique: techniques[ti], techniqueIndex: ti,
    });
}

const plan = {
    schemaVersion: 1,
    kind: 'pathfinder-family-technique-response-plan',
    generatedAt: new Date().toISOString(),
    budgetProtocol: 'family-technique-equal-work',
    equalCostAcrossTechniques: true,
    scientificUnit: 'parent-family-controlled-transformation-technique-response',
    independenceUnit: 'parent-family',
    manifestFile,
    parentCorpusFile,
    variantCorpusFile,
    familyId,
    parentId,
    relation,
    workBudget,
    budgetMs,
    techniques,
    variantCount: variants.length,
    expectedCells: (variants.length + 1) * techniques.length,
    cells,
};
mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
writeFileSync(path.resolve(outFile), JSON.stringify(plan, null, 2) + '\n');
console.log(`family-technique-response plan: family=${familyId}, variants=${variants.length}, techniques=${techniques.length}, cells=${cells.length}`);
console.log(`Plan -> ${outFile}`);
