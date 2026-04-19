import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const solverSource = await readFile(new URL('../solver.js', import.meta.url), 'utf8');

assert.ok(solverSource.includes('export function createSolver'), 'solver.js should export createSolver factory');
assert.ok(solverSource.includes('const solveLevel = async (level, opts = {}) => {'), 'solver.js should contain solveLevel implementation');
assert.ok(solverSource.includes('return (() => {'), 'createSolver should instantiate the solver IIFE');

console.log('Solver factory lint check passed.');
