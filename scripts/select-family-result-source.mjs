#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const [input, sourceFile, output] = process.argv.slice(2);
if (!input || !sourceFile || !output) {
    console.error('Usage: select-family-result-source.mjs <migration.json> <source-file> <output.json>');
    process.exit(2);
}
const migration = JSON.parse(readFileSync(input, 'utf8'));
const rows = migration.rows.filter(row => row.sourceFile === sourceFile).map(row => ({
    id:row.variantId, variantId:row.variantId, parentCorpus:row.parentCorpus, parentId:row.parentId,
    ok:row.ok, status:row.status, nodesExpanded:row.nodes, workSpent:row.work, elapsedMs:row.elapsedMs,
    winningConfig:row.winningConfig, sourceFile:row.sourceFile, sourceCommit:row.sourceCommit,
    sourceGeneratedAt:row.sourceGeneratedAt, sourceBudgetMs:row.sourceBudgetMs,
}));
if (!rows.length) throw new Error(`No rows for ${sourceFile}`);
writeFileSync(output, `${JSON.stringify({ schemaVersion:1, sourceFile, levels:rows })}\n`);
console.log(`Selected ${rows.length} namespaced rows from ${sourceFile} -> ${output}`);
