#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
    isEligibleForCpsatBranchLabeling,
    isHarvestedByCpsat,
    selectEligibleCpsatBranchLevels,
    selectShardByRoundRobin,
    selectUnharvestedCpsatLevels,
} from './lib/cpsat-branch-label-eligibility.mjs';

const fixture = JSON.parse(readFileSync(
    'docs/naming-cleanup-phase-records/fixtures/phase15b-cpsat-branch-label-eligibility.json',
    'utf8',
));

const ids = rows => rows.map(row => row.id);

assert.deepEqual(
    ids(selectEligibleCpsatBranchLevels(fixture.levels)),
    fixture.expected.eligibleIds,
    'authentic pre-15B eligibility population must remain identical after the rename',
);
assert.deepEqual(
    ids(selectUnharvestedCpsatLevels(fixture.levels)),
    fixture.expected.unharvestedIds,
    'authentic pre-15B unharvested population must remain identical after the rename',
);

const hint = (technique = null) => ({
    path: [1, 2, 3],
    provenance: technique ? [{ solver: { technique } }] : [],
});
const synthetic = [
    { id: 'no-hint', hintRecords: [], filters: [], flippingFilters: [], portals: [] },
    { id: 'filter', hintRecords: [hint()], filters: [{ x: 1, y: 1 }], flippingFilters: [], portals: [] },
    { id: 'flipper', hintRecords: [hint()], filters: [], flippingFilters: [{ x: 1, y: 1, axis: 1 }], portals: [] },
    { id: 'portal', hintRecords: [hint()], filters: [], flippingFilters: [], portals: [{ x1: 1, y1: 1, x2: 2, y2: 2 }] },
    { id: 'harvested', hintRecords: [hint('cpsat-reference-probe')], filters: [], flippingFilters: [], portals: [] },
    { id: 'plain', hintRecords: [hint('repair')], filters: [], flippingFilters: [], portals: [] },
];

assert.equal(isEligibleForCpsatBranchLabeling(synthetic[0]), false);
assert.equal(isEligibleForCpsatBranchLabeling(synthetic[1]), false);
assert.equal(isEligibleForCpsatBranchLabeling(synthetic[2]), false);
assert.equal(isEligibleForCpsatBranchLabeling(synthetic[3]), true, 'portals remain eligible');
assert.equal(isEligibleForCpsatBranchLabeling(synthetic[4]), true);
assert.equal(isHarvestedByCpsat(synthetic[4]), true);
assert.equal(isHarvestedByCpsat(synthetic[5]), false);
assert.deepEqual(ids(selectEligibleCpsatBranchLevels(synthetic)), ['portal', 'harvested', 'plain']);
assert.deepEqual(ids(selectUnharvestedCpsatLevels(synthetic)), ['portal', 'plain']);
assert.deepEqual(ids(selectShardByRoundRobin(synthetic, 2, 3)), ['filter', 'harvested']);

console.log('CP-SAT branch-label eligibility rename preserves selection, harvest, portal, and shard behavior.');
