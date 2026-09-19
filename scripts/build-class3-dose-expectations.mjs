#!/usr/bin/env node
/**
 * Derive the frozen Class-3 parent -> exact-rescuer expectation map from an already-built residual
 * atlas. This is a pure evidence reduction: no solver search and no outcome acquisition.
 *
 * Usage:
 *   node scripts/build-class3-dose-expectations.mjs --atlas=<atlas.json> [--out=<file>]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
    const index = arg.indexOf('=');
    return [arg.slice(2, index), arg.slice(index + 1)];
}));
const atlasPath = args.get('atlas');
if (!atlasPath) {
    console.error('Usage: node scripts/build-class3-dose-expectations.mjs --atlas=<atlas.json> [--out=<file>]');
    process.exit(2);
}
if (!existsSync(atlasPath)) throw new Error(`missing atlas: ${atlasPath}`);

const atlas = JSON.parse(readFileSync(atlasPath, 'utf8'));
if (!Array.isArray(atlas.rows)) throw new Error('atlas.rows must be an array');

const class3Rows = atlas.rows.filter(row => row?.primaryClass === 3).sort((a, b) => String(a.id).localeCompare(String(b.id)));
const parents = class3Rows.map(row => {
    if (typeof row.id !== 'string' || !row.id) throw new Error('Class-3 row missing id');
    const seen = new Set();
    const rescuers = [];
    for (const win of row.t1Wins ?? []) {
        if (win?.class !== 3) continue;
        if (typeof win.identity !== 'string' || !win.identity) throw new Error(`Class-3 row ${row.id} has invalid rescuer identity`);
        const key = win.identity;
        if (seen.has(key)) continue;
        seen.add(key);
        rescuers.push({
            actionKey: win.identity,
            family: win.family ?? null,
            offered: typeof win.offered === 'boolean' ? win.offered : null,
            dispatched: typeof win.dispatched === 'boolean' ? win.dispatched : null,
            familyReached: typeof win.familyReached === 'boolean' ? win.familyReached : null,
            familyStarved: typeof win.familyStarved === 'boolean' ? win.familyStarved : null,
            observability: win.observability ?? null,
            isolatedNodesExpanded: Number.isFinite(win.nodes) ? win.nodes : null,
            isolatedWinningGate: win.gate ?? null,
        });
    }
    rescuers.sort((a, b) => a.actionKey.localeCompare(b.actionKey));
    if (!rescuers.length) throw new Error(`Class-3 row ${row.id} has no Class-3 rescuer`);
    return { parentId: row.id, rescuers };
});

const result = {
    schemaVersion: 1,
    kind: 'pathfinder-class3-dose-expectations',
    evidenceRole: 'prospective acquisition expectation map; derived without solver search',
    sourceAtlas: atlasPath,
    sourceBoundary: {
        baseline: atlas.baseline ?? null,
        lifecycle: atlas.lifecycle ?? null,
        census: atlas.census ?? null,
        currentResidualLevels: atlas.currentResidualLevels ?? null,
        residualClassificationSchemaVersion: atlas.residualClassificationSchemaVersion ?? null,
    },
    expectedParentCount: parents.length,
    parents,
};

const output = JSON.stringify(result, null, 2) + '\n';
if (args.get('out')) writeFileSync(args.get('out'), output);
else process.stdout.write(output);
