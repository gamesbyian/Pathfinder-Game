#!/usr/bin/env node
import assert from 'node:assert/strict';

import { deleteApp, initializeApp } from 'firebase/app';
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  query,
  serverTimestamp,
  setDoc,
  terminate,
  where,
} from 'firebase/firestore';

import {
  getLegacyLevelFingerprints,
  getLevelFingerprint,
  isSameLevelStructure,
  LEVEL_FINGERPRINT_VERSION,
} from '../modules/domain/level-fingerprint.ts';
import { hintPathSignature, makeProvenanceEntry } from '../modules/domain/hint-types.ts';
import { createLevelRatingRepository } from '../modules/persistence/level-rating-repository.ts';
import { createLevelSubmissionRepository } from '../modules/persistence/level-submission-repository.ts';
import { createLocalLevelHintsRepository } from '../modules/persistence/local-level-hints-repository.ts';

const emulator = process.env.FIRESTORE_EMULATOR_HOST;
assert.ok(emulator, 'FIRESTORE_EMULATOR_HOST must be set by firebase emulators:exec');
const separator = emulator.lastIndexOf(':');
assert.ok(separator > 0, `invalid FIRESTORE_EMULATOR_HOST: ${emulator}`);
const host = emulator.slice(0, separator);
const port = Number(emulator.slice(separator + 1));
assert.ok(Number.isInteger(port) && port > 0, `invalid Firestore emulator port: ${emulator}`);

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'demo-pathfinder-phase15-boundary';
const APP_ID = 'pathfinder-phase15-boundary';

const apps = [];
const dbs = [];

function client(name, mockUserToken = null) {
  const app = initializeApp({
    apiKey: 'demo-api-key',
    projectId: PROJECT_ID,
    appId: `demo-${name}`,
  }, `phase15-${name}-${process.pid}`);
  const db = initializeFirestore(app, {});
  connectFirestoreEmulator(
    db,
    host,
    port,
    mockUserToken ? { mockUserToken } : undefined,
  );
  apps.push(app);
  dbs.push(db);
  const uid = mockUserToken?.sub ?? mockUserToken?.user_id ?? null;
  return {
    appId: APP_ID,
    db,
    serverTimestamp,
    withTimeout: promise => promise,
    waitForUser: async () => uid ? { uid } : null,
  };
}

const admin = client('admin', {
  sub: 'admin-user',
  user_id: 'admin-user',
  email: 'ianmakesjokes@gmail.com',
  email_verified: true,
  admin: true,
});
const user = client('user', {
  sub: 'player-user',
  user_id: 'player-user',
  email: 'player@example.test',
  email_verified: true,
});
const publicClient = client('public');

const level = {
  grid: { w: 4, h: 4 },
  reqLen: 7,
  reqInt: 0,
  gates: [{ x: 1, y: 1 }],
  goal: { x: 4, y: 4 },
  falseGoals: [],
  blocks: [{ x: 2, y: 2 }],
  mustPass: [{ x: 2, y: 3 }],
  mustCross: [],
  filters: [],
  flippingFilters: [],
  portals: [],
  geese: [],
  landmarks: [],
  hints: [],
};
const legacyOnlyLevel = {
  ...level,
  goal: { x: 4, y: 3 },
  blocks: [{ x: 3, y: 2 }],
};

