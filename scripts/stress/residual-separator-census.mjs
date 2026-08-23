#!/usr/bin/env node
/**
 * Residual-separator census — Stage 3 of the historical "Residual Interface Discovery" campaign:
 * before building any separator-conditioned resource DP, measure whether the corpus actually HAS
 * the terrain that technique needs — small articulation-separated chambers with mandatory obligations
 * inside — rather than assuming it and finding out only after building the DP.
 *
 * METHOD. Walk each level's own stored (referee-valid) hint solution — no CP-SAT, no new oracle
 * calls, just the same computeResidualChambers primitive the separator-resource-probe uses. At
 * sampled steps, measure chambers from TWO vantage points and report them separately:
 *   - "on-solution": the position the known solution actually occupies at that step;
 *   - "off-solution": every SIBLING move available there that the solution did NOT take (the same
 *     population interface-probe-harness.mjs scores probes against).
 * These are not expected to agree — an early local run of this tool found ~0% on-solution
 * (unsurprising: a solved path doesn't usually walk itself next to a dead-end pocket it has no
 * plan to enter) vs. a real, nonzero rate off-solution — so reporting only the on-solution rate
 * would understate the terrain by a wide margin.
 *
 * SCOPE. Same as residual-decomposition.mjs: no portals/filters/flipping filters/must-cross/
 * must-turn cells inside a counted chamber (see that file's doc). A level using any of those
 * mechanics can still be walked — only cells belonging to those mechanics disqualify a *chamber*
 * from being counted, not the whole level.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/residual-separator-census.mjs -- \
 *     --corpus=data/stress/stress-levels-random.json --levels=pos:1-1700 --every=4 \
 *     --out=logs/residual-separator-census/shard-01.json
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelsWithHints, selectLevelsBySpec } from '../level-data-io.mjs';
import { createSolver, SOLVER_TESTING_API } from '../../modules/solver.ts';
import { undoMove } from '../../modules/solver/search-state.ts';
import { computeResidualChambers } from './lib/residual-decomposition.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };

const CORPUS_FILE = arg('corpus', 'data/stress/stress-levels-random.json');
const LEVEL_SPEC = arg('levels', null);
const EVERY = Number(arg('every', '4'));
const MAX_CHAMBER_SIZE = Number(arg('max-chamber-size', '12'));
const OUT_FILE = arg('out', null);
const SUMMARY_OUT_FILE = arg('summary-out', null);

installBrowserStubs();
const Solver = createSolver();
const { prepLevel, createState, applyMove, getNeighbors } = SOLVER_TESTING_API;

const corpusLevels = readLevelsWithHints(path.resolve(ROOT, CORPUS_FILE));
const levels = LEVEL_SPEC ? selectLevelsBySpec(corpusLevels, LEVEL_SPEC) : corpusLevels;
console.log(`residual-separator-census: ${levels.length} level(s), corpus=${CORPUS_FILE}, every=${EVERY}, maxChamberSize=${MAX_CHAMBER_SIZE}`);

const perLevel = [];
const sizeHistogram = { onSolution: new Map(), offSolution: new Map() };
const totals = {
    onSolution: { samples: 0, samplesWithChamber: 0, chambers: 0 },
    offSolution: { branches: 0, branchesWithChamber: 0, chambers: 0 },
};
let levelsWithNoHint = 0, levelsWithAnyChamber = 0;

function persist() {
    if (!OUT_FILE) return;
    const abs = path.resolve(ROOT, OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    const summary = {
        corpus: CORPUS_FILE, every: EVERY, maxChamberSize: MAX_CHAMBER_SIZE,
        levelsTested: perLevel.length, levelsWithNoHint, levelsWithAnyChamber,
        onSolution: {
            ...totals.onSolution,
            rate: totals.onSolution.samples ? totals.onSolution.samplesWithChamber / totals.onSolution.samples : null,
            sizeHistogram: Object.fromEntries([...sizeHistogram.onSolution.entries()].sort((a, b) => a[0] - b[0])),
        },
        offSolution: {
            ...totals.offSolution,
            rate: totals.offSolution.branches ? totals.offSolution.branchesWithChamber / totals.offSolution.branches : null,
            sizeHistogram: Object.fromEntries([...sizeHistogram.offSolution.entries()].sort((a, b) => a[0] - b[0])),
        },
    };
    writeFileSync(abs, JSON.stringify({ summary, levels: perLevel }, null, 1));
    if (SUMMARY_OUT_FILE) {
        const pct = (r) => r === null ? 'n/a' : (100 * r).toFixed(1) + '%';
        const lines = [
            `# Residual-separator census`, '',
            `Corpus: ${CORPUS_FILE} — ${perLevel.length} level(s) tested, ${levelsWithNoHint} skipped (no stored hint).`,
            `Levels with >=1 in-scope chamber found anywhere (on- or off-solution): ${levelsWithAnyChamber}/${perLevel.length}.`,
            '', '## On-solution (walking the known solution itself)',
            `Sampled positions with >=1 chamber: ${summary.onSolution.samplesWithChamber}/${summary.onSolution.samples} (${pct(summary.onSolution.rate)}).`,
            `Chamber size histogram: ${JSON.stringify(summary.onSolution.sizeHistogram)}`,
            '', '## Off-solution (sibling moves the solution did NOT take, at the same sampled steps)',
            `Sibling branches with >=1 chamber: ${summary.offSolution.branchesWithChamber}/${summary.offSolution.branches} (${pct(summary.offSolution.rate)}).`,
            `Chamber size histogram: ${JSON.stringify(summary.offSolution.sizeHistogram)}`,
        ];
        mkdirSync(path.dirname(path.resolve(ROOT, SUMMARY_OUT_FILE)), { recursive: true });
        writeFileSync(path.resolve(ROOT, SUMMARY_OUT_FILE), lines.join('\n') + '\n');
    }
}

for (let i = 0; i < levels.length; i++) {
    const raw = levels[i];
    const solution = (raw.hintRecords || [])[0]?.path;
    if (!solution) { levelsWithNoHint++; perLevel.push({ id: raw.id ?? null, skipped: 'no-hint' }); persist(); continue; }

    const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber: i + 1 });
    const prep = prepLevel(level);
    prep._cfg = null;
    const state = createState(solution[0], level, prep);

    const lvl = {
        onSolution: { samples: 0, samplesWithChamber: 0, chambers: 0 },
        offSolution: { branches: 0, branchesWithChamber: 0, chambers: 0 },
    };

    for (let step = 0; step < solution.length; step++) {
        const pos = solution[step];
        if (step % EVERY === 0) {
            const chambers = computeResidualChambers({ pos, level, prep, state, maxChamberSize: MAX_CHAMBER_SIZE });
            lvl.onSolution.samples++; totals.onSolution.samples++;
            if (chambers.length > 0) {
                lvl.onSolution.samplesWithChamber++; totals.onSolution.samplesWithChamber++;
                lvl.onSolution.chambers += chambers.length; totals.onSolution.chambers += chambers.length;
                for (const c of chambers) sizeHistogram.onSolution.set(c.cells.size, (sizeHistogram.onSolution.get(c.cells.size) || 0) + 1);
            }

            const nextOnPath = step + 1 < solution.length ? solution[step + 1] : null;
            const pAtPos = level.portalMap.get(pos);
            for (const alt of getNeighbors(pos, state, level, prep)) {
                if (alt === nextOnPath) continue;
                const isJump = !!(pAtPos && !state.lastWasPortalJump && pAtPos.dest === alt);
                const undo = applyMove(alt, state, level, prep, isJump);
                const altChambers = computeResidualChambers({ pos: alt, level, prep, state, maxChamberSize: MAX_CHAMBER_SIZE });
                lvl.offSolution.branches++; totals.offSolution.branches++;
                if (altChambers.length > 0) {
                    lvl.offSolution.branchesWithChamber++; totals.offSolution.branchesWithChamber++;
                    lvl.offSolution.chambers += altChambers.length; totals.offSolution.chambers += altChambers.length;
                    for (const c of altChambers) sizeHistogram.offSolution.set(c.cells.size, (sizeHistogram.offSolution.get(c.cells.size) || 0) + 1);
                }
                undoMove(undo, state);
            }
        }
        if (step + 1 < solution.length) {
            const pAtPos = level.portalMap.get(pos);
            const next = solution[step + 1];
            applyMove(next, state, level, prep, !!(pAtPos && !state.lastWasPortalJump && pAtPos.dest === next));
        }
    }

    if (lvl.onSolution.chambers > 0 || lvl.offSolution.chambers > 0) levelsWithAnyChamber++;
    perLevel.push({ id: raw.id ?? null, ...lvl });
    persist();
    console.log(`  [${i + 1}/${levels.length}] ${raw.id ?? '(no id)'}: on-solution ${lvl.onSolution.samplesWithChamber}/${lvl.onSolution.samples}, off-solution ${lvl.offSolution.branchesWithChamber}/${lvl.offSolution.branches}`);
}

persist();
console.log(`\nDone. ${levelsWithAnyChamber}/${perLevel.length - levelsWithNoHint} levels had >=1 in-scope chamber (on- or off-solution).`);
if (OUT_FILE) console.log(`Wrote ${OUT_FILE}`);
