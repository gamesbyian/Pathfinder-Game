#!/usr/bin/env node
/**
 * Corpus-wide false-positive audit for the solver's shared hard-prune authority.
 *
 * Every replayed path is first accepted by the canonical referee. We then walk that same path
 * through production search state and ask the real hard-prune pipeline about every post-move
 * state, forcing the expensive connectivity check on every step. A hard prune that rejects any
 * state on a referee-valid complete path is unsound by construction.
 *
 * The root-level PRUNE_MC_FORCED_FIRST_MOVE lives outside evaluatePrunedMove, so it is checked
 * explicitly through search.ts's test seam. The report also records how often every prune is
 * reached on known-live states. Zero reach is not evidence of soundness; it is an evidence gap.
 *
 * This is intentionally a one-sided correctness audit. It says nothing about dead branches that
 * the solver fails to prune, search ordering, retention, or whether the stored solution set is
 * representative of the frontier.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/known-solution-hard-prune-soundness-check.mjs -- \
 *     --corpus=data/stress/stress-levels-random.json [--levels=all] [--out=reports/stress/...json]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { readLevelsWithHints, selectLevelsBySpec } from '../level-data-io.mjs';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const { evaluatePrunedMove } = await import('../../modules/solver/hard-prune-pipeline.ts');
const { __pruneFirstStepNeighborsForTests } = await import('../../modules/solver/search.ts');
const { getRealLengthFromState } = await import('../../modules/solver/solution.ts');
const { PACK } = await import('../../modules/solver/encoding.ts');

const Solver = createSolver();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...rest] = a.split('=');
    return [k, rest.join('=')];
}));
const corpusFile = args.get('--corpus') ?? 'data/stress/stress-levels-random.json';
const levelSpec = args.get('--levels') ?? 'all';
const outFile = args.get('--out') ?? null;
const allRaw = readLevelsWithHints(corpusFile);
const selected = selectLevelsBySpec(allRaw, levelSpec);

const addCounts = (target, source = {}) => {
    for (const [key, value] of Object.entries(source)) target[key] = (target[key] ?? 0) + Number(value ?? 0);
};
const packedWitness = (raw) => {
    const witness = raw?.stressMeta?.witnessSolution;
    if (!Array.isArray(witness) || !witness.length) return null;
    if (!witness.every(p => Array.isArray(p) && p.length >= 2)) return null;
    return witness.map(([x, y]) => PACK(Number(x) - 1, Number(y) - 1));
};
const knownPaths = (raw) => {
    const entries = [];
    const witness = packedWitness(raw);
    if (witness) entries.push({ source: 'stressMeta.witnessSolution', path: witness });
    for (let i = 0; i < (raw.hints ?? []).length; i++) {
        const p = raw.hints[i];
        if (Array.isArray(p) && p.length) entries.push({ source: `hint:${i}`, path: p });
    }
    const seen = new Set();
    return entries.filter(entry => {
        const sig = entry.path.join(',');
        if (seen.has(sig)) return false;
        seen.add(sig);
        return true;
    });
};
const mechanicTags = (level) => ({
    mustPass: level.mustPassKeys.length > 0,
    mustCross: level.mustCrossKeys.length > 0,
    portals: level.portalMap.size > 0,
    filters: level.filterMap.size > 0,
    flippingFilters: level.flippingFilterMap.size > 0,
    landmarks: !!(level.surroundKeys?.length || level.mustPassTurnDirs?.size || level.adjacentTurnKeys?.length),
});

const summary = {
    corpusFile,
    levelSpec,
    solverRef: process.env.GITHUB_SHA ?? null,
    levelsSelected: selected.length,
    levelsWithKnownPath: 0,
    pathsChecked: 0,
    stepsChecked: 0,
    rootNeighborChecks: 0,
    validPathFailures: 0,
    moveGenerationContradictions: 0,
    forcedFirstStepContradictions: 0,
    hardPruneContradictions: 0,
    prematureSolutionVerdicts: 0,
    finalNonSolutionVerdicts: 0,
    reachedByPrune: {},
    rejectedByPrune: {},
    mechanics: {},
};
const violations = [];
const levelRows = [];

for (const [selectedIndex, raw] of selected.entries()) {
    const originalIndex = allRaw.indexOf(raw);
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber: originalIndex + 1 });
    const paths = knownPaths(raw);
    if (!paths.length) continue;
    summary.levelsWithKnownPath++;
    const tags = mechanicTags(level);
    for (const [tag, present] of Object.entries(tags)) if (present) summary.mechanics[tag] = (summary.mechanics[tag] ?? 0) + 1;
    const row = { levelId: raw.id ?? `pos:${originalIndex + 1}`, paths: 0, steps: 0, violations: 0 };

    for (const entry of paths) {
        const verdict = Solver.validateCandidatePath(level, entry.path);
        if (!verdict.ok) {
            summary.validPathFailures++;
            row.violations++;
            violations.push({ levelId: row.levelId, source: entry.source, kind: 'canonical-referee-rejected', reason: verdict.reason });
            continue;
        }

        summary.pathsChecked++;
        row.paths++;
        const prep = api.prepLevel(level);
        prep._cfg = null;
        prep._metrics = { nodesExpanded: 0 };
        const state = api.createState(entry.path[0], level, prep);

        if (entry.path.length > 1) {
            const diagnostics = { reached: {}, rejected: {} };
            const neighbors = api.getNeighbors(entry.path[0], state, level, prep);
            summary.rootNeighborChecks++;
            if (!neighbors.includes(entry.path[1])) {
                summary.moveGenerationContradictions++;
                row.violations++;
                violations.push({ levelId: row.levelId, source: entry.source, kind: 'known-first-move-absent-from-getNeighbors' });
            }
            const retained = __pruneFirstStepNeighborsForTests(entry.path[0], neighbors, prep, diagnostics);
            addCounts(summary.reachedByPrune, diagnostics.reached);
            addCounts(summary.rejectedByPrune, diagnostics.rejected);
            if (neighbors.includes(entry.path[1]) && !retained.includes(entry.path[1])) {
                summary.forcedFirstStepContradictions++;
                row.violations++;
                violations.push({ levelId: row.levelId, source: entry.source, kind: 'PRUNE_MC_FORCED_FIRST_MOVE-rejected-known-solution' });
            }
        }

        for (let i = 1; i < entry.path.length; i++) {
            const prev = entry.path[i - 1];
            const next = entry.path[i];
            const portal = level.portalMap.get(prev);
            const isJump = !!(portal && !state.lastWasPortalJump && portal.dest === next);
            try {
                api.applyMove(next, state, level, prep, isJump);
            } catch (error) {
                summary.moveGenerationContradictions++;
                row.violations++;
                violations.push({ levelId: row.levelId, source: entry.source, step: i, kind: 'applyMove-rejected-referee-valid-step', error: String(error) });
                break;
            }

            summary.stepsChecked++;
            row.steps++;
            const diagnostics = { reached: {}, rejected: {} };
            const pruneVerdict = evaluatePrunedMove(next, getRealLengthFromState(state), state, level, prep, null, true, { diagnostics });
            addCounts(summary.reachedByPrune, diagnostics.reached);
            addCounts(summary.rejectedByPrune, diagnostics.rejected);
            const final = i === entry.path.length - 1;

            if (pruneVerdict === 'reject') {
                summary.hardPruneContradictions++;
                row.violations++;
                const reason = Object.entries(diagnostics.rejected).find(([, n]) => Number(n) > 0)?.[0] ?? 'unknown';
                violations.push({ levelId: row.levelId, source: entry.source, step: i, kind: 'hard-prune-rejected-known-solution-state', reason, final });
                break;
            }
            if (!final && pruneVerdict === 'solution') {
                summary.prematureSolutionVerdicts++;
                row.violations++;
                violations.push({ levelId: row.levelId, source: entry.source, step: i, kind: 'premature-solution-verdict' });
                break;
            }
            if (final && pruneVerdict !== 'solution') {
                summary.finalNonSolutionVerdicts++;
                row.violations++;
                violations.push({ levelId: row.levelId, source: entry.source, step: i, kind: 'final-state-not-recognized-as-solution', verdict: pruneVerdict });
            }
        }
    }
    levelRows.push(row);
    if ((selectedIndex + 1) % 100 === 0) console.error(`checked ${selectedIndex + 1}/${selected.length} selected levels`);
}

const totalViolations = summary.validPathFailures + summary.moveGenerationContradictions +
    summary.forcedFirstStepContradictions + summary.hardPruneContradictions +
    summary.prematureSolutionVerdicts + summary.finalNonSolutionVerdicts;
const document = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    ...summary,
    totalViolations,
    limitations: [
        'Known-valid paths can falsify prune soundness but cannot prove it outside the replayed state population.',
        'Forcing connectivity on every step is stricter than DFS/beam production throttles and is intentional for false-positive detection.',
        'This audit does not label dead alternatives, search ordering, beam retention, repair reachability, or missing inference.',
        'A prune with zero reachedByPrune coverage remains untested by this run.',
    ],
    violations,
    levels: levelRows,
};

console.log(`known-solution hard-prune soundness: ${corpusFile}`);
console.log(`  selected levels: ${summary.levelsSelected}; with known path: ${summary.levelsWithKnownPath}`);
console.log(`  valid paths: ${summary.pathsChecked}; replayed steps: ${summary.stepsChecked}`);
console.log(`  violations: ${totalViolations}`);
console.log(`  reached by prune: ${JSON.stringify(summary.reachedByPrune)}`);
if (violations.length) console.log(`  first violations: ${JSON.stringify(violations.slice(0, 10))}`);

if (outFile) {
    const abs = path.resolve(outFile);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, `${JSON.stringify(document, null, 2)}\n`);
    console.log(`Wrote ${outFile}`);
}
if (totalViolations > 0) process.exitCode = 1;
