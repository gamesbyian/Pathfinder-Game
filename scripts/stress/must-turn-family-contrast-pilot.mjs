#!/usr/bin/env node
/**
 * Matched-dose confirmation rung for the class-2 must-turn-biased repair seam.
 *
 * The family preflight found three historically 0/30 parents. R03049 is the
 * cheapest of those by prior isolated biased cost (~12.35M nodes), so this rung
 * compares plain versus must-turn-biased repair at 13M nodes on R03049 only.
 *
 * Prior rungs established matched treatment gains on R02768 at 5M/7M and R02180
 * at 7M. This 0/30-parent rung is the pre-registered confirmation step before
 * any additive orchestration integration or population scaling.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { createCellRunner } from '../technique-census-cell.mjs';

const NODE_BUDGET = 13_000_000;
const BUDGET_MS = 600_000; // wall-safety only; nodeBudget is decision-bearing.
const CORPUS_PATH = 'data/stress/stress-levels-random.json';
const TARGET_IDS = ['R03049'];
const TECHNIQUES = [
    { label: 'plain', key: 'repair|score=repair|guidance=standard' },
    { label: 'must-turn-biased', key: 'repair|score=repair|guidance=must-turn-biased' },
];

const arg = name => process.argv.slice(2).find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const outPath = arg('out') ?? 'tmp/must-turn-family-contrast-pilot.json';
const corpusRaw = JSON.parse(readFileSync(CORPUS_PATH, 'utf8'));
const levels = Array.isArray(corpusRaw) ? corpusRaw : corpusRaw.levels;
const positions = new Map(levels.map((level, index) => [level.id, index + 1]));
for (const id of TARGET_IDS) if (!positions.has(id)) throw new Error(`target ${id} not found in ${CORPUS_PATH}`);

const rows = [];
for (const id of TARGET_IDS) {
    for (const technique of TECHNIQUES) {
        const { runCell } = await createCellRunner();
        const row = await runCell({
            cellId: `${id}:${technique.label}:13m-dose`,
            tier: 'must-turn-family-rigid-confirmation-rung',
            corpus: 'corpus2',
            levelPos: positions.get(id),
            techniqueKeys: [technique.key],
            nodeBudget: NODE_BUDGET,
            budgetMs: BUDGET_MS,
            variantLabel: technique.label,
            pairLabel: id,
            collectAttemptTelemetry: true,
        });
        rows.push(row);
        process.stdout.write(`${id} ${technique.label}: ${row.ok ? 'SOLVED' : row.status} nodes=${row.nodesExpanded}\n`);
    }
}

const plain = rows.find(row => row.variantLabel === 'plain');
const biased = rows.find(row => row.variantLabel === 'must-turn-biased');
const result = {
    schemaVersion: 1,
    purpose: '13M matched-node confirmation on historically 0/30 family parent before additive integration',
    sourceCommit: process.env.GITHUB_SHA ?? null,
    corpus: 'corpus2',
    nodeBudgetPerCell: NODE_BUDGET,
    wallSafetyMsPerCell: BUDGET_MS,
    targetIds: TARGET_IDS,
    familyPreflight: { R03049: { historicalSiblingSolved: 0, historicalSiblingTotal: 30, class: 'family-rigid-0-of-30' } },
    priorEvidence: {
        R02768: { familySiblingSolved: '5/30', matchedGainAt5M: true, biasedNodes: 1_179_294 },
        R02180: { familySiblingSolved: '1/30', matchedGainAt7M: true, biasedNodes: 6_206_072 },
        R03049: { historicalBiasedNodes: 12_345_609 },
    },
    summary: {
        R03049: {
            plain: { ok: plain.ok, status: plain.status, nodesExpanded: plain.nodesExpanded, refereeValid: plain.refereeValid },
            mustTurnBiased: { ok: biased.ok, status: biased.status, nodesExpanded: biased.nodesExpanded, refereeValid: biased.refereeValid },
            treatmentGainAtMatchedNodeDose: biased.ok && !plain.ok,
        },
    },
    rows,
};

mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`result=${outPath}\n`);