try {
  const levelFingerprint = await getLevelFingerprint(level);
  const legacyFingerprints = await getLegacyLevelFingerprints(level);
  assert.equal(LEVEL_FINGERPRINT_VERSION, 2);
  assert.match(levelFingerprint, /^v2:/u);
  assert.ok(legacyFingerprints.length > 0);
  assert.notEqual(legacyFingerprints[0], levelFingerprint);

  // Rating identity: the real repository writes the exact computed fingerprint as the
  // Firestore document ID, and a public reader resolves both current and historical keys.
  const adminRatings = createLevelRatingRepository(admin);
  const publicRatings = createLevelRatingRepository(publicClient);
  await adminRatings.saveLevelRating(levelFingerprint, 1, {
    tags: ['phase15-current'],
    customTags: [],
    difficulty: 3,
    fun: 4,
  });
  const currentRatingDoc = await getDoc(doc(
    publicClient.db,
    'artifacts',
    APP_ID,
    'level_ratings',
    levelFingerprint,
  ));
  assert.equal(currentRatingDoc.exists(), true);
  assert.equal(currentRatingDoc.id, levelFingerprint);
  assert.deepEqual((await publicRatings.loadLevelRating(levelFingerprint))?.tags, ['phase15-current']);

  const legacyFingerprint = legacyFingerprints[0];
  await setDoc(doc(admin.db, 'artifacts', APP_ID, 'level_ratings', legacyFingerprint), {
    tags: ['phase15-legacy'],
    customTags: [],
    difficulty: 2,
    fun: 1,
    levelNumber: 1,
    updatedAt: serverTimestamp(),
  });
  assert.deepEqual((await publicRatings.loadLevelRating(legacyFingerprint))?.tags, ['phase15-legacy']);

  // Submission identity: production repository code must persist the exact current
  // levelFingerprint field, and duplicate lookup must still recognize an old-fingerprint
  // document by structure without changing the current returned identity.
  const submissions = createLevelSubmissionRepository(user, {
    isSameLevelStructure,
    getLevelFingerprint,
    reportError: (scope, error) => {
      throw new Error(`${scope}: ${error instanceof Error ? error.message : String(error)}`);
    },
  });
  await submissions.submitLevel(level, {
    skipDuplicateCheck: true,
    levelFingerprint,
  });
  const currentSubmission = await getDocs(query(
    collection(user.db, 'artifacts', APP_ID, 'submissions'),
    where('levelFingerprint', '==', levelFingerprint),
  ));
  assert.equal(currentSubmission.size, 1);
  const submittedData = currentSubmission.docs[0].data();
  assert.equal(submittedData.levelFingerprint, levelFingerprint);
  assert.equal(submittedData.fingerprintVersion, LEVEL_FINGERPRINT_VERSION);
  assert.equal('fingerprint' in submittedData, false);

  const duplicateCurrent = await submissions.findDuplicateLevel(level);
  assert.equal(duplicateCurrent.levelFingerprint, levelFingerprint);
  assert.equal(duplicateCurrent.duplicate?.source, 'pending');

  const legacyOnlyCurrentFingerprint = await getLevelFingerprint(legacyOnlyLevel);
  const legacyOnlyOldFingerprint = (await getLegacyLevelFingerprints(legacyOnlyLevel))[0];
  assert.notEqual(legacyOnlyCurrentFingerprint, legacyOnlyOldFingerprint);
  await setDoc(doc(admin.db, 'artifacts', APP_ID, 'submissions', 'legacy-fingerprint-submission'), {
    levelData: legacyOnlyLevel,
    levelFingerprint: legacyOnlyOldFingerprint,
    fingerprintVersion: 1,
    submittedAt: serverTimestamp(),
    submittedBy: 'admin-user',
  });
  const duplicateLegacy = await submissions.findDuplicateLevel(legacyOnlyLevel);
  assert.equal(duplicateLegacy.levelFingerprint, legacyOnlyCurrentFingerprint);
  assert.equal(duplicateLegacy.duplicate?.id, 'legacy-fingerprint-submission');
  assert.equal(duplicateLegacy.duplicate?.levelFingerprint, legacyOnlyCurrentFingerprint);

  // Local-hint identity: the real repository uses the exact level fingerprint as the
  // collection-path key and the deterministic path-signature digest as the entry document ID.
  const localHints = createLocalLevelHintsRepository(user);
  const hintPath = [0x00000000, 0x00000001, 0x00010001];
  const signature = hintPathSignature(hintPath);
  const provenance = makeProvenanceEntry('phase15-emulator-proof', {
    foundAt: '2026-08-31T00:00:00.000Z',
  });
  const saved = await localHints.saveLocalLevelHintIfNovel(
    levelFingerprint,
    hintPath,
    signature,
    provenance,
    new Set(),
  );
  assert.equal(saved, true);
  const entryId = localHints.hashPathSignature(signature);
  const hintDoc = await getDoc(doc(
    publicClient.db,
    'artifacts',
    APP_ID,
    'local_level_hints',
    levelFingerprint,
    'entries',
    entryId,
  ));
  assert.equal(hintDoc.exists(), true);
  assert.deepEqual(hintDoc.data()?.path, hintPath);
  assert.equal(hintDoc.data()?.pathSignature, signature);

  const roundTrippedHints = await localHints.getLocalLevelHints(levelFingerprint);
  assert.equal(roundTrippedHints.length, 1);
  assert.deepEqual(roundTrippedHints[0].path, hintPath);

  console.log('Firestore level-fingerprint repository/emulator boundary proof passed.');
} finally {
  await Promise.allSettled(dbs.map(db => terminate(db)));
  await Promise.allSettled(apps.map(app => deleteApp(app)));
}
