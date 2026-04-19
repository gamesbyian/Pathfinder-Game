import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const solverModule = await import(new URL('../solver.js', import.meta.url));

assert.equal(typeof solverModule.createSolver, 'function', 'solver.js should export createSolver factory function');

const source = await readFile(new URL('../solver.js', import.meta.url), 'utf8');
assert.ok(!/\bnew Function\b/.test(source), 'solver.js must not use new Function');
assert.ok(!/\beval\s*\(/.test(source), 'solver.js must not use eval');
assert.ok(!/\bwith\s*\(/.test(source), 'solver.js must not use with(...)');

console.log('Solver lint check passed (real module export + no dynamic-eval constructs).');
