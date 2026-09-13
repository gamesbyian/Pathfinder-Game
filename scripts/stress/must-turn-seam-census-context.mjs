#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import { techniqueCensusIdentityKey } from '../technique-census-result-lib.mjs';

const SOURCE = 'reports/stress/technique-census/33717910218/combined-cells.json';
const IDS = new Set(['R02180', 'R02367', 'R02459', 'R02768', 'R02849', 'R03049', 'R03056']);
const document = JSON.parse(readFileSync(SOURCE, 'utf8'));
const rows = (document.results ?? [])
    .filter(row => row.tier === 'T1' && IDS.has(row.levelId) && row.techniqueKeys?.length === 1)
    .map(row => ({
        levelId: row.levelId,
        levelPos: row.levelPos,
        technique: techniqueCensusIdentityKey(row),
        ok: row.ok,
        status: row.status,
        nodesExpanded: row.nodesExpanded,
        workSpent: row.workSpent ?? null,
        nodeBudget: row.nodeBudget ?? null,
        workBudget: row.workBudget ?? null,
        variantLabel: row.variantLabel ?? null,
        ablation: row.ablation ?? null,
    }))
    .sort((a, b) => a.levelId.localeCompare(b.levelId) || a.technique.localeCompare(b.technique));

const repairRows = rows.filter(row => row.technique?.startsWith('repair|'));
const byLevel = Object.fromEntries([...IDS].sort().map(id => [id, repairRows.filter(row => row.levelId === id)]));
const output = { schemaVersion: 1, source: SOURCE, totalT1Rows: rows.length, repairRows: repairRows.length, byLevel };
const out = process.argv.find(arg => arg.startsWith('--out='))?.slice(6) ?? 'tmp/must-turn-seam-census-context.json';
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(output, null, 2)}\n`);
for (const [id, levelRows] of Object.entries(byLevel)) {
    console.log(id);
    for (const row of levelRows) console.log(`  ${row.technique} ok=${row.ok} nodes=${row.nodesExpanded} status=${row.status} nodeBudget=${row.nodeBudget} workBudget=${row.workBudget}`);
}
