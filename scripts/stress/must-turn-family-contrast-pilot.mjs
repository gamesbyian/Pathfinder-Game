#!/usr/bin/env node
/**
 * Four-cell information-value pilot for the class-2 must-turn-biased repair seam.
 *
 * Compare the current plain late-repair primitive against the exact isolated
 * must-turn-biased repair action at the shipped late-tier dose (5M nodes) on
 * the two family-preflight contrast parents:
 *   R02768 — historically family-responsive (5/30 sibling solves)
 *   R02180 — historically family-rigid (1/30 sibling solves)
 *
 * This does not change orchestration. It asks the cheaper prerequisite question:
 * can the changed action recover either parent inside the bounded dose that a
 * future additive late tier would actually receive?
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { createCellRunner } from '../technique-census-cell.mjs';

const NODE_BUDGET = 5_000_000;
const BUDGET_MS = 600_000; // wall-safety only; nodeBudget is the decision-bearing bound.
const CORPUS_PATH = 'data/stress/stress-levels-random.json';
const TARGET_IDS = ['R02768', 'R02180'];
const TECHNIQUES = [
    { label: 'plain', key: 'repair|score=repair|guidance=standard' },
    { label: 'must-turn-biased', key: 'repair|score=repair|guidance=must-turn-biased' },
];

const arg = name => process.argv.slice(2).find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const outPath = arg('out') ?? 'tmp/must-turn-family-contrast-pilot.json';
const corpusRaw = JSON.parse(readFileSync(CORPUS_PATH, 'utf8'));
const levels = Array.isArray(corpusRaw) ? corpusRaw : corpusRaw.levels;

const positions = new Map(levels.map((level, index) => [level.id, index + 1]));
for (const id of TARGET_IDS) {
    if (!positions.has(id)) throw new Error(`target ${id} not found in ${CORPUS_PATH}`);
}

const rows = [];
for (const id of TARGET_IDS) {
    for (const technique of TECHNIQUES) {
        // Fresh prep/runner per cell keeps the pilot independent of prior cell state while
        // reusing the canonical census execution boundary.
        const { runCell } = await createCellRunner();
        const row = await runCell({
            cellId: `${id}:${technique.label}:late-dose`,
            tier: 'must-turn-family-contrast-pilot',
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

const byId = Object.fromEntries(TARGET_IDS.map(id => {
    const plain = rows.find(row => row.levelId === id && row.variantLabel === 'plain');
    const biased = rows.find(row => row.levelId === id && row.variantLabel === 'must-turn-biased');
    return [id, {
        plain: { ok: plain.ok, status: plain.status, nodesExpanded: plain.nodesExpanded, refereeValid: plain.refereeValid },
        mustTurnBiased: { ok: biased.ok, status: biased.status, nodesExpanded: biased.nodesExpanded, refereeValid: biased.refereeValid },
        treatmentGainAtMatchedNodeDose: biased.ok && !plain.ok,
    }];
}));

const result = {
    schemaVersion: 1,
    purpose: 'bounded-matched-node prerequisite for additive late must-turn-biased repair integration',
    sourceCommit: process.env.GITHUB_SHA ?? null,
    corpus: 'corpus2',
    nodeBudgetPerCell: NODE_BUDGET,
    wallSafetyMsPerCell: BUDGET_MS,
    targetIds: TARGET_IDS,
    techniqueKeys: Object.fromEntries(TECHNIQUES.map(row => [row.label, row.key])),
    familyPreflight: {
        R02768: { historicalSiblingSolved: 5, historicalSiblingTotal: 30, class: 'family-responsive' },
        R02180: { historicalSiblingSolved: 1, historicalSiblingTotal: 30, class: 'family-rigid' },
    },
    summary: byId,
    rows,
};

mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`result=${outPath}\n`);
