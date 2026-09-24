#!/usr/bin/env node
/**
 * Fails when a maintained (package.json/workflow-reachable) script still imports the removed
 * `readLevelsWithHints`/`writeLevelsWithHints` hint/corpus facade. This is the "mechanical guard"
 * required by docs/hint-evidence-execution-identity-storage-consolidation-plan.md section 13.1.A/13 so
 * this seam cannot silently reopen as a current writer/reader once migrated. Dormant (unreachable)
 * files may still mention the old names as historical debt; this guard only fails on live reachability.
 *
 * Usage: node scripts/hint-io-facade-guard-node-test.mjs
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { findReachableRemovedFacadeUsers } from './hint-io-facade-guard-lib.mjs';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const offenders = findReachableRemovedFacadeUsers(root);

assert.deepEqual(
    offenders,
    [],
    `Maintained-reachable file(s) still import the removed readLevelsWithHints/writeLevelsWithHints ` +
    `facade: ${offenders.join(', ')}. Migrate to readLevelCorpusDocumentWithHints/` +
    `writeLevelCorpusDocumentWithHints + setLevelHintRecords (scripts/level-data-io.mjs) before this ` +
    `seam becomes a current writer/reader again.`,
);

console.log('hint-io-facade-guard: no maintained-reachable removed-facade imports (reachability seeded from package.json + .github/workflows).');
