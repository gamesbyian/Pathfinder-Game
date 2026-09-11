#!/usr/bin/env node
/**
 * Cross-action recurrence probe for bounded first-loss phenotyping (WS2 gate 4 / capability-map
 * remaining gate). Reuses divergence-lib's tracePathRanks (the shared DFS-greedy per-step ranking
 * primitive already used by hint-divergence.mjs/witness-divergence.mjs) to check whether the SAME
 * scorer disfavors known-live labels at/around the depth where
 * scripts/stress/collect-known-solution-prefix-survival.mjs already found a beam score-width cull.
 *
 * DFS commits greedily to the top-ranked move at each step (no beam retention). A low rank here
 * means DFS would readily follow the label at that step; a high rank recurring at the same depth
 * as the beam's own score-width cull is cross-action (beam-retention vs DFS-ordering) recurrence
 * evidence that the SAME scorer-driven mis-valuation is responsible, not a beam-retention-specific
 * artifact (rank-retention-loss narrows to WS4/beam-config; a DFS-shared mis-rank stays a scoring
 * vocabulary question, still technique-level per the operating model unless repair also recurs).
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/first-loss-dfs-rank-crosscheck.mjs -- \
 *     --beam-survival=reports/stress/first-loss-pilot-beam-width2000-001.json \
 *     --out=reports/stress/first-loss-dfs-rank-crosscheck-001.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelsWithHints } from '../level-data-io.mjs';
import { tracePathRanks } from './divergence-lib.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const [key, ...rest] = x.split('='); return [key, rest.join('=')];
}));
const beamSurvivalFile = args.get('--beam-survival') ?? 'reports/stress/first-loss-pilot-beam-width2000-001.json';
const levelsFile = args.get('--levels') ?? 'data/stress/stress-levels-random.json';
const outFile = args.get('--out') ?? 'reports/stress/first-loss-dfs-rank-crosscheck-001.json';
const sampleLabels = Number(args.get('--sample-labels') ?? 5);
const profileId = args.get('--scoring-profile') ?? 'default';

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const Solver = createSolver();

const beamResult = JSON.parse(readFileSync(beamSurvivalFile, 'utf8'));
const cullDepthById = new Map(beamResult.levels.map(r => [r.levelId, r.survival.finalSupportLoss?.depth ?? null]));

const levels = readLevelsWithHints(levelsFile);
const byId = new Map(levels.map(l => [String(l.id), l]));

const out = [];
for (const [id, cullDepth] of cullDepthById) {
    const raw = byId.get(id);
    if (!raw) { console.error(`${id}: not found in ${levelsFile}`); continue; }
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const prep = api.prepLevel(level); prep._cfg = null;
    const valid = raw.hints.filter(candidate => Solver.validateCandidatePath(level, candidate).ok);
    const byGate = new Map();
    for (const p of valid) { const list = byGate.get(p[0]) ?? []; list.push(p); byGate.set(p[0], list); }
    const [gateKey, labels] = [...byGate.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    const sample = labels.slice(0, sampleLabels);
    const traces = sample.map(candidatePath => tracePathRanks({ api, level, prep, path: candidatePath, scoringProfile: api.SCORING_PROFILES[profileId] }));
    const validTraces = traces.filter(t => !t.error);
    const rankAtCullDepth = cullDepth ? validTraces.map(t => t.perStep[cullDepth - 1]?.rank ?? null).filter(r => r != null) : [];
    const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const row = {
        levelId: id, gateKey, sampledLabels: sample.length, invalidTraces: traces.length - validTraces.length,
        beamScoreWidthCullDepth: cullDepth,
        meanDfsRankAtCullDepth: mean(rankAtCullDepth),
        meanDfsMaxStepRank: mean(validTraces.map(t => t.maxStepRank)),
        meanDfsCumulativeDiscrepancy: mean(validTraces.map(t => t.cumulativeDiscrepancy)),
        worstRankedStepsSample: validTraces[0]?.worstRankedSteps?.slice(0, 3) ?? null,
    };
    out.push(row);
    console.error(`${id}: cullDepth=${cullDepth} meanDfsRankAtCull=${row.meanDfsRankAtCullDepth} meanMaxStepRank=${row.meanDfsMaxStepRank}`);
}
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(),
    beamSurvivalFile, levelsFile, scoringProfileId: profileId, sampleLabels,
    purpose: 'cross-action recurrence check: DFS-greedy per-step rank of the same known-live labels at/around the beam score-width-cull depth',
    rows: out }, null, 2)}\n`);
console.log(`Wrote ${outFile}`);
