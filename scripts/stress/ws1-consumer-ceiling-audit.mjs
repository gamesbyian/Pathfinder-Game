#!/usr/bin/env node
/**
 * WS1 consumer Gate 1: retained-evidence ceiling audit (reports/2026-10-02-ws1-late-continuation-consumer-design-001.md).
 * Applies the frozen 15-signature rule to every reachable attempt boundary of a production sweep result and reports how much
 * work/nodes the rule would nominate for deferral, split solved/unsolved and development/validation. No solver is run.
 * Usage: node scripts/stress/ws1-consumer-ceiling-audit.mjs [--input=<combined result.json>] [--model=<frozen model.json>] [--out=<audit.json>]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { buildActionBoundaryDataset, signatureFamilies } from '../analyze-action-selection-legal-signals.mjs';

const arg = n => process.argv.find(v => v.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;
const input = arg('input') ?? 'reports/stress/experiment-evidence/36952383630__run-36952383630__attempt-1/evidence/primary/result.json';
const modelPath = arg('model') ?? 'reports/stress/action-selection-legal-signal-frozen-model-2026-09-21.json';
const out = arg('out');

const doc = JSON.parse(readFileSync(input, 'utf8'));
const model = JSON.parse(readFileSync(modelPath, 'utf8'));
const fn = signatureFamilies[model.family];
if (!fn) throw new Error(`unknown family ${model.family}`);
const keyOf = parts => parts.join('\u001f');
const allowed = new Set(model.signatures.map(s => keyOf(s.signature ?? s)));

const attemptsById = new Map(doc.levels.map(l => [String(l.id ?? l.level), l.attempts ?? []]));
const dataset = buildActionBoundaryDataset(doc, { source: input });

const mk = () => ({ parents: new Set(), nominatedParents: new Set(), attempts: 0, nominatedAttempts: 0, work: 0, nominatedWork: 0, nodes: 0, nominatedNodes: 0,
    nominatedWinnerRows: 0, preWinnerWork: 0, nominatedPreWinnerWork: 0, perParent: new Map() });
const groups = { solved: { all: mk(), development: mk(), validation: mk() }, unsolved: { all: mk(), development: mk(), validation: mk() } };

for (const r of dataset.rows) {
    const att = attemptsById.get(r.levelId)?.[r.boundaryIndex];
    const nodes = Number.isFinite(att?.nodesExpanded) ? att.nodesExpanded : 0;
    const nominated = allowed.has(keyOf(fn(r)));
    for (const g of [groups[r.levelSolved ? 'solved' : 'unsolved'].all, groups[r.levelSolved ? 'solved' : 'unsolved'][r.split]]) {
        g.parents.add(r.levelId); g.attempts++; g.work += r.nextAttemptWork; g.nodes += nodes;
        if (r.offlinePreWinner) g.preWinnerWork += r.nextAttemptWork;
        const p = g.perParent.get(r.levelId) ?? { work: 0, nominatedWork: 0 }; p.work += r.nextAttemptWork;
        if (nominated) {
            g.nominatedAttempts++; g.nominatedWork += r.nextAttemptWork; g.nominatedNodes += nodes; g.nominatedParents.add(r.levelId); p.nominatedWork += r.nextAttemptWork;
            if (r.offlinePreWinner) g.nominatedPreWinnerWork += r.nextAttemptWork;
            if (r.offlineIsWinner) g.nominatedWinnerRows++;
        }
        g.perParent.set(r.levelId, p);
    }
}
// Stage-level view for the consumer seam audit: where the nominated work sits, and which stages produce the winners.
const byStage = {};
for (const r of dataset.rows) {
    if (!allowed.has(keyOf(fn(r)))) continue;
    const att = attemptsById.get(r.levelId)?.[r.boundaryIndex];
    const g = byStage[r.nextStage] ??= { nominatedAttempts: 0, nominatedWork: 0, nominatedNodes: 0, solvedParents: new Set(), unsolvedParents: new Set() };
    g.nominatedAttempts++; g.nominatedWork += r.nextAttemptWork; g.nominatedNodes += Number.isFinite(att?.nodesExpanded) ? att.nodesExpanded : 0;
    (r.levelSolved ? g.solvedParents : g.unsolvedParents).add(r.levelId);
}
const winnerStages = {};
for (const l of doc.levels) {
    if (!l.ok) continue;
    const a = l.attempts ?? []; const w = a.findIndex(x => x?.ok === true || x?.outcome === 'success' || x?.outcome === 'solved');
    if (w >= 0) winnerStages[a[w].stageId] = (winnerStages[a[w].stageId] ?? 0) + 1;
}
const stageIndexMedian = {};
for (const l of doc.levels) (l.attempts ?? []).forEach((a, i) => (stageIndexMedian[a.stageId] ??= []).push(i));
const share = (a, b) => b > 0 ? a / b : null;
const summarize = g => {
    const per = [...g.perParent.values()].map(p => share(p.nominatedWork, p.work) ?? 0).sort((a, b) => b - a);
    return { parents: g.parents.size, parentsWithNominated: g.nominatedParents.size, attempts: g.attempts, nominatedAttempts: g.nominatedAttempts,
        totalWork: g.work, nominatedWork: g.nominatedWork, nominatedWorkShare: share(g.nominatedWork, g.work),
        totalNodes: g.nodes, nominatedNodes: g.nominatedNodes, nominatedNodeShare: share(g.nominatedNodes, g.nodes),
        preWinnerWork: g.preWinnerWork, nominatedPreWinnerWork: g.nominatedPreWinnerWork, nominatedWinnerRows: g.nominatedWinnerRows,
        maxParentNominatedWorkShare: per[0] ?? null, parentsAbove10pctNominated: per.filter(x => x > 0.10).length };
};
const result = { schemaVersion: 1, kind: 'pathfinder-ws1-consumer-ceiling-audit', input, model: modelPath,
    solved: Object.fromEntries(Object.entries(groups.solved).map(([k, g]) => [k, summarize(g)])),
    unsolved: Object.fromEntries(Object.entries(groups.unsolved).map(([k, g]) => [k, summarize(g)])),
    nominatedByStage: Object.fromEntries(Object.entries(byStage).sort((a, b) => b[1].nominatedWork - a[1].nominatedWork).map(([k, g]) => [k,
        { nominatedAttempts: g.nominatedAttempts, nominatedWork: g.nominatedWork, nominatedNodes: g.nominatedNodes, solvedParents: g.solvedParents.size, unsolvedParents: g.unsolvedParents.size }])),
    winnerStages: Object.fromEntries(Object.entries(winnerStages).sort((a, b) => b[1] - a[1])),
    medianAttemptIndexByStage: Object.fromEntries(Object.entries(stageIndexMedian).map(([k, v]) => [k, v.sort((a, b) => a - b)[v.length >> 1]]).sort((a, b) => a[1] - b[1])) };
if (out) writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
