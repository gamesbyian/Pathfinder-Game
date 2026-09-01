#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const files = Object.fromEntries([
  'stateSlices',
  'ratingActions',
  'ratingManager',
  'submissionCore',
  'submissionController',
  'ratingRepository',
  'submissionRepository',
  'localHintsRepository',
  'ratingsReport',
  'fingerprintTest',
].map(name => {
  const paths = {
    stateSlices: 'modules/state-slices.ts',
    ratingActions: 'modules/state/actions/rating-actions.ts',
    ratingManager: 'modules/engine/level-rating-manager.ts',
    submissionCore: 'modules/input/submission-core.ts',
    submissionController: 'modules/input/submission-controller.ts',
    ratingRepository: 'modules/persistence/level-rating-repository.ts',
    submissionRepository: 'modules/persistence/level-submission-repository.ts',
    localHintsRepository: 'modules/persistence/local-level-hints-repository.ts',
    ratingsReport: 'scripts/level-ratings-report.mjs',
    fingerprintTest: 'modules/domain/level-fingerprint.test.ts',
  };
  return [name, readFileSync(paths[name], 'utf8')];
}));

const combinedApplication = [
  files.stateSlices,
  files.ratingActions,
  files.ratingManager,
  files.submissionCore,
  files.submissionController,
  files.ratingRepository,
  files.submissionRepository,
  files.localHintsRepository,
  files.ratingsReport,
].join('\n');

// Retired application-local identities. Domain-level fingerprint terminology and
// fingerprintVersion are intentionally not banned.
for (const [label, pattern] of [
  ['level-rating state field', /\bfingerprint:\s*string\s*\|\s*null/u],
  ['level-rating member access', /levelRating\.fingerprint\b|rating\.fingerprint\b/u],
  ['old local-corpus helper', /findLocalCorpusMatchByFingerprint/u],
  ['old duplicate-presentation member', /verdict\.fingerprint\b|duplicateCheck\.fingerprint\b/u],
  ['old local match member', /targetLocalLevelMatch\?\.fingerprint\b/u],
  ['old repository parameter', /\(fingerprint:\s*string\b/u],
  ['old awaited local', /const\s+fingerprint\s*=\s*await\s+getLevelFingerprint/u],
]) {
  assert.doesNotMatch(combinedApplication, pattern, `retired Phase-15F ${label} must not remain on current application surfaces`);
}

// Runtime state / application API vocabulary is canonical.
assert.match(files.stateSlices, /levelFingerprint: string \| null/u);
assert.match(files.ratingActions, /rating\.levelFingerprint = levelFingerprint/u);
assert.match(files.ratingManager, /setLevelRatingContext\(state, \{ levelFingerprint/u);
assert.match(files.submissionCore, /findLocalCorpusMatchByLevelFingerprint/u);
assert.match(files.submissionCore, /levelFingerprint: string \| null/u);
assert.match(files.submissionController, /findLocalCorpusMatchByLevelFingerprint/u);
assert.match(files.submissionController, /targetLocalLevelFingerprint: targetLocalLevelMatch\?\.levelFingerprint/u);
assert.match(files.ratingsReport, /levelFingerprint/u);

// Persisted query/document/path identities remain exactly on the pre-15F value.
assert.match(
  files.submissionRepository,
  /where\('levelFingerprint', '==', levelFingerprint\)/u,
  'duplicate detection must still query the persisted levelFingerprint field with the computed value',
);
assert.match(
  files.submissionRepository,
  /levelFingerprint,\s*\n\s*fingerprintVersion: LEVEL_FINGERPRINT_VERSION/u,
  'new submissions must still persist canonical levelFingerprint plus fingerprintVersion',
);
assert.match(
  files.ratingRepository,
  /doc\(ratings\(\), levelFingerprint\)/u,
  'rating document IDs must remain the computed level fingerprint value',
);
assert.match(
  files.localHintsRepository,
  /'local_level_hints', levelFingerprint, 'entries'/u,
  'local-hint Firestore path key must remain the computed level fingerprint value',
);

// Legacy-version lookup/migration remains present and current-first.
assert.match(files.ratingManager, /getLegacyLevelFingerprints/u);
assert.match(files.ratingManager, /loadLevelRating\(levelFingerprint\)/u);
assert.match(files.ratingManager, /loadLegacyRatingAndMigrate\(rawLevel, levelFingerprint, levelNumber\)/u);
assert.match(files.ratingManager, /saveLevelRating\(currentLevelFingerprint, levelNumber, found\)/u);

// The domain algorithm/version identity itself is intentionally unchanged and byte-pinned.
assert.match(
  files.fingerprintTest,
  /v2:1abd33d29f460fee3a9b9dee523699c780df4b55c2a30f12d495e62ae67788d3/u,
);
assert.match(files.submissionRepository, /fingerprintVersion: LEVEL_FINGERPRINT_VERSION/u);

console.log('Phase-15F closeout clean: application-local level fingerprint vocabulary is canonical while persisted/query/path identity remains invariant.');
