#!/usr/bin/env node
/** Build the frozen Class-3 exact-action expectation map from a current residual atlas. No solving. */
import { readFileSync, writeFileSync } from 'node:fs';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const i = a.indexOf('='); return [a.slice(2, i), a.slice(i + 1)];
}));
const input = args.get('atlas');
const output = args.get('out');
if (!input) throw new Error('Usage: build-class3-dose-expectations.mjs --atlas=<atlas.json> [--out=<file>]');
const atlas = JSON.parse(readFileSync(input, 'utf8'));
if (!Array.isArray(atlas.rows)) throw new Error(`${input}: expected rows[]`);
const parents = atlas.rows.filter(row => row.primaryClass === 3).map(row => ({
    parentId: row.id,
    expectations: (row.t1Wins ?? []).filter(win => win.class === 3).map(win => ({
        actionIdentity: win.identity,
        family: win.family,
        offered: win.offered,
        dispatched: win.dispatched,
        familyReached: win.familyReached,
        familyStarved: win.familyStarved,
        observability: win.observability,
        isolatedCensusNodes: win.nodes,
        isolatedWinningGate: win.gate,
    })).sort((a, b) => a.actionIdentity.localeCompare(b.actionIdentity)),
})).sort((a, b) => a.parentId.localeCompare(b.parentId));
if (parents.length !== 23) throw new Error(`expected 23 current Class-3 parents, found ${parents.length}`);
const expectationCount = parents.reduce((n, row) => n + row.expectations.length, 0);
if (expectationCount !== 24) throw new Error(`expected 24 exact T1 rescuer identities, found ${expectationCount}`);
if (parents.some(row => !row.expectations.length)) throw new Error('every Class-3 parent must have an exact expectation');
const result = {
    schemaVersion: 1,
    kind: 'pathfinder-class3-dose-expectations',
    evidenceRole: 'frozen acquisition expectation map; isolated census cost is context, not shared-production dose',
    sources: {
        productionBoundaryRun: '35066677597',
        techniqueCensusRun: '33717910218',
        residualClassificationSchemaVersion: atlas.residualClassificationSchemaVersion ?? 2,
    },
    independentUnit: 'parentId',
    parentCount: parents.length,
    expectationCount,
    parents,
};
const json = JSON.stringify(result, null, 2) + '\n';
if (output) writeFileSync(output, json);
else process.stdout.write(json);
