#!/usr/bin/env node
/**
 * WS2-CUT-BALANCE-PROJECTION (BC1) beam later-disposition shadow collector.
 *
 * Runs the real production beam search twice per level from its first gate: once with no
 * observer (control) and once with `Bc1ShadowDispositionObserver` attached (treatment), and
 * asserts the returned path, nodesExpanded, and canonical workSpent are byte-identical between the
 * two -- the shadow's own production-inertness proof, exactly like
 * collect-known-solution-prefix-survival.mjs's existing behaviorIdentical check. See
 * reports/2026-09-21-bc1-removable-work-economics-seam-audit-001.md for the required Phase-1
 * record shape this collector fills.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelCorpusDocumentWithHints } from '../level-data-io.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const [key, ...rest] = x.split('='); return [key, rest.join('=')];
}));
const levelsFile = args.get('--levels') ?? 'data/stress/stress-levels-random.json';
const beamWidth = Number(args.get('--beam-width') ?? 5000);
const nodeBudget = Number(args.get('--node-budget') ?? 20000000);
const budgetMs = Number(args.get('--budget-ms') ?? 120000);
const outFile = args.get('--out') ?? 'reports/stress/collect-bc1-shadow-disposition.json';
const sampleResolved = Number(args.get('--sample-resolved') ?? 25);
const requestedLevelIds = (args.get('--level-ids') ?? '').split(',').map(x => x.trim()).filter(Boolean);
const runId = args.get('--run-id') ?? `bc1-shadow-disposition-${new Date().toISOString()}`;
const solverRef = process.env.GITHUB_SHA ?? execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

if (![beamWidth, nodeBudget, budgetMs].every(Number.isFinite) || beamWidth < 1 || nodeBudget < 1 || budgetMs < 1) {
    throw new Error('beam width, node budget, and budget-ms must be positive numbers');
}
if (!requestedLevelIds.length) throw new Error('--level-ids is required (comma-separated exact level ids; no implicit sampling here)');
if (new Set(requestedLevelIds).size !== requestedLevelIds.length) throw new Error('--level-ids must not contain duplicates');

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const Solver = createSolver();
const rawLevels = readLevelCorpusDocumentWithHints(levelsFile).levels;
const byId = new Map(rawLevels.map(level => [String(level.id), level]));
const missing = requestedLevelIds.filter(id => !byId.has(id));
if (missing.length) throw new Error(`--level-ids not found in ${levelsFile}: ${missing.join(', ')}`);

const rows = [];
for (const rawId of requestedLevelIds) {
    const raw = byId.get(rawId);
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const gateKey = level.gateKeys[0];

    const offPrep = api.prepLevel(level); offPrep._cfg = null; offPrep._metrics = { nodesExpanded: 0 };
    const offPath = await api.beamSearchFromGate(gateKey, level, offPrep, api.SCORING_PROFILES.default,
        budgetMs, Date.now(), null, beamWidth, null, false, {}, nodeBudget);

    const observer = new api.Bc1ShadowDispositionObserver();
    const onPrep = api.prepLevel(level); onPrep._cfg = null; onPrep._metrics = { nodesExpanded: 0 }; onPrep._beamResearchObserver = observer;
    const onPath = await api.beamSearchFromGate(gateKey, level, onPrep, api.SCORING_PROFILES.default,
        budgetMs, Date.now(), null, beamWidth, null, false, {}, nodeBudget);

    const behaviorIdentical = JSON.stringify(offPath) === JSON.stringify(onPath)
        && offPrep._metrics.nodesExpanded === onPrep._metrics.nodesExpanded
        && offPrep._workMeter.units === onPrep._workMeter.units;
    if (!behaviorIdentical) throw new Error(`${rawId}: BC1 shadow observer changed path, nodes, or canonical work -- production-inertness violated`);

    const safety = observer.checkSolutionSafety(onPath);
    if (safety.alarm) throw new Error(`${rawId}: BC1 soundness alarm -- a referee-valid solution passed through a flagged-dead prefix: ${JSON.stringify(safety.violatingPrefixes)}`);

    const summary = observer.summary();
    const resolved = summary.resolved;
    const overlapCounts = resolved.reduce((acc, r) => { acc[r.overlap] = (acc[r.overlap] ?? 0) + 1; return acc; }, {});
    const workDistances = resolved.map(r => r.workDistance).filter(w => w !== null);
    const constructionWorkUnits = resolved.map(r => r.constructionWorkUnits);

    rows.push({
        runId, solverRef, levelId: rawId, gateKey, requiredLength: level.requiredLength,
        beamWidth, nodeBudget, budgetMs,
        producer: 'beam', scoringProfileId: 'default', controlTreatment: 'observation-on',
        solved: !!onPath, nodesExpanded: onPrep._metrics.nodesExpanded, workSpent: onPrep._workMeter.units,
        controlWorkSpent: offPrep._workMeter.units, behaviorIdentical, solutionSafetyAlarm: false,
        flaggedCount: summary.flaggedCount, overlapCounts,
        totalConstructionWorkUnits: constructionWorkUnits.reduce((a, b) => a + b, 0),
        medianConstructionWorkUnits: constructionWorkUnits.length
            ? constructionWorkUnits.slice().sort((a, b) => a - b)[Math.floor(constructionWorkUnits.length / 2)] : null,
        totalWorkDistance: workDistances.reduce((a, b) => a + b, 0),
        medianWorkDistance: workDistances.length ? workDistances.slice().sort((a, b) => a - b)[Math.floor(workDistances.length / 2)] : null,
        everExpandedCount: resolved.filter(r => r.everExpanded).length,
        // Full per-candidate `resolved` (one entry per flagged prefix, each carrying its own path
        // array) is not retained: flagged counts run into the tens of thousands per level, and
        // JSON.stringify-ing every one across a multi-parent run can exceed V8's max string length.
        // A bounded sample is kept for manual inspection/reproducibility; aggregate economics above
        // are already computed over the FULL resolved population, not just this sample.
        resolvedSample: resolved.slice(0, sampleResolved),
    });
    console.error(`${rawId}: flagged=${summary.flaggedCount} solved=${!!onPath} nodes=${onPrep._metrics.nodesExpanded} overlap=${JSON.stringify(overlapCounts)}`);
}

const document = {
    schemaVersion: 1, kind: 'pathfinder-bc1-shadow-disposition', runId, solverRef,
    generatedAt: new Date().toISOString(), levelsFile, corpus: levelsFile,
    technique: 'beam BC1 later-disposition shadow observation', scoringProfileId: 'default',
    beamWidth, nodeBudget, budgetMs, levels: rows,
    summary: {
        levels: rows.length, solved: rows.filter(x => x.solved).length,
        behaviorIdentical: rows.filter(x => x.behaviorIdentical).length,
        solutionSafetyAlarms: rows.filter(x => x.solutionSafetyAlarm).length,
        totalFlagged: rows.reduce((n, x) => n + x.flaggedCount, 0),
        parentsWithAnyFlag: rows.filter(x => x.flaggedCount > 0).length,
        overlapCounts: rows.reduce((acc, x) => {
            for (const [k, v] of Object.entries(x.overlapCounts)) acc[k] = (acc[k] ?? 0) + v;
            return acc;
        }, {}),
    },
};
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Wrote ${outFile}`);
