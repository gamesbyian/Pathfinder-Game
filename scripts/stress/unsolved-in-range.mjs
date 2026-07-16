#!/usr/bin/env node
/**
 * Prints the 1-indexed array positions within a range that do NOT yet have a solver-found hint
 * (a hint whose provenance includes an entry with solver.id === SOLVER_ID) — as opposed to a
 * witness-only hint (WITNESS_GENERATOR_ID) or no hint at all. Intended for batch-solve workflows
 * that want to skip levels the solver has already solved, checking the actual hint corpus
 * directly rather than a separate benchmark-log directory (compare scripts/stress/
 * missing-levels.mjs, which checks benchmark JSON logs instead of hint provenance).
 *
 * Output is a bare comma-separated position list (e.g. "3,7,12"), or nothing if every position
 * in range is already solver-solved — suitable for direct use as another tool's --levels=<spec>
 * (position-based tools: solver:bench, solver:direct, portfolio-solve-sweep.mjs, etc. — see
 * docs/solver-architecture.md's "--levels selector semantics differ by tool" section).
 *
 * Usage:
 *   node scripts/stress/unsolved-in-range.mjs --corpus=data/stress/stress-levels-random.json --range=1-85
 */
import path from 'node:path';
import process from 'node:process';
import { readLevelsWithHints } from '../level-data-io.mjs';
import { SOLVER_ID } from '../../modules/domain/hint-types.ts';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));

const corpusFile = args.get('--corpus');
const range = args.get('--range');
if (!corpusFile || !range) {
    console.error('Usage: node scripts/stress/unsolved-in-range.mjs --corpus=<path> --range=<start>-<end>');
    process.exit(2);
}
const [start, end] = range.split('-').map(Number);
if (!Number.isFinite(start) || !Number.isFinite(end) || start < 1 || end < start) {
    console.error(`Invalid --range=${range}`);
    process.exit(2);
}

const levels = readLevelsWithHints(path.isAbsolute(corpusFile) ? corpusFile : path.join(ROOT, corpusFile));
const unsolved = [];
for (let pos = start; pos <= Math.min(end, levels.length); pos++) {
    const level = levels[pos - 1];
    const solverSolved = (level?.hintRecords ?? []).some(h => (h.provenance ?? []).some(p => p.solver?.id === SOLVER_ID));
    if (!solverSolved) unsolved.push(pos);
}

console.error(`unsolved-in-range: ${unsolved.length}/${end - start + 1} position(s) in ${start}-${end} lack a solver-found hint.`);
console.log(unsolved.join(','));
