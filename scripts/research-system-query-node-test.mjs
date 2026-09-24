/* global structuredClone */
import assert from 'node:assert/strict';

import { buildResearchSystemInventory } from './research-system-inventory-lib.mjs';
import {
    buildResearchSystemFindingIndexFromInventory,
    buildResearchSystemFindingSnapshot,
    buildResearchSystemFindingSnapshotFromGitRef,
    diffResearchSystemFindingSnapshots,
    queryResearchSystemFindings,
} from './research-system-query-lib.mjs';

const inventory = buildResearchSystemInventory(process.cwd());
const first = buildResearchSystemFindingIndexFromInventory(inventory);
const second = buildResearchSystemFindingIndexFromInventory(inventory);

assert.equal(first.schemaVersion, 1);
assert.equal(first.authority.kind, 'derived-read-only');
assert.ok(first.count > 0);
assert.equal(new Set(first.findings.map(row => row.id)).size, first.count,
    'current derived system finding identities must be unique');
assert.deepEqual(
    first.findings.map(row => row.id),
    second.findings.map(row => row.id),
    'derived system finding identity must be deterministic on unchanged repository state',
);
assert.ok(first.findings.every(row => /^SYS-[a-f0-9]{12}$/u.test(row.id)));
assert.ok(first.findings.every(row => /^[a-f0-9]{16}$/u.test(row.fingerprint)));

const architecture = queryResearchSystemFindings(first, { category: 'architecture' });
assert.ok(Array.isArray(architecture));
assert.ok(queryResearchSystemFindings(first, { query: 'workstream' }).length >= 0);

const snapshot = buildResearchSystemFindingSnapshot(first);
assert.equal(snapshot.schemaVersion, 1);
assert.equal(snapshot.findings.length, first.count);

const headSnapshot = buildResearchSystemFindingSnapshotFromGitRef(process.cwd(), 'HEAD');
assert.deepEqual(headSnapshot, snapshot,
    'Git-ref reconstruction of HEAD should preserve current research-system findings');

const changedSnapshot = structuredClone(snapshot);
assert.ok(changedSnapshot.findings.length > 0);
changedSnapshot.findings[0].fingerprint = 'ffffffffffffffff';
const changed = diffResearchSystemFindingSnapshots(snapshot, changedSnapshot);
assert.equal(changed.added.length, 0);
assert.equal(changed.removed.length, 0);
assert.equal(changed.changed.length, 1);
assert.equal(changed.changed[0].id, snapshot.findings[0].id);

const removedSnapshot = structuredClone(snapshot);
const removed = removedSnapshot.findings.shift();
const removalDiff = diffResearchSystemFindingSnapshots(snapshot, removedSnapshot);
assert.ok(removalDiff.removed.some(row => row.id === removed.id));

const addedSnapshot = structuredClone(snapshot);
addedSnapshot.findings.push({
    id: 'SYS-000000000000',
    category: 'architecture',
    family: 'fixture',
    kind: 'fixture',
    fingerprint: '0000000000000000',
});
const additionDiff = diffResearchSystemFindingSnapshots(snapshot, addedSnapshot);
assert.ok(additionDiff.added.some(row => row.id === 'SYS-000000000000'));

console.log('research-system query tests passed');
