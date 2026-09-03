#!/usr/bin/env node
/** Compare successful-path rankings with ordinary goal attraction enabled versus disabled. */
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { comparePathTraces, tracePathRanks } from './stress/divergence-lib.mjs';

const args = new Map(process.argv.slice(2).filter(v => v.startsWith('--') && v.includes('='))
    .map(v => { const [k, ...rest] = v.split('='); return [k, rest.join('=')]; }));
const rescueIds = (args.get('--rescues') ?? 'R00355').split(',').filter(Boolean);
const controlIds = (args.get('--controls') ?? 'R00094,R00108,R00118,R00137,R00143,R00153').split(',').filter(Boolean);
const outFile = args.get('--out');

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../modules/solver.js');
const Solver = createSolver();
const corpusRaw = JSON.parse(readFileSync('data/stress/stress-levels-random.json', 'utf8'));
const corpus = Array.isArray(corpusRaw) ? corpusRaw : corpusRaw.levels;

function matchingPath(levelId, expectDisabled) {
    const document = JSON.parse(readFileSync(`data/stress/hints-random/${levelId}.json`, 'utf8'));
    const matches = [];
    for (const hint of document.hints ?? []) for (const provenance of hint.provenance ?? []) {
        const solver = provenance.solver ?? {};
        const disabled = solver.forcing?.disabledFeatures?.includes('SCORE_GOAL_ATTRACTION') === true;
        if (solver.technique === 'beam' && solver.scoringProfileId === 'intersectionHarvest'
            && solver.beamWidth === 5000 && disabled === expectDisabled) matches.push({ hint, provenance });
    }
    if (!matches.length) throw new Error(`${levelId}: no matching ${expectDisabled ? 'disabled' : 'enabled'} goal-attraction beam witness`);
    return matches.at(-1);
}

const rows = [];
for (const [role, ids, expectDisabled] of [['rescue', rescueIds, true], ['control', controlIds, false]]) for (const levelId of ids) {
    const raw = corpus.find(level => level.id === levelId);
    if (!raw) throw new Error(`${levelId}: absent from Corpus 2`);
    const { id: _id, stressMeta: _stressMeta, ...levelRecord } = raw;
    const level = Solver.prepareLevelForSolver(levelRecord, { source: 'raw' });
    const { hint, provenance } = matchingPath(levelId, expectDisabled);
    const scoringProfile = api.SCORING_PROFILES.intersectionHarvest;
    const trace = configOverride => tracePathRanks({ api, level, prep: api.prepLevel(level), path: hint.path,
        scoringProfile, configOverride });
    const enabled = trace(api.normalizeAblationConfig({ SCORE_GOAL_ATTRACTION: true }));
    const disabled = trace(api.normalizeAblationConfig({ SCORE_GOAL_ATTRACTION: false }));
    const comparison = comparePathTraces(enabled, disabled);
    rows.push({ levelId, role, witnessExpectedGoalAttractionDisabled: expectDisabled,
        witnessNodesExpanded: provenance.search?.nodesExpanded ?? null,
        enabledDiscrepancy: enabled.cumulativeDiscrepancy, disabledDiscrepancy: disabled.cumulativeDiscrepancy,
        disabledMinusEnabled: disabled.cumulativeDiscrepancy - enabled.cumulativeDiscrepancy,
        firstMeaningfulDivergence: comparison.firstMeaningfulDivergence });
}
const roles = Object.fromEntries(['rescue', 'control'].map(role => {
    const subset = rows.filter(row => row.role === role);
    return [role, { n: subset.length, disabledRanksPathBetter: subset.filter(row => row.disabledMinusEnabled < 0).length,
        disabledRanksPathWorse: subset.filter(row => row.disabledMinusEnabled > 0).length,
        tied: subset.filter(row => row.disabledMinusEnabled === 0).length,
        meanDelta: subset.reduce((sum, row) => sum + row.disabledMinusEnabled, 0) / subset.length }];
}));
const output = { schemaVersion: 1, evidenceRole: 'development-shadow',
    prespecification: { success: 'disabled guidance ranks rescue paths better and enabled guidance ranks unrelated control paths better with a recurring first-divergence pattern',
        stop: 'mixed directions, no rescue/control separation, or only selected-level recovery' }, roles, rows };
const rendered = `${JSON.stringify(output, null, 2)}\n`;
if (outFile) writeFileSync(outFile, rendered); else process.stdout.write(rendered);
