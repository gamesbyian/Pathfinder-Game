import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

assert.ok(html.includes("import { createSolver } from './solver.js';"), 'index.html should import createSolver from solver.js');
assert.ok(html.includes('APP.Solver = createSolver({ APP });'), 'index.html should initialize APP.Solver via createSolver factory');

console.log('Solver smoke test passed (index imports solver factory and wires APP.Solver).');
