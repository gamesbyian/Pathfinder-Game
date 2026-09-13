#!/usr/bin/env node
/** Extract a bounded, prespecified sample of CULLED (score-width-discarded) candidate prefixes,
 * spread across many distinct depths/branch points of one or two real production-faithful beam
 * solves, for the WS2-COMPACT-DEAD-CAUSE-RECURRENCE diagnostic
 * (docs/solver-optimization-workstreams.md; reports/2026-09-12-solver-future-work-backlog-excavation-001.md).
 *
 * This is a postprocessor over an existing collect-known-solution-prefix-survival.mjs artifact
 * (same pattern as build-class5-microscope-cases.mjs), NOT new beam instrumentation. That script's
 * 3-case-per-level design (known-live culled witness, rank-1 survivor, cutoff survivor) only ever
 * looks at the FINAL loss depth. Recurrence is a question about whether the SAME solve re-hits the
 * same dead reason at MULTIPLE distinct decision points, so this pulls one candidate per selected
 * depth across the whole retained trace instead.
 *
 * PRESPECIFIED SELECTION RULE (fixed before any CP-SAT adjudication was run, to avoid
 * result-favorable cherry-picking):
 *   1. Within one level's retained survival trace, take every depth that produced a
 *      'score-width-culled' stage (a depth where the pool exceeded the beam width and candidates
 *      were actually discarded).
 *   2. If that depth count exceeds --depths-per-level, subsample to exactly --depths-per-level
 *      depths, evenly spaced by index across the sorted depth list (deterministic, not random).
 *   3. At each selected depth, take the single candidate at rank == beamWidth + --rank-offset --
 *      i.e. the *first-culled* candidate (the most competitive discarded candidate, one place
 *      below the cutoff). This is a fixed, reproducible choice, not "worst" or "best" cherry-picked
 *      after seeing labels.
 *
 * Required producer flags on the source survival artifact:
 *   --include-stages --retain-all-removal-details --retain-ranked-pool-details
 *
 * Output is a generic explicit-prefix case document consumable directly by the existing
 * cpsat-explicit-prefix-reference.mjs seam (--format=cases, its default).
 *
 * Example:
 *   node scripts/run-bundled.mjs scripts/stress/collect-class5-dead-cause-sample.mjs -- \
 *     --levels=R00046:tmp/r00046-microscope-survival.json,R02733:tmp/r02733-microscope-survival.json \
 *     --depths-per-level=15 --out=tmp/class5-dead-cause-cases.json
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { unpackPackedCell } from './cpsat-explicit-prefix-reference-lib.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const [key, ...rest] = x.split('='); return [key, rest.join('=')];
}));
const required = key => { const value = args.get(key); if (!value) throw new Error(`missing ${key}`); return value; };
const levelsArg = required('--levels'); // "LEVEL:survivalFile.json,LEVEL2:survivalFile2.json"
const depthsPerLevel = Number(args.get('--depths-per-level') ?? 15);
const rankOffset = Number(args.get('--rank-offset') ?? 1);
const outFile = args.get('--out') ?? 'tmp/class5-dead-cause-cases.json';
if (!Number.isInteger(depthsPerLevel) || depthsPerLevel < 1) throw new Error('--depths-per-level must be a positive integer');
if (!Number.isInteger(rankOffset) || rankOffset < 1) throw new Error('--rank-offset must be a positive integer (1 = first-culled)');

const levelSpecs = levelsArg.split(',').map(entry => {
    const [levelId, survivalFile] = entry.split(':');
    if (!levelId || !survivalFile) throw new Error(`malformed --levels entry: ${entry}`);
    return { levelId, survivalFile };
});

/** Evenly-spaced index subsample of a sorted array, deterministic (Math.round based), capped/deduped. */
function evenlySpacedSubsample(items, count) {
    if (items.length <= count) return items;
    if (count === 1) return [items[0]];
    const picked = [];
    const seen = new Set();
    for (let i = 0; i < count; i++) {
        const idx = Math.round((i * (items.length - 1)) / (count - 1));
        if (!seen.has(idx)) { seen.add(idx); picked.push(items[idx]); }
    }
    return picked;
}

