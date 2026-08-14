#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const output = process.argv[2] ?? 'reports/experiments/2026-08-13-technique-tuning/ett-025-family-result-migration.json';
const tracked = execFileSync('git', ['ls-files'], { encoding:'utf8' }).split('\n').filter(Boolean);
const edgesByVariant = new Map();
for (const file of tracked.filter(path => /^data\/families\/.*manifest\.json$/u.test(path))) {
    const manifest = JSON.parse(readFileSync(file, 'utf8'));
    for (const variant of manifest.variants ?? []) {
        const variantId = String(variant.id ?? variant.variantId ?? '');
        if (!variantId) continue;
        const edge = { parentCorpus:manifest.parentCorpus, parentId:String(manifest.parentLevelId ?? manifest.parentId), variantId };
        const key = `${edge.parentCorpus}\u0000${edge.parentId}\u0000${edge.variantId}`;
        const candidates = edgesByVariant.get(variantId) ?? new Map(); candidates.set(key, edge); edgesByVariant.set(variantId, candidates);
    }
}

const rows = [];
for (const sourceFile of tracked.filter(path => /^(?:reports|logs)\/.*\.json$/u.test(path))) {
    let document;
    try { document = JSON.parse(readFileSync(sourceFile, 'utf8')); } catch { continue; }
    const sourceRows = Array.isArray(document) ? document
        : ['levels','results','attempts'].map(key => document?.[key]).find(Array.isArray) ?? [];
    for (const row of sourceRows.filter(value => /^F\d+/u.test(String(value?.variantId ?? value?.id ?? '')))) {
        const variantId = String(row.variantId ?? row.id);
        const candidates = [...(edgesByVariant.get(variantId)?.values() ?? [])];
        if (candidates.length !== 1) throw new Error(`${sourceFile}:${variantId}: expected one manifest edge, found ${candidates.length}`);
        const edge = candidates[0];
        rows.push({ ...edge, sourceFile,
            sourceCommit:document.commit ?? document.summary?.commit ?? null,
            sourceGeneratedAt:document.generatedAt ?? document.summary?.generatedAt ?? null,
            sourceBudgetMs:document.budgetMs ?? document.summary?.budgetMs ?? null,
            sourceNodeBudget:document.nodeBudget ?? document.summary?.nodeBudget ?? null,
            ok:Boolean(row.ok), status:row.status ?? null, nodes:Number(row.nodesExpanded ?? 0),
            work:Number(row.workSpent ?? 0), elapsedMs:Number(row.elapsedMs ?? row.totalMs ?? 0),
            winningConfig:row.winningConfig ?? null });
    }
}
const edgeKey = row => `${row.parentCorpus}\u0000${row.parentId}\u0000${row.variantId}`;
const groups = new Map();
for (const row of rows) { const values = groups.get(edgeKey(row)) ?? []; values.push(row); groups.set(edgeKey(row), values); }
const repeated = [...groups.values()].filter(values => values.length > 1);
const summary = { rows:rows.length, uniqueEdges:groups.size,
    parentFamilies:new Set(rows.map(row => `${row.parentCorpus}\u0000${row.parentId}`)).size,
    repeatedEdges:repeated.length, repeatedRows:repeated.reduce((sum, values) => sum + values.length, 0),
    maxObservationsPerEdge:Math.max(0, ...repeated.map(values => values.length)),
    solveStatusConflictEdges:repeated.filter(values => new Set(values.map(row => row.ok)).size > 1).length,
    winningConfigConflictEdges:repeated.filter(values => new Set(values.filter(row => row.ok).map(row => row.winningConfig)).size > 1).length };
const result = { schemaVersion:1, evidenceClass:'offline-observational-source-preserving-migration',
    generatedAt:new Date().toISOString(), repositoryCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
    selectionPolicy:'retain every source observation; no deduplication or preferred-run selection', summary, rows };
writeFileSync(output, `${JSON.stringify(result)}\n`);
console.log(`${JSON.stringify(summary)}\nWrote ${output}`);
