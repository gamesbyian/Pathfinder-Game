#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = await mkdtemp(path.join(tmpdir(), 'pathfinder-family-technique-response-'));
try {
    const parentCorpus = path.join(dir, 'parents.json');
    const variantCorpus = path.join(dir, 'variants.json');
    const manifest = path.join(dir, 'manifest.json');
    const planFile = path.join(dir, 'plan.json');
    const resultsFile = path.join(dir, 'results.json');
    const analysisFile = path.join(dir, 'analysis.json');
    const t1 = 'beam|score=default|bias=none|width=500|retention=plain';
    const t2 = 'dfs|score=default|bias=none';
    await writeFile(parentCorpus, JSON.stringify([{ id: 'P1', grid:{w:2,h:2}, gate:[0,0], goal:[1,1], reqLen:2, reqInt:0 }]));
    await writeFile(variantCorpus, JSON.stringify({ levels:[
        { id:'V1', grid:{w:2,h:2}, gate:[0,0], goal:[1,1], reqLen:2, reqInt:0 },
        { id:'V2', grid:{w:2,h:2}, gate:[0,0], goal:[1,1], reqLen:2, reqInt:0 },
    ]}));
    await writeFile(manifest, JSON.stringify({
        familyId:'family-P1-local', parentLevelId:'P1', familyMode:'local-mutant',
        variants:[
            { variantId:'V1', relation:'local-mutant', mutationManifest:{operation:'move',objectType:'block'} },
            { variantId:'V2', relation:'local-mutant', mutationManifest:{operation:'move',objectType:'mustPass'} },
        ],
    }));
    const planned = spawnSync(process.execPath, ['scripts/family-technique-response-plan.mjs',
        `--manifest=${manifest}`, `--parent-corpus=${parentCorpus}`, `--variant-corpus=${variantCorpus}`,
        `--techniques=${t1},${t2}`, '--work-budget=1000', '--budget-ms=9999', `--out=${planFile}`],
        { cwd:root, encoding:'utf8' });
    assert.equal(planned.status, 0, planned.stderr || planned.stdout);
    const plan = JSON.parse(await readFile(planFile, 'utf8'));
    assert.equal(plan.expectedCells, 6);
    assert.equal(plan.cells.length, 6);
    assert.equal(plan.equalCostAcrossTechniques, true);
    assert.ok(plan.cells.every(c => c.workBudget === 1000 && c.familyContext?.familyId === 'family-P1-local'));
    assert.ok(plan.cells.some(c => c.familyContext.role === 'variant' && c.familyContext.variantId === 'V1'));
    assert.ok(plan.cells.every(c => c.corpusFile === parentCorpus || c.corpusFile === variantCorpus));

    const row = (technique, role, variantId, ok, workSpent) => ({
        cellId:`${role}-${variantId ?? 'parent'}-${technique}`, tier:'FTR1',
        corpus:role==='parent'?'family-parent':'family-variant', techniqueKeys:[technique],
        workBudget:1000, workSpent, ok, status:ok?'success':'work-budget-reached',
        familyContext:{familyId:'family-P1-local',parentId:'P1',variantId,role,relation:'local-mutant',
            mutation:role==='variant'?{operation:'move'}:null},
    });
    await writeFile(resultsFile, JSON.stringify({results:[
        row(t1,'parent',null,false,1000), row(t2,'parent',null,false,1000),
        row(t1,'variant','V1',true,800), row(t2,'variant','V1',false,1000),
        row(t1,'variant','V2',false,1000), row(t2,'variant','V2',false,1000),
    ]}));
    const analyzed = spawnSync(process.execPath, ['scripts/analyze-family-technique-response.mjs',
        `--input=${resultsFile}`, `--out=${analysisFile}`], { cwd:root, encoding:'utf8' });
    assert.equal(analyzed.status, 0, analyzed.stderr || analyzed.stdout);
    const analysis = JSON.parse(await readFile(analysisFile, 'utf8'));
    assert.equal(analysis.summary.families, 1);
    assert.equal(analysis.summary.variants, 2);
    assert.equal(analysis.summary.edgesWithTechniqueHeterogeneity, 1);
    const v1 = analysis.families[0].edges.find(e => e.variantId === 'V1');
    assert.deepEqual(v1.gains, [t1]);
    assert.equal(v1.responses.find(r => r.technique === t2).transition, 'neither');
} finally {
    await rm(dir, { recursive:true, force:true });
}
console.log('family technique response node test: ok');
