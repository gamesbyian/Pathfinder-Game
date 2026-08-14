#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const [input, selection, output] = process.argv.slice(2);
if (!input || !selection || !output) {
    console.error('Usage: select-family-result-source.mjs <migration.json> <source-file|selection-policy.json> <output.json>');
    process.exit(2);
}

const migration = JSON.parse(readFileSync(input, 'utf8'));
const edgeKey = row => `${row.parentCorpus}\u0000${row.parentId}\u0000${row.variantId}`;
const project = row => ({
    id:row.variantId, variantId:row.variantId, parentCorpus:row.parentCorpus, parentId:row.parentId,
    ok:row.ok, status:row.status, nodesExpanded:row.nodes, workSpent:row.work, elapsedMs:row.elapsedMs,
    winningConfig:row.winningConfig, sourceFile:row.sourceFile, sourceCommit:row.sourceCommit,
    sourceGeneratedAt:row.sourceGeneratedAt, sourceBudgetMs:row.sourceBudgetMs,
});

let result;
// Source artifacts and policy documents are both JSON files. Prefer an exact source-file match so
// the original three-positional-argument interface remains usable for Phase-C regeneration.
const selectsSourceFile = migration.rows.some(row => row.sourceFile === selection);
if (selectsSourceFile) {
    const rows = migration.rows.filter(row => row.sourceFile === selection).map(project);
    if (!rows.length) throw new Error(`No rows for ${selection}`);
    result = { schemaVersion:1, sourceFile:selection, levels:rows };
} else {
    const policy = JSON.parse(readFileSync(selection, 'utf8'));
    const groups = new Map();
    for (const row of migration.rows) {
        const rows = groups.get(edgeKey(row)) ?? [];
        rows.push(row);
        groups.set(edgeKey(row), rows);
    }
    const selected = [], excluded = [];
    for (const rows of groups.values()) {
        if (rows.length === 1) { selected.push(rows[0]); continue; }
        const matching = (policy.overrides ?? []).filter(rule =>
            (rule.parentCorpus === undefined || rule.parentCorpus === rows[0].parentCorpus) &&
            (rule.parentId === undefined || String(rule.parentId) === String(rows[0].parentId)) &&
            (rule.variantId === undefined || String(rule.variantId) === String(rows[0].variantId)));
        if (matching.length !== 1) throw new Error(`${edgeKey(rows[0])}: expected one selection override, found ${matching.length}`);
        const winners = rows.filter(row => row.sourceFile === matching[0].preferredSource);
        if (winners.length !== 1) throw new Error(`${edgeKey(rows[0])}: preferred source selected ${winners.length} rows`);
        selected.push(winners[0]);
        excluded.push(...rows.filter(row => row !== winners[0]).map(row => ({
            ...project(row), reason:matching[0].reason,
        })));
    }
    selected.sort((a,b) => edgeKey(a).localeCompare(edgeKey(b)));
    excluded.sort((a,b) => edgeKey(a).localeCompare(edgeKey(b)) || a.sourceFile.localeCompare(b.sourceFile));
    result = {
        schemaVersion:1,
        evidenceClass:'offline-observational-source-selection-view',
        selectionPolicy:policy,
        summary:{ inputObservations:migration.rows.length, selectedEdges:selected.length, excludedObservations:excluded.length,
            parentFamilies:new Set(selected.map(row => `${row.parentCorpus}\u0000${row.parentId}`)).size },
        excluded,
        levels:selected.map(project),
    };
}
writeFileSync(output, `${JSON.stringify(result)}\n`);
console.log(`Selected ${result.levels.length} namespaced rows -> ${output}`);
