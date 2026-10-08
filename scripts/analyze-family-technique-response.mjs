#!/usr/bin/env node
/**
 * Analyze equal-work family x technique census results into controlled response derivatives.
 *
 * Input may be one shard result or several comma-separated shard result files from technique-census.mjs.
 * Parent and variant rows are paired by familyContext + canonical technique identity.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { techniqueCensusIdentityKey } from './technique-census-result-lib.mjs';

const argv = process.argv.slice(2);
const args = new Map(argv.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const i = a.indexOf('=');
    return [a.slice(0, i), a.slice(i + 1)];
}));
const inputArg = args.get('--input');
const inputDir = args.get('--input-dir');
if (!inputArg && !inputDir) throw new Error('--input=<result.json[,result2.json,...]> or --input-dir=<directory> is required');
if (inputArg && inputDir) throw new Error('use only one of --input or --input-dir');
const outFile = args.get('--out') ?? 'tmp/family-technique-response/analysis.json';
const inputFiles = inputDir
    ? readdirSync(path.resolve(inputDir)).filter(name => /^shard-\d+\.json$/u.test(name)).sort()
        .map(name => path.join(path.resolve(inputDir), name))
    : inputArg.split(',').map(x => x.trim()).filter(Boolean);
if (!inputFiles.length) throw new Error('no input result files found');
const rows = [];
for (const file of inputFiles) {
    const doc = JSON.parse(readFileSync(path.resolve(file), 'utf8'));
    rows.push(...(doc.results ?? []));
}
if (!rows.length) throw new Error('no result rows found');

const usable = rows.filter(r => r.familyContext?.familyId && Array.isArray(r.techniqueKeys) && r.techniqueKeys.length === 1);
if (!usable.length) throw new Error('no rows carry familyContext and one isolated technique');

const duplicateKeys = new Set();
const rowByKey = new Map();
const techniqueOf = row => techniqueCensusIdentityKey(row) ?? row.techniqueKeys[0];
const keyOf = row => {
    const c = row.familyContext;
    return [c.familyId, c.role, c.variantId ?? '', techniqueOf(row)].join('\u001f');
};
for (const row of usable) {
    const key = keyOf(row);
    if (rowByKey.has(key)) duplicateKeys.add(key);
    else rowByKey.set(key, row);
}
if (duplicateKeys.size) throw new Error(`duplicate family-technique result cells: ${duplicateKeys.size}`);

const familyIds = [...new Set(usable.map(r => r.familyContext.familyId))].sort();
const classify = (parent, variant) => parent.ok
    ? (variant.ok ? 'both-solved' : 'loss')
    : (variant.ok ? 'gain' : 'neither');
const ratio = (a, b) => Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? a / b : null;

const families = [];
for (const familyId of familyIds) {
    const familyRows = usable.filter(r => r.familyContext.familyId === familyId);
    const parentRows = familyRows.filter(r => r.familyContext.role === 'parent');
    const techniques = [...new Set(parentRows.map(techniqueOf))].sort();
    const variantIds = [...new Set(familyRows.filter(r => r.familyContext.role === 'variant').map(r => r.familyContext.variantId))].sort();
    const parentByTechnique = new Map(parentRows.map(r => [techniqueOf(r), r]));
    const edges = [];
    for (const variantId of variantIds) {
        const vrows = familyRows.filter(r => r.familyContext.role === 'variant' && r.familyContext.variantId === variantId);
        const byTechnique = new Map(vrows.map(r => [techniqueOf(r), r]));
        const responses = [];
        for (const technique of techniques) {
            const parent = parentByTechnique.get(technique);
            const variant = byTechnique.get(technique);
            if (!parent || !variant) continue;
            const transition = classify(parent, variant);
            responses.push({
                technique,
                transition,
                parent: { ok: !!parent.ok, status: parent.status, workSpent: parent.workSpent ?? null, nodesExpanded: parent.nodesExpanded ?? null },
                variant: { ok: !!variant.ok, status: variant.status, workSpent: variant.workSpent ?? null, nodesExpanded: variant.nodesExpanded ?? null },
                workDelta: Number.isFinite(parent.workSpent) && Number.isFinite(variant.workSpent) ? variant.workSpent - parent.workSpent : null,
                workRatio: ratio(variant.workSpent, parent.workSpent),
            });
        }
        const sample = vrows[0]?.familyContext ?? {};
        edges.push({
            variantId,
            relation: sample.relation ?? null,
            witnessRelation: sample.witnessRelation ?? null,
            mutation: sample.mutation ?? null,
            techniquesObserved: responses.length,
            solveResponseHeterogeneous: new Set(responses.map(r => r.transition)).size > 1,
            gains: responses.filter(r => r.transition === 'gain').map(r => r.technique),
            losses: responses.filter(r => r.transition === 'loss').map(r => r.technique),
            responses,
        });
    }
    const techniqueSummary = techniques.map(technique => {
        const rs = edges.map(edge => edge.responses.find(r => r.technique === technique)).filter(Boolean);
        return {
            technique,
            edgesObserved: rs.length,
            gains: rs.filter(r => r.transition === 'gain').length,
            losses: rs.filter(r => r.transition === 'loss').length,
            bothSolved: rs.filter(r => r.transition === 'both-solved').length,
            neither: rs.filter(r => r.transition === 'neither').length,
            medianSolvedWorkRatio: (() => {
                const values = rs.filter(r => r.transition === 'both-solved' && Number.isFinite(r.workRatio)).map(r => r.workRatio).sort((a,b)=>a-b);
                if (!values.length) return null;
                const m=Math.floor(values.length/2);
                return values.length%2 ? values[m] : (values[m-1]+values[m])/2;
            })(),
        };
    });
    families.push({
        familyId,
        parentId: familyRows[0].familyContext.parentId,
        relation: familyRows[0].familyContext.relation ?? null,
        techniques,
        variants: variantIds.length,
        heterogeneousEdges: edges.filter(e => e.solveResponseHeterogeneous).length,
        techniqueSummary,
        edges,
    });
}

const parentIds = [...new Set(families.map(f => f.parentId))].sort();
const summary = {
    familyModeBlocks: families.length,
    parentFamilies: parentIds.length,
    parentIds,
    variants: families.reduce((n, f) => n + f.variants, 0),
    edgesWithTechniqueHeterogeneity: families.reduce((n, f) => n + f.heterogeneousEdges, 0),
    gainCells: families.reduce((n, f) => n + f.techniqueSummary.reduce((s, t) => s + t.gains, 0), 0),
    lossCells: families.reduce((n, f) => n + f.techniqueSummary.reduce((s, t) => s + t.losses, 0), 0),
};
const out = {
    schemaVersion: 1,
    kind: 'pathfinder-family-technique-response-analysis',
    generatedAt: new Date().toISOString(),
    inputs: inputFiles,
    interpretation: {
        derivative: 'For one independent parent family, compare one isolated technique under equal work on the parent and one controlled descendant.',
        heterogeneity: 'An edge is heterogeneous when different techniques have different solve-state transitions on the same parent->variant transformation.',
        independence: 'Variant edges and multiple transformation-mode blocks from the same parent are repeated observations within one parent family; unique parentId is the between-level independence unit.',
    },
    summary,
    families,
};
mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
writeFileSync(path.resolve(outFile), JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(summary));
console.log(`Analysis -> ${outFile}`);
