#!/usr/bin/env node
/** Reproduces census-repair-rollback-windows.mjs's exact elite selection (same inputs, same
 * deterministic output) but also dumps full packed-key paths (gate first) so prefixes can be
 * sliced at arbitrary depths for exact-minimum-rollback CP-SAT binary search (item C in
 * docs/claude-remote-solver-handoff.md). Output is local working data, not a committed artifact —
 * feed it to cpsat-explicit-prefix-round-builder.mjs to build oracle case files. */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelsWithHints } from '../level-data-io.mjs';
import { rollbackCensus } from './research-analysis-lib.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const [key, ...rest] = x.split('='); return [key, rest.join('=')];
}));
const levelsFile = args.get('--levels') ?? 'data/stress/stress-levels-random.json';
const levelLimit = Number(args.get('--limit-levels') ?? 3);
const nodeBudget = Number(args.get('--node-budget') ?? 30000);
const eliteLimit = Number(args.get('--limit-elites') ?? 5);
const outFile = args.get('--out') ?? '/tmp/elite-paths.json';
// Direct id selection (2026-08-13, repair-retreat CP-SAT broadening): lets a caller who already
// identified specific interesting levels/elites from census-repair-rollback-windows.mjs's own output
// (e.g. smallest rollbackSteps, or a specific mechanic profile) dump exactly those paths, instead of
// re-running repair search over every file-order level up to an arbitrary --limit-levels just to
// reach the ones that matter. Overrides --limit-levels entirely when present.
const onlyIds = args.has('--only') ? new Set(args.get('--only').split(',').map(s => s.trim()).filter(Boolean)) : null;

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const { repairSearchFromGate } = await import('../../modules/solver/repair-search.ts');
const Solver = createSolver();
const hintBearing = readLevelsWithHints(levelsFile).filter(level => level.hints?.length > 0);
const selected = onlyIds ? hintBearing.filter(level => onlyIds.has(level.id)) : hintBearing.slice(0, levelLimit);
const levels = [];
for (const raw of selected) {
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const gateKey = raw.hints[0][0];
    const knownSolutions = raw.hints.filter(candidate => candidate[0] === gateKey).map((candidate, i) => {
        const verdict = Solver.validateCandidatePath(level, candidate);
        if (!verdict.ok) throw new Error(`${raw.id}: hint ${i} failed canonical referee: ${verdict.reason}`);
        return { id: `${raw.id}:known:${i}`, path: candidate };
    });
    const arrivals = [];
    const prep = api.prepLevel(level); prep._cfg = null; prep._metrics = { nodesExpanded: 0 };
    prep._repairEliteResearchObserver = { observe: record => arrivals.push(record) };
    await repairSearchFromGate(gateKey, level, prep, api.SCORING_PROFILES.repair, 120000, Date.now(), null,
        null, false, nodeBudget, {});
    const unique = new Map();
    for (const record of arrivals) {
        const key = record.path.join(',');
        const prior = unique.get(key);
        if (!prior || record.badness < prior.badness) unique.set(key, record);
    }
    const selectedElites = [...unique.values()].sort((a, b) => a.badness - b.badness || b.path.length - a.path.length).slice(0, eliteLimit)
        .map((record, i) => ({ id: `${raw.id}:elite:${i}`, path: record.path, badness: record.badness,
            arrivalNodes: record.arrivalNodes, restart: record.restart }));
    const census = rollbackCensus(selectedElites, knownSolutions, level.reqLen);
    levels.push({
        levelId: raw.id, reqLen: level.reqLen, gateKey,
        elites: selectedElites.map((elite, i) => ({
            id: elite.id, badness: elite.badness, arrivalNodes: elite.arrivalNodes,
            path: elite.path, eliteLength: elite.path.length - 1,
            commonPrefixSteps: census.rows[i].commonPrefixSteps,
            rollbackSteps: census.rows[i].rollbackSteps,
            matchedSolution: census.rows[i].matchedSolution,
        })),
    });
    console.error(`${raw.id}: dumped ${selectedElites.length} elite paths`);
}
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify({ levelsFile, levels }, null, 2));
console.log(`Wrote ${outFile}`);
