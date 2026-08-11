#!/usr/bin/env node
/** Conservative repair rollback-window proxy over observed elites and known-valid trajectories. */
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
const outFile = args.get('--out') ?? 'reports/stress/repair-rollback-census-pilot.json';

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/Solver.ts');
const { repairSearchFromGate } = await import('../../modules/solver/repair-search.ts');
const Solver = createSolver();
const selected = readLevelsWithHints(levelsFile).filter(level => level.hints?.length > 0).slice(0, levelLimit);
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
    await repairSearchFromGate(gateKey, level, prep, api.POLICY_PROFILES.repair, 120000, Date.now(), null,
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
    census.rows.forEach((row, i) => Object.assign(row, { badness: selectedElites[i].badness,
        arrivalNodes: selectedElites[i].arrivalNodes, eliteLength: selectedElites[i].path.length - 1 }));
    levels.push({ levelId: raw.id, reqLen: level.reqLen, nodeBudget, nodesExpanded: prep._metrics.nodesExpanded,
        knownSolutions: knownSolutions.length, observedEliteArrivals: arrivals.length, selectedElites: selectedElites.length, census });
    console.error(`${raw.id}: arrivals=${arrivals.length} selected=${selectedElites.length} medianRollback=${census.medianRollbackSteps}`);
}
const allRows = levels.flatMap(level => level.census.rows);
const sortedFractions = allRows.map(row => row.rollbackFractionReqLen).sort((a, b) => a - b);
const document = { schemaVersion: 1, generatedAt: new Date().toISOString(), levelsFile,
    meaning: 'longest-common-prefix distance from observed elite to any known-valid trajectory; not minimum causal edit distance',
    summary: { levels: levels.length, elites: allRows.length,
        medianRollbackSteps: allRows.length ? [...allRows].sort((a, b) => a.rollbackSteps - b.rollbackSteps)[Math.floor(allRows.length / 2)].rollbackSteps : null,
        medianRollbackFractionReqLen: sortedFractions.length ? sortedFractions[Math.floor(sortedFractions.length / 2)] : null,
        minRollbackFractionReqLen: sortedFractions[0] ?? null, maxRollbackFractionReqLen: sortedFractions.at(-1) ?? null }, levels };
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Wrote ${outFile}`);