const perLevelReport = [];
const cases = [];
let defaultCorpus = null;

for (const { levelId, survivalFile } of levelSpecs) {
    const doc = JSON.parse(readFileSync(survivalFile, 'utf8'));
    if (!doc.retainRankedPoolDetails) throw new Error(`${survivalFile}: must be produced with --retain-ranked-pool-details`);
    if (!doc.retainAllRemovalDetails) throw new Error(`${survivalFile}: must be produced with --retain-all-removal-details`);
    const row = (doc.levels ?? []).find(item => String(item.levelId) === levelId);
    if (!row) throw new Error(`${levelId} not found in ${survivalFile}`);
    if (!Array.isArray(row.survival?.stages)) throw new Error(`${levelId}: survival artifact must retain stages (--include-stages)`);
    const beamWidth = Number(row.beamWidth);
    if (!Number.isInteger(beamWidth) || beamWidth < 1) throw new Error(`${levelId}: invalid beamWidth ${row.beamWidth}`);
    const levelsFile = doc.levelsFile ?? doc.corpus;
    if (!levelsFile) throw new Error(`${survivalFile}: missing levelsFile/corpus`);
    if (defaultCorpus == null) defaultCorpus = levelsFile;
    else if (defaultCorpus !== levelsFile) throw new Error(`levels span different corpora (${defaultCorpus} vs ${levelsFile}); not supported by this extractor`);

    const cullStages = row.survival.stages
        .filter(stage => stage.stage === 'score-width-culled' && Array.isArray(stage.details?.rankedPool))
        .slice()
        .sort((a, b) => a.depth - b.depth);
    if (!cullStages.length) throw new Error(`${levelId}: no score-width-culled stages with a retained ranked pool`);

    const selectedStages = evenlySpacedSubsample(cullStages, depthsPerLevel);
    const levelCases = [];
    for (const stage of selectedStages) {
        const rankedPool = stage.details.rankedPool;
        const targetRank = beamWidth + rankOffset;
        const item = rankedPool.find(candidate => candidate.rank === targetRank);
        if (!item) throw new Error(`${levelId}: depth ${stage.depth}: no candidate at rank ${targetRank} (pool max rank ${Math.max(...rankedPool.map(c => c.rank))})`);
        const prefix = item.path.map(unpackPackedCell);
        const id = `${levelId}:d${stage.depth}:culled-rank${item.rank}`;
        levelCases.push({
            id, levelId, corpus: levelsFile, prefix, depth: stage.depth,
            source: {
                selectionRule: 'first-culled (rank == beamWidth + rank-offset) at an evenly-spaced subsample of score-width-culled depths',
                rank: item.rank, score: item.score, insertionOrder: item.insertionOrder,
                beamWidth, poolSize: rankedPool.length, cutoffScore: stage.details.cutoffScore ?? null,
                firstCulledScore: stage.details.firstCulledScore ?? null,
            },
        });
    }
    cases.push(...levelCases);
    perLevelReport.push({
        levelId, survivalFile, beamWidth,
        totalCullDepthsAvailable: cullStages.length,
        cullDepths: cullStages.map(s => s.depth),
        depthsSelected: selectedStages.map(s => s.depth),
        casesEmitted: levelCases.length,
    });
}

const document = { schemaVersion: 1, generatedAt: new Date().toISOString(), corpus: defaultCorpus,
    selectionRule: {
        description: 'One culled candidate per evenly-spaced-subsampled score-width-culled depth per level, prespecified before CP-SAT adjudication.',
        depthsPerLevel, rankOffset,
    },
    perLevel: perLevelReport,
    cases,
};
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Wrote ${outFile}: ${cases.length} case(s) across ${levelSpecs.length} level(s).`);
for (const level of perLevelReport) {
    console.log(`  ${level.levelId}: ${level.casesEmitted}/${level.totalCullDepthsAvailable} cull-depths sampled -> depths ${JSON.stringify(level.depthsSelected)}`);
}
