#!/usr/bin/env node
/**
 * Build the frozen three-case class-5 microscope input from an existing
 * collect-known-solution-prefix-survival.mjs artifact that retained full ranked-pool details.
 *
 * This is deliberately a postprocessor, not new beam instrumentation. It follows the proven B2
 * extinction-adjacent exact-prefix design: known-supported culled candidate, rank-1 retained
 * candidate, and cutoff retained candidate. The known witness prefix is a positive control; the
 * survivors' exact future-feasibility labels are decision-bearing.
 *
 * Required producer flags:
 *   --include-stages --retain-all-removal-details --retain-ranked-pool-details
 *
 * Example:
 *   node scripts/run-bundled.mjs scripts/stress/build-class5-microscope-cases.mjs -- \
 *     --survival=tmp/r03351-microscope-survival.json \
 *     --level-id=R03351 \
 *     --out=tmp/r03351-microscope-cases.json
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelsWithHints } from '../level-data-io.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const [key, ...rest] = x.split('='); return [key, rest.join('=')];
}));
const required = key => {
    const value = args.get(key);
    if (!value) throw new Error(`missing ${key}`);
    return value;
};
const survivalFile = required('--survival');
const levelId = args.get('--level-id') ?? 'R03351';
const outFile = args.get('--out') ?? `tmp/${levelId.toLowerCase()}-microscope-cases.json`;
const metaFile = args.get('--meta-out') ?? outFile.replace(/\.json$/, '.meta.json');

const survivalDoc = JSON.parse(readFileSync(survivalFile, 'utf8'));
if (!survivalDoc.retainRankedPoolDetails) {
    throw new Error('survival artifact must be produced with --retain-ranked-pool-details');
}
const row = (survivalDoc.levels ?? []).find(item => String(item.levelId) === levelId);
if (!row) throw new Error(`${levelId} not found in ${survivalFile}`);
if (!Array.isArray(row.survival?.stages)) throw new Error('survival artifact must retain stages (--include-stages)');
const loss = row.survival.finalSupportLoss;
if (!loss) throw new Error(`${levelId}: no final known-support loss recorded`);
if (loss.lossCause !== 'score-width-culled') {
    throw new Error(`${levelId}: expected final lossCause=score-width-culled, got ${loss.lossCause}`);
}
const beamWidth = Number(row.beamWidth);
if (!Number.isInteger(beamWidth) || beamWidth < 1) throw new Error(`${levelId}: invalid beamWidth ${row.beamWidth}`);

const removal = [...row.survival.stages].reverse().find(stage =>
    stage.depth === loss.depth && stage.stage === 'score-width-culled' && Array.isArray(stage.details?.rankedPool));
if (!removal) throw new Error(`${levelId}: no ranked score-width-cull record at final loss depth ${loss.depth}`);
const rankedPool = removal.details.rankedPool;
if (rankedPool.length <= beamWidth) {
    throw new Error(`${levelId}: ranked pool ${rankedPool.length} is not wider than beam ${beamWidth}`);
}

const levelsFile = survivalDoc.levelsFile ?? survivalDoc.corpus;
if (!levelsFile) throw new Error('survival artifact missing levelsFile/corpus');
const raw = readLevelsWithHints(levelsFile).find(level => String(level.id) === levelId);
if (!raw) throw new Error(`${levelId} not found in ${levelsFile}`);
if (!Array.isArray(raw.hints) || raw.hints.length === 0) throw new Error(`${levelId}: no stored hints available`);

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const Solver = createSolver();
const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
const gateKey = Number(row.gateKey);
const labels = raw.hints.map((candidate, index) => {
    const verdict = Solver.validateCandidatePath(level, candidate);
    if (!verdict.ok) throw new Error(`${levelId}: stored hint ${index} failed canonical referee: ${verdict.reason}`);
    return { index, path: candidate };
}).filter(label => label.path[0] === gateKey);
if (!labels.length) throw new Error(`${levelId}: no valid stored hint starts at observed gate ${gateKey}`);

const keyOf = values => values.join(',');
const isPrefixOf = (prefix, whole) => prefix.length <= whole.length && prefix.every((cell, i) => cell === whole[i]);
const hashPath = values => createHash('sha256').update(JSON.stringify(values)).digest('hex');
const witnessMatches = candidatePath => labels.filter(label => isPrefixOf(candidatePath, label.path));

const supportedRows = rankedPool.map(item => ({ ...item, witnessMatches: witnessMatches(item.path) }))
    .filter(item => item.witnessMatches.length > 0);
const retainedSupported = supportedRows.filter(item => item.rank <= beamWidth);
if (retainedSupported.length) {
    throw new Error(`${levelId}: final support-loss cull still has ${retainedSupported.length} supported candidate(s) inside top-${beamWidth}`);
}
const witnessCulled = supportedRows.filter(item => item.rank > beamWidth).sort((a, b) => a.rank - b.rank)[0];
if (!witnessCulled) throw new Error(`${levelId}: no witness-supported culled candidate found at final loss`);
const topRank1 = rankedPool.find(item => item.rank === 1) ?? rankedPool[0];
const cutoff = rankedPool.find(item => item.rank === beamWidth) ?? rankedPool[beamWidth - 1];
if (!topRank1 || !cutoff) throw new Error(`${levelId}: could not resolve rank-1/cutoff survivors`);
if (topRank1.rank > beamWidth || cutoff.rank > beamWidth) throw new Error(`${levelId}: selected survivor lies outside top-${beamWidth}`);

const candidates = [
    { role: 'witness-culled', item: witnessCulled, knownLive: true },
    { role: 'top-rank1', item: topRank1, knownLive: null },
    { role: 'cutoff-survivor', item: cutoff, knownLive: null },
];
const uniquePaths = new Set(candidates.map(candidate => keyOf(candidate.item.path)));
if (uniquePaths.size !== candidates.length) throw new Error(`${levelId}: frozen microscope roles are not three distinct paths`);

// Fail closed on any serialization/instrumentation mismatch before spending exact-solver work.
const prep = api.prepLevel(level); prep._cfg = null;
const replayPrefix = keys => {
    if (!prep.gateFlags[keys[0]]) return { ok: false, reason: 'prefix-does-not-start-at-gate' };
    const state = api.createState(keys[0], level, prep);
    for (let i = 1; i < keys.length; i++) {
        const from = state.path.at(-1), next = keys[i];
        if (!api.getNeighbors(from, state, level, prep).includes(next)) {
            return { ok: false, reason: 'illegal-native-step', invalidAt: i, from, next };
        }
        const portal = level.portalMap.get(from);
        api.applyMove(next, state, level, prep, !!(portal && portal.dest === next));
    }
    return { ok: true };
};
for (const candidate of candidates) {
    const replay = replayPrefix(candidate.item.path);
    if (!replay.ok) throw new Error(`${levelId}:${candidate.role}: emitted beam prefix is not replay-legal: ${JSON.stringify(replay)}`);
}

const cases = candidates.map(candidate => ({
    id: `${levelId}:microscope:d${loss.depth}:${candidate.role}`,
    levelId,
    prefix: candidate.item.path,
    source: { role: candidate.role, rank: candidate.item.rank, score: candidate.item.score, knownLive: candidate.knownLive },
}));
const caseDocument = { corpus: levelsFile, cases };

const metaDocument = {
    schemaVersion: 1,
    sourceSurvival: survivalFile,
    sourceSolverRef: survivalDoc.solverRef ?? null,
    levelId,
    levelsFile,
    gateKey,
    beamWidth,
    nodeBudget: row.nodeBudget ?? survivalDoc.nodeBudget ?? null,
    lossDepth: loss.depth,
    lossCause: loss.lossCause,
    poolSize: rankedPool.length,
    cutoffScore: removal.details.cutoffScore ?? null,
    witnessSolutionIdentities: labels.map(label => ({ index: label.index, sha256: hashPath(label.path), length: label.path.length })),
    cases: candidates.map(candidate => ({
        role: candidate.role,
        rank: candidate.item.rank,
        score: candidate.item.score,
        scoreMarginToCutoff: removal.details.cutoffScore == null || candidate.item.score == null
            ? null : removal.details.cutoffScore - candidate.item.score,
        pathLength: candidate.item.path.length,
        pathSha256: hashPath(candidate.item.path),
        knownLiveFromAcceptedWitness: candidate.knownLive,
        matchingWitnesses: candidate.role === 'witness-culled'
            ? candidate.item.witnessMatches.map(label => ({ index: label.index, sha256: hashPath(label.path) })) : [],
    })),
    interpretationGuard: 'A dead top-rank1 with a live witness is B1/B2 phenotype recurrence, not a new premise by itself.',
};

mkdirSync(path.dirname(outFile), { recursive: true });
mkdirSync(path.dirname(metaFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(caseDocument, null, 2)}\n`);
writeFileSync(metaFile, `${JSON.stringify(metaDocument, null, 2)}\n`);
console.log(`Wrote ${outFile} and ${metaFile}`);
console.log(JSON.stringify({ levelId, lossDepth: loss.depth, beamWidth, poolSize: rankedPool.length,
    cases: metaDocument.cases.map(item => ({ role: item.role, rank: item.rank, score: item.score })) }, null, 2));
