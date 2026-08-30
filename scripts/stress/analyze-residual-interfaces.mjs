#!/usr/bin/env node
/** Cheap offline residual-interface mining over canonical-valid known solutions. */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelsWithHints } from '../level-data-io.mjs';
import { mineResidualInterfaces } from './research-analysis-lib.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const [key, ...rest] = x.split('='); return [key, rest.join('=')];
}));
const levelsFile = args.get('--levels') ?? 'data/stress/stress-levels-random.json';
const levelLimit = Number(args.get('--limit-levels') ?? 5);
const solutionLimit = Number(args.get('--limit-solutions') ?? 10);
const maxSpan = Number(args.get('--max-span') ?? 12);
const outFile = args.get('--out') ?? 'reports/stress/analyze-residual-interfaces.json';
const includePairs = args.has('--include-pairs');
const runId = args.get('--run-id') ?? `residual-interface-${new Date().toISOString()}`;
const solverRef = process.env.GITHUB_SHA ?? execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
const familyDefinitionVersion = 'structural-solution-family-v1';

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const Solver = createSolver();
const selected = readLevelsWithHints(levelsFile).filter(level => level.hints?.length > 1).slice(0, levelLimit);
const rows = [];
for (const raw of selected) {
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const prep = api.prepLevel(level); prep._cfg = null;
    const records = [];
    for (let i = 0; i < Math.min(solutionLimit, raw.hints.length); i++) {
        const candidate = raw.hints[i];
        const verdict = Solver.validateCandidatePath(level, candidate);
        if (!verdict.ok) throw new Error(`${raw.id}: hint ${i} failed canonical referee: ${verdict.reason}`);
        const state = api.createState(candidate[0], level, prep);
        const futureStates = [], intersections = [], obligations = [];
        const snapshot = () => JSON.stringify({ start: state.path[0], pathLength: state.path.length,
            pos: state.path.at(-1), prev: state.path.at(-2) ?? null,
            ints: state.ints, mustMask: state.mustMask, mpVisitedMask: state.mpVisitedMask,
            mustCrossMask: state.mustCrossMask, crossCounts: [...state.crossCounts], portalJumps: state.portalJumps,
            flipperUsedMask: state.flipperUsedMask, lastWasPortalJump: state.lastWasPortalJump,
            surroundMask: state.surroundMask, surroundNeighborRemainingMasks: [...state.surroundNeighborRemainingMasks],
            mustTurnMask: state.mustTurnMask, adjTurnMask: state.adjTurnMask,
            visited: [...new Set(state.path)].sort((a, b) => a - b).map(key => [key, state.visited[key], state.edgeUsage[key]]) });
        futureStates.push(snapshot()); intersections.push(state.ints); obligations.push(null);
        for (let step = 1; step < candidate.length; step++) {
            const from = state.path.at(-1), to = candidate[step];
            const portal = level.portalMap.get(from); api.applyMove(to, state, level, prep, !!(portal && portal.dest === to));
            const tokens = [];
            if (level.mustPassKeys.includes(to)) tokens.push(`mp:${level.mustPassKeys.indexOf(to)}`);
            if (level.mustCrossKeys.includes(to)) tokens.push(`mc:${level.mustCrossKeys.indexOf(to)}`);
            if (level.mustTurnKeys?.includes(to)) tokens.push(`mt:${level.mustTurnKeys.indexOf(to)}`);
            obligations.push(tokens.join('+') || null); futureStates.push(snapshot()); intersections.push(state.ints);
        }
        records.push({ id: `${raw.id}:${i}`, family: api.structuralSolutionFamilySignature(candidate, level.mustCrossKeys),
            path: candidate, futureStates, intersections, obligations });
    }
    rows.push({ runId, solverRef, levelId: raw.id, producer: 'known-valid-solutions', provenance: raw.provenance ?? null,
        profile: null, seed: null, maxSpan, solutions: records.length, result: mineResidualInterfaces(records, { maxSpan }) });
    console.error(`${raw.id}: repeated=${rows.at(-1).result.repeatedInterfaces} pairs=${rows.at(-1).result.candidatePairs}`);
}
const globalSignatures = new Map();
for (const row of rows) for (const signature of row.result.exactSignatures) {
    let support = globalSignatures.get(signature.signature);
    if (!support) globalSignatures.set(signature.signature, support = { signature: signature.signature,
        multiplicity: 0, levels: new Set(), solutions: new Set(), families: new Set() });
    support.multiplicity += signature.multiplicity; support.levels.add(row.levelId);
    signature.solutions.forEach(x => support.solutions.add(x)); signature.families.forEach(x => support.families.add(x));
}
const signatureRows = [...globalSignatures.values()].map(x => ({ ...x, levels: [...x.levels],
    solutions: [...x.solutions], families: [...x.families] }));
const document = { schemaVersion: 3, runId, solverRef, generatedAt: new Date().toISOString(), levelsFile,
    corpus: levelsFile, selection: 'first solution-rich levels in corpus order',
    producer: 'known-valid-solutions', technique: 'offline residual-interface signature census', profile: null,
    workBudget: null, beamWidth: null, seed: null, familyDefinitionVersion, maxSpan, levels: rows,
    substitutionSignatureDefinition: 'translation-invariant directed segment shapes + length/intersection deltas + obligation sequences',
    exactSubstitutionSignatures: signatureRows,
    summary: { levels: rows.length, solutions: rows.reduce((n, x) => n + x.solutions, 0),
        repeatedInterfaces: rows.reduce((n, x) => n + x.result.repeatedInterfaces, 0),
        candidatePairs: rows.reduce((n, x) => n + x.result.candidatePairs, 0),
        detourLikePairs: rows.reduce((n, x) => n + x.result.detourLikePairs, 0),
        commutingCandidates: rows.reduce((n, x) => n + x.result.commutingCandidates, 0),
        exactStatePreservingSubstitutions: rows.reduce((n, x) => n + x.result.exactStatePreservingSubstitutions, 0),
        uniqueExactSubstitutionSignatures: signatureRows.length,
        signaturesAcrossMultipleSolutions: signatureRows.filter(x => x.solutions.length > 1).length,
        signaturesAcrossMultipleLevels: signatureRows.filter(x => x.levels.length > 1).length,
        signaturesAcrossMultipleFamilies: signatureRows.filter(x => x.families.length > 1).length } };
if (!includePairs) for (const row of document.levels) {
    delete row.result.interfaces;
    // The global table above is the appendable analytical source; retaining the same signatures
    // again under every level inflated compact reports without adding information.
    delete row.result.exactSignatures;
}
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Wrote ${outFile}`);
