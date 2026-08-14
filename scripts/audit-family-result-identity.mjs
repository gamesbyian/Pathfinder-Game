#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const output = process.argv[2] ?? 'reports/experiments/2026-08-13-technique-tuning/ett-024-family-identity-audit.json';
const tracked = execFileSync('git', ['ls-files'], { encoding:'utf8' }).split('\n').filter(Boolean);
const manifestFiles = tracked.filter(file => /^data\/families\/.*manifest\.json$/u.test(file));
const edgesByVariant = new Map();
for (const file of manifestFiles) {
    const manifest = JSON.parse(readFileSync(file, 'utf8'));
    for (const variant of manifest.variants ?? []) {
        const variantId = String(variant.id ?? variant.variantId ?? '');
        if (!variantId) continue;
        const edge = { parentCorpus:manifest.parentCorpus ?? null,
            parentId:String(manifest.parentLevelId ?? manifest.parentId ?? ''), variantId, manifest:file };
        const key = `${edge.parentCorpus}\u0000${edge.parentId}\u0000${edge.variantId}`;
        const rows = edgesByVariant.get(variantId) ?? new Map(); rows.set(key, edge); edgesByVariant.set(variantId, rows);
    }
}

const documents = [];
const ambiguityExamples = [];
for (const file of tracked.filter(path => /^(?:reports|logs)\/.*\.json$/u.test(path))) {
    let document;
    try { document = JSON.parse(readFileSync(file, 'utf8')); } catch { continue; }
    const rows = Array.isArray(document) ? document
        : ['levels','results','attempts'].map(key => document?.[key]).find(Array.isArray) ?? [];
    const familyRows = rows.filter(row => /^F\d+/u.test(String(row?.variantId ?? row?.id ?? '')));
    if (!familyRows.length) continue;
    const counts = { rows:familyRows.length, unique:0, ambiguous:0, unmatched:0 };
    for (const row of familyRows) {
        const variantId = String(row.variantId ?? row.id);
        const candidates = [...(edgesByVariant.get(variantId)?.values() ?? [])];
        if (candidates.length === 1) counts.unique++;
        else if (candidates.length === 0) counts.unmatched++;
        else {
            counts.ambiguous++;
            if (ambiguityExamples.length < 25) ambiguityExamples.push({ file, variantId, candidates });
        }
    }
    documents.push({ file, ...counts, sourceCorpus:document.corpus ?? document.summary?.corpus ?? null });
}
const totals = documents.reduce((sum, row) => ({ rows:sum.rows+row.rows, unique:sum.unique+row.unique,
    ambiguous:sum.ambiguous+row.ambiguous, unmatched:sum.unmatched+row.unmatched }),
{ rows:0, unique:0, ambiguous:0, unmatched:0 });
const result = { schemaVersion:1, evidenceClass:'offline-observational-identity-migration',
    generatedAt:new Date().toISOString(), repositoryCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
    method:'global exact variant-id join against all tracked family manifests; no filename/context fallback and no solver invocation',
    manifestFiles:manifestFiles.length, distinctVariantIds:edgesByVariant.size, totals, documents,
    ambiguityExamples, disposition:totals.ambiguous || totals.unmatched
        ? 'migration required: globally unique rows may be namespaced mechanically, but ambiguous and unmatched rows must be resolved from authenticated context or excluded'
        : 'all detected rows resolve globally uniquely; generate a namespaced migration artifact before boundary analysis' };
writeFileSync(output, `${JSON.stringify(result)}\n`);
console.log(`${result.disposition}\n${JSON.stringify(totals)}\nWrote ${output}`);
