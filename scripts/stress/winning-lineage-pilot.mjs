#!/usr/bin/env node
/** Bounded real-beam winning-lineage pilot. Known solutions label observation only. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelsWithHints } from '../level-data-io.mjs';
import { classifyScoreWidthExtinction } from './research-analysis-lib.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const [key, ...rest] = x.split('='); return [key, rest.join('=')];
}));
const levelsFile = args.get('--levels') ?? 'data/stress/stress-levels-random.json';
const limit = Number(args.get('--limit-levels') ?? 8);
const beamWidth = Number(args.get('--beam-width') ?? 100);
const nodeBudget = Number(args.get('--node-budget') ?? 100000);
const outFile = args.get('--out') ?? 'reports/stress/winning-lineage-pilot.json';
const includeStages = args.has('--include-stages');
const metadataFile = args.get('--metadata');
const retainAllRemovalDetails = args.has('--retain-all-removal-details');
const runId = args.get('--run-id') ?? `winning-lineage-${new Date().toISOString()}`;
const solverRef = process.env.GITHUB_SHA ?? execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
const familyDefinitionVersion = 'structural-solution-family-v1';
if (![limit, beamWidth, nodeBudget].every(Number.isFinite) || limit < 1 || beamWidth < 1 || nodeBudget < 1) {
    throw new Error('limits, beam width, and node budget must be positive numbers');
}

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const Solver = createSolver();
const rawLevels = readLevelsWithHints(levelsFile);
const solutionBearing = rawLevels.filter(level => level.hints?.length > 0);
let selected;
let selection = 'first levels with stored hints; densest-label gate';
let metadataColdById = null;
if (metadataFile) {
    const metadata = JSON.parse(readFileSync(metadataFile, 'utf8'));
    const coldById = new Map((metadata.results ?? metadata.levels ?? []).map(row => [String(row.levelId ?? row.id), !!row.coldSolved]));
    metadataColdById = coldById;
    const labelled = solutionBearing.filter(level => coldById.has(String(level.id)));
    const solved = labelled.filter(level => coldById.get(String(level.id)));
    const unsolved = labelled.filter(level => !coldById.get(String(level.id)));
    const solvedTake = Math.min(solved.length, Math.floor(limit / 2));
    selected = [...solved.slice(0, solvedTake), ...unsolved.slice(0, limit - solvedTake)];
    selection = `stratified by ${metadataFile} coldSolved; solved first then unsolved; densest-label gate`;
}
selected ??= solutionBearing.slice(0, limit);
const rows = [];
for (const raw of selected) {
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const valid = [];
    for (let i = 0; i < raw.hints.length; i++) {
        const candidate = raw.hints[i];
        const verdict = Solver.validateCandidatePath(level, candidate);
        if (!verdict.ok) throw new Error(`${raw.id}: stored hint ${i} failed canonical referee: ${verdict.reason}`);
        valid.push({ path: candidate, provenance: JSON.stringify(raw.hintRecords?.[i]?.provenance ?? []),
            family: api.structuralSolutionFamilySignature(candidate, level.mustCrossKeys) });
    }
    const byGate = new Map();
    for (const label of valid) {
        const list = byGate.get(label.path[0]) ?? []; list.push(label); byGate.set(label.path[0], list);
    }
    // One deterministic gate per level keeps the pilot cheap. Labels from other gates cannot
    // support this cold search and are deliberately excluded rather than counted as extinct.
    const [gateKey, labels] = [...byGate.entries()].sort((a, b) => b[1].length - a[1].length || a[0] - b[0])[0];
    const offPrep = api.prepLevel(level); offPrep._cfg = null; offPrep._metrics = { nodesExpanded: 0 };
    const offPath = await api.beamSearchFromGate(gateKey, level, offPrep, api.POLICY_PROFILES.default,
        120000, Date.now(), null, beamWidth, null, false, {}, nodeBudget);
    const observer = new api.WinningLineageObserver(new api.WinningPrefixIndex(labels), { retainAllRemovalDetails });
    const onPrep = api.prepLevel(level); onPrep._cfg = null; onPrep._metrics = { nodesExpanded: 0 }; onPrep._beamResearchObserver = observer;
    const onPath = await api.beamSearchFromGate(gateKey, level, onPrep, api.POLICY_PROFILES.default,
        120000, Date.now(), null, beamWidth, null, false, {}, nodeBudget);
    const behaviorIdentical = JSON.stringify(offPath) === JSON.stringify(onPath) && offPrep._metrics.nodesExpanded === onPrep._metrics.nodesExpanded;
    if (!behaviorIdentical) throw new Error(`${raw.id}: observer changed path or nodes`);
    const lineage = observer.summary(level.reqLen);
    rows.push({ runId, solverRef, levelId: raw.id, coldSolved: metadataColdById?.get(String(raw.id)) ?? null,
        gateKey, validLabels: labels.length, reqLen: level.reqLen, beamWidth, nodeBudget,
        producer: 'beam', profile: 'default', seed: null, controlTreatment: 'observation-on',
        solved: !!onPath, nodesExpanded: onPrep._metrics.nodesExpanded, behaviorIdentical, lineage });
    console.error(`${raw.id}: labels=${labels.length} solved=${!!onPath} nodes=${onPrep._metrics.nodesExpanded}`);
}
const forensic = rows.map(row => {
    const loss = row.lineage.finalSupportLoss;
    if (!loss || loss.lossCause !== 'score-width-culled') return null;
    const removal = [...(row.lineage.stages ?? [])].reverse().find(stage => stage.depth === loss.depth && stage.stage === 'score-width-culled');
    const supported = removal?.details?.supportedPool ?? [];
    const ranks = supported.map(x => x.rank), scores = supported.map(x => x.score);
    const margin = scores.length ? Math.min(...scores.map(score => removal.details.cutoffScore - score)) : null;
    const tied = margin === 0;
    // D is deliberately narrow: saturation alone must not hide a materially mis-ranked path.
    // Require a >2x pool, a best rank still close to the boundary, and a modest (but not B-small)
    // score miss. Far-below-cutoff candidates remain A even when the pool is crowded.
    const widthSaturated = removal?.details?.poolCandidateCount >= beamWidth * 2;
    const classification = classifyScoreWidthExtinction({ margin, tied,
        stableOrderAdmission: removal.details.stableOrderAdmission,
        poolSize: removal?.details?.poolCandidateCount ?? 0, beamWidth,
        bestRank: ranks.length ? Math.min(...ranks) : Number.POSITIVE_INFINITY });
    return { levelId: row.levelId, solved: row.solved, depth: loss.depth,
        normalizedDepth: loss.depth / Math.max(1, row.reqLen),
        beamWidth, candidatePoolSize: removal?.details?.poolCandidateCount ?? null,
        knownSupportedCandidates: supported.length,
        structuralWinningFamilies: removal?.details?.supportedPoolFamilies ?? 0,
        bestKnownRank: ranks.length ? Math.min(...ranks) : null, worstKnownRank: ranks.length ? Math.max(...ranks) : null,
        cutoffScore: removal?.details?.cutoffScore ?? null, knownSupportedScores: [...new Set(scores)], scoreMarginToCutoff: margin,
        firstCulledScore: removal?.details?.firstCulledScore ?? null,
        candidatesTiedAtCutoff: removal?.details?.equalScoreAtCutoff ?? null,
        knownSupportTiedAtCutoff: tied, stableOrderAdmission: removal?.details?.stableOrderAdmission ?? null,
        supportedInsertionOrders: supported.map(x => x.insertionOrder),
        directionalOrderInvolvement: 'not determinable from the production cull record', widthSaturated,
        structuralFamiliesAroundCutoff: removal?.details?.supportedPoolFamilies ?? 0,
        canonicalWorkAfterExtinction: row.lineage.workAfterFinalKnownSupport, classification };
}).filter(Boolean);
for (const row of rows) if (!includeStages && row.lineage.stages) delete row.lineage.stages;
const document = { schemaVersion: 3, runId, solverRef, generatedAt: new Date().toISOString(), levelsFile,
    corpus: levelsFile, selection, retainAllRemovalDetails,
    familyDefinition: 'portal usage + crossing placement + must-cross first-entry/completion order; local edge detours ignored',
    familyDefinitionVersion, technique: 'beam winning-lineage observation', profile: 'default', seed: null,
    workBudget: nodeBudget, limitLevels: limit, beamWidth, nodeBudget, levels: rows, scoreWidthForensics: forensic,
    summary: { levels: rows.length, solved: rows.filter(x => x.solved).length,
        behaviorIdentical: rows.filter(x => x.behaviorIdentical).length,
        correctnessAlarms: rows.reduce((n, x) => n + x.lineage.correctnessAlarms.length, 0) } };
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Wrote ${outFile}`);
